// src/pages/SchoolBeheer.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, TrashIcon, PencilIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { BuildingOffice2Icon } from '@heroicons/react/24/solid';
import SchoolFormModal from '../components/SchoolFormModal'; // Nieuw component
import ConfirmModal from '../components/ConfirmModal';

export default function SchoolBeheer() {
    const [scholen, setScholen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ type: null, data: null });

    useEffect(() => {
        const scholenRef = collection(db, 'scholen');
        const q = query(scholenRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const scholenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            scholenData.sort((a, b) => a.naam.localeCompare(b.naam));
            setScholen(scholenData);
            setLoading(false);
        }, (error) => {
            console.error("Fout bij ophalen scholen:", error);
            toast.error("Kon de scholen niet laden.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleCloseModal = () => {
        setModal({ type: null, data: null });
    };

    const handleDeleteSchool = async () => {
        const schoolToDelete = modal.data;
        if (!schoolToDelete) return;

        const loadingToast = toast.loading('School verwijderen...');

        try {
            // Veiligheidscheck: controleer of er gebruikers aan de school gekoppeld zijn
            const usersRef = collection(db, 'toegestane_gebruikers');
            const usersQuery = query(usersRef, where('school_id', '==', schoolToDelete.id));
            const usersSnapshot = await getDocs(usersQuery);

            if (!usersSnapshot.empty) {
                toast.error(`Kan '${schoolToDelete.naam}' niet verwijderen. Er zijn nog ${usersSnapshot.size} gebruikers aan gekoppeld.`);
                toast.dismiss(loadingToast);
                handleCloseModal();
                return;
            }

            await deleteDoc(doc(db, 'scholen', schoolToDelete.id));
            toast.success(`'${schoolToDelete.naam}' succesvol verwijderd.`);
        } catch (error) {
            toast.error(`Fout bij verwijderen: ${error.message}`);
        } finally {
            toast.dismiss(loadingToast);
            handleCloseModal();
        }
    };

    if (loading) {
        return <div className="text-center p-12">Scholen laden...</div>;
    }

    return (
        <>
            <Toaster position="top-center" />
            <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                
                    {/* --- Mobiele Header --- */}
                    <div className="lg:hidden mb-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold text-gray-800">Schoolbeheer</h1>
                            <button
                                onClick={() => setModal({ type: 'form', data: null })}
                                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full shadow-lg"
                                title="Nieuwe School"
                            >
                                <PlusIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* --- Desktop Header --- */}
                    <div className="hidden lg:block mb-12">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Schoolbeheer</h1>
                            <button
                                onClick={() => setModal({ type: 'form', data: null })}
                                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
                            >
                                <PlusIcon className="h-6 w-6 mr-2" />
                                Nieuwe School
                            </button>
                        </div>
                    </div>

                    {/* --- Inhoud --- */}
                    {scholen.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 text-center p-12 max-w-2xl mx-auto">
                           <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                               <BuildingOffice2Icon className="w-8 h-8 text-purple-600" />
                           </div>
                           <h3 className="text-2xl font-bold text-gray-800 mb-2">Geen Scholen Gevonden</h3>
                           <p className="text-gray-600">Klik op de knop hierboven om de eerste school aan te maken.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <ul className="divide-y divide-gray-200/70">
                                {scholen.map(school => (
                                    <li key={school.id} className="group">
                                        <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-purple-50/50 transition-colors">
                                            <div>
                                                <p className="text-lg font-semibold text-gray-900 group-hover:text-purple-700">{school.naam}</p>
                                                <p className="text-sm text-gray-500">{school.stad}</p>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-4">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setModal({ type: 'form', data: school });
                                                    }}
                                                    className="p-2 text-gray-400 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                                    aria-label="Bewerk school"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setModal({ type: 'confirm', data: school });
                                                    }}
                                                    className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                                                    aria-label="Verwijder school"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <SchoolFormModal
                isOpen={modal.type === 'form'}
                onClose={handleCloseModal}
                schoolData={modal.data}
            />

            <ConfirmModal
                isOpen={modal.type === 'confirm'}
                onClose={handleCloseModal}
                onConfirm={handleDeleteSchool}
                title="School Verwijderen"
            >
                Weet u zeker dat u school "{modal.data?.naam}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </ConfirmModal>
        </>
    );
}