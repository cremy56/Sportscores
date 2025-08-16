// src/pages/NieuweTestafname.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
// NIEUWE IMPORT TOEVOEGEN
import { saveWithRetry, handleFirestoreError } from '../utils/firebaseUtils';
import React, { useState, useEffect } from 'react';

// --- HULPFUNCTIE 1: BEREKENT LEEFTIJD ---
function calculateAge(birthDate, testDate) {
    if (!birthDate || !testDate) return null;
    let age = testDate.getFullYear() - birthDate.getFullYear();
    const m = testDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && testDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// --- HULPFUNCTIE 2: HAALT NORMEN OP EN BEREKENT PUNT (LIVE) ---
async function calculatePuntFromScore(test, leerling, score, testDatum) {
    if (!test || !leerling || score === null || isNaN(score)) return null;

    try {
        const { geboortedatum, geslacht } = leerling;
        if (!geboortedatum || !geslacht) return null;

        const leeftijd = calculateAge(geboortedatum.toDate(), testDatum);
        const normAge = Math.min(leeftijd, 17);

        const normRef = doc(db, 'normen', test.id);
        const normSnap = await getDoc(normRef);
        if (!normSnap.exists()) return null;

        const { punten_schaal, score_richting } = normSnap.data();
        if (!punten_schaal || punten_schaal.length === 0) return null;

        const relevantNorms = punten_schaal.filter(
            n => n.leeftijd === normAge && n.geslacht === geslacht
        ).sort((a, b) => a.punt - b.punt);

        if (relevantNorms.length === 0) return null;

        let calculatedPunt = 0;
        for (const norm of relevantNorms) {
            if (score_richting === 'laag' ? score <= norm.score_min : score >= norm.score_min) {
                calculatedPunt = norm.punt;
            } else {
                if (score_richting !== 'laag') break;
            }
        }

        if (calculatedPunt > 0 && calculatedPunt < 20) {
            const baseNorm = relevantNorms.find(n => n.punt === calculatedPunt);
            const nextNorm = relevantNorms.find(n => n.punt === calculatedPunt + 1);
            if (baseNorm && nextNorm) {
                const halfwayScore = baseNorm.score_min + ((nextNorm.score_min - baseNorm.score_min) / 2);
                if (score_richting === 'laag' ? score <= halfwayScore : score >= halfwayScore) {
                    calculatedPunt += 0.5;
                }
            }
        }
        return calculatedPunt;

    } catch (error) {
        console.error("Fout bij live berekenen:", error);
        return null;
    }
}

function parseTijdScore(input) {
    if (!input) return NaN;
    
    // Als het een tijd format is (met ' of :)
    if (input.includes("'")) {
        const [min, sec] = input.split("'");
        return (parseInt(min, 10) * 60) + (parseInt(sec, 10) || 0);
    }
    if (input.includes(":")) {
        const [min, sec] = input.split(":");
        return (parseInt(min, 10) * 60) + (parseInt(sec, 10) || 0);
    }
    
    // Voor gewone getallen (zoals meters), parse als float
    // Vervang komma door punt voor Nederlandse decimalen
    const cleanInput = input.trim().replace(',', '.');
    
    // BELANGRIJK: Parse als gewoon getal, niet als tijd
    const parsed = parseFloat(cleanInput);
    
    console.log(`parseTijdScore: "${input}" -> ${parsed}`);
    return parsed;
}

function validateScore(score, eenheid, selectedTest, normen) {
    if (!score || score.trim() === '') {
        return { valid: true, message: '' }; // Empty is allowed
    }
    
    const numericScore = parseTijdScore(score);
    if (isNaN(numericScore)) {
        return { valid: false, message: 'Ongeldige score format' };
    }
    
    if (numericScore < 0) {
        return { valid: false, message: 'Score kan niet negatief zijn' };
    }
    
    if (eenheid === 'seconden' && numericScore > 3600) {
        return { valid: false, message: 'Score te hoog (max 1 uur)' };
    }
    
    if (eenheid === 'meter') {
        // Gebruik de hoogste norm waarde + 50% als maximum
        if (normen && normen.length > 0) {
            const hoogsteNorm = Math.max(...normen.map(n => n.score_min || 0));
            const maxMeters = Math.max(hoogsteNorm * 1.5, 1000); // minimaal 1000m
            
            if (numericScore > maxMeters) {
                return { valid: false, message: `Score te hoog (max ${Math.round(maxMeters)}m)` };
            }
        } else {
            // Fallback als er geen normen zijn
            if (numericScore > 5000) {
                return { valid: false, message: 'Score te hoog (max 5000m)' };
            }
        }
    }
    
    return { valid: true, message: '' };
}

function getScoreColorClass(punt) {
    if (punt === null || punt === undefined) return 'text-gray-400';
    if (punt < 5) return 'text-red-600';
    if (punt <= 7) return 'text-yellow-600';
    return 'text-green-600';
}

function ScoreInput({ leerling, selectedTest, onScoreChange, score, calculatedPoint, validation }) {
    const [localScore, setLocalScore] = useState(score || '');
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e) => {
        const value = e.target.value;
        setLocalScore(value);
        onScoreChange(leerling, value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    const placeholder = selectedTest?.eenheid === 'seconden' ? "2'30\" of 2:30" : 
                      selectedTest?.eenheid === 'meter' ? "Afstand in meter" :
                      `Score in ${selectedTest?.eenheid || ''}`;

    return (
        <div className="relative">
            <input
                type="text"
                value={localScore}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className={`w-full p-2 border rounded-md text-right transition-colors ${
                    validation?.valid === false 
                        ? 'border-red-500 bg-red-50' 
                        : isFocused 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-300'
                }`}
            />
            {validation?.valid === false && (
                <div className="absolute top-full left-0 mt-1 text-xs text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    {validation.message}
                </div>
            )}
        </div>
    );
}

export default function NieuweTestafname() {
    const { profile } = useOutletContext();
    const [groepen, setGroepen] = useState([]);
    const [testen, setTesten] = useState([]);
    const [selectedGroep, setSelectedGroep] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [leerlingen, setLeerlingen] = useState([]);
    const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
    // De 'scores' state houdt nu per leerling de score, het punt, en een laadstatus bij
    const [scores, setScores] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const debounceTimeoutRef = useRef(null);

    useEffect(() => {
        if (!profile?.school_id) return;
        setLoading(true);
        const fetchData = async () => {
            try {
                const groepenQuery = query(collection(db, 'groepen'), where('school_id', '==', profile.school_id));
                const testenQuery = query(collection(db, 'testen'), where('school_id', '==', profile.school_id));
                
                const [groepenSnap, testenSnap] = await Promise.all([
                    getDocs(groepenQuery),
                    getDocs(testenQuery)
                ]);

                const groepenData = groepenSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const testenData = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Haal alle leden voor alle groepen op
                const ledenPromises = groepenData.map(g => {
                    if (!g.leerling_ids || g.leerling_ids.length === 0) {
                        return Promise.resolve({ docs: [] });
                    }
                    return getDocs(query(collection(db, 'toegestane_gebruikers'), where('__name__', 'in', g.leerling_ids)));
                });
                const ledenSnaps = await Promise.all(ledenPromises);
                
                ledenSnaps.forEach((ledenSnap, index) => {
                    groepenData[index].leden = ledenSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                });

                setGroepen(groepenData);
                setTesten(testenData);
            } catch (error) {
                toast.error("Kon groepen of testen niet laden.");
                console.error(error);
            }
            setLoading(false);
        };
        fetchData();
    }, [profile]);

    // Haal normen op als een test is geselecteerd
    useEffect(() => {
        if (!selectedTestId) {
            setNormen([]);
            return;
        }
        const normenQuery = query(collection(db, 'normen'), where('test_id', '==', selectedTestId));
        getDocs(normenQuery).then(snap => {
            setNormen(snap.docs.map(d => d.data()));
        }).catch(error => {
            console.error("Fout bij laden normen:", error);
            setNormen([]);
        });
    }, [selectedTestId]);

 // VERBETERDE getPointForScore functie
const getPointForScore = useCallback((leerling, score) => {
    console.log('=== Starting getPointForScore ===');
    console.log('Student:', leerling.naam);
    console.log('Raw birth date:', leerling.geboortedatum);
    
    if (score === '' || !selectedTest || normen.length === 0) {
        console.log('Early return: missing data');
        setCalculatedPoints(prev => ({ ...prev, [leerling.id]: null }));
        return;
    }

    const numericScore = parseTijdScore(score);
    console.log('Numeric score:', numericScore);
    
    if (isNaN(numericScore)) {
        console.log('Invalid numeric score');
        setCalculatedPoints(prev => ({ ...prev, [leerling.id]: null }));
        return;
    }

    // Calculate age
    let age = calculateAge(leerling.geboortedatum);
    console.log('Calculated age:', age);
    
    if (age === null) {
        console.warn(`Cannot calculate age for student ${leerling.naam}`);
        setCalculatedPoints(prev => ({ ...prev, [leerling.id]: null }));
        return;
    }

    // Cap leeftijd op 17 jaar voor normen
    const normAge = Math.min(age, 17);
    console.log('Norm age (capped at 17):', normAge);
    
    // Gender mapping
    const genderMapping = {
        'man': 'M',
        'vrouw': 'V',
        'jongen': 'M',
        'meisje': 'V',
        'm': 'M',
        'v': 'V'
    };
    
    const normalizedGender = leerling.geslacht?.toLowerCase();
    const mappedGender = genderMapping[normalizedGender] || leerling.geslacht?.toUpperCase();
    console.log(`Gender: "${leerling.geslacht}" -> "${mappedGender}"`);
    
    // Filter relevante normen
    let relevanteNormen = normen.filter(n => {
        const matches = n.leeftijd === normAge && n.geslacht === mappedGender;
        console.log(`Norm check: age ${n.leeftijd} === ${normAge} && gender ${n.geslacht} === ${mappedGender} = ${matches}`);
        return matches;
    });
    
    console.log('Relevante normen found:', relevanteNormen.length);
    console.log('Relevante normen details:', relevanteNormen.map(n => ({ 
        punt: n.punt, 
        score_min: n.score_min,
        leeftijd: n.leeftijd,
        geslacht: n.geslacht
    })));
    
    if (relevanteNormen.length === 0) {
        console.warn(`No norms found for age ${normAge}, gender ${mappedGender}`);
        setCalculatedPoints(prev => ({ ...prev, [leerling.id]: null }));
        return;
    }
    
    // BELANGRIJKE FIX: Sorteer normen correct op punt (van laag naar hoog)
    relevanteNormen.sort((a, b) => a.punt - b.punt);
    console.log('Sorted norms by point (low to high):', relevanteNormen.map(n => ({ 
        punt: n.punt, 
        score_min: n.score_min 
    })));
    
    let behaaldPunt = 0; // Start met 0 punten
    
    console.log('Test score richting:', selectedTest.score_richting);
    
    if (selectedTest.score_richting === 'hoog') {
        // Voor 'hoog': hogere scores zijn beter
        // Ga door alle normen (van laag naar hoog punt)
        for (const norm of relevanteNormen) {
            console.log(`Check: ${numericScore} >= ${norm.score_min}? ${numericScore >= norm.score_min} (punt: ${norm.punt})`);
            if (numericScore >= norm.score_min) {
                behaaldPunt = norm.punt;
                console.log(`Score qualifies for ${behaaldPunt} punten`);
                // NIET BREAKEN - ga door naar hogere punten
            }
        }
    } else { // 'laag' of 'omlaag'
        // Voor 'laag': lagere scores zijn beter
        // Ga door alle normen (van laag naar hoog punt)
        for (const norm of relevanteNormen) {
            console.log(`Check: ${numericScore} <= ${norm.score_min}? ${numericScore <= norm.score_min} (punt: ${norm.punt})`);
            if (numericScore <= norm.score_min) {
                behaaldPunt = norm.punt;
                console.log(`Score qualifies for ${behaaldPunt} punten`);
                // NIET BREAKEN - ga door naar hogere punten
            }
        }
    }
    
    console.log(`Final result: ${numericScore} -> ${behaaldPunt} punten`);
    console.log('=== End getPointForScore ===');
    
    setCalculatedPoints(prev => ({ ...prev, [leerling.id]: behaaldPunt }));
}, [selectedTest, normen, selectedTestId]);

const handleScoreChange = (leerlingId, newScore) => {
        // Update direct de input-waarde en zet de laadstatus aan
        setScores(prev => ({
            ...prev,
            [leerlingId]: { 
                ...prev[leerlingId], 
                score: newScore, 
                rapportpunt: null, // Reset het punt
                isCalculating: true // Toon laad-indicator
            }
        }));
    };

    // --- DEBOUNCING LOGICA: BEREKENT HET PUNT NA EEN KORTE PAUZE ---
    useEffect(() => {
        // Stop de vorige timer als die nog loopt
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Vind de leerling wiens score net is aangepast
        const studentIdToCalculate = Object.keys(scores).find(id => scores[id]?.isCalculating);

        if (studentIdToCalculate && selectedTest) {
            // Start een nieuwe timer
            debounceTimeoutRef.current = setTimeout(async () => {
                const leerling = leerlingen.find(l => l.id === studentIdToCalculate);
                const scoreToCalc = scores[studentIdToCalculate];
                const scoreValue = parseFloat(scoreToCalc.score.replace(',', '.'));

                if (!isNaN(scoreValue) && leerling) {
                    const newPunt = await calculatePuntFromScore(selectedTest, leerling.data, scoreValue, new Date(datum));
                    setScores(prev => ({
                        ...prev,
                        [studentIdToCalculate]: { ...prev[studentIdToCalculate], rapportpunt: newPunt, isCalculating: false }
                    }));
                } else {
                    // Als de score ongeldig is, stop met laden en toon geen punt
                    setScores(prev => ({
                        ...prev,
                        [studentIdToCalculate]: { ...prev[studentIdToCalculate], rapportpunt: null, isCalculating: false }
                    }));
                }
            }, 500); // Wacht 500ms na de laatste toetsaanslag
        }

        // Cleanup: stop de timer als de component verlaat
        return () => clearTimeout(debounceTimeoutRef.current);
    }, [scores, selectedTest, datum, leerlingen]);

    // GEWIJZIGDE handleSaveScores FUNCTIE MET NIEUWE UTILITIES
    const handleSaveScores = async () => {
        if (!selectedGroupId || !selectedTestId) {
            toast.error("Selecteer eerst een groep en een test.");
            return;
        }

        // Check voor validatie fouten
        const hasValidationErrors = Object.values(validations).some(v => v.valid === false);
        if (hasValidationErrors) {
            toast.error("Los eerst alle validatiefouten op voordat je opslaat.");
            return;
        }

        const scoresToInsert = Object.entries(scores)
            .filter(([_, score]) => score !== '' && score !== null)
            .map(([leerlingId, score]) => ({
                leerling_id: leerlingId,
                score: parseTijdScore(score),
                rapportpunt: calculatedPoints[leerlingId] || 0,
            }));

        if (scoresToInsert.length === 0) {
            toast.error("Voer ten minste één score in.");
            return;
        }

        if (scoresToInsert.some(s => isNaN(s.score))) {
            toast.error("Een of meerdere scores zijn ongeldig. Controleer de invoer.");
            return;
        }

        setSaving(true);
        const loadingToast = toast.loading('Scores opslaan...');
        
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error("Gebruiker niet ingelogd");
            }

            const batch = writeBatch(db);
            const nowDate = new Date().toISOString().split('T')[0];
            const leerlingDetails = new Map(selectedGroup.leden.map(l => [l.id, { naam: l.naam, email: l.email }]));

            scoresToInsert.forEach(item => {
                const scoreRef = doc(collection(db, 'scores'));
                batch.set(scoreRef, {
                    leerling_id: item.leerling_id,
                    leerling_naam: leerlingDetails.get(item.leerling_id)?.naam,
                    test_id: selectedTestId,
                    score: item.score,
                    rapportpunt: item.rapportpunt,
                    groep_id: selectedGroupId,
                    datum: nowDate,
                    leerkracht_id: currentUser.uid,
                    school_id: profile.school_id,
                    score_jaar: new Date().getFullYear()
                });
            });

            // GEBRUIK VAN NIEUWE UTILITY FUNCTIES
            await saveWithRetry(batch);
            toast.success(`${scoresToInsert.length} scores succesvol opgeslagen!`);
            navigate('/scores');
        } catch (error) {
            console.error("Fout bij opslaan:", error);
            // GEBRUIK VAN NIEUWE ERROR HANDLING
            const errorMessage = handleFirestoreError(error);
            toast.error(errorMessage);
        } finally {
            setSaving(false);
            toast.dismiss(loadingToast);
        }
    };

    const validScoresCount = Object.entries(scores).filter(([_, score]) => score !== '' && score !== null).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Gegevens laden...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <Link to="/scores" className="flex items-center text-sm text-gray-600 hover:text-purple-700 mb-4 font-medium transition-colors">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Annuleren en terug
                </Link>
                
                <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">Nieuwe Testafname</h1>
                    
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-2">
                                    Kies een groep
                                </label>
                                <select 
                                    id="group-select" 
                                    value={selectedGroupId} 
                                    onChange={(e) => setSelectedGroupId(e.target.value)} 
                                    className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                >
                                    <option value="">-- Selecteer een groep --</option>
                                    {groepen.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.naam} ({g.leden?.length || 0} leerlingen)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="test-select" className="block text-sm font-medium text-gray-700 mb-2">
                                    Kies een test
                                </label>
                                <select 
                                    id="test-select" 
                                    value={selectedTestId} 
                                    onChange={(e) => setSelectedTestId(e.target.value)} 
                                    disabled={!selectedGroupId} 
                                    className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                                >
                                    <option value="">-- Selecteer een test --</option>
                                    {testen.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.naam} ({t.eenheid})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                       {selectedGroup && selectedTest && (
                        <div className="border-t pt-6 p-6 mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    Scores invoeren voor {selectedTest?.label}
                                </h2>
                                <div className="text-sm text-gray-600">
                                    {validScoresCount} van {selectedGroup.leden?.length || 0} scores ingevoerd
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                {(selectedGroup.leden || []).sort((a, b) => a.naam.localeCompare(b.naam)).map(lid => (
                                    <div key={lid.id} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="font-medium text-gray-900 self-center">
                                            {lid.naam}
                                        </div>
                                        <div className="relative">
                                            {/* VERVANGEN DOOR STANDAARD INPUT */}
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                                                placeholder={`Score in ${selectedTest.eenheid}`}
                                                value={scores[lid.id] || ''}
                                                onChange={(e) => handleScoreChange(lid.id, e.target.value)}
                                            />
                                        </div>
                                        <div className="text-center self-center">
                                            <div className={`font-bold text-xl transition-colors ${getScoreColorClass(calculatedPoints[lid.id])}`}>
                                                {calculating[lid.id] ? (
                                                    <span className="text-gray-400 animate-pulse">...</span>
                                                ) : (
                                                    calculatedPoints[lid.id] !== null && calculatedPoints[lid.id] !== undefined 
                                                        ? `${calculatedPoints[lid.id]} pt` 
                                                        : '-'
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-end mt-8">
                                <button 
                                    onClick={handleSaveScores}
                                    disabled={saving || validScoresCount === 0}
                                    className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium"
                                >
                                    <CheckCircleIcon className="h-6 w-6 mr-2" />
                                    {saving ? 'Opslaan...' : `${validScoresCount} Score${validScoresCount !== 1 ? 's' : ''} Opslaan`}
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