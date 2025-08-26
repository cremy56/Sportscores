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

    const searchLeerlingen = async (term) => {
        if (!profile?.school_id) return;
        
        setLoading(true);
        let finalQuery;
        const termLower = term.toLowerCase();
        const usersRef = collection(db, 'toegestane_gebruikers');

        if (term.includes('@')) {
            finalQuery = query(
                usersRef,
                where('school_id', '==', profile.school_id),
                where('rol', '==', 'leerling'),
                where('email', '>=', termLower),
                where('email', '<=', termLower + '\uf8ff')
            );
        } else {
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
                             geboortedatum: row.geboortedatum ? new Date(row.geboortedatum) : null,
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
            <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                    
                    {/* --- MOBILE HEADER: Zichtbaar op kleine schermen, verborgen op lg en groter --- */}
                    <div className="lg:hidden mb-8">
                        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <UsersIcon className="w-8 h-8 text-purple-600" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-800">Leerlingbeheer</h1>
                                <p className="text-sm text-gray-600">
                                    {totalCount !== null ? `Totaal ${totalCount} leerlingen` : 'Leerlingen beheren'}
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <button 
                                    onClick={exportToCSV}
                                    disabled={gefilterdeLeerlingen.length === 0}
                                    className="flex flex-col items-center justify-center px-3 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ArrowDownTrayIcon className="h-6 w-6 mb-1" />
                                    <span className="text-sm text-center">Exporteer</span>
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
                                    className="flex flex-col items-center justify-center px-3 py-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                                >
                                    <ArrowUpTrayIcon className="h-6 w-6 mb-1" />
                                    <span className="text-sm text-center">Importeer</span>
                                </button>
                                <button
                                    onClick={() => setModal({ type: 'form', data: null })}
                                    className="flex flex-col items-center justify-center px-3 py-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                                >
                                    <PlusIcon className="h-6 w-6 mb-1" />
                                    <span className="text-sm text-center">Nieuwe</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- DESKTOP HEADER: Verborgen op kleine schermen, zichtbaar op lg en groter --- */}
                    <div className="hidden lg:block mb-12">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Leerlingbeheer</h1>
                                <p className="text-gray-600">
                                    {totalCount !== null ? `Totaal ${totalCount} leerlingen` : 'Leerlingen beheren'}
                                </p>
                            </div>
                            
                            <div className="flex gap-4">
                                <button 
                                    onClick={exportToCSV}
                                    disabled={gefilterdeLeerlingen.length === 0}
                                    className="flex items-center bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                                >
                                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                                    Exporteer
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
                                    className="flex items-center bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                                >
                                    <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                                    Importeer
                                </button>
                                <button
                                    onClick={() => setModal({ type: 'form', data: null })}
                                    className="flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                                >
                                    <PlusIcon className="h-5 w-5 mr-2" />
                                    Nieuwe Leerling
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-8">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Zoek leerlingen op naam of e-mail (minimaal 2 karakters)..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300"
                        />
                        {loading && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {searchTerm.length < 2 ? (
                            <div className="text-center p-12">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UsersIcon className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                    Zoek naar leerlingen
                                </h3>
                                <p className="text-gray-600">
                                    Gebruik de zoekbalk hierboven om leerlingen te vinden.
                                </p>
                            </div>
                        ) : loading ? (
                            <div className="text-center p-12">
                                <div className="flex items-center justify-center space-x-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                    <span className="text-gray-700 font-medium">Resultaten laden...</span>
                                </div>
                            </div>
                        ) : gefilterdeLeerlingen.length === 0 ? (
                            <div className="text-center p-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                    Geen resultaten gevonden
                                </h3>
                                <p className="text-gray-600">
                                    Probeer andere zoektermen of controleer de spelling.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-200">
                                {gefilterdeLeerlingen.map(leerling => (
                                    <li key={leerling.id}>
                                        <div className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                                            <div>
                                                <p className="text-lg font-bold text-gray-900">{leerling.naam}</p>
                                                <p className="text-sm text-gray-600">{leerling.email}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setModal({ type: 'form', data: leerling })}
                                                    className="p-2 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-all duration-200"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => setModal({ type: 'confirm', data: leerling })}
                                                    className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-all duration-200"
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