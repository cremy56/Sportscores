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
    getCountFromServer,
    setDoc 
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
    UserPlusIcon,
    ShieldCheckIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import UserFormModal from '../components/UserFormModal'; 
import ConfirmModal from '../components/ConfirmModal';


// Mobile-vriendelijke Action Buttons Component
const MobileActionButtons = ({ onEdit, onDelete, user }) => (
    <div className="flex items-center gap-2">
        <button
            onClick={onEdit}
            className="p-3 sm:p-2 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-all duration-200 touch-manipulation"
            aria-label="Bewerk gebruiker"
        >
            <PencilIcon className="h-5 w-5" />
        </button>
        <button
            onClick={onDelete}
            className="p-3 sm:p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-all duration-200 touch-manipulation"
            aria-label="Verwijder gebruiker"
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
    const [filterKlas, setFilterKlas] = useState('');
    const [filterRol, setFilterRol] = useState('');
    const [totalCount, setTotalCount] = useState(null);
    const fileInputRef = useCallback(node => {
        if (node !== null) {
            node.value = '';
        }
    }, []);
    const [modal, setModal] = useState({ type: null, data: null });


    // Tel totaal aantal gebruikers
    useEffect(() => {
        const getTotalCount = async () => {
            if (!profile?.school_id) return;
            try {
                const countQuery = query(
                    collection(db, 'toegestane_gebruikers'),
                    where('school_id', '==', profile.school_id)
                );
                const snapshot = await getCountFromServer(countQuery);
                setTotalCount(snapshot.data().count);
            } catch (error) {
                console.error('Fout bij ophalen totaal aantal:', error);
            }
        };
        getTotalCount();
    }, [profile?.school_id]);

    // Laad gebruikers op basis van filters
    useEffect(() => {
        if (profile?.school_id) {
            loadUsers();
        }
    }, [profile?.school_id, filterKlas, filterRol]);

    const loadUsers = async () => {
        if (!profile?.school_id) return;
        
        setLoading(true);
        try {
            let q = query(
                collection(db, 'toegestane_gebruikers'),
                where('school_id', '==', profile.school_id)
            );

            // Filter op klas als geselecteerd
            if (filterKlas) {
                q = query(q, where('klas', '==', filterKlas));
            }

            // Filter op rol als geselecteerd
            if (filterRol) {
                q = query(q, where('rol', '==', filterRol));
            }

            const snapshot = await getDocs(q);
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setUsers(usersData);
        } catch (error) {
            console.error('Fout bij laden gebruikers:', error);
            toast.error('Kon gebruikers niet laden');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Alleen CSV bestanden zijn toegestaan.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result;
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    await handleCSVImport(results.data);
                },
                error: (error) => {
                    console.error('CSV parse fout:', error);
                    toast.error('Fout bij inlezen CSV bestand.');
                }
            });
        };
        reader.readAsText(file);
    }, [profile?.school_id]);

   const handleCSVImport = async (data) => {
        if (!profile?.school_id) {
            toast.error('School niet geladen, probeer opnieuw');
            return;
        }

        const loadingToast = toast.loading('CSV importeren...');
        
        try {
            const apiPayload = {
                csvData: data, // De volledige lijst van Papa.parse
                targetSchoolId: profile.school_id,
                currentUserProfileHash: profile.smartschool_id_hash
            };

            const response = await fetch('/api/bulkCreateUsers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiPayload),
            });

            const result = await response.json();
            toast.dismiss(loadingToast);

            if (!response.ok) {
                throw new Error(result.error || 'Er is iets misgegaan');
            }

            // Toon succes/fouten van de server
            if (result.errorCount > 0) {
                console.error('Import fouten:', result.errors);
                toast.error(
                    `${result.successCount} gebruikers geïmporteerd, ${result.errorCount} fouten`, 
                    { duration: 5000 }
                );
            } else {
                toast.success(`${result.successCount} gebruikers succesvol geïmporteerd!`);
            }

            loadUsers(); // Refresh de lijst

        } catch (error) {
            console.error('CSV import fout:', error);
            toast.error('Fout bij importeren: ' + error.message);
            toast.dismiss(loadingToast);
        }
    };

    const exportToCSV = () => {
        if (users.length === 0) {
            toast.error('Geen gebruikers om te exporteren');
            return;
        }

        // Export zonder gevoelige data
        const exportData = users.map(user => ({
            rol: user.rol,
            klas: user.klas || '',
            gender: user.gender || '',
            is_active: user.is_active,
            created_at: user.created_at?.toDate?.()?.toISOString() || ''
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `gebruikers_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Gebruikers geëxporteerd');
    };

    const handleDeleteUser = async () => {
        if (!modal.data?.id) return;

        const loadingToast = toast.loading('Gebruiker verwijderen...');
        
        try {
            // Verwijder uit toegestane_gebruikers
            await deleteDoc(doc(db, 'toegestane_gebruikers', modal.data.id));
            
            // Verwijder ook uit users (als bestaat)
            try {
                await deleteDoc(doc(db, 'users', modal.data.id));
            } catch (error) {
                // User document bestaat misschien nog niet
                console.log('User document niet gevonden (normaal als nog niet ingelogd)');
            }

            toast.dismiss(loadingToast);
            toast.success('Gebruiker verwijderd');
            setModal({ type: null, data: null });
            loadUsers();
        } catch (error) {
            console.error('Verwijder fout:', error);
            toast.dismiss(loadingToast);
            toast.error('Fout bij verwijderen');
        }
    };

    const handleUserSaved = () => {
        setModal({ type: null, data: null });
        loadUsers();
    };

    const handleCloseModal = () => {
        setModal({ type: null, data: null });
    };

    const RoleBadge = ({ role }) => {
        const styles = {
            leerling: 'bg-purple-100 text-purple-800',
            leerkracht: 'bg-blue-100 text-blue-800',
            admin: 'bg-green-100 text-green-800',
            super_admin: 'bg-red-100 text-red-800'
        };
        return <span className={`capitalize text-xs font-semibold px-2 py-1 rounded-full ${styles[role] || 'bg-gray-100 text-gray-800'}`}>{role}</span>;
    };

    // Unieke klassen voor filter
    const uniqueKlassen = [...new Set(users.filter(u => u.klas).map(u => u.klas))].sort();

    return (
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <Toaster position="top-center" />
            
            {/* Privacy Notice */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                    <ShieldCheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-blue-900 text-sm">Privacy-Veilig Beheer</h3>
                        <p className="text-xs text-blue-700 mt-1">
                            Gebruikers worden opgeslagen via gehashte IDs. Namen zijn encrypted. 
                            CSV import gebruikt Smartschool User IDs (geen namen of emails).
                        </p>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8 space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Gebruikersbeheer</h2>
                    <p className="text-sm sm:text-base text-gray-600">
                        {totalCount !== null ? `Totaal ${totalCount} gebruikers` : 'Gebruikers beheren'}
                    </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* CSV Import */}
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
                        >
                            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                            <span>CSV Import</span>
                        </button>
                    </div>

                    {/* CSV Export */}
                    {users.length > 0 && (
                        <button
                            onClick={exportToCSV}
                            className="flex items-center justify-center sm:justify-start bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                            <span>CSV Export</span>
                        </button>
                    )}

                    {/* Nieuwe Leerkracht */}
                    <button 
                        onClick={() => setModal({ type: 'form', data: null, role: 'leerkracht' })}
                        className="flex items-center justify-center sm:justify-start bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                    >
                        <UserPlusIcon className="h-5 w-5 mr-2" />
                        <span>Leerkracht</span>
                    </button>

                    {/* Nieuwe Leerling */}
                    <button
                        onClick={() => setModal({ type: 'form', data: null, role: 'leerling' })}
                        className="flex items-center justify-center sm:justify-start bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        <span>Leerling</span>
                    </button>
                </div>
            </div>

            {/* CSV Format Helper */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <button
                    onClick={() => setModal({ type: 'csvhelp' })}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                >
                    <InformationCircleIcon className="h-5 w-5" />
                    <span className="font-medium">CSV Formaat Informatie</span>
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter op Klas</label>
                    <select
                        value={filterKlas}
                        onChange={(e) => setFilterKlas(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="">Alle klassen</option>
                        {uniqueKlassen.map(klas => (
                            <option key={klas} value={klas}>{klas}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter op Rol</label>
                    <select
                        value={filterRol}
                        onChange={(e) => setFilterRol(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option value="">Alle rollen</option>
                        <option value="leerling">Leerling</option>
                        <option value="leerkracht">Leerkracht</option>
                    </select>
                </div>
            </div>

            {/* Resultaten */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="text-center p-8 sm:p-12 text-gray-600">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        Laden...
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center p-8 sm:p-12">
                        <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Geen gebruikers gevonden</h3>
                        <p className="text-sm sm:text-base text-gray-600">Voeg gebruikers toe via CSV import of handmatig.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klas</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hash ID</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <RoleBadge role={user.rol} />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {user.klas || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {user.gender || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {user.is_active ? 'Actief' : 'Inactief'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500 font-mono truncate max-w-xs">
                                                {user.id.substring(0, 16)}...
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <MobileActionButtons
                                                    user={user}
                                                    onEdit={() => setModal({ type: 'form', data: user })}
                                                    onDelete={() => setModal({ type: 'confirm', data: user })}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                            Totaal: {users.length} gebruiker{users.length !== 1 ? 's' : ''}
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
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
                <p className="text-gray-700">
                    Weet u zeker dat u deze gebruiker wilt verwijderen?
                </p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                        <strong>Rol:</strong> {modal.data?.rol}<br />
                        <strong>Klas:</strong> {modal.data?.klas || 'N/A'}<br />
                        <strong>Hash:</strong> <span className="font-mono text-xs">{modal.data?.id?.substring(0, 20)}...</span>
                    </p>
                </div>
                <p className="mt-4 text-sm text-red-600">
                    ⚠️ Dit kan niet ongedaan worden gemaakt.
                </p>
            </ConfirmModal>

            {/* CSV Help Modal */}
            {modal.type === 'csvhelp' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4">CSV Import Formaat</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">Verplichte Kolommen:</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                                    <li><code className="bg-gray-100 px-1 rounded">smartschool_user_id</code> - Unieke ID van Smartschool</li>
                                    <li><code className="bg-gray-100 px-1 rounded">naam</code> - Voor- en achternaam (wordt encrypted)</li>
                                    <li><code className="bg-gray-100 px-1 rounded">rol</code> - "leerling" of "leerkracht"</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Extra voor Leerlingen:</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                                    <li><code className="bg-gray-100 px-1 rounded">klas</code> - Bijv. "3A", "4B"</li>
                                    <li><code className="bg-gray-100 px-1 rounded">gender</code> - "M", "V" of "X"</li>
                                </ul>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold mb-2">Voorbeeld CSV:</h3>
                                <pre className="text-xs font-mono overflow-x-auto">
{`smartschool_user_id,naam,rol,klas,gender
abc123xyz==,Jan Janssens,leerling,3A,M
def456uvw==,Marie Peeters,leerling,3A,V
teacher789==,Tom Claes,leerkracht,,`}
                                </pre>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="font-semibold text-blue-900 mb-2">🔒 Privacy & Beveiliging:</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                    <li>Namen worden automatisch encrypted bij import</li>
                                    <li>Smartschool User IDs worden gehashed (SHA-256)</li>
                                    <li>Originele data wordt niet leesbaar opgeslagen</li>
                                </ul>
                            </div>
                        </div>

                        <button
                            onClick={() => setModal({ type: null })}
                            className="mt-6 w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Sluiten
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}