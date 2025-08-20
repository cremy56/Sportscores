// src/pages/NieuweTestafname.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// --- HELPER FUNCTIES (bovenaan het bestand) ---

function calculateAge(birthDate, testDate) {
    if (!birthDate || !testDate) return null;
    let age = testDate.getFullYear() - birthDate.getFullYear();
    const m = testDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && testDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

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
        const genderMapping = { 'man': 'M', 'vrouw': 'V', 'jongen': 'M', 'meisje': 'V' };
        const mappedGender = genderMapping[geslacht.toLowerCase()] || geslacht.toUpperCase();
        const relevantNorms = punten_schaal.filter(n => n.leeftijd === normAge && n.geslacht === mappedGender).sort((a, b) => a.punt - b.punt);
        if (relevantNorms.length === 0) return null;
        let lowerBoundNorm = null;
        for (const norm of relevantNorms) {
            const meetsRequirement = score_richting === 'laag' ? score <= norm.score_min : score >= norm.score_min;
            if (meetsRequirement) {
                lowerBoundNorm = norm;
            } else {
                if (score_richting === 'hoog') break;
            }
        }
        if (!lowerBoundNorm) return 0;
        let finalPunt = lowerBoundNorm.punt;
        const upperBoundNorm = relevantNorms.find(n => n.punt === lowerBoundNorm.punt + 1);
        if (upperBoundNorm) {
            const isBetweenNorms = score_richting === 'laag' ? score < lowerBoundNorm.score_min : score > lowerBoundNorm.score_min;
            if (isBetweenNorms) finalPunt += 0.5;
        }
        return finalPunt;
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

// NIEUW: Helper functie om tijd geleden te formatteren
function formatTimeAgo(pastDate, referenceDate) {
    const seconds = Math.floor((referenceDate - pastDate) / 1000);
    const days = Math.floor(seconds / 86400);

    if (days > 30) {
        return `${Math.floor(days / 30)} maand(en) geleden`;
    }
    if (days > 7) {
        return `${Math.floor(days / 7)} week/weken geleden`;
    }
    if (days > 1) {
        return `${days} dag(en) geleden`;
    }
    return "Vandaag";
}

// --- HOOFDCOMPONENT ---
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

    // NIEUW: State voor de waarschuwings-popup
    const [warningModal, setWarningModal] = useState({ isOpen: false, message: '', onConfirm: null, onCancel: null });
    
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
        setScores({});
    }, [selectedGroep]);

   useEffect(() => {
        const checkForRecentTests = async () => {
            if (!selectedGroep || !selectedTest || !datum || !selectedGroep.leerling_ids || selectedGroep.leerling_ids.length === 0) {
                return;
            }

            const geselecteerdeDatum = new Date(datum);
            const oneMonthAgo = new Date(geselecteerdeDatum);
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            
            const scoresQuery = query(collection(db, 'scores'),
                where('test_id', '==', selectedTest.id),
                where('leerling_id', 'in', selectedGroep.leerling_ids),
                where('datum', '>=', oneMonthAgo),
                where('datum', '<', geselecteerdeDatum)
            );

            const querySnapshot = await getDocs(scoresQuery);
            if (!querySnapshot.empty) {
                const recentScores = querySnapshot.docs.map(d => d.data());
                const mostRecentAfname = recentScores.sort((a, b) => b.datum.toMillis() - a.datum.toMillis())[0];
                const afnameDatum = mostRecentAfname.datum.toDate();

                // Haal alle unieke leerkracht IDs op
                const teacherIds = [...new Set(recentScores.map(s => s.leerkracht_id).filter(Boolean))];
                let teacherNames = [];

                if (teacherIds.length > 0) {
                    const leerkrachtenQuery = query(collection(db, 'toegestane_gebruikers'), where('__name__', 'in', teacherIds));
                    const leerkrachtenSnap = await getDocs(leerkrachtenQuery);
                    const leerkrachtenMap = new Map(leerkrachtenSnap.docs.map(d => [d.id, d.data().naam]));
                    
                    teacherNames = teacherIds.map(id => {
                        if (id === auth.currentUser.uid) return 'jezelf';
                        return leerkrachtenMap.get(id) || 'een onbekende leerkracht';
                    });
                }
                
                const leerkrachtTekst = teacherNames.length > 0 
                    ? new Intl.ListFormat('nl-BE', { style: 'long', type: 'conjunction' }).format(teacherNames)
                    : 'een leerkracht';

                const affectedStudentsCount = new Set(recentScores.map(s => s.leerling_id)).size;
                
                setWarningModal({
                    isOpen: true,
                    message: `${affectedStudentsCount} leerling(en) van deze groep hebben deze test ${formatTimeAgo(afnameDatum, geselecteerdeDatum)} reeds afgelegd bij ${leerkrachtTekst}.`,
                    onConfirm: () => setWarningModal({ isOpen: false, message: '', onConfirm: null, onCancel: null }),
                    onCancel: () => {
                        setSelectedTest(null);
                        setWarningModal({ isOpen: false, message: '', onConfirm: null, onCancel: null });
                    }
                });
            }
        };

        checkForRecentTests();
    }, [selectedGroep, selectedTest, datum]);

    // Debounced effect to calculate points
    useEffect(() => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        const studentIdToCalculate = Object.keys(scores).find(id => scores[id]?.isCalculating);
        if (studentIdToCalculate && selectedTest) {
            debounceTimeoutRef.current = setTimeout(async () => {
                const leerling = leerlingen.find(l => l.id === studentIdToCalculate);
                const scoreToCalc = scores[studentIdToCalculate];
                const scoreValue = parseFloat(String(scoreToCalc.score).replace(',', '.'));
                if (!isNaN(scoreValue) && leerling) {
                    const newPunt = await calculatePuntFromScore(selectedTest, leerling.data, scoreValue, new Date(datum));
                    setScores(prev => ({ ...prev, [studentIdToCalculate]: { ...prev[studentIdToCalculate], rapportpunt: newPunt, isCalculating: false } }));
                } else {
                    setScores(prev => ({ ...prev, [studentIdToCalculate]: { ...prev[studentIdToCalculate], rapportpunt: null, isCalculating: false } }));
                }
            }, 500);
        }
        return () => clearTimeout(debounceTimeoutRef.current);
    }, [scores, selectedTest, datum, leerlingen]);

    const handleScoreChange = (leerlingId, newScore) => {
        setScores(prev => ({
            ...prev,
            [leerlingId]: { ...prev[leerlingId], score: newScore, rapportpunt: null, isCalculating: true }
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
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="text-gray-700 font-medium">Gegevens laden...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            {/* NIEUW: Waarschuwings-popup */}
            {warningModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg">
                        <div className="flex items-center mb-4">
                            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mr-3" />
                            <h3 className="text-lg font-bold text-gray-900">Recente Testafname Gevonden</h3>
                        </div>
                        <p className="text-gray-600 mb-6">{warningModal.message}</p>
                        <p className="text-gray-800 font-medium mb-6">Wenst u deze test toch opnieuw af te nemen?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={warningModal.onCancel}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Nee
                            </button>
                            <button
                                onClick={warningModal.onConfirm}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                            >
                                Ja
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                <div className="max-w-4xl mx-auto">
                    <Link to="/scores" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group">
                        <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
                        Annuleren en terug naar scores
                    </Link>
                    
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <h1 className="text-3xl font-bold mb-8 text-gray-800">Nieuwe Testafname</h1>
                        
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <label htmlFor="date-input" className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                                    <input 
                                        type="date" 
                                        id="date-input" 
                                        value={datum} 
                                        onChange={e => setDatum(e.target.value)} 
                                        className="w-full p-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                                    />
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-2">Kies een groep</label>
                                        <select 
                                            id="group-select" 
                                            value={selectedGroep?.id || ''} 
                                            onChange={(e) => setSelectedGroep(groepen.find(g => g.id === e.target.value) || null)} 
                                            className="w-full p-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                        >
                                            <option value="">-- Selecteer groep --</option>
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
                                            className="w-full p-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">-- Selecteer test --</option>
                                            {testen.map(t => <option key={t.id} value={t.id}>{t.naam} ({t.eenheid})</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                           {selectedGroep && selectedTest && (
                            <div className="border-t border-gray-200 pt-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-semibold text-gray-800">Scores invoeren</h2>
                                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                                        {validScoresCount} / {leerlingen.length} ingevoerd
                                    </div>
                                </div>
                                
                                {leerlingen.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                                        Deze groep heeft geen leerlingen. Voeg eerst leerlingen toe aan de groep.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {leerlingen.map(lid => (
                                            <div key={lid.id} className="grid grid-cols-3 items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                                <div className="font-medium text-gray-900">{lid.data.naam}</div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right transition-all"
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
                                )}
                                
                                <div className="flex justify-end mt-8">
                                    <button 
                                        onClick={handleSaveScores}
                                        disabled={isSaving || validScoresCount === 0}
                                        className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
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
        </div>
    );
}