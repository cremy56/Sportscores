// src/pages/Testbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import TestFormModal from '../components/TestFormModal';
import ConfirmModal from '../components/ConfirmModal';
import { PlusIcon, TrashIcon, ChevronRightIcon, BeakerIcon } from '@heroicons/react/24/outline';

export default function Testbeheer() {
    const { profile } = useOutletContext();
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [modal, setModal] = useState({ type: null, data: null });

    // Bepaal de rol van de gebruiker
    const isAdmin = profile?.rol?.toLowerCase() === 'administrator';

    useEffect(() => {
        if (!profile?.school_id) {
            setLoading(false);
            return;
        }

        const testenRef = collection(db, 'testen');
        const q = query(testenRef, where('school_id', '==', profile.school_id));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const testenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sorteer de testen alfabetisch in de code
            testenData.sort((a, b) => a.naam.localeCompare(b.naam));
            setTesten(testenData);
            setLoading(false);
        }, (error) => {
            console.error("Fout bij ophalen testen:", error);
            toast.error("Kon de testen niet laden.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.school_id]);

    const handleCloseModal = () => {
        setModal({ type: null, data: null });
    };

    const handleDeleteTest = async () => {
        const testToDelete = modal.data;
        if (!testToDelete) return;

        const loadingToast = toast.loading('Test verwijderen...');

        try {
            // Controleer of er scores aan deze test gekoppeld zijn
            const scoresRef = collection(db, 'scores');
            const scoresQuery = query(scoresRef, where('test_id', '==', testToDelete.id));
            const scoresSnapshot = await getDocs(scoresQuery);

            if (!scoresSnapshot.empty) {
                toast.error(`Kan '${testToDelete.naam}' niet verwijderen. Er zijn nog ${scoresSnapshot.size} scores aan gekoppeld.`);
                toast.dismiss(loadingToast);
                handleCloseModal();
                return;
            }

            // Verwijder de test
            await deleteDoc(doc(db, 'testen', testToDelete.id));
            toast.success(`'${testToDelete.naam}' succesvol verwijderd.`);
        } catch (error) {
            toast.error(`Fout bij verwijderen: ${error.message}`);
        } finally {
            toast.dismiss(loadingToast);
            handleCloseModal();
        }
    };
    
    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="text-gray-700 font-medium">Testen laden...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Toaster position="top-center" />
            <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                
                    {/* --- MOBILE HEADER: Zichtbaar op kleine schermen, verborgen op lg en groter --- */}
                    <div className="lg:hidden mb-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-800">
                                {isAdmin ? "Testbeheer" : "Sporttesten"}
                            </h1>
                            {isAdmin && (
                                <button
                                    onClick={() => setModal({ type: 'form', data: null })}
                                    className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full shadow-lg"
                                >
                                    <PlusIcon className="h-6 w-6" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- DESKTOP HEADER: Verborgen op kleine schermen, zichtbaar op lg en groter --- */}
                    <div className="hidden lg:block mb-12">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                                {isAdmin ? "Testbeheer" : "Sporttesten"}
                            </h1>
                            {isAdmin && (
                                <button
                                    onClick={() => setModal({ type: 'form', data: null })}
                                    className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                                >
                                    <PlusIcon className="h-6 w-6" />
                                    <span className="ml-2">Nieuwe Test</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- CONTENT --- */}
                    {testen.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 text-center p-12 max-w-2xl mx-auto">
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BeakerIcon className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Geen Testen Gevonden</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {isAdmin 
                                        ? "Er zijn nog geen testen aangemaakt voor deze school. Klik op de knop hierboven om uw eerste test te creëren."
                                        : "Er zijn nog geen testen beschikbaar voor uw school."
                                    }
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <ul className="divide-y divide-gray-200/70">
                                    {testen.map(test => (
                                        <li key={test.id} className="group">
                                            <div 
                                                onClick={() => navigate(`/testbeheer/${test.id}`)} 
                                                className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-purple-50/50 transition-colors"
                                            >
                                                <div>
                                                    <p className="text-lg font-semibold text-gray-900 group-hover:text-purple-700">{test.naam}</p>
                                                    <p className="text-sm text-gray-500">{test.categorie}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {/* Enkel tonen als de gebruiker een administrator is */}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setModal({ type: 'confirm', data: test });
                                                            }}
                                                            className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                                                            aria-label="Verwijder test"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                    <ChevronRightIcon className="h-6 w-6 text-gray-400 group-hover:text-purple-700 transition-transform group-hover:translate-x-1" />
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Statistics */}
                            <div className="mt-16 text-center">
                                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4 inline-block">
                                    <div className="flex items-center justify-center space-x-8 text-sm text-slate-600 flex-wrap gap-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                                            <span>{testen.length} {testen.length === 1 ? 'Test' : 'Testen'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <TestFormModal
                isOpen={modal.type === 'form'}
                onClose={handleCloseModal}
                onTestSaved={handleCloseModal}
                testData={modal.data}
                schoolId={profile?.school_id}
            />

            <ConfirmModal
                isOpen={modal.type === 'confirm'}
                onClose={handleCloseModal}
                onConfirm={handleDeleteTest}
                title="Test Verwijderen"
            >
                Weet u zeker dat u de test "{modal.data?.naam}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </>
    );
}