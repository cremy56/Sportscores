// src/pages/NieuweTestafname.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import Select from 'react-select';

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

    // ... (jouw bestaande useEffects om groepen en testen op te halen)

    useEffect(() => {
        // Logica om leerlingen op te halen wanneer een groep is geselecteerd
        // ...
    }, [selectedGroep]);


    // --- FUNCTIE VOOR DE LIVE PREVIEW ---
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


    // Functie om de testafname op te slaan
    const handleSave = async () => {
        // ... (jouw bestaande logica om alles op te slaan)
    };

    // --- DE JSX OM DE LIVE PREVIEW TE TONEN ---
    return (
        <div>
            {/* ... (jouw JSX voor het selecteren van groep, test en datum) ... */}

            {leerlingen.length > 0 && (
                <div>
                    <h3>Scores Invoeren</h3>
                    <ul>
                        {leerlingen.map(leerling => (
                            <li key={leerling.id}>
                                <span>{leerling.data.naam}</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder={`Score in ${selectedTest?.eenheid || ''}`}
                                    value={scores[leerling.id]?.score || ''}
                                    onChange={(e) => handleScoreChange(leerling.id, e.target.value)}
                                />
                                {/* Live Preview Div */}
                                <div>
                                    {scores[leerling.id]?.isCalculating ? (
                                        <span>...</span>
                                    ) : (
                                        scores[leerling.id]?.rapportpunt !== null && (
                                            <strong>{scores[leerling.id].rapportpunt} / 20</strong>
                                        )
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <button onClick={handleSave}>Testafname Opslaan</button>
                </div>
            )}
        </div>
    );
}