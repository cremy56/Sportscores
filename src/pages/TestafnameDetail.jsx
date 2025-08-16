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
    if (eenheid === 'seconden' || eenheid === 'minuten') {
        const mins = Math.floor(score / 60);
        const secs = Math.round(score % 60);
        return `${mins}'${secs.toString().padStart(2, '0')}"`;
    }
    return score;
}

function getScoreColorClass(punt, maxPunten = 20) {
    if (punt === null || punt === undefined) return 'text-gray-400';
    const percentage = (punt / maxPunten) * 100;
    if (percentage < 40) return 'text-red-600';
    if (percentage < 60) return 'text-yellow-600';
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
const handleScoreChange = (value) => {
    console.log('🔥 NEW HANDLE SCORE CHANGE 🔥');
    
    const validation = validateScore(value, details.eenheid);
    let previewPoints = null;
    const numericValue = value ? parseFloat(value.toString().replace(',', '.')) : null;
    
    if (numericValue !== null && !isNaN(numericValue) && editingScore.leerlingId) {
        const leerling = details.leerlingen.find(l => l.id === editingScore.leerlingId);
        
        if (leerling && details.testNorms.length > 0 && leerling.leeftijd && leerling.geslacht) {
            console.log('🚀 Calling NEW interpolation function...');
            previewPoints = calculatePointsWithInterpolation_NEW(
                numericValue, 
                leerling.leeftijd, 
                leerling.geslacht, 
                details.testNorms,
                details.score_richting
            );
            console.log('✅ Preview points result:', previewPoints);
        }
    }
    
    setEditingScore(prev => ({ 
        ...prev, 
        score: value, 
        validation,
        previewPoints
    }));
};
// Nieuwe functie voor score naar punt conversie met lineaire interpolatie
function calculatePointsWithInterpolation_NEW(score, age, gender, normsArray, scoreDirection = 'hoog') {
    console.log('🔥 NEW INTERPOLATION FUNCTION CALLED 🔥');
    console.log('Parameters:', { score, age, gender, normsArrayLength: normsArray?.length, scoreDirection });

    if (!score || !age || !gender || !normsArray || normsArray.length === 0) {
        console.log('❌ Early return - missing parameters');
        return null;
    }

    // Flatten de normen data - extract alle punten_schaal items
    let allNorms = [];
    normsArray.forEach((normDoc, docIndex) => {
        console.log(`📋 Processing norm document ${docIndex}:`, normDoc);
        
        if (normDoc.punten_schaal && Array.isArray(normDoc.punten_schaal)) {
            console.log(`✅ Found punten_schaal with ${normDoc.punten_schaal.length} items`);
            normDoc.punten_schaal.forEach((punt, puntIndex) => {
                console.log(`  ➕ Adding punt ${puntIndex}:`, punt);
                allNorms.push(punt);
            });
        } else {
            console.log(`❌ No punten_schaal found in document ${docIndex}`);
        }
    });

    console.log('📊 Total flattened norms:', allNorms.length);

    if (allNorms.length === 0) {
        console.log('❌ No norms found in punten_schaal arrays');
        return null;
    }

    // Gebruik leeftijd 17 als fallback voor oudere leerlingen
    const targetAge = Math.min(age, 17);
    console.log('🎯 Target age (capped at 17):', targetAge);
    
    // Converteer geslacht
    const targetGender = gender.toLowerCase() === 'man' ? 'M' : 
                        gender.toLowerCase() === 'vrouw' ? 'V' : 
                        gender.toUpperCase();
    
    console.log('🚻 Target gender converted:', `"${gender}" -> "${targetGender}"`);
    
    // Filter normen
    const relevantNorms = allNorms
        .filter(norm => {
            const ageMatch = norm.leeftijd === targetAge;
            const genderMatch = norm.geslacht === targetGender;
            console.log(`🔍 Norm check: leeftijd ${norm.leeftijd}===${targetAge} (${ageMatch}) && geslacht "${norm.geslacht}"==="${targetGender}" (${genderMatch})`);
            return ageMatch && genderMatch;
        })
        .sort((a, b) => a.score_min - b.score_min);

    console.log('✅ Relevant norms found:', relevantNorms.length);

    if (relevantNorms.length === 0) {
        console.log(`❌ No matching norms for age ${targetAge}, gender ${targetGender}`);
        return null;
    }

    // Interpolatie logic
    if (score < relevantNorms[0].score_min) {
        const result = scoreDirection === 'hoog' ? 0 : relevantNorms[0].punt;
        console.log('⬇️ Score below minimum, returning:', result);
        return result;
    }

    const highestNorm = relevantNorms[relevantNorms.length - 1];
    if (score >= highestNorm.score_min) {
        console.log('⬆️ Score above maximum, returning:', highestNorm.punt);
        return highestNorm.punt;
    }

    // Zoek interpolatie range
    for (let i = 0; i < relevantNorms.length - 1; i++) {
        const currentNorm = relevantNorms[i];
        const nextNorm = relevantNorms[i + 1];

        if (score >= currentNorm.score_min && score < nextNorm.score_min) {
            const scoreDiff = nextNorm.score_min - currentNorm.score_min;
            const pointDiff = nextNorm.punt - currentNorm.punt;
            const scorePosition = score - currentNorm.score_min;
            const interpolatedPoints = currentNorm.punt + (scorePosition / scoreDiff) * pointDiff;
            const result = Math.round(interpolatedPoints * 2) / 2;
            
            console.log('🎯 INTERPOLATION SUCCESS!');
            console.log('Result:', result);
            return result;
        }
    }

    const fallback = relevantNorms[relevantNorms.length - 1].punt;
    console.log('🔄 Using fallback:', fallback);
    return fallback;
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

        // Dynamic thresholds based on max points
        const excellentThreshold = Math.round(maxPunten * 0.8); // 80%
        const goodThreshold = Math.round(maxPunten * 0.6); // 60%
        const satisfactoryThreshold = Math.round(maxPunten * 0.4); // 40%

        const excellent = punten.filter(p => p >= excellentThreshold).length;
        const good = punten.filter(p => p >= goodThreshold && p < excellentThreshold).length;
        const satisfactory = punten.filter(p => p >= satisfactoryThreshold && p < goodThreshold).length;
        const poor = punten.filter(p => p < satisfactoryThreshold).length;
        
        const total = punten.length;
        const average = (punten.reduce((sum, p) => sum + p, 0) / total).toFixed(1);

        return {
            excellent: { count: excellent, percentage: Math.round((excellent / total) * 100), threshold: excellentThreshold },
            good: { count: good, percentage: Math.round((good / total) * 100), threshold: goodThreshold },
            satisfactory: { count: satisfactory, percentage: Math.round((satisfactory / total) * 100), threshold: satisfactoryThreshold },
            poor: { count: poor, percentage: Math.round((poor / total) * 100) },
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
                        Uitstekend ({distribution.excellent.threshold}-{distribution.maxPunten})
                    </span>
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
                    <span className="text-sm font-medium text-blue-700">
                        Goed ({distribution.good.threshold}-{distribution.excellent.threshold - 1})
                    </span>
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
                    <span className="text-sm font-medium text-yellow-700">
                        Voldoende ({distribution.satisfactory.threshold}-{distribution.good.threshold - 1})
                    </span>
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
                   <span className="text-sm font-medium text-red-700">
                       Onvoldoende (&lt;{distribution.satisfactory.threshold})
                   </span>
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
        score_richting: 'hoog',
        leerlingen: [],
        testNorms: []
    });
    const [loading, setLoading] = useState(true);
    const [editingScore, setEditingScore] = useState({ id: null, score: '', validation: null, leerlingId: null, previewPoints: null });
    const [editingDate, setEditingDate] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [updating, setUpdating] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

            // Haal normen op voor deze test
            let testNorms = [];
            try {
                const normsQuery = query(collection(db, 'normen'), where('test_id', '==', testId));
                const normsSnap = await getDocs(normsQuery);
                testNorms = normsSnap.docs.map(d => d.data());
            } catch (error) {
                console.warn("Kon normen niet ophalen:", error);
            }
            
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
                        leeftijd: d.data().leeftijd,
                        geslacht: d.data().geslacht,
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
                max_punten: testData.max_punten || 20,
                score_richting: testData.score_richting || 'hoog',
                leerlingen: leerlingenData.sort((a,b) => a.naam.localeCompare(b.naam)),
                testNorms: testNorms
            });

        } catch (error) {
            toast.error("Details konden niet worden geladen.");
            console.error(error);
        }
        setLoading(false);
    }, [groepId, testId, datum]);

    useEffect(() => { 
        fetchDetails(); 
        setNewDate(datum);
    }, [fetchDetails, datum]);

    const handleEditClick = (scoreId, currentScore, leerlingId) => {
        setEditingScore({ 
            id: scoreId, 
            score: currentScore ?? '', 
            validation: { valid: true, message: '' },
            leerlingId: leerlingId,
            previewPoints: null
        });
    };

    const handleScoreChange = (value) => {
        const validation = validateScore(value, details.eenheid);
        
        // Bereken preview punten tijdens typen
        let previewPoints = null;
        if (value && !isNaN(parseFloat(value.replace(',', '.'))) && editingScore.leerlingId) {
            const leerling = details.leerlingen.find(l => l.id === editingScore.leerlingId);
            if (leerling && details.testNorms.length > 0 && leerling.leeftijd && leerling.geslacht) {
                const scoreValue = parseFloat(value.replace(',', '.'));
                previewPoints = calculatePointsWithInterpolation(
                    scoreValue, 
                    leerling.leeftijd, 
                    leerling.geslacht, 
                    details.testNorms,
                    details.score_richting
                );
            }
        }
        
        setEditingScore(prev => ({ 
            ...prev, 
            score: value, 
            validation,
            previewPoints
        }));
    };

    const handleUpdateScore = async () => {
        if (!editingScore.id || !editingScore.validation?.valid) return;
        
        const scoreValue = parseFloat(editingScore.score.replace(',', '.'));
        if (isNaN(scoreValue)) {
            toast.error("Voer een geldige score in.");
            return;
        }

        // Vind de leerling gegevens
        const leerling = details.leerlingen.find(l => l.id === editingScore.leerlingId);
        if (!leerling) {
            toast.error("Leerling gegevens niet gevonden.");
            return;
        }

        // Bereken punten met interpolatie
        let calculatedPoints = null;
        if (details.testNorms.length > 0 && leerling.leeftijd && leerling.geslacht) {
            calculatedPoints = calculatePointsWithInterpolation(
                scoreValue, 
                leerling.leeftijd, 
                leerling.geslacht, 
                details.testNorms,
                details.score_richting
            );
        }

        setUpdating(true);
        const scoreRef = doc(db, 'scores', editingScore.id);
        
        try {
            const updateData = { score: scoreValue };
            if (calculatedPoints !== null) {
                updateData.rapportpunt = calculatedPoints;
            }
            
            await updateDoc(scoreRef, updateData);
            
            const message = calculatedPoints !== null 
                ? `Score succesvol bijgewerkt! Punten: ${calculatedPoints}/20`
                : "Score succesvol bijgewerkt!";
            toast.success(message);
            
            fetchDetails();
            setEditingScore({ id: null, score: '', validation: null, leerlingId: null, previewPoints: null });
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
        if (!newDate || newDate === datum) {
            setEditingDate(false);
            return;
        }

        const loadingToast = toast.loading('Datum bijwerken...');
        try {
            // Update all scores with the new date
            const scoresQuery = query(collection(db, 'scores'), 
                where('groep_id', '==', groepId),
                where('test_id', '==', testId),
                where('datum', '==', datum)
            );
            const scoresSnap = await getDocs(scoresQuery);
            
            const batch = writeBatch(db);
            scoresSnap.docs.forEach(doc => {
                batch.update(doc.ref, { datum: newDate });
            });
            await batch.commit();

            toast.success("Testdatum succesvol bijgewerkt!");
            setEditingDate(false);
            navigate(`/testafname/${groepId}/${testId}/${newDate}`);
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
                where('datum', '==', datum)
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
        link.setAttribute('download', `${details.test_naam}_${details.groep_naam}_${datum}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const cancelEdit = () => {
        setEditingScore({ id: null, score: '', validation: null, leerlingId: null, previewPoints: null });
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
                                        {editingDate ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    value={newDate}
                                                    onChange={(e) => setNewDate(e.target.value)}
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                                <button
                                                    onClick={handleUpdateDate}
                                                    className="text-green-600 hover:text-green-800"
                                                >
                                                    <CheckIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {setEditingDate(false); setNewDate(datum);}}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span>{new Date(datum).toLocaleDateString('nl-BE', { 
                                                    weekday: 'long', 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric' 
                                                })}</span>
                                                <button
                                                    onClick={() => setEditingDate(true)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Datum wijzigen"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
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
                            subtitle={`/ ${details.max_punten} punten`}
                            color="purple"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Score Verdeling */}
                        <div className="lg:col-span-1">
                            <ScoreDistributionChart 
                                leerlingen={details.leerlingen} 
                                maxPunten={details.max_punten}
                            />
                        </div>

                        {/* Scores Lijst */}
                        <div className="lg:col-span-2">
                            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                                <div className="p-6 border-b border-gray-200/70">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Individuele Scores {details.testNorms.length > 0 && <span className="text-sm text-green-600">(met interpolatie)</span>}
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
                                                        {lid.leeftijd && (
                                                            <span className="text-xs text-gray-500 block">
                                                                {lid.leeftijd} jaar, {lid.geslacht}
                                                            </span>
                                                        )}
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
                                                                {editingScore.previewPoints !== null && editingScore.validation?.valid && (
                                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-green-600 whitespace-nowrap font-bold">
                                                                        Preview: {editingScore.previewPoints}/20
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
                                                        {editingScore.id === lid.score_id && editingScore.previewPoints !== null && editingScore.validation?.valid ? (
                                                            <span className="font-bold text-lg text-green-600 animate-pulse">
                                                                {editingScore.previewPoints}/{details.max_punten}
                                                            </span>
                                                        ) : (
                                                            <span className={`font-bold text-lg ${getScoreColorClass(lid.punt, details.max_punten)}`}>
                                                                {lid.punt !== null ? `${lid.punt}/${details.max_punten}` : '-'}
                                                            </span>
                                                        )}
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
                                                                    onClick={() => handleEditClick(lid.score_id, lid.score, lid.id)}
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
                    
                    {/* Enhanced Testafname Acties */}
                    <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Testafname Beheer</h3>
                            <p className="text-sm text-gray-600">
                                Beheer deze testafname en de bijbehorende scores
                                {details.testNorms.length > 0 && (
                                    <span className="block text-green-600 font-medium mt-1">
                                        ✓ Automatische puntenberekening met interpolatie actief
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Export Data */}
                            <button
                                onClick={exportToCSV}
                                disabled={details.leerlingen.length === 0}
                                className="flex items-center justify-center px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                                Exporteer CSV
                            </button>

                            {/* Print Report */}
                            <button
                                onClick={() => window.print()}
                                className="flex items-center justify-center px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                            >
                                <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                                Print Rapport
                            </button>

                            {/* Refresh Data */}
                            <button
                                onClick={fetchDetails}
                                disabled={loading}
                                className="flex items-center justify-center px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium disabled:opacity-50"
                            >
                                <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Vernieuwen
                            </button>

                            {/* Delete Test Session */}
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center justify-center px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                            >
                                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                                Verwijder Testafname
                            </button>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6 pt-6 border-t border-gray-200/70">
                            <h4 className="text-lg font-medium text-gray-900 mb-3">Snelle Acties</h4>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => navigate('/nieuwe-testafname')}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                                >
                                    Nieuwe Testafname
                                </button>
                                <button
                                    onClick={() => navigate(`/test/${testId}`)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                                >
                                    Test Details
                                </button>
                                <button
                                    onClick={() => navigate(`/groep/${groepId}`)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                                >
                                    Groep Details
                                </button>
                            </div>
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