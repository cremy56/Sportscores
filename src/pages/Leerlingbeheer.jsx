// src/pages/Leerlingbeheer.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import Papa from 'papaparse';
import { PlusIcon, ArrowUpTrayIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
// Je zult een formulier-modal nodig hebben, vergelijkbaar met TestFormModal
// import StudentFormModal from '../components/StudentFormModal'; 
import ConfirmModal from '../components/ConfirmModal';

export default function Leerlingbeheer() {
    const { profile } = useOutletContext();
    const [leerlingen, setLeerlingen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef(null);
    const [modal, setModal] = useState({ type: null, data: null });

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
            leerlingenData.sort((a, b) => a.naam.localeCompare(b.naam));
            setLeerlingen(leerlingenData);
            setLoading(false);
        }, (error) => {
            console.error("Fout bij ophalen leerlingen:", error);
            toast.error("Kon de leerlingen niet laden.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.school_id]);

    const gefilterdeLeerlingen = useMemo(() => {
        return leerlingen.filter(leerling => 
            leerling.naam.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [leerlingen, searchTerm]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

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
                if (!requiredHeaders.every(h => results.meta.fields.includes(h))) {
                    toast.error(`CSV mist verplichte kolommen: ${requiredHeaders.join(', ')}`);
                    return;
                }

                const batch = writeBatch(db);
                results.data.forEach(row => {
                    const docRef = doc(db, 'toegestane_gebruikers', row.email);
                    const geslachtCleaned = (row.geslacht || '').trim().toUpperCase();
                    const finalGeslacht = geslachtCleaned.startsWith('M') ? 'M' : 'V';

                    batch.set(docRef, {
                        naam: row.naam,
                        email: row.email,
                        geboortedatum: row.geboortedatum,
                        geslacht: finalGeslacht,
                        rol: 'leerling',
                        school_id: profile.school_id,
                        naam_keywords: row.naam.toLowerCase().split(' ')
                    });
                });

                const promise = batch.commit();
                toast.promise(promise, {
                    loading: `Bezig met importeren van ${results.data.length} leerlingen...`,
                    success: `${results.data.length} leerlingen succesvol geïmporteerd!`,
                    error: (err) => `Import mislukt: ${err.message}`
                });
            },
            error: (error) => {
                toast.dismiss(loadingToast);
                toast.error(`Fout bij het lezen van het bestand: ${error.message}`);
            }
        });
        event.target.value = null; // Reset file input
    };

    const handleDeleteLeerling = async () => {
        // Logica voor het verwijderen van een leerling komt hier
        console.log("Verwijderen:", modal.data);
        toast.success("Verwijder-logica nog te implementeren.");
        setModal({ type: null, data: null });
    };

    if (loading) {
        return <div className="text-center p-8">Laden...</div>;
    }

    return (
        <>
            <Toaster position="top-center" />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
                <div className="max-w-7xl mx-auto mb-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                            Leerlingbeheer
                        </h1>
                        <div className="flex gap-2">
                             <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputRef.current.click()}
                                className="flex items-center justify-center bg-gradient-to-r from-green-600 to-teal-600 text-white p-3 rounded-full sm:px-5 sm:py-3 sm:rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                            >
                                <ArrowUpTrayIcon className="h-6 w-6" />
                                <span className="hidden sm:inline sm:ml-2">Importeer</span>
                            </button>
                            <button
                                onClick={() => toast.error('Modal voor nieuwe leerling nog te implementeren.')}
                                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full sm:px-5 sm:py-3 sm:rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                            >
                                <PlusIcon className="h-6 w-6" />
                                <span className="hidden sm:inline sm:ml-2">Nieuwe Leerling</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Zoek op naam..."
                            className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        />
                    </div>

                    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                        <ul className="divide-y divide-gray-200/70">
                            {gefilterdeLeerlingen.length > 0 ? (
                                gefilterdeLeerlingen.map(leerling => (
                                    <li key={leerling.id}>
                                        <div className="flex items-center justify-between p-4 sm:p-6">
                                            <div>
                                                <p className="text-lg font-semibold text-gray-900">{leerling.naam}</p>
                                                <p className="text-sm text-gray-500">{leerling.email}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => toast.error('Bewerken nog te implementeren.')}
                                                    className="p-2 text-gray-400 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => setModal({ type: 'confirm', data: leerling })}
                                                    className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="text-center text-gray-500 p-12">
                                    <h3 className="text-xl font-semibold mb-2">Geen Leerlingen Gevonden</h3>
                                    <p>{searchTerm ? 'Pas uw zoekterm aan.' : 'Er zijn nog geen leerlingen voor deze school.'}</p>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmModal
                isOpen={modal.type === 'confirm'}
                onClose={() => setModal({ type: null, data: null })}
                onConfirm={handleDeleteLeerling}
                title="Leerling Verwijderen"
            >
                Weet u zeker dat u "{modal.data?.naam}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </>
    );
}
