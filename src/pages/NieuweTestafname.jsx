// src/pages/NieuweTestafname.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

function parseTijdScore(input) {
    if (!input) return NaN;
    if (input.includes("'")) {
        const [min, sec] = input.split("'");
        return (parseInt(min, 10) * 60) + (parseInt(sec, 10) || 0);
    }
    if (input.includes(":")) {
        const [min, sec] = input.split(":");
        return (parseInt(min, 10) * 60) + (parseInt(sec, 10) || 0);
    }
    return parseFloat(input.replace(',', '.'));
}

export default function NieuweTestafname() {
    const navigate = useNavigate();
    const { profile } = useOutletContext();
    const [groepen, setGroepen] = useState([]);
    const [testen, setTesten] = useState([]);
    const [normen, setNormen] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedTestId, setSelectedTestId] = useState('');
    const [scores, setScores] = useState({});
    const [calculatedPoints, setCalculatedPoints] = useState({});
    const [pointLoading, setPointLoading] = useState({});

    const selectedGroup = useMemo(() => groepen.find(g => g.id === selectedGroupId), [groepen, selectedGroupId]);
    const selectedTest = useMemo(() => testen.find(t => t.id === selectedTestId), [testen, selectedTestId]);

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
                const ledenPromises = groepenData.map(g => getDocs(query(collection(db, 'toegestane_gebruikers'), where('__name__', 'in', g.leerling_ids))));
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
        });
    }, [selectedTestId]);

    const getPointForScore = useCallback((leerling, score) => {
        if (score === '' || !selectedTest || normen.length === 0) {
            setCalculatedPoints(prev => ({ ...prev, [leerling.id]: null }));
            return;
        }

        const numericScore = parseTijdScore(score);
        if (isNaN(numericScore)) {
            setCalculatedPoints(prev => ({ ...prev, [leerling.id]: null }));
            return;
        }

        const age = new Date().getFullYear() - new Date(leerling.geboortedatum).getFullYear();
        const relevanteNormen = normen.filter(n => n.leeftijd === age && n.geslacht === leerling.geslacht);
        
        let behaaldPunt = 0;
        if (selectedTest.score_richting === 'hoog') {
            relevanteNormen.sort((a, b) => a.score_min - b.score_min);
            for (const norm of relevanteNormen) {
                if (numericScore >= norm.score_min) {
                    behaaldPunt = norm.punt;
                } else {
                    break;
                }
            }
        } else { // 'laag'
            relevanteNormen.sort((a, b) => b.score_min - a.score_min);
            for (const norm of relevanteNormen) {
                if (numericScore <= norm.score_min) {
                    behaaldPunt = norm.punt;
                } else {
                    break;
                }
            }
        }
        setCalculatedPoints(prev => ({ ...prev, [leerling.id]: behaaldPunt }));
    }, [selectedTest, normen]);

    const handleScoreChange = (leerling, score) => {
        setScores(prev => ({ ...prev, [leerling.id]: score }));
        getPointForScore(leerling, score);
    };

    const handleSaveScores = async () => {
        if (!selectedGroupId || !selectedTestId) {
            toast.error("Selecteer eerst een groep en een test.");
            return;
        }

        const scoresToInsert = Object.entries(scores)
            .filter(([_, score]) => score !== '' && score !== null)
            .map(([leerlingId, score]) => ({
                leerling_id: leerlingId,
                score: parseTijdScore(score),
                rapportpunt: calculatedPoints[leerlingId] || 0,
            }));

        if (scoresToInsert.some(s => isNaN(s.score))) {
            toast.error("Een of meerdere scores zijn ongeldig. Controleer de invoer.");
            return;
        }

        const loadingToast = toast.loading('Scores opslaan...');
        try {
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
                    leerkracht_id: profile.id,
                    school_id: profile.school_id,
                    score_jaar: new Date().getFullYear()
                });
            });

            await batch.commit();
            toast.success('Scores succesvol opgeslagen!');
            navigate('/scores');
        } catch (error) {
            toast.error(`Fout bij opslaan: ${error.message}`);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <Link to="/scores" className="flex items-center text-sm text-gray-600 hover:text-purple-700 mb-4 font-semibold">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Annuleren en terug
                </Link>
                <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-lg">
                    <h1 className="text-2xl font-bold mb-6 text-gray-800">Nieuwe Testafname</h1>
                    {loading ? <p>Laden...</p> : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="group-select" className="block text-sm font-medium text-gray-700">Kies een groep</label>
                                    <select id="group-select" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="mt-1 w-full p-2 border rounded-md shadow-sm">
                                        <option value="">-- Selecteer een groep --</option>
                                        {groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="test-select" className="block text-sm font-medium text-gray-700">Kies een test</label>
                                    <select id="test-select" value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)} disabled={!selectedGroupId} className="mt-1 w-full p-2 border rounded-md shadow-sm disabled:bg-gray-200">
                                        <option value="">-- Selecteer een test --</option>
                                        {testen.map(t => <option key={t.id} value={t.id}>{t.naam}</option>)}
                                    </select>
                                </div>
                            </div>

                            {selectedGroup && selectedTestId && (
                                <div className="border-t pt-6 mt-6">
                                    <ul className="space-y-2">
                                        {(selectedGroup.leden || []).map(lid => (
                                            <li key={lid.id} className="grid grid-cols-3 items-center gap-4 p-2 bg-white rounded-md shadow-sm">
                                                <span className="font-medium truncate">{lid.naam}</span>
                                                <input
                                                    type="text"
                                                    placeholder={`Score in ${selectedTest?.eenheid}`}
                                                    onChange={(e) => handleScoreChange(lid, e.target.value)}
                                                    className="w-full p-1 border rounded-md text-right"
                                                />
                                                <div className="text-center font-bold text-lg text-purple-700 w-16 mx-auto">
                                                    {pointLoading[lid.id] ? '...' : (
                                                        calculatedPoints[lid.id] ?? '-'
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="text-right mt-6">
                                        <button onClick={handleSaveScores} className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105">
                                            <CheckCircleIcon className="h-6 w-6 mr-2" />
                                            Scores Opslaan
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
