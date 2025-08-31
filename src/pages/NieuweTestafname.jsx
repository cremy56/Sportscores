// src/pages/NieuweTestafname.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { parseTimeInputToSeconds } from '../utils/formatters.js';

// --- HELPER FUNCTIES ---
// De helper functies (calculateAge, calculatePuntFromScore, etc.) blijven ongewijzigd.
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
        const { score_richting } = test;
        if (!score_richting) {
            console.error("Geen 'score_richting' gevonden in het test-object.");
            return null;
        }
        const { geboortedatum, geslacht } = leerling;
        if (!geboortedatum || !geslacht) return null;
        const leeftijd = calculateAge(geboortedatum.toDate(), testDatum);
        if (leeftijd === null) return null;
        const normAge = Math.min(leeftijd, 17);
        const normenQuery = query(collection(db, 'normen'), where('test_id', '==', test.id));
        const normenSnapshot = await getDocs(normenQuery);
        if (normenSnapshot.empty) return null;
        const normSnap = normenSnapshot.docs[0];
        const { punten_schaal } = normSnap.data();
        if (!punten_schaal || punten_schaal.length === 0) return null;
        const mappedGender = geslacht.toUpperCase();
        const relevantNorms = punten_schaal
            .filter(n => n.leeftijd === normAge && n.geslacht === mappedGender)
            .sort((a, b) => a.punt - b.punt);
        if (relevantNorms.length === 0) return null;
        let behaaldeNorm = null;
        let volgendeNorm = null;
        if (score_richting === 'laag') {
            if (score <= relevantNorms[relevantNorms.length - 1].score_min) return relevantNorms[relevantNorms.length - 1].punt;
            if (score >= relevantNorms[0].score_min) return relevantNorms[0].punt;
            for (let i = 0; i < relevantNorms.length - 1; i++) {
                if (score < relevantNorms[i].score_min && score >= relevantNorms[i + 1].score_min) {
                    behaaldeNorm = relevantNorms[i];
                    volgendeNorm = relevantNorms[i + 1];
                    break;
                }
            }
        } else { // 'hoog'
            if (score >= relevantNorms[relevantNorms.length - 1].score_min) return relevantNorms[relevantNorms.length - 1].punt;
            if (score <= relevantNorms[0].score_min) return relevantNorms[0].punt;
            for (let i = 0; i < relevantNorms.length - 1; i++) {
                if (score >= relevantNorms[i].score_min && score < relevantNorms[i + 1].score_min) {
                    behaaldeNorm = relevantNorms[i];
                    volgendeNorm = relevantNorms[i + 1];
                    break;
                }
            }
        }
        if (!behaaldeNorm || !volgendeNorm) {
            const exactMatch = relevantNorms.find(n => n.score_min === score);
            return exactMatch ? exactMatch.punt : (behaaldeNorm ? behaaldeNorm.punt : 0);
        }
        const midpoint = (behaaldeNorm.score_min + volgendeNorm.score_min) / 2;
        let finalPunt = behaaldeNorm.punt;
        if ((score_richting === 'laag' && score < midpoint) || (score_richting === 'hoog' && score > midpoint)) {
            finalPunt += 0.5;
        }
        return finalPunt;
    } catch (error) {
        console.error("Fout tijdens puntberekening:", error);
        return null;
    }
}
function getScoreColorClass(punt) {
   if (punt === null || punt === undefined) return 'text-gray-400';
    if (punt < 10) return 'text-red-600';
    if (punt < 13) return 'text-orange-500';
    if (punt < 15) return 'text-yellow-600';
    return 'text-green-600';
}
function formatTimeAgo(pastDate, referenceDate) {
    const seconds = Math.floor((referenceDate - pastDate) / 1000);
    if (seconds < 86400) return "Vandaag";
    const days = Math.floor(seconds / 86400);
    if (days < 7) return `${days} ${days === 1 ? 'dag' : 'dagen'} geleden`;
    if (days < 30) {
        const weeks = Math.floor(days / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weken'} geleden`;
    }
    if (days < 365) {
        const months = Math.floor(days / 30);
        return `${months} ${months === 1 ? 'maand' : 'maanden'} geleden`;
    }
    const years = Math.floor(days / 365);
    return `${years} ${years === 1 ? 'jaar' : 'jaren'} geleden`;
}

// --- HOOFDCOMPONENT ---
export default function NieuweTestafname() {
    const { profile } = useOutletContext();
    const [groepen, setGroepen] = useState([]);
    const [testen, setTesten] = useState([]);
    // --- CORRECTIE 1: Ontbrekende state voor selectedGroep toegevoegd ---
    const [selectedGroep, setSelectedGroep] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [volledigeLeerlingen, setVolledigeLeerlingen] = useState([]);
    const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
    const [scores, setScores] = useState({});
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    const debounceTimeoutRef = useRef(null);
    const [warningModal, setWarningModal] = useState({ isOpen: false });
    const [normenInfo, setNormenInfo] = useState({ M: true, V: true, loading: false });
    const [uitgeslotenLeerlingen, setUitgeslotenLeerlingen] = useState([]);

    // Fetch initial data
    useEffect(() => {
        if (!profile?.school_id) return;
        setLoading(true);
        const fetchData = async () => {
            try {
                const groepenQuery = query(collection(db, 'groepen'), where('school_id', '==', profile.school_id));
                const testenQuery = query(collection(db, 'testen'), where('school_id', '==', profile.school_id));
                const [groepenSnap, testenSnap] = await Promise.all([getDocs(groepenQuery), getDocs(testenQuery)]);
                setGroepen(groepenSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setTesten(testenSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) { toast.error("Kon groepen of testen niet laden."); }
            setLoading(false);
        };
        fetchData();
    }, [profile]);

    // Fetch students when a group is selected
    useEffect(() => {
        if (!selectedGroep) {
            setVolledigeLeerlingen([]);
            return;
        }
        const fetchLeerlingen = async () => {
            if (!selectedGroep.leerling_ids || selectedGroep.leerling_ids.length === 0) {
                 setVolledigeLeerlingen([]);
                 return;
            }
            const q = query(collection(db, 'toegestane_gebruikers'), where('__name__', 'in', selectedGroep.leerling_ids));
            const snap = await getDocs(q);
            const leerlingenData = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            // --- CORRECTIE 2: Typfout in setVolledigeLeerlingen opgelost ---
            setVolledigeLeerlingen(leerlingenData.sort((a, b) => a.data.naam.localeCompare(b.data.naam)));
        };
        fetchLeerlingen();
        setScores({});
    }, [selectedGroep]);

    // Check normen beschikbaarheid als test wijzigt
    useEffect(() => {
        if (!selectedTest) {
            setNormenInfo({ M: true, V: true, loading: false });
            return;
        }
        const checkNormen = async () => {
            setNormenInfo({ M: false, V: false, loading: true });
            try {
                const normenQuery = query(collection(db, 'normen'), where('test_id', '==', selectedTest.id));
                const normenSnapshot = await getDocs(normenQuery);
                if (normenSnapshot.empty) {
                    setNormenInfo({ M: false, V: false, loading: false });
                    return;
                }
                const normData = normenSnapshot.docs[0].data();
                const hasMaleNorms = normData.punten_schaal.some(n => n.geslacht === 'M');
                const hasFemaleNorms = normData.punten_schaal.some(n => n.geslacht === 'V');
                setNormenInfo({ M: hasMaleNorms, V: hasFemaleNorms, loading: false });
            } catch (error) {
                console.error("Fout bij ophalen normen:", error);
                setNormenInfo({ M: true, V: true, loading: false });
            }
        };
        checkNormen();
    }, [selectedTest]);
    
    // Filter leerlingen op basis van beschikbare normen
    const gefilterdeLeerlingen = useMemo(() => {
        if (normenInfo.loading) return [];
        const filtered = volledigeLeerlingen.filter(leerling => {
            const gender = leerling.data.geslacht.toUpperCase();
            if (gender === 'M') return normenInfo.M;
            if (gender === 'V') return normenInfo.V;
            return false;
        });
        setUitgeslotenLeerlingen(volledigeLeerlingen.filter(l => !filtered.includes(l)));
        return filtered;
    }, [volledigeLeerlingen, normenInfo]);
    
    // Check voor recente testafnames
    useEffect(() => {
        if (!selectedGroep || !selectedTest || !datum || !gefilterdeLeerlingen || gefilterdeLeerlingen.length === 0) return;
        const leerlingIds = gefilterdeLeerlingen.map(l => l.id);
        if(leerlingIds.length === 0) return;
        const geselecteerdeDatum = new Date(datum);
        const oneMonthAgo = new Date(geselecteerdeDatum);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const scoresQuery = query(collection(db, 'scores'),
            where('test_id', '==', selectedTest.id),
            where('leerling_id', 'in', leerlingIds),
            where('datum', '>=', oneMonthAgo),
            where('datum', '<', geselecteerdeDatum)
        );
        const checkForRecentTests = async () => {
            const querySnapshot = await getDocs(scoresQuery);
            if (!querySnapshot.empty) {
                const recentScores = querySnapshot.docs.map(d => d.data());
                const mostRecentAfname = recentScores.sort((a, b) => b.datum.toMillis() - a.datum.toMillis())[0];
                const afnameDatum = mostRecentAfname.datum.toDate();
                const teacherIds = [...new Set(recentScores.map(s => s.leerkracht_id).filter(Boolean))];
                let teacherNames = [];
                if (teacherIds.length > 0) {
                    const leerkrachtenQuery = query(collection(db, 'toegestane_gebruikers'), where('__name__', 'in', teacherIds));
                    const leerkrachtenSnap = await getDocs(leerkrachtenQuery);
                    const leerkrachtenMap = new Map(leerkrachtenSnap.docs.map(d => [d.id, d.data().naam]));
                    teacherNames = teacherIds.map(id => id === auth.currentUser.uid ? 'jezelf' : leerkrachtenMap.get(id) || 'een onbekende leerkracht');
                }
                const leerkrachtTekst = teacherNames.length > 0 ? new Intl.ListFormat('nl-BE').format(teacherNames) : 'een leerkracht';
                const affectedStudentsCount = new Set(recentScores.map(s => s.leerling_id)).size;
                const noun = affectedStudentsCount === 1 ? 'leerling' : 'leerlingen';
                const verb = affectedStudentsCount === 1 ? 'heeft' : 'hebben';
                setWarningModal({
                    isOpen: true,
                    message: `${affectedStudentsCount} ${noun} van deze groep ${verb} deze test ${formatTimeAgo(afnameDatum, geselecteerdeDatum)} reeds afgelegd bij ${leerkrachtTekst}.`,
                    onConfirm: () => setWarningModal({ isOpen: false }),
                    onCancel: () => {
                        setSelectedTest(null);
                        setWarningModal({ isOpen: false });
                    }
                });
            }
        };
        checkForRecentTests();
    }, [selectedGroep, selectedTest, datum, gefilterdeLeerlingen]);

    // Debounced puntberekening
    useEffect(() => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        const studentIdToProcess = Object.keys(scores).find(id => scores[id]?.isCalculating);
        if (studentIdToProcess) {
            debounceTimeoutRef.current = setTimeout(async () => {
                const scoreData = scores[studentIdToProcess];
                if (!scoreData || !scoreData.score || scoreData.score.trim() === '') {
                    setScores(prev => ({...prev, [studentIdToProcess]: { ...scoreData, isCalculating: false, isValid: true, rapportpunt: null }}));
                    return;
                }
                const parsedValue = parseTimeInputToSeconds(scoreData.score);
                if (isNaN(parsedValue)) {
                    toast.error("Ongeldige tijdnotatie. Gebruik bv. 1:15 of 12.5");
                    setScores(prev => ({...prev, [studentIdToProcess]: { ...scoreData, isValid: false, isCalculating: false }}));
                } else {
                    const leerling = gefilterdeLeerlingen.find(l => l.id === studentIdToProcess);
                    const newPunt = await calculatePuntFromScore(selectedTest, leerling.data, parsedValue, new Date(datum));
                    setScores(prev => ({...prev, [studentIdToProcess]: { ...scoreData, rapportpunt: newPunt, isValid: true, isCalculating: false }}));
                }
            }, 750);
        }
        return () => clearTimeout(debounceTimeoutRef.current);
    }, [scores, selectedTest, datum, gefilterdeLeerlingen]);

    const handleScoreChange = (leerlingId, newScore) => {
        setScores(prev => ({ ...prev, [leerlingId]: { ...prev[leerlingId], score: newScore, rapportpunt: null, isValid: true, isCalculating: true }}));
    };

    const handleSaveScores = async () => {
        if (!selectedGroep || !selectedTest) return toast.error("Selecteer een groep en een test.");
        setIsSaving(true);
        const batch = writeBatch(db);
        const eenheidLower = selectedTest.eenheid?.toLowerCase();
        try {
            for (const leerlingId in scores) {
                const scoreData = scores[leerlingId];
                if (scoreData.score && String(scoreData.score).trim() !== '') {
                    let finalScoreValue = (eenheidLower.includes('min') || eenheidLower.includes('sec')) ? parseTimeInputToSeconds(scoreData.score) : parseFloat(String(scoreData.score).replace(',', '.'));
                    if (finalScoreValue !== null && !isNaN(finalScoreValue)) {
                        const leerling = gefilterdeLeerlingen.find(l => l.id === leerlingId);
                        const newScoreRef = doc(collection(db, 'scores'));
                        batch.set(newScoreRef, {
                            datum: new Date(datum),
                            groep_id: selectedGroep.id,
                            leerling_id: leerlingId,
                            leerling_naam: leerling?.data?.naam || 'Onbekend',
                            score: finalScoreValue,
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
        } catch (error) { toast.error("Kon de scores niet opslaan.");
        } finally { setIsSaving(false); }
    };

    const validScoresCount = Object.values(scores).filter(s => s.score && String(s.score).trim() !== '').length;
    
    const getPlaceholder = () => {
        if (!selectedTest) return "Score";
        const eenheidLower = selectedTest.eenheid?.toLowerCase();
        const naamLower = selectedTest.naam?.toLowerCase();
        if (eenheidLower.includes('sec') || eenheidLower.includes('min')) {
            if (naamLower.includes('10x5') || naamLower.includes('sprint') || naamLower.includes('50m')) return "bv. 12.5 of 12,5";
            return "bv. 1:15";
        }
        return `Score in ${selectedTest.eenheid}`;
    };
    
    const placeholderText = getPlaceholder();

    if (loading) return <div>Laden...</div>;

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            {warningModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg">
                        <div className="flex items-center mb-4"><ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mr-3" /><h3 className="text-lg font-bold">Recente Testafname Gevonden</h3></div>
                        <p className="text-gray-600 mb-6">{warningModal.message}</p>
                        <p className="font-medium mb-6">Wenst u deze test toch opnieuw af te nemen?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={warningModal.onCancel} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Nee</button>
                            <button onClick={warningModal.onConfirm} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">Ja</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                <div className="max-w-4xl mx-auto">
                    <Link to="/scores" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group"><ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />Annuleren en terug naar scores</Link>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <h1 className="text-3xl font-bold mb-8 text-gray-800">Nieuwe Testafname</h1>
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-700 mb-2">Datum</label><input type="date" value={datum} onChange={e => setDatum(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl shadow-sm"/></div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Kies een groep</label><select value={selectedGroep?.id || ''} onChange={(e) => setSelectedGroep(groepen.find(g => g.id === e.target.value) || null)} className="w-full p-3 border border-gray-200 rounded-xl shadow-sm"><option value="">-- Selecteer groep --</option>{groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Kies een test</label><select value={selectedTest?.id || ''} onChange={(e) => setSelectedTest(testen.find(t => t.id === e.target.value) || null)} disabled={!selectedGroep} className="w-full p-3 border border-gray-200 rounded-xl shadow-sm disabled:bg-gray-50"><option value="">-- Selecteer test --</option>{testen.map(t => <option key={t.id} value={t.id}>{t.naam} ({t.eenheid})</option>)}</select></div>
                                </div>
                            </div>
                            {selectedTest && !normenInfo.loading && uitgeslotenLeerlingen.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex"><div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" /></div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">Normen niet beschikbaar voor {(!normenInfo.M && !normenInfo.V) ? 'jongens en meisjes' : !normenInfo.M ? 'jongens' : 'meisjes'}</h3>
                                            <div className="mt-2 text-sm text-red-700">
                                                <p>Voor deze test konden geen normwaarden worden gevonden. De volgende {uitgeslotenLeerlingen.length === 1 ? 'leerling wordt' : 'leerlingen worden'} niet weergegeven:</p>
                                                <ul role="list" className="list-disc pl-5 space-y-1 mt-1">{uitgeslotenLeerlingen.map(l => <li key={l.id}>{l.data.naam}</li>)}</ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {selectedGroep && selectedTest && (
                            <div className="border-t border-gray-200 pt-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-semibold text-gray-800">Scores invoeren</h2>
                                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">{validScoresCount} / {gefilterdeLeerlingen.length} ingevoerd</div>
                                </div>
                                {normenInfo.loading ? <div className="text-center py-8 text-gray-500">Normen controleren...</div>
                                : gefilterdeLeerlingen.length === 0 ? <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">{volledigeLeerlingen.length > 0 ? 'Geen leerlingen met geldige normen voor deze test.' : 'Deze groep heeft geen leerlingen.'}</div>
                                : (
                                    <div className="space-y-3">
                                        {gefilterdeLeerlingen.map(lid => (
                                            <div key={lid.id} className="grid grid-cols-3 items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                                <div className="font-medium text-gray-900">{lid.data.naam}</div>
                                                <div><input type="text" inputMode="text" className={`w-full p-3 border rounded-xl text-right transition-all shadow-sm ${scores[lid.id]?.isValid === false ? 'border-red-500' : 'border-gray-200'}`} placeholder={placeholderText} value={scores[lid.id]?.score || ''} onChange={(e) => handleScoreChange(lid.id, e.target.value)} /></div>
                                                <div className={`text-center font-bold text-xl transition-colors ${getScoreColorClass(scores[lid.id]?.rapportpunt)}`}>{scores[lid.id]?.isCalculating ? <span className="text-gray-400 animate-pulse">...</span> : (scores[lid.id]?.rapportpunt !== null && scores[lid.id]?.rapportpunt !== undefined) ? `${scores[lid.id]?.rapportpunt} pt` : '-'}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-end mt-8">
                                    <button onClick={handleSaveScores} disabled={isSaving || validScoresCount === 0} className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl shadow-lg disabled:opacity-50 hover:scale-105"><CheckCircleIcon className="h-5 w-5 mr-2" />{isSaving ? 'Opslaan...' : `${validScoresCount} Score${validScoresCount !== 1 ? 's' : ''} Opslaan`}</button>
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