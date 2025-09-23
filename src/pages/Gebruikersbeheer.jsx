// src/pages/Gebruikersbeheer.jsx
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    writeBatch, 
    doc, 
    deleteDoc,
    getCountFromServer 
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import Papa from 'papaparse';
import { 
    PlusIcon, 
    ArrowUpTrayIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon,
    UsersIcon,
    ArrowDownTrayIcon,
    UserPlusIcon
} from '@heroicons/react/24/outline';
import UserFormModal from '../components/UserFormModal'; 
import ConfirmModal from '../components/ConfirmModal';

// Helper functie om identifier te bepalen
const getIdentifier = (user) => {
    if (user.smartschool_username) {
        return user.smartschool_username;
    }
    if (user.email) {
        return user.email;
    }
    return null;
};

// Mobile-vriendelijke Action Buttons Component
const MobileActionButtons = ({ onEdit, onDelete, user }) => (
    <div className="flex items-center gap-2">
        <button
            onClick={onEdit}
            className="p-3 sm:p-2 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-all duration-200 touch-manipulation"
            aria-label={`Bewerk ${user.naam}`}
        >
            <PencilIcon className="h-5 w-5" />
        </button>
        <button
            onClick={onDelete}
            className="p-3 sm:p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-all duration-200 touch-manipulation"
            aria-label={`Verwijder ${user.naam}`}
        >
            <TrashIcon className="h-5 w-5" />
        </button>
    </div>
);

export default function Gebruikersbeheer() {
    const context = useOutletContext();
    const { profile, school } = context || {};
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalCount, setTotalCount] = useState(null);
    const fileInputRef = useCallback(node => {
        if (node !== null) {
            node.value = '';
        }
    }, []);
    const [modal, setModal] = useState({ type: null, data: null });

    useEffect(() => {
        const getTotalCount = async () => {
            if (!profile?.school_id) return;
            try {
                const countQuery = query(
                    collection(db, 'toegestane_gebruikers'),
                    where('school_id', '==', profile.school_id),
                    where('rol', 'in', ['leerling', 'leerkracht'])
                );
                const snapshot = await getCountFromServer(countQuery);
                setTotalCount(snapshot.data().count);
            } catch (error) {
                console.error('Fout bij ophalen totaal aantal:', error);
            }
        };
        getTotalCount();
    }, [profile?.school_id]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm.length >= 2) {
                searchUsers(searchTerm);
            } else if (searchTerm.length === 0) {
                setUsers([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, profile?.school_id]);

    const searchUsers = async (term) => {
        if (!profile?.school_id) return;
        
        setLoading(true);
        const termLower = term.toLowerCase();
        const usersRef = collection(db, 'toegestane_gebruikers');

        try {
            let queries = [];
            
            // Query 1: Zoek op naam keywords
            queries.push(
                query(
                    usersRef,
                    where('school_id', '==', profile.school_id),
                    where('rol', 'in', ['leerling', 'leerkracht']),
                    where('naam_keywords', 'array-contains', termLower)
                )
            );

            // Query 2: Zoek op email (als term @ bevat)
            if (term.includes('@')) {
                queries.push(
                    query(
                        usersRef,
                        where('school_id', '==', profile.school_id),
                        where('rol', 'in', ['leerling', 'leerkracht']),
                        where('email', '>=', termLower),
                        where('email', '<=', termLower + '\uf8ff')
                    )
                );
            }

            // Query 3: Zoek op smartschool_username
            queries.push(
                query(
                    usersRef,
                    where('school_id', '==', profile.school_id),
                    where('rol', 'in', ['leerling', 'leerkracht']),
                    where('smartschool_username', '>=', termLower),
                    where('smartschool_username', '<=', termLower + '\uf8ff')
                )
            );

            // Voer alle queries uit
            const allResults = new Map();
            
            for (const q of queries) {
                try {
                    const querySnapshot = await getDocs(q);
                    querySnapshot.docs.forEach(doc => {
                        allResults.set(doc.id, { id: doc.id, ...doc.data() });
                    });
                } catch (error) {
                    console.warn('Een query is mislukt:', error);
                    // Continue met andere queries
                }
            }

            const results = Array.from(allResults.values());
            results.sort((a, b) => a.naam.localeCompare(b.naam));
            setUsers(results);
        } catch (error) {
            console.error('Zoekfout:', error);
            toast.error('Fout bij zoeken naar gebruikers.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleFileChange = useCallback((event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast.error("Selecteer een geldig CSV-bestand.");
            return;
        }

        const loadingToast = toast.loading('CSV-bestand verwerken...');
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
            complete: async (results) => {
                toast.dismiss(loadingToast);
                
                if (!results.data || results.data.length === 0) {
                    toast.error("CSV is leeg of incorrect geformatteerd.");
                    return;
                }

                // Aangepaste header validatie - email is nu optioneel
                const requiredHeaders = ['naam', 'geboortedatum', 'geslacht'];
                const missingRequiredHeaders = requiredHeaders.filter(h => !results.meta.fields.includes(h));
                
                if (missingRequiredHeaders.length > 0) {
                    toast.error(`CSV mist verplichte kolommen: ${missingRequiredHeaders.join(', ')}`);
                    return;
                }

                // Valideer dat elke rij minstens email OF smartschool_username heeft
                const validRows = results.data.filter(row => {
                    if (!row.naam) return false;
                    
                    const hasEmail = row.email && row.email.includes('@');
                    const hasUsername = row.smartschool_username && row.smartschool_username.trim();
                    
                    return hasEmail || hasUsername;
                });

                if (validRows.length === 0) {
                    toast.error("Geen geldige rijen gevonden. Elke rij moet een naam en minstens een email of smartschool_username hebben.");
                    return;
                }

                try {
                    const batch = writeBatch(db);
                    let successCount = 0;
                    
                    for (const row of validRows) {
                        try {
                            // Bepaal de identifier voor het document ID
                            const identifier = row.smartschool_username?.trim() || row.email?.trim().toLowerCase();
                            const docRef = doc(db, 'toegestane_gebruikers', identifier);
                            
                            const geslachtCleaned = (row.geslacht || '').trim().toUpperCase();
                            const finalGeslacht = geslachtCleaned.startsWith('M') ? 'M' : 'V';

                            const userData = {
                                naam: row.naam.trim(),
                                geboortedatum: row.geboortedatum ? new Date(row.geboortedatum) : null,
                                geslacht: finalGeslacht,
                                rol: 'leerling',
                                school_id: profile.school_id,
                                naam_keywords: row.naam.toLowerCase().split(' ').filter(Boolean),
                            };

                            // Voeg email toe als het bestaat
                            if (row.email && row.email.includes('@')) {
                                userData.email = row.email.trim().toLowerCase();
                            }

                            // Voeg smartschool_username toe als het bestaat
                            if (row.smartschool_username && row.smartschool_username.trim()) {
                                userData.smartschool_username = row.smartschool_username.trim();
                            }

                            batch.set(docRef, userData);
                            successCount++;
                        } catch (rowError) {
                            console.warn(`Fout bij verwerken van rij voor ${row.naam}:`, rowError);
                        }
                    }

                    if (successCount > 0) {
                        await batch.commit();
                        toast.success(`${successCount} leerlingen succesvol geïmporteerd!`);
                        setTotalCount(prev => (prev || 0) + successCount);
                    } else {
                        toast.error("Geen geldige gebruikers konden worden geïmporteerd.");
                    }
                } catch (error) {
                    console.error("Import error:", error);
                    toast.error(`Import mislukt: ${error.message}`);
                }
            },
            error: (error) => {
                toast.dismiss(loadingToast);
                toast.error(`Fout bij het lezen van het bestand: ${error.message}`);
            }
        });
    }, [profile?.school_id]);

    const handleDeleteUser = async () => {
        if (!modal.data) return;
        
        try {
            await deleteDoc(doc(db, 'toegestane_gebruikers', modal.data.id));
            toast.success('Gebruiker succesvol verwijderd!');
            setUsers(prev => prev.filter(l => l.id !== modal.data.id));
            setTotalCount(prev => (prev || 1) - 1);
        } catch (error) {
            console.error("Delete error:", error);
            toast.error('Kon de gebruiker niet verwijderen.');
        }

        setModal({ type: null, data: null });
    };

    const handleCloseModal = () => {
        setModal({ type: null, data: null });
    };

    const handleUserSaved = () => {
        if (!modal.data) {
            setTotalCount(prev => (prev !== null ? prev + 1 : 1));
        }

        if (searchTerm.length >= 2) {
            searchUsers(searchTerm);
        }
        
        handleCloseModal();
    };
    
    const exportToCSV = () => {
        if (users.length === 0) {
            toast.error('Geen data om te exporteren. Voer eerst een zoekopdracht uit.');
            return;
        }

        const csvData = users.map(user => ({
            naam: user.naam,
            email: user.email || '',
            smartschool_username: user.smartschool_username || '',
            rol: user.rol,
            geboortedatum: user.geboortedatum || '',
            geslacht: user.geslacht === 'M' ? 'Mannelijk' : 'Vrouwelijk'
        }));

        const csv = Papa.unparse(csvData, { delimiter: ';' });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `gebruikers_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV-bestand gedownload!');
    };
    
    const RoleBadge = ({ role }) => {
        const styles = {
            leerling: 'bg-blue-100 text-blue-800',
            leerkracht: 'bg-green-100 text-green-800',
        };
        return <span className={`capitalize text-xs font-semibold px-2 py-1 rounded-full ${styles[role] || 'bg-gray-100 text-gray-800'}`}>{role}</span>;
    };

    // Nieuwe component om gebruiker identificatie te tonen
    const UserIdentification = ({ user }) => (
        <div>
            <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{user.naam}</p>
            <div className="space-y-1">
                {user.email && (
                    <p className="text-sm text-gray-600 truncate">📧 {user.email}</p>
                )}
                {user.smartschool_username && (
                    <p className="text-sm text-blue-600 truncate">👤 {user.smartschool_username}</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <Toaster position="top-center" />
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8 space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Gebruikersbeheer</h2>
                    <p className="text-sm sm:text-base text-gray-600">
                        {totalCount !== null ? `Totaal ${totalCount} gebruikers` : 'Gebruikers beheren'}
                    </p>
                </div>
                
                {/* Mobile-first button layout */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* CSV Import knop */}
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            title="Importeer CSV"
                        />
                        <button 
                            type="button"
                            className="flex items-center justify-center sm:justify-start bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto relative z-0"
                            onClick={() => {
                                const fileInput = fileInputRef.current;
                                if (fileInput) {
                                    fileInput.click();
                                }
                            }}
                        >
                            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                            <span className="sm:hidden">CSV Import</span>
                            <span className="hidden sm:inline">CSV </span>
                            <span className="hidden sm:inline">Import</span>
                        </button>
                    </div>

                    {/* Export knop - alleen zichtbaar als er resultaten zijn */}
                    {users.length > 0 && (
                        <button
                            onClick={exportToCSV}
                            className="flex items-center justify-center sm:justify-start bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            <span className="sm:hidden">CSV Export</span>
                            <span className="hidden sm:inline">CSV </span>
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    )}

                    <button 
                        onClick={() => setModal({ type: 'form', data: null, role: 'leerkracht' })}
                        className="flex items-center justify-center sm:justify-start bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                    >
                        <UserPlusIcon className="h-4 w-4 mr-2" />
                        <span className="sm:hidden">Nieuwe Leerkracht</span>
                        <span className="hidden sm:inline">Nieuwe </span>
                        <span className="hidden sm:inline">Leerkracht</span>
                    </button>
                    <button
                        onClick={() => setModal({ type: 'form', data: null, role: 'leerling' })}
                        className="flex items-center justify-center sm:justify-start bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        <span className="sm:hidden">Nieuwe Leerling</span>
                        <span className="hidden sm:inline">Nieuwe </span>
                        <span className="hidden sm:inline">Leerling</span>
                    </button>
                </div>
            </div>

            {/* Zoekbalk */}
            <div className="relative mb-6 sm:mb-8">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Zoek op naam, e-mail of smartschool username..."
                    className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 text-base"
                />
                {loading && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    </div>
                )}
            </div>

            {/* Resultaten */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
                {searchTerm.length < 2 ? (
                    <div className="text-center p-8 sm:p-12">
                        <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Zoek naar gebruikers</h3>
                        <p className="text-sm sm:text-base text-gray-600">Gebruik de zoekbalk hierboven om gebruikers te vinden.</p>
                    </div>
                ) : loading ? (
                   <div className="text-center p-8 sm:p-12 text-gray-600">Laden...</div>
                ) : users.length === 0 ? (
                    <div className="text-center p-8 sm:p-12">
                        <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Geen resultaten</h3>
                        <p className="text-sm sm:text-base text-gray-600">Probeer een andere zoekterm.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-200">
                        {users.map(user => (
                            <li key={user.id}>
                                <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 transition-colors touch-manipulation">
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                            <RoleBadge role={user.rol} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <UserIdentification user={user} />
                                        </div>
                                    </div>
                                    <MobileActionButtons
                                        user={user}
                                        onEdit={() => setModal({ type: 'form', data: user })}
                                        onDelete={() => setModal({ type: 'confirm', data: user })}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <UserFormModal
                isOpen={modal.type === 'form'}
                onClose={handleCloseModal}
                onUserSaved={handleUserSaved}
                userData={modal.data}
                schoolId={profile?.school_id}
                role={modal.role}
                currentUserProfile={profile}
                schoolSettings={school?.instellingen}
            />
            
            <ConfirmModal
                isOpen={modal.type === 'confirm'}
                onClose={handleCloseModal}
                onConfirm={handleDeleteUser}
                title="Gebruiker Verwijderen"
            >
                Weet u zeker dat u "{modal.data?.naam}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </div>
    );
}