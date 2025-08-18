// src/pages/TestafnameDetail.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
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

function formatScore(score, eenheid) {
    if (score === null || score === undefined) return '-';
    
    const eenheidLower = eenheid?.toLowerCase();

    // Speciale opmaak voor 'aantal'
    if (eenheidLower === 'aantal') {
        return `${score}x`;
    }
    
    // Speciale opmaak voor tijd
    if (eenheidLower === 'min' || eenheidLower === 'sec' || eenheidLower === 'minuten' || eenheidLower === 'seconden') {
        const mins = Math.floor(score / 60);
        const secs = Math.round(score % 60);
        return `${mins}'${secs.toString().padStart(2, '0')}"`;
    }
    
    // Standaard opmaak voor alle andere eenheden (bv. meter)
    return `${score} ${eenheid}`;
}

function getScoreColorClass(punt, maxPunten = 20) {
    if (punt === null || punt === undefined) return 'text-gray-400';

    if (punt < 10) { // Onvoldoende
        return 'text-red-600';
    }
    if (punt < 14) { // Voldoende (10 t/m 13.9)
        return 'text-yellow-600';
    }
    // Goed en Uitstekend (14 en hoger)
    return 'text-green-600';
}

function validateScore(score, eenheid) {
    if (!score || score.toString().trim() === '') {
        return { valid: true, message: '' };
    }
    
    const numericScore = parseFloat(score.toString().replace(',', '.'));
    if (isNaN(numericScore)) {
        return { valid: false, message: 'Ongeldige score' };
    }
    
    if (numericScore < 0) {
        return { valid: false, message: 'Score kan niet negatief zijn' };
    }
    
    if (eenheid === 'seconden' && numericScore > 3600) {
        return { valid: false, message: 'Score te hoog (max 1 uur)' };
    }
    
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
        const punten = leerlingen
            .filter(l => l.punt !== null)
            .map(l => l.punt);
        
        if (punten.length === 0) return null;

        const uitstekendDrempel = 18; // Alles van 18 en hoger
        const goedDrempel = 14;       // Goed: 14, 15, 16, 17
        const voldoendeDrempel = 10;    // Voldoende: 10, 11, 12, 13
        // Onvoldoende is alles onder de 10

        const uitstekend = punten.filter(p => p >= uitstekendDrempel).length;
        const goed = punten.filter(p => p >= goedDrempel && p < uitstekendDrempel).length;
        const voldoende = punten.filter(p => p >= voldoendeDrempel && p < goedDrempel).length;
        const onvoldoende = punten.filter(p => p < voldoendeDrempel).length;
        
        const total = punten.length;
        const average = (punten.reduce((sum, p) => sum + p, 0) / total).toFixed(1);

        return {
            uitstekend: { count: uitstekend, percentage: Math.round((uitstekend / total) * 100) },
            goed: { count: goed, percentage: Math.round((goed / total) * 100) },
            voldoende: { count: voldoende, percentage: Math.round((voldoende / total) * 100) },
            onvoldoende: { count: onvoldoende, percentage: Math.round((onvoldoende / total) * 100) },
            average,
            total,
            maxPunten
        };
    }, [leerlingen, maxPunten]);

    if (!distribution) {
        return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Score Verdeling
                </h3>
                <p className="text-gray-500 text-center py-8">Geen scores beschikbaar voor analyse</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Score Verdeling
            </h3>
            
            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700">
                        Uitstekend (18-{distribution.maxPunten})
                    </span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${distribution.uitstekend.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.uitstekend.count}/{distribution.total}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">
                        Goed (14-17)
                    </span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${distribution.goed.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.goed.count}/{distribution.total}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-700">
                        Voldoende (10-13)
                    </span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-yellow-500 h-2 rounded-full" 
                                style={{ width: `${distribution.voldoende.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.voldoende.count}/{distribution.total}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                   <span className="text-sm font-medium text-red-700">
                       Onvoldoende (&lt;10)
                   </span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-red-500 h-2 rounded-full" 
                                style={{ width: `${distribution.onvoldoende.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.onvoldoende.count}/{distribution.total}</span>
                    </div>
                </div>
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
    const navigate = useNavigate();
    const [details, setDetails] = useState({ 
        groep_naam: '', 
        test_naam: '', 
        eenheid: '',
        max_punten: 20,
        leerlingen: [] 
    });
    const [loading, setLoading] = useState(true);
    const [editingScore, setEditingScore] = useState({ id: null, score: '', validation: null });
    const [editingDate, setEditingDate] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [updating, setUpdating] = useState(false);
    const [swipeState, setSwipeState] = useState({ id: null, translateX: 0, isDeleting: false });
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // FIXED: Added missing state

    const stats = useMemo(() => {
        const leerlingenMetScore = details.leerlingen.filter(l => l.score !== null);
        const totaalLeerlingen = details.leerlingen.length;
        const percentageCompleet = totaalLeerlingen > 0 
            ? Math.round((leerlingenMetScore.length / totaalLeerlingen) * 100) 
            : 0;

        return {
            totaal: totaalLeerlingen,
            compleet: leerlingenMetScore.length,
            percentage: percentageCompleet
        };
    }, [details.leerlingen]);

    // FIXED: Remove fetchDetails from dependency array to prevent infinite loop
    const fetchDetails = useCallback(async () => {
        if (!groepId || !testId || !datum) {
            console.warn('Missing required params:', { groepId, testId, datum });
            setLoading(false);
            return;
        }
        
        setLoading(true);
        console.log('Fetching details for:', { groepId, testId, datum });

        try {
            const [groupSnap, testSnap] = await Promise.all([
                getDoc(doc(db, 'groepen', groepId)),
                getDoc(doc(db, 'testen', testId)),
            ]);

            if (!groupSnap.exists() || !testSnap.exists()) {
                console.error('Document not found:', { 
                    groupExists: groupSnap.exists(), 
                    testExists: testSnap.exists() 
                });
                toast.error("Groep of test niet gevonden");
                setLoading(false);
                return;
            }

            const groupData = groupSnap.data();
            const testData = testSnap.data();
            
            // FIXED: Better date parsing
            let targetDate;
            try {
                targetDate = new Date(datum);
                if (isNaN(targetDate.getTime())) {
                    throw new Error('Invalid date');
                }
            } catch (error) {
                console.error('Invalid date format:', datum);
                toast.error("Ongeldige datum");
                setLoading(false);
                return;
            }

            const dayStart = new Date(targetDate);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(targetDate);
            dayEnd.setHours(23, 59, 59, 999);

            console.log('Date range:', { dayStart, dayEnd });

            const scoresQuery = query(collection(db, 'scores'), 
                where('groep_id', '==', groepId),
                where('test_id', '==', testId),
                where('datum', '>=', dayStart),
                where('datum', '<=', dayEnd)
            );
            
            const scoresSnap = await getDocs(scoresQuery);
            console.log('Found scores:', scoresSnap.docs.length);
            
            const scoresMap = new Map(scoresSnap.docs.map(d => [d.data().leerling_id, { id: d.id, ...d.data() }]));

            const leerlingIds = groupData.leerling_ids || [];
            console.log('Leerling IDs:', leerlingIds.length);
            
            let leerlingenData = [];
            if (leerlingIds.length > 0) {
                // FIXED: Handle large arrays by batching queries if needed
                if (leerlingIds.length > 10) {
                    // Firestore 'in' queries are limited to 10 items
                    const batches = [];
                    for (let i = 0; i < leerlingIds.length; i += 10) {
                        const batch = leerlingIds.slice(i, i + 10);
                        const leerlingenQuery = query(
                            collection(db, 'toegestane_gebruikers'), 
                            where('__name__', 'in', batch)
                        );
                        batches.push(getDocs(leerlingenQuery));
                    }
                    
                    const batchResults = await Promise.all(batches);
                    const allDocs = batchResults.flatMap(snap => snap.docs);
                    
                    leerlingenData = allDocs.map(d => {
                        const scoreInfo = scoresMap.get(d.id);
                        return {
                            id: d.id,
                            naam: d.data().naam,
                            score: scoreInfo?.score ?? null,
                            punt: scoreInfo?.rapportpunt ?? null,
                            score_id: scoreInfo?.id
                        };
                    });
                } else {
                    const leerlingenQuery = query(
                        collection(db, 'toegestane_gebruikers'), 
                        where('__name__', 'in', leerlingIds)
                    );
                    const leerlingenSnap = await getDocs(leerlingenQuery);
                    
                    leerlingenData = leerlingenSnap.docs.map(d => {
                        const scoreInfo = scoresMap.get(d.id);
                        return {
                            id: d.id,
                            naam: d.data().naam,
                            score: scoreInfo?.score ?? null,
                            punt: scoreInfo?.rapportpunt ?? null,
                            score_id: scoreInfo?.id
                        };
                    });
                }
            }
            
            console.log('Final leerlingen data:', leerlingenData.length);
            
            setDetails({
                groep_naam: groupData.naam,
                test_naam: testData.naam,
                eenheid: testData.eenheid,
                max_punten: testData.max_punten || 20,
                leerlingen: leerlingenData.sort((a,b) => a.naam.localeCompare(b.naam))
            });

        } catch (error) {
            console.error("Error fetching details:", error);
            toast.error("Details konden niet worden geladen: " + error.message);
        } finally {
            setLoading(false);
        }
    }, []); // FIXED: Empty dependency array

    // FIXED: Separate useEffect with proper dependencies
    useEffect(() => {
        if (groepId && testId && datum) {
            fetchDetails();
            setNewDate(datum.split('T')[0]);
        }
    }, [groepId, testId, datum, fetchDetails]);

    // Background effect
    useEffect(() => {
        const root = document.getElementById('root');
        if (root) {
            root.classList.add('bg-gradient-to-br', 'from-slate-50', 'via-purple-50', 'to-blue-50');
        }
        return () => {
            if (root) {
                root.classList.remove('bg-gradient-to-br', 'from-slate-50', 'via-purple-50', 'to-blue-50');
            }
        };
    }, []);

    const handleEditClick = (scoreId, currentScore) => {
        setEditingScore({ 
            id: scoreId, 
            score: currentScore ?? '', 
            validation: { valid: true, message: '' }
        });
    };

    const handleScoreChange = (value) => {
        const validation = validateScore(value, details.eenheid);
        setEditingScore(prev => ({ 
            ...prev, 
            score: value, 
            validation 
        }));
    };

    const handleUpdateScore = async () => {
        if (!editingScore.id || !editingScore.validation?.valid) return;
        
        const scoreValue = parseFloat(editingScore.score.replace(',', '.'));
        if (isNaN(scoreValue)) {
            toast.error("Voer een geldige score in.");
            return;
        }

        setUpdating(true);
        const scoreRef = doc(db, 'scores', editingScore.id);
        
        try {
            await updateDoc(scoreRef, { score: scoreValue });
            toast.success("Score succesvol bijgewerkt!");
            fetchDetails();
            setEditingScore({ id: null, score: '', validation: null });
        } catch (error) {
            console.error("Fout bij bijwerken:", error);
            if (error.code === 'permission-denied') {
                toast.error("Geen toegang om deze score bij te werken.");
            } else {
                toast.error(`Fout bij bijwerken: ${error.message}`);
            }
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteScore = async (scoreId, leerlingNaam) => {
        if (!window.confirm(`Weet je zeker dat je de score van ${leerlingNaam} wilt verwijderen?`)) return;
        
        const loadingToast = toast.loading('Score verwijderen...');
        try {
            await deleteDoc(doc(db, 'scores', scoreId));
            toast.success("Score succesvol verwijderd!");
            fetchDetails();
        } catch (error) {
            console.error("Fout bij verwijderen:", error);
            if (error.code === 'permission-denied') {
                toast.error("Geen toegang om deze score te verwijderen.");
            } else {
                toast.error(`Fout bij verwijderen: ${error.message}`);
            }
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleUpdateDate = async () => {
        const originalDate = new Date(datum);
        const updatedDate = new Date(newDate);

        if (!newDate || originalDate.toISOString().split('T')[0] === updatedDate.toISOString().split('T')[0]) {
            setEditingDate(false);
            return;
        }

        const loadingToast = toast.loading('Datum bijwerken...');
        try {
            // Update all scores with the new date
            const scoresQuery = query(collection(db, 'scores'), 
                where('groep_id', '==', groepId),
                where('test_id', '==', testId),
                where('datum', '==', originalDate)
            );
            const scoresSnap = await getDocs(scoresQuery);
            
            const batch = writeBatch(db);
            scoresSnap.docs.forEach(doc => {
                batch.update(doc.ref, { datum: updatedDate });
            });
            await batch.commit();

            toast.success("Testdatum succesvol bijgewerkt!");
            setEditingDate(false);
            navigate(`/testafname/${groepId}/${testId}/${updatedDate.toISOString()}`);

        } catch (error) {
            console.error("Fout bij bijwerken datum:", error);
            toast.error("Fout bij bijwerken van de datum.");
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleDeleteTestafname = async () => {
        const loadingToast = toast.loading('Testafname verwijderen...');
        try {
            // Delete all scores for this test session
            const scoresQuery = query(collection(db, 'scores'), 
                where('groep_id', '==', groepId),
                where('test_id', '==', testId),
                where('datum', '==', new Date(datum))
            );
            const scoresSnap = await getDocs(scoresQuery);
            
            const batch = writeBatch(db);
            scoresSnap.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            toast.success("Testafname succesvol verwijderd!");
            navigate('/scores');
        } catch (error) {
            console.error("Fout bij verwijderen:", error);
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
            leerling.score !== null ? formatScore(leerling.score, details.eenheid) : '',
            leerling.punt !== null ? leerling.punt : ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${details.test_naam}_${details.groep_naam}_${datum.split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const cancelEdit = () => {
        setEditingScore({ id: null, score: '', validation: null });
    };

    // FIXED: Single loading check at the top
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="bg-white p-8 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="text-gray-700 font-medium">Details laden...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* AANGEPAST: padding (py, lg:py) en margin (mb) aangepast voor minder witruimte */}
            <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-24 pb-16 space-y-6">
                <Link to="/scores" className="inline-flex items-center text-sm text-gray-600 hover:text-purple-700 font-medium transition-colors">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Terug naar overzicht
                </Link>
                    
                <div className="space-y-6">
                    {/* Header */}
                   <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                        {/* AANGEPAST: Nieuwe header layout */}
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
                                            <input
                                                type="date"
                                                value={newDate}
                                                onChange={(e) => setNewDate(e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                            <button onClick={handleUpdateDate} className="text-green-600 hover:text-green-800">
                                                <CheckIcon className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => {setEditingDate(false); setNewDate(datum.split('T')[0]);}} className="text-red-600 hover:text-red-800">
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{new Date(datum).toLocaleDateString('nl-BE', { 
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })}</span>
                                            <button onClick={() => setEditingDate(true)} className="text-blue-600 hover:text-blue-800" title="Datum wijzigen">
                                                <PencilSquareIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Score Verdeling - HIDDEN ON MOBILE */}
                        <div className="hidden lg:block lg:col-span-1">
                            <ScoreDistributionChart 
                                leerlingen={details.leerlingen} 
                                maxPunten={details.max_punten}
                            />
                        </div>

                        {/* Scores Lijst */}
                        <div className="col-span-1 lg:col-span-2">
                            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                                <div className="p-6 border-b border-gray-200/70">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                Individuele Scores
                                            </h2>
                                            
                                        </div>
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
                                                className="relative overflow-hidden hover:bg-gray-50/50 transition-colors px-4 py-3 lg:px-0 lg:py-0" // Padding voor mobiel
                                                style={{
                                                    transform: swipeState.id === lid.id ? `translateX(${swipeState.translateX}px)` : 'translateX(0)',
                                                    transition: swipeState.id === lid.id && swipeState.translateX === 0 ? 'transform 0.3s ease' : 'none'
                                                }}
                                                onTouchStart={(e) => {
                                                    if (editingScore.id === lid.score_id) return;
                                                    
                                                    const touch = e.touches[0];
                                                    const startX = touch.clientX;
                                                    const startTime = Date.now();
                                                    
                                                    // Long press timer for edit
                                                    const timer = setTimeout(() => {
                                                        navigator.vibrate && navigator.vibrate(50);
                                                        handleEditClick(lid.score_id, lid.score);
                                                    }, 500);
                                                    setLongPressTimer(timer);
                                                    
                                                    const handleTouchMove = (e) => {
                                                        const currentTouch = e.touches[0];
                                                        const deltaX = currentTouch.clientX - startX;
                                                        const deltaTime = Date.now() - startTime;
                                                        
                                                        // Cancel long press if moving
                                                        if (Math.abs(deltaX) > 10) {
                                                            clearTimeout(timer);
                                                        }
                                                        
                                                        // Only allow swipe left and after 100ms to avoid conflicts
                                                        if (deltaX < -20 && deltaTime > 100) {
                                                            e.preventDefault();
                                                            const constrainedDelta = Math.max(deltaX, -100);
                                                            setSwipeState({ id: lid.id, translateX: constrainedDelta, isDeleting: false });
                                                        }
                                                    };
                                                    
                                                    const handleTouchEnd = (e) => {
                                                        clearTimeout(timer);
                                                        setLongPressTimer(null);
                                                        
                                                        if (swipeState.id === lid.id) {
                                                            if (swipeState.translateX < -50) {
                                                                // Show delete confirmation
                                                                if (lid.score !== null) {
                                                                    handleDeleteScore(lid.score_id, lid.naam);
                                                                }
                                                            }
                                                            // Reset swipe
                                                            setSwipeState({ id: null, translateX: 0, isDeleting: false });
                                                        }
                                                        
                                                        document.removeEventListener('touchmove', handleTouchMove);
                                                        document.removeEventListener('touchend', handleTouchEnd);
                                                    };
                                                    
                                                    document.addEventListener('touchmove', handleTouchMove, { passive: false });
                                                    document.addEventListener('touchend', handleTouchEnd);
                                                }}
                                                onTouchEnd={() => {
                                                    if (longPressTimer) {
                                                        clearTimeout(longPressTimer);
                                                        setLongPressTimer(null);
                                                    }
                                                }}
                                            >
                                                {/* Delete indicator - only visible when swiping */}
                                                {swipeState.id === lid.id && swipeState.translateX < -20 && lid.score !== null && (
                                                    <div className="absolute right-0 top-0 h-full w-20 bg-red-500 flex items-center justify-center">
                                                        <TrashIcon className="h-6 w-6 text-white" />
                                                    </div>
                                                )}
                                                
                                                <div className="p-0 lg:p-4">
                                                    {/* AANGEPAST: Desktop Layout met flexbox voor centreren */}
                                                    <div className="hidden lg:flex lg:items-center">
                                                        {/* Naam (links) */}
                                                        <div className="w-1/3 font-medium text-gray-900 text-lg truncate">
                                                            {lid.naam}
                                                        </div>
                                                        
                                                        {/* Scores (midden) */}
                                                        <div className="flex-grow flex justify-center items-center gap-8">
                                                            <div className="text-center w-36">
                                                                {editingScore.id === lid.score_id ? (
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            step="any"
                                                                            value={editingScore.score}
                                                                            onChange={e => handleScoreChange(e.target.value)}
                                                                            onKeyPress={e => e.key === 'Enter' && handleUpdateScore()}
                                                                            className={`w-32 p-2 border-2 rounded-lg text-center ${
                                                                                editingScore.validation?.valid === false 
                                                                                    ? 'border-red-500 bg-red-50' 
                                                                                    : 'border-purple-500 bg-purple-50'
                                                                            }`}
                                                                            placeholder="Score"
                                                                            autoFocus
                                                                        />
                                                                        {editingScore.validation?.valid === false && (
                                                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-red-600 whitespace-nowrap">
                                                                                {editingScore.validation.message}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="font-bold text-xl text-purple-700">
                                                                        {lid.score !== null ? formatScore(lid.score, details.eenheid) : '-'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-center w-24">
                                                                <span className={`font-bold text-xl ${getScoreColorClass(lid.punt, details.max_punten)}`}>
                                                                    {lid.punt !== null ? `${lid.punt}/${details.max_punten}` : '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Acties (rechts) */}
                                                        <div className="w-1/3 flex justify-end items-center gap-2">
                                                            {editingScore.id === lid.score_id ? (
                                                                <>
                                                                    <button 
                                                                        onClick={handleUpdateScore}
                                                                        disabled={updating || !editingScore.validation?.valid}
                                                                        title="Opslaan" 
                                                                        className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        <CheckIcon className="h-5 w-5"/>
                                                                    </button>
                                                                    <button 
                                                                        onClick={cancelEdit}
                                                                        disabled={updating}
                                                                        title="Annuleren" 
                                                                        className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50"
                                                                    >
                                                                        <XMarkIcon className="h-5 w-5"/>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        onClick={() => handleEditClick(lid.score_id, lid.score)}
                                                                        title="Wijzigen" 
                                                                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                                                    >
                                                                        <PencilSquareIcon className="h-5 w-5"/>
                                                                    </button>
                                                                    {lid.score !== null && (
                                                                        <button 
                                                                            onClick={() => handleDeleteScore(lid.score_id, lid.naam)}
                                                                            title="Verwijderen" 
                                                                            className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                                                        >
                                                                            <TrashIcon className="h-5 w-5"/>
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Mobile Layout - gestapeld */}
                                                    <div className="lg:hidden space-y-3">
                                                        <div className="font-medium text-gray-900 text-lg">
                                                            {lid.naam}
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-center">
                                                                {editingScore.id === lid.score_id ? (
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            step="any"
                                                                            value={editingScore.score}
                                                                            onChange={e => handleScoreChange(e.target.value)}
                                                                            onKeyPress={e => e.key === 'Enter' && handleUpdateScore()}
                                                                            className={`w-32 p-3 border-2 rounded-lg text-center ${
                                                                                editingScore.validation?.valid === false 
                                                                                    ? 'border-red-500 bg-red-50' 
                                                                                    : 'border-purple-500 bg-purple-50'
                                                                            }`}
                                                                            placeholder="Score"
                                                                            autoFocus
                                                                        />
                                                                        {editingScore.validation?.valid === false && (
                                                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-red-600 whitespace-nowrap">
                                                                                {editingScore.validation.message}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="font-bold text-2xl text-purple-700">
                                                                        {lid.score !== null ? formatScore(lid.score, details.eenheid) : '-'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="text-center">
                                                                <span className={`font-bold text-2xl ${getScoreColorClass(lid.punt, details.max_punten)}`}>
                                                                    {lid.punt !== null ? `${lid.punt}/${details.max_punten}` : '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Mobile actie knoppen - alleen bij editing */}
                                                        {editingScore.id === lid.score_id && (
                                                            <div className="flex justify-center items-center gap-3 pt-2">
                                                                <button 
                                                                    onClick={handleUpdateScore}
                                                                    disabled={updating || !editingScore.validation?.valid}
                                                                    title="Opslaan" 
                                                                    className="p-3 text-green-600 hover:bg-green-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    <CheckIcon className="h-6 w-6"/>
                                                                </button>
                                                                <button 
                                                                    onClick={cancelEdit}
                                                                    disabled={updating}
                                                                    title="Annuleren" 
                                                                    className="p-3 text-red-600 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50"
                                                                >
                                                                    <XMarkIcon className="h-6 w-6"/>
                                                                </button>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Mobile instructies */}
                                                        {editingScore.id !== lid.score_id && (
                                                            <div className="text-center">
                                                                <p className="text-xs text-gray-500 mt-2">
                                                                    Houd ingedrukt om te bewerken
                                                                    {lid.score !== null && " • Swipe links om te verwijderen"}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
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

                        {/* Testafname Details - HIDDEN ON MOBILE */}
                        <div className="hidden lg:block lg:col-span-1">
                            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Testafname Details</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center" title="Totaal aantal leerlingen">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                                        <div>
                                            <div className="text-sm text-gray-600">Totaal Leerlingen: {stats.totaal}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center" title="Aantal ingevoerde scores">
                                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                        <div>
                                            <div className="text-sm text-gray-600">Scores Ingevoerd: {stats.compleet} ({stats.percentage}%)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Enhanced Testafname Acties */}
                    <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Testafname Beheer</h3>
                            <p className="text-sm text-gray-600">
                                Beheer deze testafname en de bijbehorende scores
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
                            {/* Export Data */}
                            <button
                                onClick={exportToCSV}
                                disabled={details.leerlingen.length === 0}
                                className="flex flex-col items-center justify-center px-3 py-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DocumentArrowDownIcon className="h-6 w-6 mb-1" />
                                <span className="text-sm text-center">Exporteer CSV</span>
                            </button>

                            {/* Print Report */}
                            <button
                                onClick={() => window.print()}
                                className="flex flex-col items-center justify-center px-3 py-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                            >
                                <ClipboardDocumentListIcon className="h-6 w-6 mb-1" />
                                <span className="text-sm text-center">Print Rapport</span>
                            </button>

                            {/* Refresh Data */}
                            <button
                                onClick={fetchDetails}
                                disabled={loading}
                                className="flex flex-col items-center justify-center px-3 py-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium disabled:opacity-50"
                            >
                                <ArrowPathIcon className={`h-6 w-6 mb-1 ${loading ? 'animate-spin' : ''}`} />
                                <span className="text-sm text-center">Vernieuwen</span>
                            </button>

                            {/* Delete Test Session */}
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex flex-col items-center justify-center px-3 py-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                            >
                                <ExclamationTriangleIcon className="h-6 w-6 mb-1" />
                                <span className="text-sm text-center">Verwijder Testafname</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                            <div className="flex items-center mb-4">
                                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
                                <h3 className="text-lg font-bold text-gray-900">Testafname Verwijderen</h3>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Weet je zeker dat je deze testafname wilt verwijderen? Dit zal alle scores 
                                voor <strong>{details.test_naam}</strong> van groep <strong>{details.groep_naam}</strong> 
                                op {new Date(datum).toLocaleDateString('nl-BE')} permanent verwijderen.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                    Annuleren
                                </button>
                                <button
                                    onClick={handleDeleteTestafname}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    Verwijderen
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}