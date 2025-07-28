// src/pages/Leerlingbeheer.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    limit,
    orderBy,
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
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import StudentFormModal from '../components/StudentFormModal'; 
import ConfirmModal from '../components/ConfirmModal';

export default function Leerlingbeheer() {
    const { profile } = useOutletContext();
    const [leerlingen, setLeerlingen] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalCount, setTotalCount] = useState(null);
    const fileInputRef = useRef(null);
    const [modal, setModal] = useState({ type: null, data: null });

    // Haal totaal aantal leerlingen op
    useEffect(() => {
        const getTotalCount = async () => {
            if (!profile?.school_id) return;
            try {
                const countQuery = query(
                    collection(db, 'toegestane_gebruikers'),
                    where('school_id', '==', profile.school_id),
                    where('rol', '==', 'leerling')
                );
                const snapshot = await getCountFromServer(countQuery);
                setTotalCount(snapshot.data().count);
            } catch (error) {
                console.error('Fout bij ophalen totaal aantal:', error);
            }
        };
        getTotalCount();
    }, [profile?.school_id]);

    // Debounced search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm.length >= 2) {
                searchLeerlingen(searchTerm);
            } else if (searchTerm.length === 0) {
                setLeerlingen([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, profile?.school_id]);

    // --- AANGEPASTE ZOEKFUNCTIE ---
    const searchLeerlingen = async (term) => {
        if (!profile?.school_id) return;
        
        setLoading(true);
        let finalQuery;
        const termLower = term.toLowerCase();
        const usersRef = collection(db, 'toegestane_gebruikers');

        // Bepaal of we op e-mail of op naam zoeken
        if (term.includes('@')) {
            // Zoek op e-mail met een exacte match
            finalQuery = query(
                usersRef,
                where('school_id', '==', profile.school_id),
                where('rol', '==', 'leerling'),
                where('email', '==', termLower)
            );
        } else {
            // Zoek op naam
            finalQuery = query(
                usersRef,
                where('school_id', '==', profile.school_id),
                where('rol', '==', 'leerling'),
                where('naam_keywords', 'array-contains', termLower)
            );
        }

        try {
            const querySnapshot = await getDocs(finalQuery);
            const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            results.sort((a, b) => a.naam.localeCompare(b.naam));
            setLeerlingen(results);
        } catch (error) {
            console.error('Zoekfout:', error);
            toast.error('Fout bij zoeken naar leerlingen. Controleer de database-indexen.');
        } finally {
            setLoading(false);
        }
    };

    const gefilterdeLeerlingen = useMemo(() => {
        return leerlingen;
    }, [leerlingen]);

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

                const requiredHeaders = ['naam', 'email', 'geboortedatum', 'geslacht'];
                const missingHeaders = requiredHeaders.filter(h => !results.meta.fields.includes(h));
                
                if (missingHeaders.length > 0) {
                    toast.error(`CSV mist verplichte kolommen: ${missingHeaders.join(', ')}`);
                    return;
                }

                const validRows = results.data.filter(row => row.naam && row.email && row.email.includes('@'));

                if (validRows.length === 0) {
                    toast.error("Geen geldige rijen gevonden in CSV.");
                    return;
                }

                try {
                    const batch = writeBatch(db);
                    validRows.forEach(row => {
                        const docRef = doc(db, 'toegestane_gebruikers', row.email.trim().toLowerCase());
                        const geslachtCleaned = (row.geslacht || '').trim().toUpperCase();
                        const finalGeslacht = geslachtCleaned.startsWith('M') ? 'M' : 'V';

                        batch.set(docRef, {
                            naam: row.naam.trim(),
                            email: row.email.trim().toLowerCase(),
                            geboortedatum: row.geboortedatum,
                            geslacht: finalGeslacht,
                            rol: 'leerling',
                            school_id: profile.school_id,
                            naam_keywords: row.naam.toLowerCase().split(' '),
                        });
                    });

                    await batch.commit();
                    toast.success(`${validRows.length} leerlingen succesvol geïmporteerd!`);
                    setTotalCount(prev => (prev || 0) + validRows.length);
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
        event.target.value = null;
    }, [profile?.school_id]);

    const handleDeleteLeerling = async () => {
        if (!modal.data) return;
        
        try {
            await deleteDoc(doc(db, 'toegestane_gebruikers', modal.data.id));
            toast.success('Leerling succesvol verwijderd!');
            setLeerlingen(prev => prev.filter(l => l.id !== modal.data.id));
            setTotalCount(prev => (prev || 1) - 1);
        } catch (error) {
            console.error("Delete error:", error);
            toast.error('Kon de leerling niet verwijderen.');
        }

        setModal({ type: null, data: null });
    };

    const handleCloseModal = () => {
        setModal({ type: null, data: null });
    };

    const handleStudentSaved = () => {
        if (searchTerm.length >= 2) {
            searchLeerlingen(searchTerm);
        }
        handleCloseModal();
    };
    
    const exportToCSV = () => {
        if (gefilterdeLeerlingen.length === 0) {
            toast.error('Geen data om te exporteren. Voer eerst een zoekopdracht uit.');
            return;
        }

        const csvData = gefilterdeLeerlingen.map(leerling => ({
            naam: leerling.naam,
            email: leerling.email,
            geboortedatum: leerling.geboortedatum,
            geslacht: leerling.geslacht === 'M' ? 'Mannelijk' : 'Vrouwelijk'
        }));

        const csv = Papa.unparse(csvData, { delimiter: ';' });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `leerlingen_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV-bestand gedownload!');
    };

    return (
        <>
            <Toaster position="top-center" />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                                    <UsersIcon className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Leerlingbeheer</h1>
                                    <p className="text-sm text-gray-600">
                                        {totalCount !== null ? `Totaal ${totalCount} leerlingen` : 'Leerlingen beheren'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={exportToCSV}
                                    disabled={gefilterdeLeerlingen.length === 0}
                                    className="flex items-center bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Exporteer</span>
                                </button>
                                <input
                                    type="file"
                                    accept=".csv"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <button 
                                    onClick={() => fileInputRef.current.click()}
                                    className="flex items-center bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105"
                                >
                                    <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Importeer</span>
                                </button>
                                
                                <button
                                    onClick={() => setModal({ type: 'form', data: null })}
                                    className="flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105"
                                >
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Nieuwe Leerling</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Zoek leerlingen op naam of e-mail (minimaal 2 karakters)..."
                            className="w-full pl-12 pr-4 py-4 bg-white/70 backdrop-blur-lg border-2 border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-md"
                        />
                        {loading && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                        {searchTerm.length < 2 ? (
                            <div className="text-center p-12">
                                <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Zoek naar leerlingen
                                </h3>
                                <p className="text-gray-600">
                                    Gebruik de zoekbalk hierboven om leerlingen te vinden.
                                </p>
                            </div>
                        ) : loading ? (
                            <div className="text-center p-12 text-gray-600">Resultaten laden...</div>
                        ) : gefilterdeLeerlingen.length === 0 ? (
                            <div className="text-center p-12">
                                <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Geen resultaten gevonden
                                </h3>
                                <p className="text-gray-600">
                                    Probeer andere zoektermen of controleer de spelling.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200/70">
                                {gefilterdeLeerlingen.map(leerling => (
                                    <li key={leerling.id}>
                                        <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                                            <div>
                                                <p className="text-lg font-semibold text-gray-900">{leerling.naam}</p>
                                                <p className="text-sm text-gray-500">{leerling.email}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setModal({ type: 'form', data: leerling })}
                                                    className="p-2 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => setModal({ type: 'confirm', data: leerling })}
                                                    className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <StudentFormModal
                isOpen={modal.type === 'form'}
                onClose={handleCloseModal}
                onStudentSaved={handleStudentSaved}
                studentData={modal.data}
                schoolId={profile?.school_id}
            />
            
            <ConfirmModal
                isOpen={modal.type === 'confirm'}
                onClose={handleCloseModal}
                onConfirm={handleDeleteLeerling}
                title="Leerling Verwijderen"
            >
                Weet u zeker dat u "{modal.data?.naam}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </>
    );
}
