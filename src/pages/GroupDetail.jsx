// src/pages/GroupDetail.jsx
// ✅ VOLLEDIG GEMIGREERD — geen directe Firestore calls meer
// Ondersteunt zowel groepen (/groep/:groepId) als klassen (/klas/:klasNaam)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    TrashIcon, PlusIcon, ArrowLeftIcon,
    UserPlusIcon, XMarkIcon
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

// =============================================
// MODAL: Sorteren
// =============================================
function SortStudentsModal({ isOpen, onClose, availableTests, onSortChange, currentSort }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Sorteren Op</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <div className="space-y-3">
                    <button onClick={() => { onSortChange('naam'); onClose(); }} className={`w-full text-left px-4 py-3 rounded-2xl transition-colors ${currentSort === 'naam' ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 border-2 border-transparent'}`}>
                        <div className="font-medium">Naam (A-Z)</div>
                        <div className="text-sm opacity-75">Alfabetisch sorteren op naam</div>
                    </button>
                    {availableTests.length > 0 && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-3">Sorteren op testresultaat:</p>
                            {availableTests.map(test => (
                                <button key={test.id} onClick={() => { onSortChange(test.id); onClose(); }} className={`w-full text-left px-4 py-3 rounded-2xl transition-colors mb-2 ${currentSort === test.id ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' : 'bg-gray-50 text-gray-800 hover:bg-gray-100 border-2 border-transparent'}`}>
                                    <div className="font-medium">{test.naam}</div>
                                    <div className="text-sm opacity-75">Ranking binnen de groep</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================
// MODAL: Leerling toevoegen (via /api/users)
// =============================================
function AddStudentModal({ group, isOpen, onClose, onStudentAdded, token, profile }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (searchTerm.length < 2 || !group?.school_id || !token) { setSearchResults([]); return; }

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'get_users', schoolId: group.school_id, filterRol: 'leerling' })
                });
                if (!response.ok) throw new Error('Fout bij zoeken');
                const data = await response.json();
                const allStudents = data.users || [];
                const searchLower = searchTerm.toLowerCase();
                const currentIds = group.leerling_ids || [];
                const filtered = allStudents
                    .filter(s => (s.decrypted_name || s.naam || '').toLowerCase().includes(searchLower))
                    .filter(s => !currentIds.includes(s.id));
                setSearchResults(filtered);
            } catch (error) {
                toast.error('Kon niet zoeken naar leerlingen.');
            }
            setLoading(false);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, group, token]);

    const handleAddStudent = async (student) => {
        try {
            await apiPost('add_leerling', {
                groepId: group.id,
                leerlingId: student.id,
                schoolId: group.school_id
            }, token);
            const naam = student.decrypted_name || student.naam || '';
            toast.success(`${naam} toegevoegd!`);
            onStudentAdded();
            setSearchTerm('');
            setSearchResults([]);
        } catch (error) {
            toast.error('Kon leerling niet toevoegen: ' + error.message);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Leerling Toevoegen</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Zoek op voor- of achternaam..." className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" autoFocus />
                <div className="mt-6 max-h-60 overflow-y-auto">
                    {loading && <p className="text-center text-gray-500 py-4">Zoeken...</p>}
                    {!loading && searchResults.length > 0 && (
                        <ul className="space-y-2">
                            {searchResults.map(student => (
                                <li key={student.id} className="flex justify-between items-center p-3 bg-gray-50/70 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-800">{student.decrypted_name || student.naam}</p>
                                        {student.klas && <p className="text-xs text-gray-500">{student.klas}</p>}
                                    </div>
                                    <button onClick={() => handleAddStudent(student)} className="text-purple-600 hover:text-purple-800 p-1 rounded-full hover:bg-purple-100">
                                        <UserPlusIcon className="h-6 w-6" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {!loading && searchTerm.length > 1 && searchResults.length === 0 && (
                        <p className="text-center text-gray-600 py-4">Geen leerlingen gevonden.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================
// HOOFD COMPONENT
// =============================================
export default function GroupDetail() {
    const { groepId, klasNaam } = useParams();  // ✅ beide params
    const isKlas = !!klasNaam;                   // read-only modus
    const { profile } = useOutletContext();

    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [showRemoveStudentModal, setShowRemoveStudentModal] = useState(false);
    const [studentToRemove, setStudentToRemove] = useState(null);
    const [scoresByLeerling, setScoresByLeerling] = useState({});
    const [loadingScores, setLoadingScores] = useState(false);
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);
    const [currentSort, setCurrentSort] = useState('naam');
    const [availableTests, setAvailableTests] = useState([]);

    // =============================================
    // ALLE DATA LADEN via API
    // =============================================
    const fetchGroupData = useCallback(async () => {
        if (!profile?._token || !profile?.school_id) return;
        setLoading(true);
        try {
            const data = isKlas
                ? await apiPost('get_klas_detail', { klasNaam, schoolId: profile.school_id }, profile._token)
                : await apiPost('get_groep_detail', { groepId, schoolId: profile.school_id }, profile._token);

            setGroup(data.groep);
            setMembers(data.members || []);
            setScoresByLeerling(data.scoresByLeerling || {});
            setAvailableTests(data.availableTests || []);
        } catch (error) {
            toast.error('Details konden niet worden geladen: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [groepId, klasNaam, isKlas, profile]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    // =============================================
    // SORTERING
    // =============================================
    const sortedMembers = useMemo(() => {
        if (!members || members.length === 0) return [];
        if (currentSort === 'naam') return [...members].sort((a, b) => a.naam.localeCompare(b.naam));

        return [...members].map(member => {
            const memberScores = scoresByLeerling[member.id] || [];
            const testScore = memberScores.find(s => s.test_id === currentSort);
            return { ...member, testScore: testScore?.totale_score ?? null, hasScore: !!testScore };
        }).sort((a, b) => {
            if (a.hasScore && !b.hasScore) return -1;
            if (!a.hasScore && b.hasScore) return 1;
            if (a.hasScore && b.hasScore) return b.testScore - a.testScore;
            return a.naam.localeCompare(b.naam);
        });
    }, [members, scoresByLeerling, currentSort]);

    const getRankingForTest = useCallback((memberId, testId) => {
        if (testId === 'naam') return null;
        const membersWithScores = members
            .map(m => {
                const score = (scoresByLeerling[m.id] || []).find(s => s.test_id === testId);
                return { id: m.id, score: score?.totale_score ?? null };
            })
            .filter(m => m.score !== null)
            .sort((a, b) => b.score - a.score);
        const idx = membersWithScores.findIndex(m => m.id === memberId);
        return idx !== -1 ? idx + 1 : null;
    }, [members, scoresByLeerling]);

    const getCurrentSortName = () => {
        if (currentSort === 'naam') return 'Naam (A-Z)';
        const test = availableTests.find(t => t.id === currentSort);
        return test ? `${test.naam} (Ranking)` : 'Naam (A-Z)';
    };

    // =============================================
    // LEERLING VERWIJDEREN via API
    // =============================================
    const handleRemoveStudentClick = (student) => {
        setStudentToRemove(student);
        setShowRemoveStudentModal(true);
    };

    const handleRemoveStudent = async () => {
        if (!studentToRemove) return;
        try {
            await apiPost('remove_leerling', {
                groepId,
                leerlingId: studentToRemove.id,
                schoolId: profile.school_id
            }, profile._token);
            toast.success(`${studentToRemove.naam} verwijderd uit de groep!`);
            setShowRemoveStudentModal(false);
            setStudentToRemove(null);
            fetchGroupData();
        } catch (error) {
            toast.error('Kon leerling niet verwijderen: ' + error.message);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="text-gray-700 font-medium">Groepsdetails laden...</span>
                </div>
            </div>
        </div>
    );

    if (!group) return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 text-center p-12 max-w-2xl mx-auto">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Groep niet gevonden</h3>
                    <p className="text-gray-600 mb-4">De opgevraagde groep bestaat niet of u heeft geen toegang.</p>
                    <Link to="/groepsbeheer" className="inline-flex items-center text-purple-600 hover:text-purple-700">
                        <ArrowLeftIcon className="h-5 w-5 mr-2" />Terug naar groepenoverzicht
                    </Link>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Toaster position="top-center" />
            <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">

                    {/* MOBILE HEADER */}
                    <div className="lg:hidden mb-8">
                        <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                                <Link to="/groepsbeheer" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-2 group">
                                    <ArrowLeftIcon className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
                                    <span className="text-sm">Terug</span>
                                </Link>
                                <h1 className="text-2xl font-bold text-gray-800 truncate">{group.naam}</h1>
                            </div>
                            {!isKlas && (
                                <button onClick={() => setIsAddStudentModalOpen(true)} className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full shadow-lg ml-4">
                                    <PlusIcon className="h-6 w-6" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DESKTOP HEADER */}
                    <div className="hidden lg:block mb-12">
                        <Link to="/groepsbeheer" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group">
                            <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />Terug naar groepenoverzicht
                        </Link>
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{group.naam}</h1>
                                {isKlas && <p className="text-sm text-gray-500 mt-1">Klas — overzicht</p>}
                            </div>
                            {!isKlas && (
                                <button onClick={() => setIsAddStudentModalOpen(true)} className="flex items-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                                    <PlusIcon className="h-6 w-6" />
                                    <span className="ml-2">Leerling Toevoegen</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* LEDENLIJST */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-xl text-gray-800">Groepsleden ({members.length})</h2>
                            {members.length > 1 && (
                                <button onClick={() => setIsSortModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium text-gray-700">
                                    <ArrowLeftIcon className="h-5 w-5 rotate-90" />
                                    <span>Bekijk ranking: {getCurrentSortName()}</span>
                                </button>
                            )}
                        </div>

                        <ul className="-my-4 divide-y divide-gray-200">
                            {sortedMembers.length > 0 ? sortedMembers.map((lid) => {
                                const afgenomenTesten = scoresByLeerling[lid.id] || [];
                                const ranking = currentSort !== 'naam' ? getRankingForTest(lid.id, currentSort) : null;

                                return (
                                    <li key={lid.id} className="flex items-center py-4 space-x-4">
                                        {currentSort !== 'naam' && (
                                            <div className="flex-shrink-0 w-8 text-center">
                                                {ranking ? (
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${ranking === 1 ? 'bg-yellow-100 text-yellow-800' : ranking === 2 ? 'bg-gray-100 text-gray-800' : ranking === 3 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{ranking}</span>
                                                ) : <span className="text-gray-400 text-xs">-</span>}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-md font-medium text-gray-900 truncate">{lid.naam}</p>
                                            {lid.klas && <p className="text-xs text-gray-400">{lid.klas}</p>}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {afgenomenTesten.length > 0 ? (
                                                    afgenomenTesten.map(score => (
                                                        <span key={score.id} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                                                            {score.test_naam} ({new Date(score.datum).toLocaleDateString('nl-BE')})
                                                        </span>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-gray-500 italic">Nog geen testen afgenomen dit schooljaar.</p>
                                                )}
                                            </div>
                                        </div>
                                        {!isKlas && (
                                            <button onClick={() => handleRemoveStudentClick(lid)} className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </li>
                                );
                            }) : (
                                <li className="text-center text-gray-500 py-12">
                                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <UserPlusIcon className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Geen Groepsleden</h3>
                                    <p className="text-gray-600">Deze groep heeft nog geen leden. Voeg leerlingen toe om te beginnen.</p>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            <AddStudentModal group={group} isOpen={isAddStudentModalOpen} onClose={() => setIsAddStudentModalOpen(false)} onStudentAdded={fetchGroupData} token={profile?._token} profile={profile} />
            <SortStudentsModal isOpen={isSortModalOpen} onClose={() => setIsSortModalOpen(false)} availableTests={availableTests} onSortChange={setCurrentSort} currentSort={currentSort} />
            <ConfirmModal isOpen={showRemoveStudentModal} onClose={() => setShowRemoveStudentModal(false)} onConfirm={handleRemoveStudent} title="Leerling Verwijderen">
                Weet u zeker dat u "{studentToRemove?.naam}" uit deze groep wilt verwijderen?
            </ConfirmModal>
        </>
    );
}