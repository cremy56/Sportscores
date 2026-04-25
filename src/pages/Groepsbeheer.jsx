// src/pages/Groepsbeheer.jsx
// ✅ VOLLEDIG GEMIGREERD — geen directe Firestore calls meer
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    PlusIcon, UsersIcon, AcademicCapIcon,
    PencilIcon, TrashIcon, XMarkIcon,
    BookOpenIcon, CheckIcon
} from '@heroicons/react/24/outline';
import ConfirmModal from '../components/ConfirmModal';

// --- API HELPER ---
async function apiPost(action, body, token) {
    const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, ...body })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API fout');
    return data;
}

// Leerlingen van een klas ophalen via /api/users
async function fetchLeerlingenVanKlas(klas, schoolId, token) {
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'get_users', schoolId, filterKlas: klas, filterRol: 'leerling' })
        });
        if (!response.ok) throw new Error('Fout bij ophalen leerlingen');
        const data = await response.json();
        return data.users || [];
    } catch (error) {
        toast.error('Kon leerlingen niet ophalen.');
        return [];
    }
}

export default function Groepsbeheer() {
    const { profile } = useOutletContext();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('groepen');
    const [groepen, setGroepen] = useState([]);
    const [loadingGroepen, setLoadingGroepen] = useState(true);
    const [mijnKlassen, setMijnKlassen] = useState([]);
    const [loadingKlassen, setLoadingKlassen] = useState(false);
    const [isFallbackKlassen, setIsFallbackKlassen] = useState(false);

    // Modal: nieuwe groep
    const [showModal, setShowModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stapModal, setStapModal] = useState(1);
    const [geselecteerdeKlas, setGeselecteerdeKlas] = useState('');
    const [leerlingenVanKlas, setLeerlingenVanKlas] = useState([]);
    const [geselecteerdeLeerlingen, setGeselecteerdeLeerlingen] = useState([]);
    const [loadingLeerlingen, setLoadingLeerlingen] = useState(false);

    // Modal: bewerken
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [editGroupName, setEditGroupName] = useState('');

    // Modal: verwijderen
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);

    // =============================================
    // GROEPEN LADEN via API
    // =============================================
    const fetchGroepen = useCallback(async () => {
        if (!profile?.school_id || !profile?._token) return;
        setLoadingGroepen(true);
        try {
            const data = await apiPost('get_groepen', { schoolId: profile.school_id }, profile._token);
            setGroepen(data.groepen || []);
        } catch (error) {
            toast.error('Kon de groepen niet laden.');
        } finally {
            setLoadingGroepen(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchGroepen();
    }, [fetchGroepen]);

    // =============================================
    // KLASSEN LADEN via API
    // =============================================
    useEffect(() => {
        if (activeTab !== 'klassen' || !profile?.school_id || !profile?._token) return;

        const laadKlassen = async () => {
            setLoadingKlassen(true);
            try {
                const data = await apiPost('get_mijn_klassen', { schoolId: profile.school_id }, profile._token);
                setMijnKlassen(data.klassen || []);
                setIsFallbackKlassen(data.isFallback || false);
            } catch (error) {
                toast.error('Kon klassen niet laden.');
            } finally {
                setLoadingKlassen(false);
            }
        };

        laadKlassen();
    }, [activeTab, profile]);

    // =============================================
    // HANDLERS: Nieuwe groep aanmaken
    // =============================================
    const handleKlasSelecteren = (klas) => {
        navigate(`/klas/${klas}`);
    };

    const toggleLeerling = (leerling) => {
        setGeselecteerdeLeerlingen(prev => {
            const bestaat = prev.find(l => l.id === leerling.id);
            if (bestaat) return prev.filter(l => l.id !== leerling.id);
            return [...prev, { id: leerling.id, naam: leerling.decrypted_name || leerling.naam, klas: leerling.klas }];
        });
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) { toast.error('Groepsnaam mag niet leeg zijn.'); return; }
        if (geselecteerdeLeerlingen.length === 0) { toast.error('Selecteer minstens 1 leerling.'); return; }

        setIsSubmitting(true);
        try {
            const data = await apiPost('create_groep', {
                naam: newGroupName.trim(),
                leerling_ids: geselecteerdeLeerlingen.map(l => l.id),
                schoolId: profile.school_id
            }, profile._token);

            // Voeg toe aan lokale state
            setGroepen(prev => [...prev, {
                id: data.id,
                naam: newGroupName.trim(),
                leerling_ids: geselecteerdeLeerlingen.map(l => l.id),
                leerkracht_id: profile.uid,
                school_id: profile.school_id
            }]);

            toast.success(`Groep "${newGroupName}" aangemaakt!`);
            resetModal();
        } catch (error) {
            toast.error('Kon de groep niet aanmaken: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetModal = () => {
        setShowModal(false);
        setNewGroupName('');
        setStapModal(1);
        setGeselecteerdeKlas('');
        setLeerlingenVanKlas([]);
        setGeselecteerdeLeerlingen([]);
    };

    // =============================================
    // HANDLERS: Bewerken & Verwijderen
    // =============================================
    const handleEditGroup = (group) => {
        setEditingGroup(group);
        setEditGroupName(group.naam);
        setShowEditModal(true);
    };

    const handleUpdateGroup = async (e) => {
        e.preventDefault();
        if (!editGroupName.trim()) { toast.error('Groepsnaam mag niet leeg zijn.'); return; }
        setIsSubmitting(true);
        try {
            await apiPost('update_groep', {
                groepId: editingGroup.id,
                naam: editGroupName.trim(),
                schoolId: profile.school_id
            }, profile._token);

            setGroepen(prev => prev.map(g => g.id === editingGroup.id ? { ...g, naam: editGroupName.trim() } : g));
            toast.success('Groepsnaam bijgewerkt!');
            setShowEditModal(false);
        } catch (error) {
            toast.error('Kon naam niet wijzigen.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;
        try {
            await apiPost('delete_groep', {
                groepId: groupToDelete.id,
                schoolId: profile.school_id
            }, profile._token);

            setGroepen(prev => prev.filter(g => g.id !== groupToDelete.id));
            toast.success(`Groep "${groupToDelete.naam}" verwijderd.`);
            setShowDeleteModal(false);
            setGroupToDelete(null);
        } catch (error) {
            toast.error('Kon de groep niet verwijderen.');
        }
    };

    return (
        <>
            <Toaster position="top-center" />
            <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">

                    {/* HEADER */}
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Groepsbeheer</h1>
                        {activeTab === 'groepen' && (
                            <button onClick={() => { setShowModal(true); setStapModal(1); }} className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-2.5 rounded-full shadow-lg hover:from-purple-700 hover:to-blue-700 transition-all">
                                <PlusIcon className="h-5 w-5" />
                                <span className="hidden sm:inline">Nieuwe Groep</span>
                            </button>
                        )}
                    </div>

                    {/* TABS */}
                    <div className="flex space-x-2 mb-8 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 w-fit">
                        <button onClick={() => setActiveTab('groepen')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'groepen' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                            <UsersIcon className="h-4 w-4" />
                            <span>Mijn Groepen</span>
                            {groepen.length > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'groepen' ? 'bg-white/20' : 'bg-gray-100'}`}>{groepen.length}</span>}
                        </button>
                        <button onClick={() => setActiveTab('klassen')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'klassen' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                            <BookOpenIcon className="h-4 w-4" />
                            <span>Mijn Klassen</span>
                        </button>
                    </div>

                    {/* TAB: MIJN GROEPEN */}
                    {activeTab === 'groepen' && (
                        <>
                            {loadingGroepen ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                </div>
                            ) : groepen.length === 0 ? (
                                <div className="text-center py-20">
                                    <UsersIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-500 mb-2">Nog geen groepen</h3>
                                    <p className="text-gray-400 mb-6">Maak je eerste groep aan om leerlingen te beheren.</p>
                                    <button onClick={() => { setShowModal(true); setStapModal(1); }} className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-full shadow-lg">
                                        <PlusIcon className="h-5 w-5" />
                                        <span>Eerste Groep Aanmaken</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groepen.map((groep) => (
                                        <div key={groep.id} className="relative group">
                                            <Link to={`/groep/${groep.id}`}>
                                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all hover:-translate-y-1">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors line-clamp-2 flex-1">{groep.naam}</h2>
                                                        <div className="bg-purple-100 p-3 rounded-2xl ml-4"><AcademicCapIcon className="h-6 w-6 text-purple-600" /></div>
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-gray-600">
                                                        <UsersIcon className="h-5 w-5" />
                                                        <span className="text-sm font-medium">{(groep.leerling_ids || []).length} leerlingen</span>
                                                    </div>
                                                </div>
                                            </Link>
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                                <button onClick={(e) => { e.preventDefault(); handleEditGroup(groep); }} className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-purple-600 rounded-full shadow-md"><PencilIcon className="h-4 w-4" /></button>
                                                <button onClick={(e) => { e.preventDefault(); setGroupToDelete(groep); setShowDeleteModal(true); }} className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-600 rounded-full shadow-md"><TrashIcon className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* TAB: MIJN KLASSEN */}
                    {activeTab === 'klassen' && (
                        <>
                            {loadingKlassen ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                </div>
                            ) : mijnKlassen.length === 0 ? (
                                <div className="text-center py-20">
                                    <BookOpenIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-500 mb-2">Geen klassen gevonden</h3>
                                    <p className="text-gray-400 text-sm">Klassen worden automatisch toegewezen door de admin of via Smartschool synchronisatie.</p>
                                </div>
                            ) : (
                                <>
                                    {isFallbackKlassen && (
                                        <p className="text-sm text-gray-500 mb-6">
                                            ⚠️ <span className="font-medium">Tijdelijk:</span> Alle klassen van je school worden getoond.
                                        </p>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {mijnKlassen.map((klas) => (
                                            <div key={klas} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer" onClick={() => handleKlasSelecteren(klas)}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-xl font-bold text-gray-900">{klas}</h2>
                                                    <div className="bg-blue-100 p-3 rounded-2xl"><BookOpenIcon className="h-6 w-6 text-blue-600" /></div>
                                                </div>
                                                <p className="text-sm text-gray-500">Klik om leerlingen te bekijken</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* MODAL: Nieuwe Groep Aanmaken */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {stapModal === 1 && 'Groepsnaam'}
                                {stapModal === 2 && 'Kies een klas'}
                                {stapModal === 3 && 'Selecteer leerlingen'}
                            </h2>
                            <div className="flex items-center space-x-1">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className={`h-2 w-8 rounded-full transition-all ${s <= stapModal ? 'bg-purple-600' : 'bg-gray-200'}`} />
                                ))}
                            </div>
                        </div>

                        {stapModal === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Naam van de groep</label>
                                    <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && newGroupName.trim() && setStapModal(2)} className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" placeholder="bv. Basketbalgroep 3de graad" autoFocus />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button onClick={resetModal} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold">Annuleren</button>
                                    <button onClick={() => setStapModal(2)} disabled={!newGroupName.trim()} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-semibold disabled:opacity-50">Volgende →</button>
                                </div>
                            </div>
                        )}

                        {stapModal === 2 && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">Kies de klas waaruit je leerlingen wil selecteren.</p>
                                {mijnKlassen.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">Geen klassen beschikbaar.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {mijnKlassen.map((klas) => (
                                            <button key={klas} onClick={() => handleKlasSelecteren(klas)} className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-2xl font-semibold text-gray-800 transition-all">
                                                <span>{klas}</span>
                                                <BookOpenIcon className="h-4 w-4 text-gray-400" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-between pt-4">
                                    <button onClick={() => setStapModal(1)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold">← Terug</button>
                                </div>
                            </div>
                        )}

                        {stapModal === 3 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-500">Klas: <span className="font-semibold text-purple-700">{geselecteerdeKlas}</span></p>
                                    <button onClick={() => setGeselecteerdeLeerlingen(geselecteerdeLeerlingen.length === leerlingenVanKlas.length ? [] : leerlingenVanKlas.map(l => ({ id: l.id, naam: l.decrypted_name || l.naam, klas: l.klas })))} className="text-xs text-purple-600 font-semibold hover:underline">
                                        {geselecteerdeLeerlingen.length === leerlingenVanKlas.length ? 'Deselecteer alles' : 'Selecteer alles'}
                                    </button>
                                </div>
                                {loadingLeerlingen ? (
                                    <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {leerlingenVanKlas.map((leerling) => {
                                            const isSelected = geselecteerdeLeerlingen.some(l => l.id === leerling.id);
                                            return (
                                                <button key={leerling.id} onClick={() => toggleLeerling(leerling)} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${isSelected ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-slate-50 border-slate-200 text-gray-800 hover:bg-purple-50/50'}`}>
                                                    <span className="font-medium">{leerling.decrypted_name || leerling.naam || '[Naam]'}</span>
                                                    {isSelected && <CheckIcon className="h-5 w-5 text-purple-600" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                <p className="text-xs text-gray-400">{geselecteerdeLeerlingen.length} van {leerlingenVanKlas.length} geselecteerd</p>
                                <div className="flex justify-between pt-4">
                                    <button onClick={() => setStapModal(2)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold">← Terug</button>
                                    <button onClick={handleCreateGroup} disabled={isSubmitting || geselecteerdeLeerlingen.length === 0} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-semibold disabled:opacity-50 flex items-center space-x-2">
                                        {isSubmitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Aanmaken...</span></> : <span>Groep Aanmaken ✓</span>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: Bewerken */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Groep Wijzigen</h2>
                            <button onClick={() => setShowEditModal(false)}><XMarkIcon className="h-6 w-6 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleUpdateGroup} className="space-y-6">
                            <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" autoFocus />
                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-2xl font-semibold">Annuleren</button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-semibold disabled:opacity-50">Opslaan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Verwijderen */}
            <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={confirmDeleteGroup} title="Groep Verwijderen">
                Weet u zeker dat u de groep "{groupToDelete?.naam}" wilt verwijderen? Deze actie kan niet ongedaan gemaakt worden.
            </ConfirmModal>
        </>
    );
}