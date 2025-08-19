// src/pages/Testbeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import TestFormModal from '../components/TestFormModal';
import ConfirmModal from '../components/ConfirmModal';
import PageHeader from '../components/PageHeader'; // Importeer PageHeader
import { PlusIcon, TrashIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

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
        return <div className="text-center p-8">Laden...</div>;
    }

    return (
       <>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
           
                 {/* --- Aangepaste Header --- */}
            <PageHeader
                title={isAdmin ? "Testbeheer" : "Sporttesten"}
                showCreateButton={isAdmin}
                createButtonText="Nieuwe Test"
                onCreateClick={() => setModal({ type: 'form', data: null })}
                createButtonIcon={PlusIcon}
            />

            {/* --- Content --- */}
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    <ul className="divide-y divide-gray-200/70">
                        {testen.length > 0 ? (
                            testen.map(test => (
                                <li key={test.id} className="group">
                                    <div onClick={() => navigate(`/testbeheer/${test.id}`)} className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-purple-50/50 transition-colors">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900 group-hover:text-purple-700">{test.naam}</p>
                                            <p className="text-sm text-gray-500">{test.categorie}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
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
                                            <ChevronRightIcon className="h-6 w-6 text-gray-400 group-hover:text-purple-700 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="text-center text-gray-500 p-12">
                                <h3 className="text-xl font-semibold mb-2">Geen Testen Gevonden</h3>
                                <p>Er zijn nog geen testen aangemaakt voor deze school. Klik op "+ Nieuwe Test" om te beginnen.</p>
                            </li>
                        )}
                    </ul>
                </div>
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
