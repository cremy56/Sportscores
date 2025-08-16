// src/pages/NieuweTestafname.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// --- HELPER FUNCTION 1: CALCULATE AGE ---
function calculateAge(birthDate, testDate) {
    if (!birthDate || !testDate) return null;
    let age = testDate.getFullYear() - birthDate.getFullYear();
    const m = testDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && testDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// --- HELPER FUNCTION 2: FETCH NORMS AND CALCULATE POINT ---
async function calculatePuntFromScore(test, leerling, score, testDatum) {
    if (!test || !leerling || score === null || isNaN(score)) return null;

    try {
        const { geboortedatum, geslacht } = leerling;
        if (!geboortedatum || !geslacht) return null;

        const leeftijd = calculateAge(geboortedatum.toDate(), testDatum);
        const normAge = Math.min(leeftijd, 17); // Norms are capped at age 17

        const normRef = doc(db, 'normen', test.id);
        const normSnap = await getDoc(normRef);

        if (!normSnap.exists()) {
             console.warn(`No norm document found with ID: ${test.id}`);
             return null;
        }

        const { punten_schaal, score_richting } = normSnap.data();
        if (!punten_schaal || punten_schaal.length === 0) return null;
        
        const genderMapping = { 'man': 'M', 'vrouw': 'V', 'jongen': 'M', 'meisje': 'V' };
        const mappedGender = genderMapping[geslacht.toLowerCase()] || geslacht.toUpperCase();

        const relevantNorms = punten_schaal
            .filter(n => n.leeftijd === normAge && n.geslacht === mappedGender)
            .sort((a, b) => a.punt - b.punt);

        if (relevantNorms.length === 0) {
            console.warn(`No relevant norms for age: ${normAge}, gender: ${mappedGender}`);
            return null;
        }

        // ▼▼▼ UPDATED LOGIC START ▼▼▼

        let lowerBoundNorm = null;

        // Find the highest norm that the score meets
        for (const norm of relevantNorms) {
            const meetsRequirement = score_richting === 'laag' 
                ? score <= norm.score_min 
                : score >= norm.score_min;

            if (meetsRequirement) {
                lowerBoundNorm = norm;
            } else {
                // For 'hoog' scores, we can stop early once a norm isn't met
                if (score_richting === 'hoog') break;
            }
        }

        // If no norm was met, return 0
        if (!lowerBoundNorm) {
            return 0;
        }

        let finalPunt = lowerBoundNorm.punt;
        
        // Find the next norm level to check for interpolation
        const upperBoundNorm = relevantNorms.find(n => n.punt === lowerBoundNorm.punt + 1);

        if (upperBoundNorm) {
            const isBetweenNorms = score_richting === 'laag'
                ? score < lowerBoundNorm.score_min // Better score is smaller
                : score > lowerBoundNorm.score_min; // Better score is larger
            
            // If the score is not exactly on the threshold but better, add 0.5
            if (isBetweenNorms) {
                finalPunt += 0.5;
            }
        }
        
        return finalPunt;
        
        // ▲▲▲ UPDATED LOGIC END ▲▲▲

    } catch (error) {
        console.error("Error during point calculation:", error);
        toast.error("Kon punt niet berekenen.");
        return null;
    }
}


function getScoreColorClass(punt) {
    if (punt === null || punt === undefined) return 'text-gray-400';
    if (punt < 5) return 'text-red-600';
    if (punt <= 7) return 'text-yellow-600';
    return 'text-green-600';
}

export default function NieuweTestafname() {
    const { profile } = useOutletContext();
    const [groepen, setGroepen] = useState([]);
    const [testen, setTesten] = useState([]);
    const [selectedGroep, setSelectedGroep] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [leerlingen, setLeerlingen] = useState([]);
    const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
    const [scores, setScores] = useState({});
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    const debounceTimeoutRef = useRef(null);

    // Fetch initial data (groups and tests)
    useEffect(() => {
        if (!profile?.school_id) return;
        setLoading(true);
        const fetchData = async () => {
            try {
                const groepenQuery = query(collection(db, 'groepen'), where('school_id', '==', profile.school_id));
                const testenQuery = query(collection(db, 'testen'), where('school_id', '==', profile.school_id));
                
                const [groepenSnap, testenSnap] = await Promise.all([getDocs(groepenQuery), getDocs(testenQuery)]);

                const groepenData = groepenSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setGroepen(groepenData);
                setTesten(testenSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            } catch (error) {
                toast.error("Kon groepen of testen niet laden.");
                console.error(error);
            }
            setLoading(false);
        };
        fetchData();
    }, [profile]);

    // Fetch students when a group is selected
    useEffect(() => {
        if (!selectedGroep) {
            setLeerlingen([]);
            return;
        }

        const fetchLeerlingen = async () => {
            if (!selectedGroep.leerling_ids || selectedGroep.leerling_ids.length === 0) {
                 setLeerlingen([]);
                 return;
            }
            const q = query(collection(db, 'toegestane_gebruikers'), where('__name__', 'in', selectedGroep.leerling_ids));
            const snap = await getDocs(q);
            const leerlingenData = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            setLeerlingen(leerlingenData.sort((a, b) => a.data.naam.localeCompare(b.data.naam)));
        };

        fetchLeerlingen();
        setScores({}); // Reset scores when group changes
    }, [selectedGroep]);

    // Debounced effect to calculate points after user stops typing
    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        const studentIdToCalculate = Object.keys(scores).find(id => scores[id]?.isCalculating);

        if (studentIdToCalculate && selectedTest) {
            debounceTimeoutRef.current = setTimeout(async () => {
                const leerling = leerlingen.find(l => l.id === studentIdToCalculate);
                const scoreToCalc = scores[studentIdToCalculate];
                
                // Handle comma as decimal separator
                const scoreValue = parseFloat(String(scoreToCalc.score).replace(',', '.'));

                if (!isNaN(scoreValue) && leerling) {
                    const newPunt = await calculatePuntFromScore(selectedTest, leerling.data, scoreValue, new Date(datum));
                    setScores(prev => ({
                        ...prev,
                        [studentIdToCalculate]: { ...prev[studentIdToCalculate], rapportpunt: newPunt, isCalculating: false }
                    }));
                } else {
                    setScores(prev => ({
                        ...prev,
                        [studentIdToCalculate]: { ...prev[studentIdToCalculate], rapportpunt: null, isCalculating: false }
                    }));
                }
            }, 500); // 500ms debounce delay
        }

        return () => clearTimeout(debounceTimeoutRef.current);
    }, [scores, selectedTest, datum, leerlingen]);

    const handleScoreChange = (leerlingId, newScore) => {
        setScores(prev => ({
            ...prev,
            [leerlingId]: { 
                ...prev[leerlingId], 
                score: newScore, 
                rapportpunt: null,
                isCalculating: true 
            }
        }));
    };

    const handleSaveScores = async () => {
        if (!selectedGroep || !selectedTest) {
            toast.error("Selecteer een groep en een test.");
            return;
        }
        setIsSaving(true);
        const batch = writeBatch(db);
        try {
            for (const leerlingId in scores) {
                const scoreData = scores[leerlingId];
                if (scoreData.score && String(scoreData.score).trim() !== '') {
                    const scoreValue = parseFloat(String(scoreData.score).replace(',', '.'));
                    if (!isNaN(scoreValue)) {
                        const leerling = leerlingen.find(l => l.id === leerlingId);
                        const newScoreRef = doc(collection(db, 'scores'));
                        batch.set(newScoreRef, {
                            datum: new Date(datum),
                            groep_id: selectedGroep.id,
                            leerling_id: leerlingId,
                            leerling_naam: leerling?.data?.naam || 'Onbekend',
                            score: scoreValue,
                            rapportpunt: scoreData.rapportpunt ?? null,
                            school_id: profile.school_id,
                            test_id: selectedTest.id,
                            leerkracht_id: auth.currentUser.uid,
                            created_at: serverTimestamp()
                        });
                    }
                }
            }
            await batch.commit();
            toast.success("Scores succesvol opgeslagen!");
            navigate('/scores');
        } catch (error) {
            console.error("Fout bij opslaan:", error);
            toast.error("Kon de scores niet opslaan.");
        } finally {
            setIsSaving(false);
        }
    };

    const validScoresCount = Object.values(scores).filter(s => s.score && String(s.score).trim() !== '').length;

    if (loading) {
        return <div className="p-8">Gegevens laden...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <Link to="/scores" className="flex items-center text-sm text-gray-600 hover:text-purple-700 mb-4 font-medium">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Annuleren en terug
                </Link>
                
                <div className="bg-white p-6 rounded-xl shadow-md border">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">Nieuwe Testafname</h1>
                    
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label htmlFor="date-input" className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                                <input type="date" id="date-input" value={datum} onChange={e => setDatum(e.target.value)} className="w-full p-2 border rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
                            </div>
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-2">Kies een groep</label>
                                    <select 
                                        id="group-select" 
                                        value={selectedGroep?.id || ''} 
                                        onChange={(e) => setSelectedGroep(groepen.find(g => g.id === e.target.value) || null)} 
                                        className="w-full p-2 border rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="">-- Selecteer --</option>
                                        {groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="test-select" className="block text-sm font-medium text-gray-700 mb-2">Kies een test</label>
                                    <select 
                                        id="test-select" 
                                        value={selectedTest?.id || ''} 
                                        onChange={(e) => setSelectedTest(testen.find(t => t.id === e.target.value) || null)} 
                                        disabled={!selectedGroep} 
                                        className="w-full p-2 border rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                                    >
                                        <option value="">-- Selecteer --</option>
                                        {testen.map(t => <option key={t.id} value={t.id}>{t.naam} ({t.eenheid})</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                       {selectedGroep && selectedTest && (
                        <div className="border-t pt-6 mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">Scores invoeren</h2>
                                <div className="text-sm text-gray-600">{validScoresCount} / {leerlingen.length} ingevoerd</div>
                            </div>
                            
                            <div className="space-y-3">
                                {leerlingen.map(lid => (
                                    <div key={lid.id} className="grid grid-cols-3 items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                        <div className="font-medium text-gray-900">{lid.data.naam}</div>
                                        <div>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-right"
                                                placeholder={`Score in ${selectedTest.eenheid}`}
                                                value={scores[lid.id]?.score || ''}
                                                onChange={(e) => handleScoreChange(lid.id, e.target.value)}
                                            />
                                        </div>
                                        <div className={`text-center font-bold text-xl transition-colors ${getScoreColorClass(scores[lid.id]?.rapportpunt)}`}>
                                            {scores[lid.id]?.isCalculating ? (
                                                <span className="text-gray-400 animate-pulse">...</span>
                                            ) : (
                                                scores[lid.id]?.rapportpunt !== null && scores[lid.id]?.rapportpunt !== undefined 
                                                    ? `${scores[lid.id]?.rapportpunt} pt` 
                                                    : '-'
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-end mt-8">
                                <button 
                                    onClick={handleSaveScores}
                                    disabled={isSaving || validScoresCount === 0}
                                    className="flex items-center justify-center bg-purple-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                                    {isSaving ? 'Opslaan...' : `${validScoresCount} Score${validScoresCount !== 1 ? 's' : ''} Opslaan`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div>
    );
}