// src/pages/TestafnameDetail.jsx
// ✅ VOLLEDIG GEMIGREERD — geen directe Firestore calls meer
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import toast from 'react-hot-toast';
import { 
    TrashIcon, 
    PencilSquareIcon, 
    CheckIcon, 
    XMarkIcon, 
    ArrowLeftIcon,
    ChartBarIcon,
    UserGroupIcon,
    CalendarIcon,
    DocumentArrowDownIcon,
    ClipboardDocumentListIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import { parseTimeInputToSeconds, formatScoreWithUnit, getPointColorClass } from '../utils/formatters.js';
import ConfirmModal from '../components/ConfirmModal';
import { useOutletContext } from 'react-router-dom';

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

function validateScore(score, eenheid) {
    if (!score || score.toString().trim() === '') return { valid: true, message: '' };
    const numericScore = parseFloat(score.toString().replace(',', '.'));
    if (isNaN(numericScore)) return { valid: false, message: 'Ongeldige score' };
    if (numericScore < 0) return { valid: false, message: 'Score kan niet negatief zijn' };
    if (eenheid === 'seconden' && numericScore > 3600) return { valid: false, message: 'Score te hoog (max 1 uur)' };
    return { valid: true, message: '' };
}

function StatCard({ icon: Icon, title, value, subtitle, color = "gray" }) {
    const colorClasses = {
        purple: "from-purple-500 to-purple-600",
        blue: "from-blue-500 to-blue-600", 
        green: "from-green-500 to-green-600",
        red: "from-red-500 to-red-600",
        gray: "from-gray-500 to-gray-600"
    };
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${colorClasses[color]} text-white mr-3`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm font-medium text-gray-700">{title}</p>
                    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                </div>
            </div>
        </div>
    );
}

function ScoreDistributionChart({ leerlingen, maxPunten = 20 }) {
    const distribution = useMemo(() => {
        const punten = leerlingen.filter(l => l.punt !== null).map(l => l.punt);
        if (punten.length === 0) return null;
        const uitstekend = punten.filter(p => p >= 18).length;
        const goed = punten.filter(p => p >= 14 && p < 18).length;
        const voldoende = punten.filter(p => p >= 10 && p < 14).length;
        const onvoldoende = punten.filter(p => p < 10).length;
        const total = punten.length;
        const average = (punten.reduce((sum, p) => sum + p, 0) / total).toFixed(1);
        return {
            uitstekend: { count: uitstekend, percentage: Math.round((uitstekend / total) * 100) },
            goed: { count: goed, percentage: Math.round((goed / total) * 100) },
            voldoende: { count: voldoende, percentage: Math.round((voldoende / total) * 100) },
            onvoldoende: { count: onvoldoende, percentage: Math.round((onvoldoende / total) * 100) },
            average, total, maxPunten
        };
    }, [leerlingen, maxPunten]);

    if (!distribution) return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />Score Verdeling
            </h3>
            <p className="text-gray-500 text-center py-8">Geen scores beschikbaar voor analyse</p>
        </div>
    );

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />Score Verdeling
            </h3>
            <div className="space-y-3 mb-6">
                {[
                    { label: `Uitstekend (18-${distribution.maxPunten})`, data: distribution.uitstekend, color: 'bg-green-500', textColor: 'text-green-700' },
                    { label: 'Goed (14-17)', data: distribution.goed, color: 'bg-blue-500', textColor: 'text-blue-700' },
                    { label: 'Voldoende (10-13)', data: distribution.voldoende, color: 'bg-yellow-500', textColor: 'text-yellow-700' },
                    { label: 'Onvoldoende (<10)', data: distribution.onvoldoende, color: 'bg-red-500', textColor: 'text-red-700' },
                ].map(({ label, data, color, textColor }) => (
                    <div key={label} className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${textColor}`}>{label}</span>
                        <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                <div className={`${color} h-2 rounded-full`} style={{ width: `${data.percentage}%` }}></div>
                            </div>
                            <span className="text-sm text-gray-600 w-12">{data.count}/{distribution.total}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="border-t pt-4">
                <p className="text-center">
                    <span className="text-sm text-gray-600">Gemiddelde: </span>
                    <span className="text-lg font-bold text-gray-900">{distribution.average}</span>
                    <span className="text-sm text-gray-600"> / {distribution.maxPunten} punten</span>
                </p>
            </div>
        </div>
    );
}

export default function TestafnameDetail() {
    const { groepId, testId, datum } = useParams();
    const { profile } = useOutletContext();
    const navigate = useNavigate();
    const [details, setDetails] = useState({ 
        groep_naam: '', test_naam: '', test_volledig: null,
        leerlingen: [], eenheid: '', max_punten: 20
    });
    const [loading, setLoading] = useState(true);
    const [editingScore, setEditingScore] = useState({ id: null, score: '', validation: null });
    const [editingDate, setEditingDate] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [updating, setUpdating] = useState(false);
    const [swipeState, setSwipeState] = useState({ id: null, translateX: 0, isDeleting: false });
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, scoreId: null, leerlingNaam: '' });
    const [currentDate, setCurrentDate] = useState(datum);

    const stats = useMemo(() => {
        const leerlingenMetScore = details.leerlingen.filter(l => l.score !== null);
        const totaalLeerlingen = details.leerlingen.length;
        return {
            totaal: totaalLeerlingen,
            compleet: leerlingenMetScore.length,
            percentage: totaalLeerlingen > 0 ? Math.round((leerlingenMetScore.length / totaalLeerlingen) * 100) : 0
        };
    }, [details.leerlingen]);

    // =============================================
    // FETCH DETAILS via API
    // ✅ GEMIGREERD: geen directe Firestore calls
    // =============================================
    const fetchDetails = useCallback(async () => {
        if (!groepId || !testId || !datum || !profile?._token || !profile?.school_id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await apiPost('get_testafname_detail', {
                groepId, testId, datum,
                schoolId: profile.school_id
            }, profile._token);

            setDetails({
                groep_naam: data.groep_naam,
                test_naam: data.test_naam,
                eenheid: data.eenheid,
                max_punten: data.max_punten,
                test_volledig: data.test_volledig,
                leerlingen: data.leerlingen,
                isOrphanedGroup: data.isOrphanedGroup
            });
        } catch (error) {
            console.error("Error fetching details:", error);
            toast.error("Details konden niet worden geladen: " + error.message);
        } finally {
            setLoading(false);
        }
    }, [groepId, testId, datum, profile]);

    useEffect(() => {
        if (groepId && testId && datum && profile?._token) {
            fetchDetails();
            setNewDate(datum.split('T')[0]);
        }
    }, [groepId, testId, datum, profile, fetchDetails]);

    useEffect(() => {
        const root = document.getElementById('root');
        if (root) root.classList.add('bg-gradient-to-br', 'from-slate-50', 'via-purple-50', 'to-blue-50');
        return () => { if (root) root.classList.remove('bg-gradient-to-br', 'from-slate-50', 'via-purple-50', 'to-blue-50'); };
    }, []);

    const handleEditClick = (leerling) => {
        const initialValue = leerling.score !== null ? leerling.score.toString().replace('.', ',') : '';
        setEditingScore({ id: leerling.score_id, score: initialValue, validation: { valid: true } });
    };

    const handleScoreChange = (value) => {
        const isTimeTest = details.test_volledig?.eenheid?.toLowerCase().includes('sec') || details.test_volledig?.eenheid?.toLowerCase().includes('min');
        let isValid = true;
        if (isTimeTest) {
            const parsed = parseTimeInputToSeconds(value);
            if (value.trim() !== '' && isNaN(parsed)) {
                isValid = false;
                toast.error("Ongeldige notatie. Gebruik bv. 1:15 of 12.5", { id: 'time-validation-toast' });
            }
        }
        setEditingScore(prev => ({ ...prev, score: value, validation: { valid: isValid } }));
    };

    // =============================================
    // UPDATE SCORE via API
    // ✅ GEMIGREERD: server herberekent punt via klas
    // =============================================
    const handleUpdateScore = async () => {
        if (!editingScore.id || !editingScore.validation?.valid) return;

        const isTimeTest = details.test_volledig?.eenheid?.toLowerCase().includes('sec') || details.test_volledig?.eenheid?.toLowerCase().includes('min');
        let scoreValue = isTimeTest
            ? parseTimeInputToSeconds(editingScore.score)
            : parseFloat(String(editingScore.score).replace(',', '.'));

        if (scoreValue === null || isNaN(scoreValue)) { toast.error("Voer een geldige score in."); return; }

        setUpdating(true);
        try {
            const leerling = details.leerlingen.find(l => l.score_id === editingScore.id);
            const data = await apiPost('update_score', {
                scoreId: editingScore.id,
                score: scoreValue,
                testId,
                klas: leerling?.klas || null,
                geslacht: leerling?.geslacht || null,
                schoolId: profile.school_id
            }, profile._token);

            toast.success("Score bijgewerkt!");
            setDetails(prev => ({
                ...prev,
                leerlingen: prev.leerlingen.map(l =>
                    l.score_id === editingScore.id ? { ...l, score: scoreValue, punt: data.newPunt } : l
                )
            }));
            setEditingScore({ id: null, score: '', validation: null });
        } catch (error) {
            toast.error(`Fout bij bijwerken: ${error.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteScore = (scoreId, leerlingNaam) => {
        setDeleteModalState({ isOpen: true, scoreId, leerlingNaam });
    };

    // =============================================
    // DELETE SCORE via API
    // =============================================
    const confirmDeleteScore = async () => {
        const { scoreId } = deleteModalState;
        if (!scoreId) return;
        const loadingToast = toast.loading('Score verwijderen...');
        try {
            await apiPost('delete_score', { scoreId, schoolId: profile.school_id }, profile._token);
            toast.success("Score succesvol verwijderd!");
            setDetails(prev => ({
                ...prev,
                leerlingen: prev.leerlingen.map(l =>
                    l.score_id === scoreId ? { ...l, score: null, punt: null, score_id: null } : l
                )
            }));
        } catch (error) {
            toast.error("Fout bij verwijderen van de score.");
        } finally {
            toast.dismiss(loadingToast);
            setDeleteModalState({ isOpen: false, scoreId: null, leerlingNaam: '' });
        }
    };

    // =============================================
    // UPDATE DATUM via API
    // =============================================
    const handleUpdateDate = async () => {
        if (!newDate || newDate === currentDate.split('T')[0]) { setEditingDate(false); return; }
        setUpdating(true);
        const loadingToast = toast.loading('Datum bijwerken...');
        try {
            const scoreIds = details.leerlingen.filter(l => l.score_id).map(l => l.score_id);
            if (scoreIds.length === 0) { toast.error('Geen scores gevonden om bij te werken.'); return; }

            await apiPost('update_score_date', {
                scoreIds, newDate, schoolId: profile.school_id
            }, profile._token);

            setCurrentDate(newDate);
            window.history.replaceState(null, '', `/testafname/${groepId}/${testId}/${newDate}`);
            toast.success(`${scoreIds.length} score(s) bijgewerkt naar nieuwe datum!`);
        } catch (error) {
            toast.error('Fout bij bijwerken van de datum: ' + error.message);
            setNewDate(currentDate.split('T')[0]);
        } finally {
            toast.dismiss(loadingToast);
            setUpdating(false);
            setEditingDate(false);
        }
    };

    // =============================================
    // DELETE TESTAFNAME via API
    // =============================================
    const handleDeleteTestafname = async () => {
        const loadingToast = toast.loading('Testafname verwijderen...');
        try {
            await apiPost('delete_testafname', {
                groepId, testId, datum, schoolId: profile.school_id
            }, profile._token);
            toast.success("Testafname succesvol verwijderd!");
            navigate('/sporttesten');
        } catch (error) {
            toast.error("Fout bij verwijderen van de testafname.");
        } finally {
            toast.dismiss(loadingToast);
            setShowDeleteConfirm(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Naam', 'Score', 'Punten'];
        const rows = details.leerlingen.map(leerling => [
            leerling.naam,
            leerling.score !== null ? formatScoreWithUnit(leerling.score, details.eenheid) : '',
            leerling.punt !== null ? leerling.punt : ''
        ]);
        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `${details.test_naam}_${details.groep_naam}_${datum.split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const cancelEdit = () => setEditingScore({ id: null, score: '', validation: null });

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="bg-white p-8 rounded-2xl shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="text-gray-700 font-medium">Details laden...</span>
                </div>
            </div>
        </div>
    );

    return (
        <div>
            <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-2 pb-16 space-y-6">
                <Link to="/sporttesten" className="inline-flex items-center text-sm text-gray-600 hover:text-purple-700 font-medium transition-colors">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Terug naar overzicht
                </Link>
                    
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{details.test_naam}</h1>
                            <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-gray-600 mt-2">
                                <div className="flex items-center">
                                    <UserGroupIcon className="h-4 w-4 mr-1.5" />
                                    <span className="text-sm">{details.groep_naam}</span>
                                </div>
                                <div className="flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-1.5" />
                                    {editingDate ? (
                                        <div className="flex items-center gap-2">
                                            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-sm" />
                                            <button onClick={handleUpdateDate} className="text-green-600 hover:text-green-800"><CheckIcon className="h-4 w-4" /></button>
                                            <button onClick={() => { setEditingDate(false); setNewDate(datum.split('T')[0]); }} className="text-red-600 hover:text-red-800"><XMarkIcon className="h-4 w-4" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{new Date(currentDate).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                            <button onClick={() => setEditingDate(true)} className="text-blue-600 hover:text-blue-800" title="Datum wijzigen"><PencilSquareIcon className="h-4 w-4" /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Score Verdeling */}
                        <div className="hidden lg:block lg:col-span-1">
                            <ScoreDistributionChart leerlingen={details.leerlingen} maxPunten={details.max_punten} />
                        </div>

                        {/* Scores Lijst */}
                        <div className="col-span-1 lg:col-span-2">
                            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                                <div className="p-6 border-b border-gray-200/70">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-semibold text-gray-900">Individuele Scores</h2>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-600">Gemiddelde</div>
                                            <div className="text-lg font-bold text-purple-700">
                                                {details.leerlingen.filter(l => l.punt !== null).length > 0 
                                                    ? (details.leerlingen.filter(l => l.punt !== null).reduce((sum, l) => sum + l.punt, 0) / details.leerlingen.filter(l => l.punt !== null).length).toFixed(1)
                                                    : '-'
                                                } / {details.max_punten}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="max-h-96 overflow-y-auto">
                                    <ul className="divide-y divide-gray-200/70">
                                        {details.leerlingen?.map(lid => (
                                            <li 
                                                key={lid.id} 
                                                className="relative overflow-hidden hover:bg-gray-50/50 transition-colors px-4 py-3 lg:px-0 lg:py-0"
                                                style={{
                                                    transform: swipeState.id === lid.id ? `translateX(${swipeState.translateX}px)` : 'translateX(0)',
                                                    transition: swipeState.id === lid.id && swipeState.translateX === 0 ? 'transform 0.3s ease' : 'none'
                                                }}
                                                onTouchStart={(e) => {
                                                    if (editingScore.id === lid.score_id) return;
                                                    const touch = e.touches[0];
                                                    const startX = touch.clientX;
                                                    const startTime = Date.now();
                                                    const timer = setTimeout(() => {
                                                        navigator.vibrate && navigator.vibrate(50);
                                                        handleEditClick(lid);
                                                    }, 500);
                                                    setLongPressTimer(timer);
                                                    const handleTouchMove = (e) => {
                                                        const deltaX = e.touches[0].clientX - startX;
                                                        if (Math.abs(deltaX) > 10) clearTimeout(timer);
                                                        if (deltaX < -20 && Date.now() - startTime > 100) {
                                                            e.preventDefault();
                                                            setSwipeState({ id: lid.id, translateX: Math.max(deltaX, -100), isDeleting: false });
                                                        }
                                                    };
                                                    const handleTouchEnd = () => {
                                                        clearTimeout(timer);
                                                        setLongPressTimer(null);
                                                        if (swipeState.id === lid.id) {
                                                            if (swipeState.translateX < -50 && lid.score !== null) handleDeleteScore(lid.score_id, lid.naam);
                                                            setSwipeState({ id: null, translateX: 0, isDeleting: false });
                                                        }
                                                        document.removeEventListener('touchmove', handleTouchMove);
                                                        document.removeEventListener('touchend', handleTouchEnd);
                                                    };
                                                    document.addEventListener('touchmove', handleTouchMove, { passive: false });
                                                    document.addEventListener('touchend', handleTouchEnd);
                                                }}
                                                onTouchEnd={() => { if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); } }}
                                            >
                                                {/* Delete achtergrond */}
                                                {swipeState.id === lid.id && swipeState.translateX < -20 && (
                                                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500 text-white px-4" style={{ width: '80px' }}>
                                                        <TrashIcon className="h-5 w-5" />
                                                    </div>
                                                )}

                                                {/* Desktop rij */}
                                                <div className="hidden lg:flex items-center p-4">
                                                    <div className="flex-1 font-medium text-gray-900">{lid.naam}</div>
                                                    <div className="w-48 text-right mr-4">
                                                        {editingScore.id === lid.score_id ? (
                                                            <input
                                                                type="text"
                                                                className={`w-32 px-3 py-1 border rounded-lg text-right text-sm ${editingScore.validation?.valid === false ? 'border-red-500' : 'border-gray-300'}`}
                                                                value={editingScore.score}
                                                                onChange={(e) => handleScoreChange(e.target.value)}
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <span className="text-gray-700">
                                                                {lid.score !== null ? formatScoreWithUnit(lid.score, details.eenheid) : <span className="text-gray-400 italic text-sm">Geen score</span>}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`w-16 text-center font-bold text-lg ${getPointColorClass(lid.punt, details.max_punten)}`}>
                                                        {lid.punt !== null ? `${lid.punt}` : '-'}
                                                    </div>
                                                    <div className="w-24 flex justify-end gap-1">
                                                        {editingScore.id === lid.score_id ? (
                                                            <>
                                                                <button onClick={handleUpdateScore} disabled={updating} className="p-2 text-green-600 hover:bg-green-100 rounded-full disabled:opacity-50"><CheckIcon className="h-5 w-5"/></button>
                                                                <button onClick={cancelEdit} disabled={updating} className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50"><XMarkIcon className="h-5 w-5"/></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleEditClick(lid)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><PencilSquareIcon className="h-5 w-5"/></button>
                                                                {lid.score !== null && (
                                                                    <button onClick={() => handleDeleteScore(lid.score_id, lid.naam)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="h-5 w-5"/></button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Mobiele kaart */}
                                                <div className="lg:hidden">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-medium text-gray-900">{lid.naam}</span>
                                                        <span className={`text-xl font-bold ${getPointColorClass(lid.punt, details.max_punten)}`}>
                                                            {lid.punt !== null ? `${lid.punt} pt` : '-'}
                                                        </span>
                                                    </div>
                                                    {editingScore.id === lid.score_id ? (
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <input
                                                                type="text"
                                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-right"
                                                                value={editingScore.score}
                                                                onChange={(e) => handleScoreChange(e.target.value)}
                                                                autoFocus
                                                            />
                                                            <button onClick={handleUpdateScore} disabled={updating} className="p-3 text-green-600 hover:bg-green-100 rounded-full disabled:opacity-50"><CheckIcon className="h-6 w-6"/></button>
                                                            <button onClick={cancelEdit} disabled={updating} className="p-3 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50"><XMarkIcon className="h-6 w-6"/></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-600 text-sm">
                                                                {lid.score !== null ? formatScoreWithUnit(lid.score, details.eenheid) : <span className="text-gray-400 italic">Geen score</span>}
                                                            </span>
                                                            <div className="text-center">
                                                                <p className="text-xs text-gray-500 mt-2">
                                                                    Houd ingedrukt om te bewerken
                                                                    {lid.score !== null && " • Swipe links om te verwijderen"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                {details.leerlingen?.length === 0 && (
                                    <div className="p-8 text-center text-gray-500">
                                        <p>Geen leerlingen gevonden in deze groep.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Testafname Details - Desktop only */}
                        <div className="hidden lg:block lg:col-span-1">
                            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Testafname Details</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                                        <div className="text-sm text-gray-600">Totaal Leerlingen: {stats.totaal}</div>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                        <div className="text-sm text-gray-600">Scores Ingevoerd: {stats.compleet} ({stats.percentage}%)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Testafname Acties */}
                    <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Testafname Beheer</h3>
                            <p className="text-sm text-gray-600">Beheer deze testafname en de bijbehorende scores</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
                            <button onClick={exportToCSV} disabled={details.leerlingen.length === 0} className="flex flex-col items-center justify-center px-3 py-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium disabled:opacity-50">
                                <DocumentArrowDownIcon className="h-6 w-6 mb-1" /><span className="text-sm text-center">Exporteer CSV</span>
                            </button>
                            <button onClick={() => window.print()} className="flex flex-col items-center justify-center px-3 py-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium">
                                <ClipboardDocumentListIcon className="h-6 w-6 mb-1" /><span className="text-sm text-center">Print Rapport</span>
                            </button>
                            <button onClick={fetchDetails} disabled={loading} className="flex flex-col items-center justify-center px-3 py-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium disabled:opacity-50">
                                <ArrowPathIcon className={`h-6 w-6 mb-1 ${loading ? 'animate-spin' : ''}`} /><span className="text-sm text-center">Vernieuwen</span>
                            </button>
                            <button onClick={() => setShowDeleteConfirm(true)} className="flex flex-col items-center justify-center px-3 py-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium">
                                <ExclamationTriangleIcon className="h-6 w-6 mb-1" /><span className="text-sm text-center">Verwijder Testafname</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Delete Testafname Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                            <div className="flex items-center mb-4">
                                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
                                <h3 className="text-lg font-bold text-gray-900">Testafname Verwijderen</h3>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Weet je zeker dat je deze testafname wilt verwijderen? Dit zal alle scores 
                                voor <strong>{details.test_naam}</strong> van groep <strong>{details.groep_naam}</strong> permanent verwijderen.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Annuleren</button>
                                <button onClick={handleDeleteTestafname} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Verwijderen</button>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={deleteModalState.isOpen}
                    onClose={() => setDeleteModalState({ isOpen: false, scoreId: null, leerlingNaam: '' })}
                    onConfirm={confirmDeleteScore}
                    title="Score Verwijderen"
                >
                    Weet je zeker dat je de score van <strong>{deleteModalState.leerlingNaam}</strong> permanent wilt verwijderen?
                </ConfirmModal>
            </div>
        </div>
    );
}