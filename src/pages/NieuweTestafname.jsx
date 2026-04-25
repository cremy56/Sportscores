// src/pages/NieuweTestafname.jsx
// ✅ VOLLEDIG GEMIGREERD — geen directe Firestore calls meer
// Alle data gaat via /api/tests (Admin SDK server-side)
import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon, PencilIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { parseTimeInputToSeconds } from '../utils/formatters.js';
import { GENDER_MAPPING } from '../utils/firebaseUtils.js';

// --- API HELPER ---
async function apiPost(action, body, token) {
    const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, ...body })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API fout');
    return data;
}

// --- HELPER FUNCTIES ---
function calculateAge(birthDate, testDate) {
    if (!birthDate || !testDate) return null;
    let age = testDate.getFullYear() - birthDate.getFullYear();
    const m = testDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && testDate.getDate() < birthDate.getDate())) age--;
    return age;
}

// ✅ GEMIGREERD: accepteert normenData als parameter i.p.v. Firestore query
function calculatePuntFromScore(test, leerling, score, testDatum, normenData) {
    if (!test || !leerling || score === null || isNaN(score) || !normenData) return null;
    try {
        const { score_richting } = test;
        if (!score_richting) return null;
        const { geboortedatum, geslacht } = leerling;
        if (!geboortedatum || !geslacht) return null;

        // geboortedatum komt als ISO string van API (niet als Firestore Timestamp)
        const geboortedatumDate = typeof geboortedatum === 'string'
            ? new Date(geboortedatum)
            : geboortedatum?.toDate?.() ?? new Date(geboortedatum);

        const leeftijd = calculateAge(geboortedatumDate, testDatum);
        if (leeftijd === null) return null;

        const normAge = Math.min(leeftijd, 17);
        const { punten_schaal } = normenData;
        if (!punten_schaal || punten_schaal.length === 0) return null;

        const mappedGender = GENDER_MAPPING[geslacht?.toLowerCase() || ''];
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
                    behaaldeNorm = relevantNorms[i]; volgendeNorm = relevantNorms[i + 1]; break;
                }
            }
        } else {
            if (score >= relevantNorms[relevantNorms.length - 1].score_min) return relevantNorms[relevantNorms.length - 1].punt;
            if (score <= relevantNorms[0].score_min) return relevantNorms[0].punt;
            for (let i = 0; i < relevantNorms.length - 1; i++) {
                if (score >= relevantNorms[i].score_min && score < relevantNorms[i + 1].score_min) {
                    behaaldeNorm = relevantNorms[i]; volgendeNorm = relevantNorms[i + 1]; break;
                }
            }
        }

        if (!behaaldeNorm || !volgendeNorm) {
            const exactMatch = relevantNorms.find(n => n.score_min === score);
            return exactMatch ? exactMatch.punt : (behaaldeNorm ? behaaldeNorm.punt : 0);
        }
        const midpoint = (behaaldeNorm.score_min + volgendeNorm.score_min) / 2;
        let finalPunt = behaaldeNorm.punt;
        if ((score_richting === 'laag' && score < midpoint) || (score_richting === 'hoog' && score > midpoint)) finalPunt += 0.5;
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
    if (days < 30) { const weeks = Math.floor(days / 7); return `${weeks} ${weeks === 1 ? 'week' : 'weken'} geleden`; }
    if (days < 365) { const months = Math.floor(days / 30); return `${months} ${months === 1 ? 'maand' : 'maanden'} geleden`; }
    const years = Math.floor(days / 365);
    return `${years} ${years === 1 ? 'jaar' : 'jaren'} geleden`;
}

// --- HOOFDCOMPONENT ---
export default function NieuweTestafname() {
    const { profile } = useOutletContext();
    const [groepen, setGroepen] = useState([]);
    const [testen, setTesten] = useState([]);
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
    // ✅ NIEUW: gecachede normenData voor puntberekening (geen Firestore call per keystroke)
    const [cachedNormenData, setCachedNormenData] = useState(null);
    const [uitgeslotenLeerlingen, setUitgeslotenLeerlingen] = useState([]);
    const [filtersZijnOpen, setFiltersZijnOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // =============================================
    // EFFECT 1: Groepen en testen laden via API
    // ✅ GEMIGREERD van directe Firestore queries
    // =============================================
    useEffect(() => {
        if (!profile?.school_id || !profile?._token) return;
        setLoading(true);
        const fetchData = async () => {
            try {
                const data = await apiPost('get_setup_data', {
                    schoolId: profile.school_id
                }, profile._token);
                setGroepen(data.groepen || []);
                setTesten(data.testen || []);
            } catch (error) {
                toast.error("Kon groepen of testen niet laden.");
            }
            setLoading(false);
        };
        fetchData();
    }, [profile]);

    // =============================================
    // EFFECT 2: Leerlingen ophalen via API
    // ✅ GEMIGREERD: geen toegestane_gebruikers query meer
    // =============================================
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
            try {
                const data = await apiPost('get_leerlingen_voor_groep', {
                    groepId: selectedGroep.id,
                    schoolId: profile.school_id
                }, profile._token);

                setVolledigeLeerlingen(
                    (data.leerlingen || []).sort((a, b) => a.data.naam.localeCompare(b.data.naam))
                );
            } catch (error) {
                console.error('Fout bij laden leerlingen:', error);
                toast.error('Kon leerlingen niet laden.');
            }
        };

        fetchLeerlingen();
        setScores({});
    }, [selectedGroep, profile]);

    // =============================================
    // EFFECT 3: Normen controleren + cachen via API
    // ✅ GEMIGREERD: normen worden gecached voor puntberekening
    // =============================================
    useEffect(() => {
        if (!selectedTest) {
            setNormenInfo({ M: true, V: true, loading: false });
            setCachedNormenData(null);
            return;
        }
        const checkNormen = async () => {
            setNormenInfo({ M: false, V: false, loading: true });
            try {
                const data = await apiPost('get_normen', {
                    testId: selectedTest.id
                }, profile._token);

                const normenData = data.normen || null;
                setCachedNormenData(normenData);

                if (!normenData) {
                    setNormenInfo({ M: false, V: false, loading: false });
                    return;
                }
                const hasMaleNorms = normenData.punten_schaal?.some(n => n.geslacht === 'M') ?? false;
                const hasFemaleNorms = normenData.punten_schaal?.some(n => n.geslacht === 'V') ?? false;
                setNormenInfo({ M: hasMaleNorms, V: hasFemaleNorms, loading: false });
            } catch (error) {
                console.error("Fout bij ophalen normen:", error);
                setNormenInfo({ M: true, V: true, loading: false });
            }
        };
        checkNormen();
    }, [selectedTest, profile]);

    // Sluit filters na testselectie op mobiel
    useEffect(() => {
        if (selectedTest) setFiltersZijnOpen(false);
    }, [selectedTest]);

    // Detecteer mobiele weergave
    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // =============================================
    // GEFILTERDE LEERLINGEN (op basis van normen)
    // =============================================
    const gefilterdeLeerlingen = useMemo(() => {
        if (normenInfo.loading) return [];

        const filtered = volledigeLeerlingen.filter(leerling => {
            const geslachtString = leerling.data.geslacht?.toLowerCase() || '';
            const mappedGender = GENDER_MAPPING[geslachtString];
            if (mappedGender === 'M') return normenInfo.M;
            if (mappedGender === 'V') return normenInfo.V;
            return false;
        });

        setUitgeslotenLeerlingen(volledigeLeerlingen.filter(l => !filtered.includes(l)));
        return filtered;
    }, [volledigeLeerlingen, normenInfo]);

    // =============================================
    // EFFECT 4: Check recente testafnames via API
    // ✅ GEMIGREERD: geen directe scores query meer
    // =============================================
    useEffect(() => {
        if (!selectedGroep || !selectedTest || !datum || gefilterdeLeerlingen.length === 0) return;

        const checkForRecentTests = async () => {
            try {
                const data = await apiPost('get_recent_scores', {
                    testId: selectedTest.id,
                    groepId: selectedGroep.id,
                    datum: datum,
                    schoolId: profile.school_id
                }, profile._token);

                if (data.hasRecentScores) {
                    const { message, afnameDatum, isEigenAfname } = data;
                    const afnameDate = new Date(afnameDatum);
                    const geselecteerdeDatum = new Date(datum);

                    const leerkrachtTekst = isEigenAfname ? 'jezelf' : 'een leerkracht';
                    const { affectedStudentsCount } = data;
                    const noun = affectedStudentsCount === 1 ? 'leerling' : 'leerlingen';
                    const verb = affectedStudentsCount === 1 ? 'heeft' : 'hebben';

                    setWarningModal({
                        isOpen: true,
                        message: `${affectedStudentsCount} ${noun} van deze groep ${verb} deze test ${formatTimeAgo(afnameDate, geselecteerdeDatum)} reeds afgelegd bij ${leerkrachtTekst}.`,
                        onConfirm: () => setWarningModal({ isOpen: false }),
                        onCancel: () => { setSelectedTest(null); setWarningModal({ isOpen: false }); }
                    });
                }
            } catch (error) {
                console.error('Fout bij controleren recente afnames:', error);
            }
        };
        checkForRecentTests();
    }, [selectedGroep, selectedTest, datum, gefilterdeLeerlingen, profile]);

    // =============================================
    // EFFECT 5: Debounced puntberekening
    // ✅ GEMIGREERD: gebruikt cachedNormenData i.p.v. Firestore query
    // =============================================
    useEffect(() => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        const studentIdToProcess = Object.keys(scores).find(id => scores[id]?.isCalculating);
        if (studentIdToProcess) {
            debounceTimeoutRef.current = setTimeout(async () => {
                const scoreData = scores[studentIdToProcess];
                if (!scoreData || !scoreData.score || scoreData.score.trim() === '') {
                    setScores(prev => ({ ...prev, [studentIdToProcess]: { ...scoreData, isCalculating: false, isValid: true, rapportpunt: null } }));
                    return;
                }
                const parsedValue = parseTimeInputToSeconds(scoreData.score);
                if (isNaN(parsedValue)) {
                    toast.error("Ongeldige tijdnotatie. Gebruik bv. 1:15 of 12.5");
                    setScores(prev => ({ ...prev, [studentIdToProcess]: { ...scoreData, isValid: false, isCalculating: false } }));
                } else {
                    const leerling = gefilterdeLeerlingen.find(l => l.id === studentIdToProcess);
                    // ✅ Geef cachedNormenData mee — geen Firestore call per keystroke
                    const newPunt = calculatePuntFromScore(
                        selectedTest,
                        leerling.data,
                        parsedValue,
                        new Date(datum),
                        cachedNormenData
                    );
                    setScores(prev => ({ ...prev, [studentIdToProcess]: { ...scoreData, rapportpunt: newPunt, isValid: true, isCalculating: false } }));
                }
            }, 750);
        }
        return () => clearTimeout(debounceTimeoutRef.current);
    }, [scores, selectedTest, datum, gefilterdeLeerlingen, cachedNormenData]);

    const handleScoreChange = (leerlingId, newScore) => {
        setScores(prev => ({ ...prev, [leerlingId]: { ...prev[leerlingId], score: newScore, rapportpunt: null, isValid: true, isCalculating: true } }));
    };

    // =============================================
    // SCORES OPSLAAN via API
    // ✅ GEMIGREERD: geen writeBatch meer via client
    // =============================================
    const handleSaveScores = async () => {
        if (!selectedGroep || !selectedTest) return toast.error("Selecteer een groep en een test.");

        setIsSaving(true);

        const eenheidLower = selectedTest.eenheid?.toLowerCase();
        const scoresToSave = [];

        for (const leerlingId in scores) {
            const scoreData = scores[leerlingId];
            if (scoreData.score && String(scoreData.score).trim() !== '') {
                let finalScoreValue = (eenheidLower.includes('min') || eenheidLower.includes('sec'))
                    ? parseTimeInputToSeconds(scoreData.score)
                    : parseFloat(String(scoreData.score).replace(',', '.'));

                if (finalScoreValue !== null && !isNaN(finalScoreValue)) {
                    const leerling = gefilterdeLeerlingen.find(l => l.id === leerlingId);
                    scoresToSave.push({
                        leerling_id: leerling.id,                          // ✅ smartschool_id_hash
                        leerling_naam: leerling?.data?.naam || 'Onbekend', // ✅ ontsleutelde naam
                        score: finalScoreValue,
                        rapportpunt: scoreData.rapportpunt ?? null,
                    });
                }
            }
        }

        if (scoresToSave.length === 0) {
            toast.error("Geen geldige scores om op te slaan.");
            setIsSaving(false);
            return;
        }

        try {
            await apiPost('save_scores', {
                groepId: selectedGroep.id,
                testId: selectedTest.id,
                schoolId: profile.school_id,
                datum: datum,
                scores: scoresToSave
            }, profile._token);

            toast.success("Scores succesvol opgeslagen!");
            navigate('/Sporttesten');
        } catch (error) {
            console.error('❌ Save error:', error);
            toast.error("Kon de scores niet opslaan: " + error.message);
        } finally {
            setIsSaving(false);
        }
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

    if (loading) return <div className="fixed inset-0 bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            {/* Waarschuwings-popup */}
            <Transition.Root show={warningModal.isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => {}}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    </Transition.Child>
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                                <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                            <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                                Recente testafname gevonden
                                            </Dialog.Title>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">{warningModal.message}</p>
                                                <p className="text-sm text-gray-500 mt-2">Wil je toch doorgaan met een nieuwe afname?</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                                        <button type="button" className="inline-flex w-full justify-center rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 sm:w-auto" onClick={warningModal.onConfirm}>
                                            Ja, doorgaan
                                        </button>
                                        <button type="button" className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onClick={warningModal.onCancel}>
                                            Annuleren
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>

            <div className="max-w-4xl mx-auto px-4 pt-20 pb-12 lg:px-8 lg:pt-24">
                <div className="mb-8">
                    <Link to="/Sporttesten" className="inline-flex items-center text-gray-600 hover:text-purple-700 group mb-4">
                        <ArrowLeftIcon className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                        Terug naar sporttesten
                    </Link>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Nieuwe Testafname</h1>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-8">
                    {/* Toggle filters knop (mobiel) */}
                    <div className="flex justify-between items-center mb-4 md:hidden">
                        <h2 className="text-lg font-semibold text-gray-700">Selectie</h2>
                        <button
                            onClick={() => setFiltersZijnOpen(!filtersZijnOpen)}
                            className="flex items-center text-sm text-purple-600 font-medium"
                        >
                            {filtersZijnOpen ? (
                                <><span>Verberg Selectie</span><ChevronUpIcon className="h-4 w-4 ml-1" /></>
                            ) : (
                                <><span>Wijzig Selectie</span><PencilIcon className="h-4 w-4 ml-1" /></>
                            )}
                        </button>
                    </div>

                    {/* Filters */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${filtersZijnOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} md:max-h-full md:opacity-100 ${filtersZijnOpen ? 'mb-4 lg:mb-8' : 'mb-0'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                                <input type="date" value={datum} onChange={e => setDatum(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl shadow-sm" />
                            </div>
                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Kies een groep</label>
                                    <select
                                        value={selectedGroep?.id || ''}
                                        onChange={(e) => setSelectedGroep(groepen.find(g => g.id === e.target.value) || null)}
                                        className="w-full p-3 border border-gray-200 rounded-xl shadow-sm"
                                    >
                                        <option value="">-- Selecteer groep --</option>
                                        {groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Kies een test</label>
                                    <select
                                        value={selectedTest?.id || ''}
                                        onChange={(e) => setSelectedTest(testen.find(t => t.id === e.target.value) || null)}
                                        disabled={!selectedGroep}
                                        className="w-full p-3 border border-gray-200 rounded-xl shadow-sm disabled:bg-gray-50"
                                    >
                                        <option value="">-- Selecteer test --</option>
                                        {testen.map(t => <option key={t.id} value={t.id}>{t.naam} ({t.eenheid})</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Waarschuwing: geen normen */}
                    {selectedTest && !normenInfo.loading && uitgeslotenLeerlingen.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
                            <div className="flex">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">
                                        Normen niet beschikbaar voor {(!normenInfo.M && !normenInfo.V) ? 'jongens en meisjes' : !normenInfo.M ? 'jongens' : 'meisjes'}
                                    </h3>
                                    {!isMobile && (
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>De volgende {uitgeslotenLeerlingen.length === 1 ? 'leerling wordt' : 'leerlingen worden'} niet weergegeven:</p>
                                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                                {uitgeslotenLeerlingen.map(l => <li key={l.id}>{l.data.naam}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scores invoeren */}
                    {selectedGroep && selectedTest && (
                        <div className="border-t border-gray-200 pt-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-800">Scores invoeren</h2>
                                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                                    {validScoresCount} / {gefilterdeLeerlingen.length} ingevoerd
                                </div>
                            </div>

                            {normenInfo.loading ? (
                                <div className="text-center py-8 text-gray-500">Normen controleren...</div>
                            ) : gefilterdeLeerlingen.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                                    {volledigeLeerlingen.length > 0
                                        ? 'Geen leerlingen met geldige normen voor deze test.'
                                        : 'Deze groep heeft geen leerlingen.'}
                                </div>
                            ) : (
                                <>
                                    {/* Desktop grid */}
                                    <div className="hidden md:grid grid-cols-[1fr,150px,80px] gap-x-4 gap-y-3">
                                        {gefilterdeLeerlingen.map(lid => (
                                            <div key={lid.id} className="col-span-3 grid grid-cols-subgrid items-center p-2 rounded-lg hover:bg-gray-50">
                                                <div className="font-medium text-gray-900">{lid.data.naam}</div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        inputMode="text"
                                                        className={`w-full p-3 border rounded-xl text-right shadow-sm ${scores[lid.id]?.isValid === false ? 'border-red-500' : 'border-gray-200'}`}
                                                        placeholder={placeholderText}
                                                        value={scores[lid.id]?.score || ''}
                                                        onChange={(e) => handleScoreChange(lid.id, e.target.value)}
                                                    />
                                                </div>
                                                <div className={`text-center font-bold text-xl ${getScoreColorClass(scores[lid.id]?.rapportpunt)}`}>
                                                    {scores[lid.id]?.isCalculating
                                                        ? <span className="text-gray-400 animate-pulse">...</span>
                                                        : (scores[lid.id]?.rapportpunt !== null && scores[lid.id]?.rapportpunt !== undefined)
                                                            ? `${scores[lid.id]?.rapportpunt} pt`
                                                            : '-'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Mobiele kaarten */}
                                    <div className="md:hidden space-y-4">
                                        {gefilterdeLeerlingen.map(lid => (
                                            <div key={lid.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                                <div className="font-medium text-slate-900 mb-3">{lid.data.naam}</div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <input
                                                            type="text"
                                                            inputMode="text"
                                                            className={`w-full p-3 border rounded-xl text-right shadow-sm ${scores[lid.id]?.isValid === false ? 'border-red-500' : 'border-gray-200'}`}
                                                            placeholder={placeholderText}
                                                            value={scores[lid.id]?.score || ''}
                                                            onChange={(e) => handleScoreChange(lid.id, e.target.value)}
                                                        />
                                                    </div>
                                                    <div className={`w-24 text-center font-bold text-xl ${getScoreColorClass(scores[lid.id]?.rapportpunt)}`}>
                                                        {scores[lid.id]?.isCalculating
                                                            ? <span className="text-gray-400 animate-pulse">...</span>
                                                            : (scores[lid.id]?.rapportpunt !== null && scores[lid.id]?.rapportpunt !== undefined)
                                                                ? `${scores[lid.id]?.rapportpunt} pt`
                                                                : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end mt-8">
                                <button
                                    onClick={handleSaveScores}
                                    disabled={isSaving || validScoresCount === 0}
                                    className="w-full sm:w-auto flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl shadow-lg disabled:opacity-50 hover:scale-105"
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
    );
}
