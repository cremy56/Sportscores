import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { 
    collection, 
    onSnapshot, 
    deleteDoc, 
    doc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    setDoc, 
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, TrashIcon, PencilIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { BuildingOffice2Icon } from '@heroicons/react/24/solid';
import SchoolFormModal from '../components/SchoolFormModal';
import ConfirmModal from '../components/ConfirmModal';
import RapportperiodeModal from '../components/RapportperiodeModal'; // Aanname dat deze bestaat
import MobileActionButtons from '../components/MobileActionButtons'; // <-- VOEG DEZE REGEL TOE


export default function SchoolBeheer() {
    console.log('%c[RENDER] Component wordt opnieuw gerenderd...', 'color: gray');

    const context = useOutletContext();
    const profile = context ? context.profile : null;

    const [scholen, setScholen] = useState([]);
    const [rapportperioden, setRapportperioden] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodenLoading, setPeriodenLoading] = useState(false);
    const [modal, setModal] = useState({ type: null, data: null });

    const userSchoolId = profile?.school_id;
    const isSuperAdmin = profile?.rol === 'super-administrator';

    console.log('%c[STATE INIT] Direct na useState', 'color: blue', {
        profile: profile,
        isSuperAdmin: isSuperAdmin,
        userSchoolId: userSchoolId,
        loading: loading,
        selectedSchool: selectedSchool
    });

    // Effect 1: Reset selectedSchool als de rol verandert
    useEffect(() => {
        console.log(`%c[EFFECT 1] Rol is veranderd (isSuperAdmin: ${isSuperAdmin}). Resetting selectedSchool.`, 'color: orange');
        setSelectedSchool(null);
    }, [isSuperAdmin]);

    // Effect 2: Haal scholen op
    useEffect(() => {
        console.log('%c[EFFECT 2] Start met ophalen van scholen. Zet loading op true.', 'color: green');
        setLoading(true);

        const scholenRef = collection(db, 'scholen');
        const q = query(scholenRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('%c[EFFECT 2 - SNAPSHOT] Data ontvangen van Firestore.', 'color: green; font-weight: bold');
            const scholenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            scholenData.sort((a, b) => a.naam.localeCompare(b.naam));
            setScholen(scholenData);
            
            console.log(`%c[EFFECT 2 - SNAPSHOT] Logic voor auto-select: isSuperAdmin=${isSuperAdmin}, userSchoolId=${userSchoolId}`, 'color: green');

            if (!isSuperAdmin && userSchoolId) {
                const userSchool = scholenData.find(s => s.id === userSchoolId);
                console.log(`%c[EFFECT 2 - SNAPSHOT] School gezocht voor admin. Gevonden:`, 'color: green', userSchool);
                if (userSchool) {
                    setSelectedSchool(userSchool);
                } else {
                    console.error(`[EFFECT 2 - SNAPSHOT] FOUT: Kon school met ID "${userSchoolId}" niet vinden voor de admin!`);
                }
            }
            
            console.log('%c[EFFECT 2 - SNAPSHOT] Zet loading op false.', 'color: green');
            setLoading(false);
        }, (error) => {
            console.error("[EFFECT 2] Fout bij ophalen scholen:", error);
            toast.error("Kon de scholen niet laden.");
            setLoading(false);
        });

        return () => {
            console.log('%c[EFFECT 2 - CLEANUP] Unsubscribe van scholen listener.', 'color: red');
            unsubscribe();
        };
    }, [isSuperAdmin, userSchoolId]);

    // Effect 3: Laad rapportperioden
    useEffect(() => {
        if (!selectedSchool) {
            setRapportperioden([]);
            return;
        }
        console.log(`%c[EFFECT 3] Geselecteerde school veranderd naar: ${selectedSchool.naam}. Rapportperioden ophalen.`, 'color: purple');
        setPeriodenLoading(true);
        const periodenRef = collection(db, 'scholen', selectedSchool.id, 'rapportperioden');
        const q = query(periodenRef, orderBy('startdatum', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const periodenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRapportperioden(periodenData);
            setPeriodenLoading(false);
        }, (error) => {
            console.error("Fout bij ophalen rapportperioden:", error);
            setPeriodenLoading(false);
        });

        return () => {
            console.log('%c[EFFECT 3 - CLEANUP] Unsubscribe van rapportperioden listener.', 'color: red');
            unsubscribe();
        };
    }, [selectedSchool]);

    const handleCloseModal = () => {
        setModal({ type: null, data: null });
    };

    const handleDeleteSchool = async () => {
        const schoolToDelete = modal.data;
        if (!schoolToDelete) return;

        const loadingToast = toast.loading('School verwijderen...');

        try {
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

    const handleDeletePeriod = async () => {
        const periodToDelete = modal.data;
        if (!periodToDelete || !selectedSchool) return;

        const loadingToast = toast.loading('Periode verwijderen...');

        try {
            await deleteDoc(doc(db, 'scholen', selectedSchool.id, 'rapportperioden', periodToDelete.id));
            toast.success(`'${periodToDelete.naam}' succesvol verwijderd.`);
        } catch (error) {
            toast.error(`Fout bij verwijderen: ${error.message}`);
        } finally {
            toast.dismiss(loadingToast);
            handleCloseModal();
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('nl-NL');
    };
        console.log('%c[PRE-RENDER] Finale state voordat JSX wordt gerenderd', 'font-weight: bold; color: darkblue', {
                loading: loading,
                isSuperAdmin: isSuperAdmin,
                selectedSchool: selectedSchool,
                profileExists: !!profile
            });
    if (loading) {
        console.log('[RENDER-RESULTAAT] Toon "Laden..."');
        return <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">Laden...</div>;
    }

    if (!profile) {
        console.log('[RENDER-RESULTAAT] Toon "Profiel laden..."');
        return <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">Profiel laden...</div>;
    }

    console.log('[RENDER-RESULTAAT] Toon de volledige component UI.');

// En zorg ervoor dat er altijd content wordt getoond
return (
    <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
        <Toaster position="top-center" />

        {/* ======================= */}
        {/* == SUPER-ADMIN VIEW === */}
        {/* ======================= */}
        {isSuperAdmin && (
            <>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Schoolbeheer</h2>
                        <p className="text-gray-600">Beheer alle scholen in het systeem</p>
                    </div>
                    <button
                        onClick={() => setModal({ type: 'form', data: null })}
                        className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        <span>Nieuwe School</span>
                    </button>
                </div>

                {/* Scholen lijst voor Super Admin */}
                {scholen.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
                        <ul className="divide-y divide-gray-200/70">
                            {scholen.map(school => (
                                <li key={school.id} className="group">
                                    <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-purple-50/50 transition-colors touch-manipulation">
                                        <div className="flex-1 min-w-0 mr-4 cursor-pointer" onClick={() => setSelectedSchool(school)}>
                                            <p className={`text-base sm:text-lg font-semibold truncate ${selectedSchool?.id === school.id ? 'text-purple-700' : 'text-gray-900 group-hover:text-purple-700'}`}>
                                                {school.naam}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">{school.stad}</p>
                                        </div>
                                        <MobileActionButtons
                                            onEdit={(e) => { e.stopPropagation(); setModal({ type: 'form', data: school }); }}
                                            onDelete={(e) => { e.stopPropagation(); setModal({ type: 'confirm-school', data: school }); }}
                                            editLabel={`Bewerk ${school.naam}`}
                                            deleteLabel={`Verwijder ${school.naam}`}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </>
        )}

        {/* =================== */}
        {/* == ADMIN VIEW ===== */}
        {/* =================== */}
        {!isSuperAdmin && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Rapportperioden</h2>
                    <p className="text-gray-600">Voor jouw school: <strong>{selectedSchool ? selectedSchool.naam : '...'}</strong></p>
                </div>
                
                {/* Knop naast de titel voor gewone admins */}
                {selectedSchool && (
                    <button
                        onClick={() => setModal({ type: 'period', data: null })}
                        className="flex items-center justify-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        <span>Nieuwe Periode</span>
                    </button>
                )}
            </div>
        )}

        {/* ===================================== */}
        {/* == GEDEELDE RAPPORTPERIODEN SECTIE == */}
        {/* ===================================== */}

        {/* Voor Admins: toon een laadstatus als de school nog niet geselecteerd is */}
        {!isSuperAdmin && !selectedSchool && (
            <div className="text-center p-8 border border-slate-200 rounded-xl">
                <p>Schoolgegevens laden...</p>
            </div>
        )}

        {/* Voor Super Admins: toon placeholder als er nog geen school gekozen is */}
        {isSuperAdmin && !selectedSchool && (
            <div className="text-center p-8 border border-slate-200 rounded-xl">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BuildingOffice2Icon className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Selecteer een School</h3>
                <p className="text-gray-600">Klik op een school hierboven om de rapportperioden te beheren.</p>
            </div>
        )}

        {/* Zodra een school geselecteerd is, toon de rapportperioden (werkt voor beide rollen) */}
        {selectedSchool && (
            <div className={isSuperAdmin ? "border-t border-slate-200 pt-8" : ""}>
                {/* Alleen voor super-admins een kleine subtitel */}
                {isSuperAdmin && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 space-y-4 sm:space-y-0">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Rapportperioden</h3>
                            <p className="text-gray-600">Geselecteerde school: <strong>{selectedSchool.naam}</strong></p>
                        </div>
                        <button
                            onClick={() => setModal({ type: 'period', data: null })}
                            className="flex items-center justify-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            <span>Nieuwe Periode</span>
                        </button>
                    </div>
                )}

                {/* Direct naar de perioden lijst */}
                {periodenLoading ? (
                    <div className="text-center p-6"><p>Perioden laden...</p></div>
                ) : rapportperioden.length === 0 ? (
                    <div className="text-center p-8 border border-slate-200 rounded-xl">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-800 mb-2">Geen Rapportperioden</h4>
                        <p className="text-gray-600">Maak de eerste rapportperiode aan voor deze school.</p>
                    </div>
                ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <ul className="divide-y divide-gray-200/70">
                            {rapportperioden.map(period => (
                                <li key={period.id} className="group">
                                    <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-green-50/50 transition-colors">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-green-700">{period.naam}</p>
                                                {period.is_actief && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Actief</span>}
                                            </div>
                                            <p className="text-sm text-gray-500">{formatDate(period.startdatum)} - {formatDate(period.einddatum)}</p>
                                            <p className="text-sm text-gray-500">Doel: {period.doel_xp?.toLocaleString()} XP • {period.schooljaar}</p>
                                        </div>
                                        <MobileActionButtons
                                            onEdit={(e) => { e.stopPropagation(); setModal({ type: 'period', data: period }); }}
                                            onDelete={(e) => { e.stopPropagation(); setModal({ type: 'confirm-period', data: period }); }}
                                            editLabel={`Bewerk ${period.naam}`}
                                            deleteLabel={`Verwijder ${period.naam}`}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        )}

        {/* Modals */}
        {isSuperAdmin && (
            <SchoolFormModal
                isOpen={modal.type === 'form'}
                onClose={handleCloseModal}
                schoolData={modal.data}
            />
        )}

        <RapportperiodeModal
            isOpen={modal.type === 'period'}
            onClose={handleCloseModal}
            schoolId={selectedSchool?.id}
            periodData={modal.data}
        />

        <ConfirmModal
            isOpen={modal.type === 'confirm-school'}
            onClose={handleCloseModal}
            onConfirm={handleDeleteSchool}
            title="School Verwijderen"
        >
            Weet u zeker dat u school "{modal.data?.naam}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
        </ConfirmModal>

        <ConfirmModal
            isOpen={modal.type === 'confirm-period'}
            onClose={handleCloseModal}
            onConfirm={handleDeletePeriod}
            title="Periode Verwijderen"
        >
            Weet u zeker dat u periode "{modal.data?.naam}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
        </ConfirmModal>
    </div>
);
}