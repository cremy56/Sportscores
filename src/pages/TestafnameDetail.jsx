// src/pages/TestafnameDetail.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
    TrashIcon, 
    PencilSquareIcon, 
    CheckIcon, 
    XMarkIcon, 
    ArrowLeftIcon,
    ChartBarIcon,
    UserGroupIcon,
    CalendarIcon
} from '@heroicons/react/24/solid';

function formatScore(score, eenheid) {
    if (eenheid === 'seconden' || eenheid === 'minuten') {
        const mins = Math.floor(score / 60);
        const secs = Math.round(score % 60);
        return `${mins}'${secs.toString().padStart(2, '0')}"`;
    }
    return score;
}

function getScoreColorClass(punt) {
    if (punt === null || punt === undefined) return 'text-gray-400';
    if (punt < 5) return 'text-red-600';
    if (punt <= 7) return 'text-yellow-600';
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

// Verbeterde Score Verdeling Component - Dynamische punten schaal
function ScoreDistributionChart({ leerlingen }) {
    const distribution = useMemo(() => {
        const puntenMetScore = leerlingen
            .filter(l => l.punt !== null && l.punt !== undefined)
            .map(l => l.punt);
        
        if (puntenMetScore.length === 0) return null;

        // Bepaal automatisch de maximum score
        const maxScore = Math.max(...puntenMetScore);
        const isScale20 = maxScore > 10; // Als hoogste score > 10, dan 20-punten schaal
        
        let excellent, good, satisfactory, poor;
        
        if (isScale20) {
            // 20-punten schaal
            excellent = puntenMetScore.filter(p => p >= 16).length;    // 16-20 = Uitstekend
            good = puntenMetScore.filter(p => p >= 12 && p < 16).length; // 12-16 = Goed  
            satisfactory = puntenMetScore.filter(p => p >= 8 && p < 12).length; // 8-12 = Voldoende
            poor = puntenMetScore.filter(p => p < 8).length;            // <8 = Onvoldoende
        } else {
            // 10-punten schaal (oorspronkelijk)
            excellent = puntenMetScore.filter(p => p >= 8).length;
            good = puntenMetScore.filter(p => p >= 6 && p < 8).length;
            satisfactory = puntenMetScore.filter(p => p >= 4 && p < 6).length;
            poor = puntenMetScore.filter(p => p < 4).length;
        }
        
        const total = puntenMetScore.length;
        const average = (puntenMetScore.reduce((sum, p) => sum + p, 0) / total).toFixed(1);

        return {
            excellent: { count: excellent, percentage: Math.round((excellent / total) * 100) },
            good: { count: good, percentage: Math.round((good / total) * 100) },
            satisfactory: { count: satisfactory, percentage: Math.round((satisfactory / total) * 100) },
            poor: { count: poor, percentage: Math.round((poor / total) * 100) },
            average,
            total,
            maxScore,
            isScale20,
            // Labels gebaseerd op schaal
            labels: isScale20 ? {
                excellent: "Uitstekend (16-20)",
                good: "Goed (12-16)", 
                satisfactory: "Voldoende (8-12)",
                poor: "Onvoldoende (<8)"
            } : {
                excellent: "Uitstekend (8-10)",
                good: "Goed (6-8)",
                satisfactory: "Voldoende (4-6)", 
                poor: "Onvoldoende (<4)"
            }
        };
    }, [leerlingen]);

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
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Score Verdeling
            </h3>
            <p className="text-xs text-gray-500 mb-4">
                Schaal: {distribution.isScale20 ? '20-punten systeem' : '10-punten systeem'} 
                (max: {distribution.maxScore})
            </p>
            
            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700">{distribution.labels.excellent}</span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${distribution.excellent.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.excellent.count}/{distribution.total}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">{distribution.labels.good}</span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${distribution.good.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.good.count}/{distribution.total}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-700">{distribution.labels.satisfactory}</span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-yellow-500 h-2 rounded-full" 
                                style={{ width: `${distribution.satisfactory.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.satisfactory.count}/{distribution.total}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-700">{distribution.labels.poor}</span>
                    <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                                className="bg-red-500 h-2 rounded-full" 
                                style={{ width: `${distribution.poor.percentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{distribution.poor.count}/{distribution.total}</span>
                    </div>
                </div>
            </div>
            
            <div className="border-t pt-4">
                <p className="text-center">
                    <span className="text-sm text-gray-600">Gemiddelde: </span>
                    <span className="text-lg font-bold text-gray-900">{distribution.average}</span>
                    <span className="text-sm text-gray-600"> punten</span>
                </p>
            </div>
        </div>
    );
}

// Verbeterde Testafname Acties met meer functionaliteit
function TestafnameActions({ 
    groepId, 
    testId, 
    datum, 
    groepNaam, 
    testNaam, 
    onDateChange, 
    onExport, 
    onDuplicate, 
    onDelete 
}) {
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [newDate, setNewDate] = useState(datum);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDateSave = async () => {
        if (newDate !== datum) {
            await onDateChange(newDate);
        }
        setIsEditingDate(false);
    };

    const handleExportCSV = () => {
        // CSV export functionaliteit
        onExport('csv');
    };

    const handleExportPDF = () => {
        // PDF export functionaliteit  
        onExport('pdf');
    };

    const handleDuplicate = () => {
        onDuplicate();
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        onDelete();
        setShowDeleteConfirm(false);
    };

    return (
        <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
            <div className="flex flex-col gap-6">
                {/* Datum bewerken */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Testdatum</h3>
                    <div className="flex items-center gap-3">
                        {isEditingDate ? (
                            <>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                                <button
                                    onClick={handleDateSave}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                    Opslaan
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingDate(false);
                                        setNewDate(datum);
                                    }}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                                >
                                    Annuleren
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-gray-700">
                                    {new Date(datum).toLocaleDateString('nl-BE', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </span>
                                <button
                                    onClick={() => setIsEditingDate(true)}
                                    className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                                >
                                    Wijzigen
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Export opties */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Exporteren</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleExportCSV}
                            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium flex items-center"
                        >
                            <DocumentIcon className="h-4 w-4 mr-2" />
                            Export CSV
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center"
                        >
                            <DocumentIcon className="h-4 w-4 mr-2" />
                            Export PDF
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium flex items-center"
                        >
                            <PrinterIcon className="h-4 w-4 mr-2" />
                            Afdrukken
                        </button>
                    </div>
                </div>

                {/* Testafname acties */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Testafname Beheer</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleDuplicate}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium flex items-center"
                        >
                            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                            Dupliceren
                        </button>
                        <button
                            onClick={() => navigate('/nieuwe-testafname')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Nieuwe Testafname
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center"
                        >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Verwijderen
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Testafname Verwijderen</h3>
                        <p className="text-gray-600 mb-4">
                            Weet je zeker dat je deze testafname wilt verwijderen? 
                            <br />
                            <strong>{testNaam}</strong> - <strong>{groepNaam}</strong>
                            <br />
                            Alle scores worden permanent verwijderd.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Verwijderen
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
        leerlingen: [] 
    });
    const [loading, setLoading] = useState(true);
    const [editingScore, setEditingScore] = useState({ id: null, score: '', validation: null });
    const [updating, setUpdating] = useState(false);

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

    const fetchDetails = useCallback(async () => {
        if (!groepId || !testId || !datum) return;
        setLoading(true);

        try {
            const [groupSnap, testSnap] = await Promise.all([
                getDoc(doc(db, 'groepen', groepId)),
                getDoc(doc(db, 'testen', testId)),
            ]);

            if (!groupSnap.exists() || !testSnap.exists()) {
                throw new Error("Groep of test niet gevonden");
            }

            const groupData = groupSnap.data();
            const testData = testSnap.data();
            
            const scoresQuery = query(collection(db, 'scores'), 
                where('groep_id', '==', groepId),
                where('test_id', '==', testId),
                where('datum', '==', datum)
            );
            const scoresSnap = await getDocs(scoresQuery);
            const scoresMap = new Map(scoresSnap.docs.map(d => [d.data().leerling_id, { id: d.id, ...d.data() }]));

            const leerlingIds = groupData.leerling_ids || [];
            let leerlingenData = [];
            if (leerlingIds.length > 0) {
                const leerlingenQuery = query(collection(db, 'toegestane_gebruikers'), where('__name__', 'in', leerlingIds));
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
            
            setDetails({
                groep_naam: groupData.naam,
                test_naam: testData.naam,
                eenheid: testData.eenheid,
                leerlingen: leerlingenData.sort((a,b) => a.naam.localeCompare(b.naam))
            });

        } catch (error) {
            toast.error("Details konden niet worden geladen.");
            console.error(error);
        }
        setLoading(false);
    }, [groepId, testId, datum]);

    useEffect(() => { 
        fetchDetails(); 
    }, [fetchDetails]);

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

    const cancelEdit = () => {
        setEditingScore({ id: null, score: '', validation: null });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Details laden...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <Link to="/scores" className="flex items-center text-sm text-gray-600 hover:text-purple-700 mb-6 font-medium transition-colors">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Terug naar overzicht
                </Link>
                
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">{details.test_naam}</h1>
                                <div className="flex items-center gap-4 mt-2 text-gray-600">
                                    <div className="flex items-center">
                                        <UserGroupIcon className="h-5 w-5 mr-1" />
                                        <span>{details.groep_naam}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <CalendarIcon className="h-5 w-5 mr-1" />
                                        <span>{new Date(datum).toLocaleDateString('nl-BE', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statistieken */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            icon={UserGroupIcon}
                            title="Totaal Leerlingen"
                            value={stats.totaal}
                            color="blue"
                        />
                        <StatCard
                            icon={CheckIcon}
                            title="Scores Ingevoerd"
                            value={stats.compleet}
                            subtitle={`${stats.percentage}% compleet`}
                            color={stats.percentage === 100 ? "green" : stats.percentage > 50 ? "blue" : "red"}
                        />
                        <StatCard
                            icon={ChartBarIcon}
                            title="Gemiddelde Score"
                            value={details.leerlingen.filter(l => l.punt !== null).length > 0 
                                ? (details.leerlingen
                                    .filter(l => l.punt !== null)
                                    .reduce((sum, l) => sum + l.punt, 0) / 
                                   details.leerlingen.filter(l => l.punt !== null).length
                                  ).toFixed(1)
                                : '-'
                            }
                            subtitle="punten"
                            color="purple"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Score Verdeling */}
                        <div className="lg:col-span-1">
                            <ScoreDistributionChart leerlingen={details.leerlingen} />
                        </div>

                        {/* Scores Lijst */}
                        <div className="lg:col-span-2">
                            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                                <div className="p-6 border-b border-gray-200/70">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Individuele Scores
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Klik op het potlood-icoon om een score te bewerken
                                    </p>
                                </div>
                                
                                <div className="max-h-96 overflow-y-auto">
                                    <ul className="divide-y divide-gray-200/70">
                                        {details.leerlingen?.map(lid => (
                                            <li key={lid.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                                    <div className="font-medium text-gray-900">
                                                        {lid.naam}
                                                    </div>
                                                    
                                                    <div className="text-center">
                                                        {editingScore.id === lid.score_id ? (
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={editingScore.score}
                                                                    onChange={e => handleScoreChange(e.target.value)}
                                                                    onKeyPress={e => e.key === 'Enter' && handleUpdateScore()}
                                                                    className={`w-24 p-2 border-2 rounded-md text-center mx-auto ${
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
                                                            <span className="font-bold text-lg text-purple-700">
                                                                {lid.score !== null ? formatScore(lid.score, details.eenheid) : '-'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="text-center">
                                                        <span className={`font-bold text-lg ${getScoreColorClass(lid.punt)}`}>
                                                            {lid.punt !== null ? `${lid.punt} pt` : '-'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex justify-center items-center gap-2">
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
                    </div>
                    
                    {/* Acties */}
                    <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="font-semibold text-gray-900">Testafname Acties</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Beheer deze testafname en de bijbehorende scores
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate('/nieuwe-testafname')}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                    Nieuwe Testafname
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                                >
                                    Afdrukken
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}