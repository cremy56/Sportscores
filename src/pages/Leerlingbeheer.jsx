// src/pages/Leerlingbeheer.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import Papa from 'papaparse';
import { 
    PlusIcon, 
    ArrowUpTrayIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon,
    UsersIcon,
    ChevronDownIcon,
    CheckIcon,
    XMarkIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import StudentFormModal from '../components/StudentFormModal'; 
import ConfirmModal from '../components/ConfirmModal';

export default function Leerlingbeheer() {
    const { profile } = useOutletContext();
    const [leerlingen, setLeerlingen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('naam');
    const [sortOrder, setSortOrder] = useState('asc');
    const [selectedLeerlingen, setSelectedLeerlingen] = useState([]);
    const [filterGeslacht, setFilterGeslacht] = useState('all');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const fileInputRef = useRef(null);
    const [modal, setModal] = useState({ type: null, data: null });

    // Detecteer schermgrootte veranderingen
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!profile?.school_id) {
            setLoading(false);
            return;
        }

        const leerlingenRef = collection(db, 'toegestane_gebruikers');
        const q = query(
            leerlingenRef, 
            where('school_id', '==', profile.school_id),
            where('rol', '==', 'leerling')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leerlingenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeerlingen(leerlingenData);
            setLoading(false);
        }, (error) => {
            console.error("Fout bij ophalen leerlingen:", error);
            toast.error("Kon de leerlingen niet laden.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.school_id]);

   const sortedAndFilteredLeerlingen = useMemo(() => {
    let filtered = leerlingen.filter(leerling => {
        // Safe check for naam and email existence
        const naam = leerling.naam || '';
        const email = leerling.email || '';
        
        const naamMatch = naam.toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = email.toLowerCase().includes(searchTerm.toLowerCase());
        const geslachtMatch = filterGeslacht === 'all' || leerling.geslacht === filterGeslacht;
        
        return (naamMatch || emailMatch) && geslachtMatch;
    });

    return filtered.sort((a, b) => {
        let aValue = a[sortBy] || '';
        let bValue = b[sortBy] || '';
        
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = (bValue || '').toLowerCase(); // Also safe check here
        }
        
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
    });
}, [leerlingen, searchTerm, sortBy, sortOrder, filterGeslacht]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
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

                const requiredHeaders = ['naam', 'email', 'geboortedatum', 'geslacht'];
                const missingHeaders = requiredHeaders.filter(h => !results.meta.fields.includes(h));
                
                if (missingHeaders.length > 0) {
                    toast.error(`CSV mist verplichte kolommen: ${missingHeaders.join(', ')}`);
                    return;
                }

                // Valideer data
                const validRows = results.data.filter(row => {
                    return row.naam && row.email && row.email.includes('@');
                });

                if (validRows.length === 0) {
                    toast.error("Geen geldige rijen gevonden in CSV.");
                    return;
                }

                if (validRows.length !== results.data.length) {
                    toast.error(`${results.data.length - validRows.length} ongeldige rijen overgeslagen.`);
                }

                try {
                    const batch = writeBatch(db);
                    validRows.forEach(row => {
                        const docRef = doc(db, 'toegestane_gebruikers', row.email);
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
                            created_at: new Date(),
                            updated_at: new Date()
                        });
                    });

                    await batch.commit();
                    toast.success(`${validRows.length} leerlingen succesvol geïmporteerd!`);
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
        } catch (error) {
            console.error("Delete error:", error);
            toast.error('Kon de leerling niet verwijderen.');
        }

        setModal({ type: null, data: null });
    };

    const handleBulkDelete = async () => {
        if (selectedLeerlingen.length === 0) return;

        try {
            const batch = writeBatch(db);
            selectedLeerlingen.forEach(id => {
                const docRef = doc(db, 'toegestane_gebruikers', id);
                batch.delete(docRef);
            });

            await batch.commit();
            toast.success(`${selectedLeerlingen.length} leerlingen succesvol verwijderd!`);
            setSelectedLeerlingen([]);
        } catch (error) {
            console.error("Bulk delete error:", error);
            toast.error('Kon de leerlingen niet verwijderen.');
        }

        setModal({ type: null, data: null });
    };

    const handleSelectLeerling = (id) => {
        setSelectedLeerlingen(prev => 
            prev.includes(id) 
                ? prev.filter(lId => lId !== id)
                : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedLeerlingen.length === sortedAndFilteredLeerlingen.length) {
            setSelectedLeerlingen([]);
        } else {
            setSelectedLeerlingen(sortedAndFilteredLeerlingen.map(l => l.id));
        }
    };

    const exportToCSV = () => {
        const csvData = sortedAndFilteredLeerlingen.map(leerling => ({
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

    const handleCloseModal = () => {
        setModal({ type: null, data: null });
    };

    // Mobile Card Component
    const MobileLeerlingCard = ({ leerling }) => (
        <div className={`p-4 bg-white rounded-xl border-2 transition-all duration-200 ${
            selectedLeerlingen.includes(leerling.id) ? 'border-purple-200 bg-purple-50' : 'border-gray-100 hover:border-purple-200'
        }`}>
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                    <input
                        type="checkbox"
                        checked={selectedLeerlingen.includes(leerling.id)}
                        onChange={() => handleSelectLeerling(leerling.id)}
                        className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{leerling.naam}</h3>
                        <p className="text-sm text-gray-500 truncate">{leerling.email}</p>
                        <div className="flex items-center space-x-4 mt-2">
                            {leerling.geboortedatum && (
                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                    {new Date(leerling.geboortedatum).toLocaleDateString('nl-NL')}
                                </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                leerling.geslacht === 'M' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-pink-100 text-pink-800'
                            }`}>
                                {leerling.geslacht === 'M' ? 'Mannelijk' : 'Vrouwelijk'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex space-x-2 ml-2">
                    <button
                        onClick={() => setModal({ type: 'form', data: leerling })}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                        <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setModal({ type: 'confirm', data: leerling })}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
                    <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <p className="text-lg font-medium text-gray-700">Leerlingen laden...</p>
                    </div>
                </div>
            </div>
        );
    }

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
                                    <p className="text-sm text-gray-600">{sortedAndFilteredLeerlingen.length} leerlingen</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                {selectedLeerlingen.length > 0 && (
                                    <button 
                                        onClick={() => setModal({ type: 'bulkDelete', data: selectedLeerlingen })}
                                        className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                    >
                                        <TrashIcon className="h-4 w-4 mr-2" />
                                        Verwijder ({selectedLeerlingen.length})
                                    </button>
                                )}
                                
                                <button 
                                    onClick={exportToCSV}
                                    className="flex items-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Export</span>
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
                                    <span className="hidden sm:inline">Import</span>
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

                    {/* Filters en Zoeken */}
                    <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Zoek op naam of e-mail..."
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            
                            <div className="flex gap-3">
                                <select
                                    value={filterGeslacht}
                                    onChange={(e) => setFilterGeslacht(e.target.value)}
                                    className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="all">Alle geslachten</option>
                                    <option value="M">Mannelijk</option>
                                    <option value="V">Vrouwelijk</option>
                                </select>

                                {!isMobile && (
                                    <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => handleSort('naam')}
                                            className={`px-4 py-3 text-sm font-medium transition-colors ${
                                                sortBy === 'naam' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            Naam {sortBy === 'naam' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </button>
                                        <button
                                            onClick={() => handleSort('email')}
                                            className={`px-4 py-3 text-sm font-medium transition-colors border-l border-gray-200 ${
                                                sortBy === 'email' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Leerlingen Lijst */}
                    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden">
                        {sortedAndFilteredLeerlingen.length > 0 ? (
                            <>
                                {!isMobile && (
                                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                        <div className="flex items-center space-x-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedLeerlingen.length === sortedAndFilteredLeerlingen.length && sortedAndFilteredLeerlingen.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                            />
                                            <span className="text-sm font-medium text-gray-700">
                                                {selectedLeerlingen.length > 0 
                                                    ? `${selectedLeerlingen.length} geselecteerd`
                                                    : 'Alles selecteren'
                                                }
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {sortedAndFilteredLeerlingen.length} resultaten
                                        </span>
                                    </div>
                                )}

                                <div className={isMobile ? "p-4 space-y-4" : "divide-y divide-gray-200"}>
                                    {isMobile ? (
                                        <>
                                            {selectedLeerlingen.length > 0 && (
                                                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl mb-4">
                                                    <span className="text-sm font-medium text-purple-700">
                                                        {selectedLeerlingen.length} geselecteerd
                                                    </span>
                                                    <button
                                                        onClick={handleSelectAll}
                                                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                                                    >
                                                        {selectedLeerlingen.length === sortedAndFilteredLeerlingen.length ? 'Deselecteer alles' : 'Selecteer alles'}
                                                    </button>
                                                </div>
                                            )}
                                            {sortedAndFilteredLeerlingen.map(leerling => (
                                                <MobileLeerlingCard key={leerling.id} leerling={leerling} />
                                            ))}
                                        </>
                                    ) : (
                                        sortedAndFilteredLeerlingen.map(leerling => (
                                            <div key={leerling.id} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center space-x-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLeerlingen.includes(leerling.id)}
                                                        onChange={() => handleSelectLeerling(leerling.id)}
                                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                                    />
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-semibold text-gray-900">{leerling.naam}</h3>
                                                        <p className="text-sm text-gray-500">{leerling.email}</p>
                                                        <div className="flex items-center space-x-4 mt-1">
                                                            {leerling.geboortedatum && (
                                                                <span className="text-xs text-gray-600">
                                                                    {new Date(leerling.geboortedatum).toLocaleDateString('nl-NL')}
                                                                </span>
                                                            )}
                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                                leerling.geslacht === 'M' 
                                                                    ? 'bg-blue-100 text-blue-800' 
                                                                    : 'bg-pink-100 text-pink-800'
                                                            }`}>
                                                                {leerling.geslacht === 'M' ? 'M' : 'V'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => setModal({ type: 'form', data: leerling })}
                                                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                    >
                                                        <PencilIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setModal({ type: 'confirm', data: leerling })}
                                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-12">
                                <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    {searchTerm || filterGeslacht !== 'all' ? 'Geen leerlingen gevonden' : 'Nog geen leerlingen'}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {searchTerm || filterGeslacht !== 'all' 
                                        ? 'Pas uw zoek- of filtercriteria aan.'
                                        : 'Voeg leerlingen toe door ze handmatig in te voeren of een CSV-bestand te importeren.'
                                    }
                                </p>
                                {!searchTerm && filterGeslacht === 'all' && (
                                    <button
                                        onClick={() => setModal({ type: 'form', data: null })}
                                        className="inline-flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
                                    >
                                        <PlusIcon className="h-5 w-5 mr-2" />
                                        Voeg eerste leerling toe
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <StudentFormModal
                isOpen={modal.type === 'form'}
                onClose={handleCloseModal}
                onStudentSaved={handleCloseModal}
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

            <ConfirmModal
                isOpen={modal.type === 'bulkDelete'}
                onClose={handleCloseModal}
                onConfirm={handleBulkDelete}
                title="Meerdere Leerlingen Verwijderen"
            >
                Weet u zeker dat u {selectedLeerlingen.length} leerlingen wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </>
    );
}