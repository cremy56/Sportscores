// src/pages/NieuweTestafname.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
function parseTijdScore(input) {
    // Ondersteunt notaties als 28'10 of 5:30 of 4.5
    if (!input) return NaN;

    if (input.includes("'")) {
        const [min, sec] = input.split("'");
        const minNum = parseInt(min, 10);
        const secNum = parseInt(sec, 10);
        if (isNaN(minNum) || isNaN(secNum)) return NaN;
        return minNum + secNum / 60;
    }

    if (input.includes(":")) {
        const [min, sec] = input.split(":");
        const minNum = parseInt(min, 10);
        const secNum = parseInt(sec, 10);
        if (isNaN(minNum) || isNaN(secNum)) return NaN;
        return minNum + secNum / 60;
    }

    // Anders: probeer gewone float
    return parseFloat(input.replace(',', '.'));
}


export default function NieuweTestafname() {
    const navigate = useNavigate();
    const { profile } = useOutletContext();
    const [groepen, setGroepen] = useState([]);
    const [testen, setTesten] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedTestId, setSelectedTestId] = useState('');
    const [scores, setScores] = useState({});
    const [calculatedPoints, setCalculatedPoints] = useState({});
    const [pointLoading, setPointLoading] = useState({});

    useEffect(() => {
        if (!profile) return;
        setLoading(true);
        const fetchData = async () => {
            const [groepenRes, testenRes] = await Promise.all([
                supabase.rpc('get_groups_with_members', { p_leerkracht_id: profile.id }),
                supabase.from('testen').select('*').order('naam')
            ]);
            if (groepenRes.error) toast.error("Kon groepen niet laden."); else setGroepen(groepenRes.data || []);
            if (testenRes.error) toast.error("Kon testen niet laden."); else setTesten(testenRes.data || []);
            setLoading(false);
        };
        fetchData();
    }, [profile]);

    const getPointForScore = useCallback(async (leerlingId, score) => {
        if (score === '') {
            setCalculatedPoints(prev => ({ ...prev, [leerlingId]: null }));
            return;
        }

        const numericScore = isTijdTest ? parseTijdScore(score) : parseFloat(score.replace(',', '.'));

        if (isNaN(numericScore)) {
            setCalculatedPoints(prev => ({ ...prev, [leerlingId]: null }));
            return;
        }

        setPointLoading(prev => ({ ...prev, [leerlingId]: true }));

        const { data, error } = await supabase.rpc('get_punt_for_score', {
            p_leerling_id: leerlingId,
            p_test_id: selectedTestId,
            p_score: numericScore,
            p_test_datum: new Date().toISOString().split('T')[0]
        });

        if (error) {
            console.error("Fout bij berekenen punt:", error);
        } else {
            setCalculatedPoints(prev => ({ ...prev, [leerlingId]: data }));
        }
        setPointLoading(prev => ({ ...prev, [leerlingId]: false }));
    }, [selectedTestId]);

    const handleScoreChange = (leerlingId, score) => {
        setScores(prevScores => ({ ...prevScores, [leerlingId]: score }));
        getPointForScore(leerlingId, score);
    };

    const handleSaveScores = async () => {
        if (!selectedGroupId || !selectedTestId) {
            toast.error("Selecteer eerst een groep en een test.");
            return;
        }
        const scoresToInsert = Object.entries(scores)
            .filter(([_, score]) => score !== '' && score !== null && !isNaN(parseFloat(score.replace(',', '.'))))
            .map(([leerlingId, score]) => ({
                leerling_id: leerlingId,
                test_id: selectedTestId,
                score: isTijdTest ? parseTijdScore(score) : parseFloat(score.replace(',', '.'))

            }));
        if (scoresToInsert.length === 0) {
            toast.error("Geen geldige scores ingevuld om op te slaan.");
            return;
        }
        const promise = supabase.rpc('bulk_insert_scores', { scores_data: scoresToInsert });
        toast.promise(promise, {
            loading: 'Scores opslaan...',
            success: () => {
                navigate('/scores');
                return 'Scores succesvol opgeslagen!';
            },
            error: (err) => `Fout bij opslaan: ${err.message}`
        });
    };

    const selectedGroup = useMemo(() => groepen.find(g => g.groep_id === selectedGroupId), [groepen, selectedGroupId]);
    const selectedTest = useMemo(() => testen.find(t => t.id === selectedTestId), [testen, selectedTestId]);

    // Hulpfunctie om te bepalen of het een tijdstest is
    const isTijdTest = useMemo(() => {
        if (!selectedTest) return false;
        const tijdEenheden = ['s', 'min', 'sec'];
        return tijdEenheden.some(eenheid => selectedTest.eenheid?.toLowerCase().includes(eenheid));
    }, [selectedTest]);

    return (
        <div className="max-w-4xl mx-auto">
            <Link to="/scores" className="flex items-center text-sm text-gray-600 hover:text-purple-700 mb-4 font-semibold">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Annuleren en terug naar overzicht
            </Link>
            <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">
                <h1 className="text-2xl font-bold mb-4">Nieuwe Testafname</h1>
                {loading ? <p>Laden...</p> : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="group-select" className="block text-sm font-medium text-gray-700">Kies een groep</label>
                                <select id="group-select" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="mt-1 w-full p-2 border rounded-md shadow-sm">
                                    <option value="">-- Selecteer een groep --</option>
                                    {groepen.map(g => <option key={g.groep_id} value={g.groep_id}>{g.groep_naam}</option>)}
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
                                <div className="grid grid-cols-3 gap-4 mb-2 px-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    <span>Leerling</span>
                                    <span className="text-right">Score ({selectedTest?.eenheid})</span>
                                    <span className="text-center">Punt (/ {selectedTest?.max_punten || 20})</span>
                                </div>
                                <ul className="space-y-2">
                                    {(selectedGroup.leden || []).map(lid => (
                                        <li key={lid.leerling_id} className="grid grid-cols-3 items-center gap-4 p-2 bg-white rounded-md shadow-sm">
                                            <span className="font-medium truncate">{lid.naam}</span>
                                            <input
                                                type={isTijdTest ? "text" : "number"}
                                                step={isTijdTest ? undefined : "any"}
                                                placeholder="Score"
                                                onChange={(e) => handleScoreChange(lid.leerling_id, e.target.value)}
                                                className="w-full p-1 border rounded-md text-right"
                                            />
                                            <div className="text-center font-bold text-lg text-purple-700 w-16 mx-auto">
                                                {pointLoading[lid.leerling_id] ? '...' : (
                                                    calculatedPoints[lid.leerling_id] ?? '-'
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="text-right mt-4">
                                    <button onClick={handleSaveScores} className="bg-purple-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-purple-800">
                                        Scores Opslaan
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
