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
    updateDoc, 
    Timestamp 
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, TrashIcon, PencilIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { BuildingOffice2Icon } from '@heroicons/react/24/solid';
import SchoolFormModal from '../components/SchoolFormModal';
import ConfirmModal from '../components/ConfirmModal';

// Mobile-vriendelijke Action Buttons Component
const MobileActionButtons = ({ onEdit, onDelete, editLabel = "Bewerk", deleteLabel = "Verwijder" }) => (
    <div className="flex items-center gap-2">
        <button
            onClick={onEdit}
            className="p-3 sm:p-2 text-gray-400 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors touch-manipulation"
            aria-label={editLabel}
        >
            <PencilIcon className="h-5 w-5" />
        </button>
        <button
            onClick={onDelete}
            className="p-3 sm:p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors touch-manipulation"
            aria-label={deleteLabel}
        >
            <TrashIcon className="h-5 w-5" />
        </button>
    </div>
);

// Rapportperiode Form Modal
const RapportperiodeModal = ({ isOpen, onClose, schoolId, periodData = null }) => {
    const [formData, setFormData] = useState({
        naam: '',
        startdatum: '',
        einddatum: '',
        schooljaar: '',
        doel_xp: 20000,
        is_actief: false
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (periodData) {
            setFormData({
                naam: periodData.naam || '',
                startdatum: periodData.startdatum?.toDate().toISOString().split('T')[0] || '',
                einddatum: periodData.einddatum?.toDate().toISOString().split('T')[0] || '',
                schooljaar: periodData.schooljaar || '',
                doel_xp: periodData.doel_xp || 20000,
                is_actief: periodData.is_actief || false
            });
        } else {
            setFormData({
                naam: '',
                startdatum: '',
                einddatum: '',
                schooljaar: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
                doel_xp: 20000,
                is_actief: false
            });
        }
    }, [periodData, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!schoolId) return;

        setSaving(true);
        const loadingToast = toast.loading(periodData ? 'Periode bijwerken...' : 'Periode aanmaken...');

        try {
            const docId = periodData?.id || `periode_${Date.now()}`;
            const periodRef = doc(db, 'scholen', schoolId, 'rapportperioden', docId);
            
            const data = {
                naam: formData.naam,
                startdatum: Timestamp.fromDate(new Date(formData.startdatum)),
                einddatum: Timestamp.fromDate(new Date(formData.einddatum)),
                schooljaar: formData.schooljaar,
                doel_xp: parseInt(formData.doel_xp),
                is_actief: formData.is_actief,
                updated_at: Timestamp.now()
            };

            if (!periodData) {
                data.created_at = Timestamp.now();
            }

            await setDoc(periodRef, data, { merge: true });
            
            toast.success(periodData ? 'Periode succesvol bijgewerkt!' : 'Periode succesvol aangemaakt!');
            onClose();
        } catch (error) {
            console.error('Error saving period:', error);
            toast.error('Fout bij opslaan: ' + error.message);
        } finally {
            setSaving(false);
            toast.dismiss(loadingToast);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {periodData ? 'Periode Bewerken' : 'Nieuwe Rapportperiode'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Naam
                        </label>
                        <input
                            type="text"
                            value={formData.naam}
                            onChange={(e) => setFormData(prev => ({ ...prev, naam: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="bijv. 1e Trimester 2024-2025"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Startdatum
                            </label>
                            <input
                                type="date"
                                value={formData.startdatum}
                                onChange={(e) => setFormData(prev => ({ ...prev, startdatum: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Einddatum
                            </label>
                            <input
                                type="date"
                                value={formData.einddatum}
                                onChange={(e) => setFormData(prev => ({ ...prev, einddatum: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Schooljaar
                        </label>
                        <input
                            type="text"
                            value={formData.schooljaar}
                            onChange={(e) => setFormData(prev => ({ ...prev, schooljaar: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="2024-2025"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Doel XP
                        </label>
                        <input
                            type="number"
                            value={formData.doel_xp}
                            onChange={(e) => setFormData(prev => ({ ...prev, doel_xp: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            min="1000"
                            max="100000"
                            step="1000"
                            required
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="is_actief"
                            checked={formData.is_actief}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_actief: e.target.checked }))}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_actief" className="ml-2 block text-sm text-gray-700">
                            Actieve periode (telt voor leerling rapportscores)
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            disabled={saving}
                        >
                            Annuleren
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Opslaan...' : 'Opslaan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function SchoolBeheer() {
    const { profile } = useOutletContext();
    const [scholen, setScholen] = useState([]);
    const [rapportperioden, setRapportperioden] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodenLoading, setPeriodenLoading] = useState(false);
    const [modal, setModal] = useState({ type: null, data: null });

    // Bepaal welke school de admin kan beheren
    const userSchoolId = profile?.school_id;
    const isSuperAdmin = profile?.rol === 'super-administrator';

    useEffect(() => {
        const scholenRef = collection(db, 'scholen');
        const q = query(scholenRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const scholenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            scholenData.sort((a, b) => a.naam.localeCompare(b.naam));
            setScholen(scholenData);
            
            // Voor gewone administrators, selecteer automatisch hun school
            if (!isSuperAdmin && userSchoolId) {
                const userSchool = scholenData.find(s => s.id === userSchoolId);
                if (userSchool) {
                    setSelectedSchool(userSchool);
                }
            }
            
            setLoading(false);
        }, (error) => {
            console.error("Fout bij ophalen scholen:", error);
            toast.error("Kon de scholen niet laden.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isSuperAdmin, userSchoolId]);

    // Laad rapportperioden voor geselecteerde school
    useEffect(() => {
        if (!selectedSchool) {
            setRapportperioden([]);
            return;
        }

        setPeriodenLoading(true);
        const periodenRef = collection(db, 'scholen', selectedSchool.id, 'rapportperioden');
        const q = query(periodenRef, orderBy('startdatum', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const periodenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRapportperioden(periodenData);
            setPeriodenLoading(false);
        }, (error) => {
            console.error("Fout bij ophalen rapportperioden:", error);
            toast.error("Kon rapportperioden niet laden.");
            setPeriodenLoading(false);
        });

        return () => unsubscribe();
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

    if (loading) {
        return (
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="text-center p-8 sm:p-12">Laden...</div>
            </div>
        );
    }
// Na de loading check, voeg deze check toe:
if (!profile) {
    return (
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-center p-8 sm:p-12">Profiel laden...</div>
        </div>
    );
}

// En zorg ervoor dat er altijd content wordt getoond
return (
    <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
        <Toaster position="top-center" />
        
        {/* Algemene header - ALTIJD zichtbaar */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                        {isSuperAdmin ? 'Schoolbeheer' : 'Rapportperioden Beheer'}
                    </h2>
                    <p className="text-gray-600">
                        {isSuperAdmin ? 'Beheer alle scholen in het systeem' : 'Beheer rapportperioden voor jouw school'}
                    </p>
                </div>
                
                {/* Button alleen voor super-admins */}
                {isSuperAdmin && (
                    <button
                        onClick={() => setModal({ type: 'form', data: null })}
                        className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        <span>Nieuwe School</span>
                    </button>
                )}
            </div>

                {scholen.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
                        <ul className="divide-y divide-gray-200/70">
                            {scholen.map(school => (
                                <li key={school.id} className="group">
                                    <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-purple-50/50 transition-colors touch-manipulation">
                                        <div 
                                            className="flex-1 min-w-0 mr-4 cursor-pointer"
                                            onClick={() => setSelectedSchool(school)}
                                        >
                                            <p className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-purple-700 truncate">
                                                {school.naam}
                                                {selectedSchool?.id === school.id && (
                                                    <span className="ml-2 text-sm text-purple-600">(geselecteerd)</span>
                                                )}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">{school.stad}</p>
                                        </div>
                                        <MobileActionButtons
                                            onEdit={(e) => {
                                                e.stopPropagation();
                                                setModal({ type: 'form', data: school });
                                            }}
                                            onDelete={(e) => {
                                                e.stopPropagation();
                                                setModal({ type: 'confirm-school', data: school });
                                            }}
                                            editLabel={`Bewerk ${school.naam}`}
                                            deleteLabel={`Verwijder ${school.naam}`}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

       {/* Rapportperioden sectie - voor beide rollen */}
{selectedSchool ? (
    <div className={isSuperAdmin ? "border-t border-slate-200 pt-8" : ""}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 space-y-4 sm:space-y-0">
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Rapportperioden - {selectedSchool.naam}
                </h3>
                <p className="text-gray-600">Beheer de perioden voor leerling evaluatie</p>
            </div>
            <button
                onClick={() => setModal({ type: 'period', data: null })}
                className="flex items-center justify-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 sm:py-2 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 touch-manipulation w-full sm:w-auto"
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                <span>Nieuwe Periode</span>
            </button>
        </div>
        
        {periodenLoading ? (
            <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-500">Perioden laden...</p>
            </div>
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
                                        <p className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-green-700">
                                            {period.naam}
                                        </p>
                                        {period.is_actief && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Actief
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {formatDate(period.startdatum)} - {formatDate(period.einddatum)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Doel: {period.doel_xp?.toLocaleString()} XP • {period.schooljaar}
                                    </p>
                                </div>
                                <MobileActionButtons
                                    onEdit={(e) => {
                                        e.stopPropagation();
                                        setModal({ type: 'period', data: period });
                                    }}
                                    onDelete={(e) => {
                                        e.stopPropagation();
                                        setModal({ type: 'confirm-period', data: period });
                                    }}
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
) : (
    <div className="text-center p-8 border border-slate-200 rounded-xl">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-6 h-6 text-gray-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">
            {isSuperAdmin ? 'Selecteer een School' : 'Rapportperioden Beheer'}
        </h3>
        <p className="text-gray-600">
            {isSuperAdmin ? 'Klik op een school hierboven om rapportperioden te beheren.' : 'Geen school gevonden voor jouw account.'}
        </p>
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