// src/pages/NieuweTestafname.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon, PencilIcon, ChevronUpIcon } from '@heroicons/react/24/outline'; // Voeg PencilIcon en ChevronUpIcon toe
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { parseTimeInputToSeconds } from '../utils/formatters.js';
import { GENDER_MAPPING } from '../utils/firebaseUtils.js';

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
        const geslachtString = geslacht?.toLowerCase() || '';
        const mappedGender = GENDER_MAPPING[geslachtString];
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
    const [filtersZijnOpen, setFiltersZijnOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
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
        console.log('Checking norms for test_id:', selectedTest.id); // DEBUG
        const normenQuery = query(collection(db, 'normen'), where('test_id', '==', selectedTest.id));
        const normenSnapshot = await getDocs(normenQuery);
        console.log('Found norms docs:', normenSnapshot.docs.length); // DEBUG
        
        if (normenSnapshot.empty) {
            setNormenInfo({ M: false, V: false, loading: false });
            return;
        }
        const normData = normenSnapshot.docs[0].data();
        console.log('Norm data:', normData); // DEBUG
        console.log('Punten schaal:', normData.punten_schaal); // DEBUG
        
        const hasMaleNorms = normData.punten_schaal.some(n => n.geslacht === 'M');
        const hasFemaleNorms = normData.punten_schaal.some(n => n.geslacht === 'V');
        
        console.log('Has male norms:', hasMaleNorms); // DEBUG
        console.log('Has female norms:', hasFemaleNorms); // DEBUG
        
        setNormenInfo({ M: hasMaleNorms, V: hasFemaleNorms, loading: false });
    } catch (error) {
        console.error("Fout bij ophalen normen:", error);
        setNormenInfo({ M: true, V: true, loading: false });
    }
};
        checkNormen();
    }, [selectedTest]);
    
// --- NIEUW: Effect om filters te sluiten na testselectie op mobiel ---
    useEffect(() => {
        if (selectedTest) {
            setFiltersZijnOpen(false);
        }
    }, [selectedTest]);

    // --- NIEUW: Detecteer mobiele weergave ---
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768); // Tailwind's 'md' breakpoint is 768px
        };
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Filter leerlingen op basis van beschikbare normen
  const gefilterdeLeerlingen = useMemo(() => {
    if (normenInfo.loading) return [];
    
    console.log('=== GENDER FILTERING DEBUG ===');
    console.log('normenInfo:', normenInfo); // Zou {M: true, V: true, loading: false} moeten zijn
    console.log('volledigeLeerlingen count:', volledigeLeerlingen.length);
    
    const filtered = volledigeLeerlingen.filter(leerling => {
        const geslachtString = leerling.data.geslacht?.toLowerCase() || '';
        const mappedGender = GENDER_MAPPING[geslachtString];
        
        console.log(`Leerling: ${leerling.data.naam}`);
        console.log(`  - geslacht raw: "${leerling.data.geslacht}"`);
        console.log(`  - geslacht lowercase: "${geslachtString}"`);
        console.log(`  - mappedGender: "${mappedGender}"`);
        console.log(`  - normenInfo.M: ${normenInfo.M}, normenInfo.V: ${normenInfo.V}`);

        if (mappedGender === 'M') {
            console.log(`  - Is male, normenInfo.M = ${normenInfo.M}, including: ${normenInfo.M}`);
            return normenInfo.M;
        }
        if (mappedGender === 'V') {
            console.log(`  - Is female, normenInfo.V = ${normenInfo.V}, including: ${normenInfo.V}`);
            return normenInfo.V;
        }
        
        console.log(`  - No valid mapping, excluding`);
        return false;
    });

    console.log('Filtered count:', filtered.length);
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
                                leerling_id: leerling.id,  // ✅ Gebruik altijd het document ID
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
       {/* NIEUW: Waarschuwings-popup */}
<Transition.Root show={warningModal.isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
        >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                >
                    <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                                </div>
                                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                        Recente Testafname Gevonden
                                    </Dialog.Title>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            {warningModal.message}
                                        </p>
                                        <p className="text-sm text-gray-700 font-medium mt-2">
                                            Wenst u deze test toch opnieuw af te nemen?
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button
                                type="button"
                                className="inline-flex w-full justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 sm:ml-3 sm:w-auto"
                                onClick={warningModal.onConfirm}
                            >
                                Ja
                            </button>
                            <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                onClick={warningModal.onCancel}
                            >
                                Nee
                            </button>
                        </div>
                    </Dialog.Panel>
                </Transition.Child>
            </div>
        </div>
    </Dialog>
</Transition.Root>
         <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                <div className="max-w-4xl mx-auto">
                    
                   {/* --- AANGEPAST: MOBIELVRIENDELIJKE HEADER (mb verwijderd) --- */}
                        <div className="lg:hidden"> {/* mb-6 verwijderd */}
                            <Link to="/sporttesten" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-2 group">
                                <ArrowLeftIcon className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
                                <span className="text-sm">Terug</span>
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-800 truncate">Nieuwe Testafname</h1>
                        </div>

                        {/* --- AANGEPAST: DESKTOP HEADER (mb verwijderd) --- */}
                        <div className="hidden lg:block"> {/* mb-8 verwijderd */}
                            <Link to="/sporttesten" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group">
                                <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
                                Annuleren en terug naar scores
                            </Link>
                            <h1 className="text-3xl font-bold text-gray-800">Nieuwe Testafname</h1>
                        </div>
                    
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                        <div className="space-y-8">
                            {/* --- NIEUW: Knop om filters te tonen/verbergen (alleen mobiel) --- */}
                                <div className="md:hidden flex justify-end">
                                    <button
                                        onClick={() => setFiltersZijnOpen(prev => !prev)}
                                        className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-800 p-2 -mr-2"
                                    >
                                        {filtersZijnOpen ? (
                                            <>
                                                <span>Verberg Selectie</span>
                                                <ChevronUpIcon className="h-4 w-4 ml-1" />
                                            </>
                                        ) : (
                                            <>
                                                <span>Wijzig Selectie</span>
                                                <PencilIcon className="h-4 w-4 ml-1" />
                                            </>
                                        )}
                                    </button>
                                </div>
                           <div className={`
                                    transition-all duration-500 ease-in-out overflow-hidden
                                    ${filtersZijnOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                                    md:max-h-full md:opacity-100
                                    ${filtersZijnOpen ? 'mb-4 lg:mb-8' : 'mb-0'} /* Dynamische margin */
                                `}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                    <input type="date" value={datum} onChange={e => setDatum(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl shadow-sm"/>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kies een groep</label>
                        <select value={selectedGroep?.id || ''} onChange={(e) => setSelectedGroep(groepen.find(g => g.id === e.target.value) || null)} className="w-full p-3 border border-gray-200 rounded-xl shadow-sm">
                            <option value="">-- Selecteer groep --</option>
                            {groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kies een test</label>
                        <select value={selectedTest?.id || ''} onChange={(e) => setSelectedTest(testen.find(t => t.id === e.target.value) || null)} disabled={!selectedGroep} className="w-full p-3 border border-gray-200 rounded-xl shadow-sm disabled:bg-gray-50">
                            <option value="">-- Selecteer test --</option>
                            {testen.map(t => <option key={t.id} value={t.id}>{t.naam} ({t.eenheid})</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
                            
                            {selectedTest && !normenInfo.loading && uitgeslotenLeerlingen.length > 0 && (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8"> {/* mb-8 toegevoegd hier */}
        <div className="flex">
            <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
                {/* --- AANGEPAST: Dynamische tekst voor mobiel/desktop --- */}
                {isMobile ? (
                    <h3 className="text-sm font-medium text-red-800">
                        Normen niet beschikbaar voor {(!normenInfo.M && !normenInfo.V) ? 'jongens en meisjes' : !normenInfo.M ? 'jongens' : 'meisjes'}
                    </h3>
                ) : (
                    <>
                        <h3 className="text-sm font-medium text-red-800">
                            Normen niet beschikbaar voor {(!normenInfo.M && !normenInfo.V) ? 'jongens en meisjes' : !normenInfo.M ? 'jongens' : 'meisjes'}
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                            <p>
                                Voor deze test konden geen normwaarden worden gevonden. De volgende {uitgeslotenLeerlingen.length === 1 ? 'leerling wordt' : 'leerlingen worden'} niet weergegeven:
                            </p>
                            <ul role="list" className="list-disc pl-5 space-y-1 mt-1">
                                {uitgeslotenLeerlingen.map(l => <li key={l.id}>{l.data.naam}</li>)}
                            </ul>
                        </div>
                    </>
                )}
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
                                    <>
                                        {/* --- AANGEPAST: DESKTOP GRID (verborgen op mobiel) --- */}
                                        <div className="hidden md:grid grid-cols-[1fr,150px,80px] gap-x-4 gap-y-3">
                                            {gefilterdeLeerlingen.map(lid => (
                                                <div key={lid.id} className="col-span-3 grid grid-cols-subgrid items-center p-2 rounded-lg hover:bg-gray-50">
                                                    <div className="font-medium text-gray-900">{lid.data.naam}</div>
                                                    <div><input type="text" inputMode="text" className={`w-full p-3 border rounded-xl text-right transition-all shadow-sm ${scores[lid.id]?.isValid === false ? 'border-red-500' : 'border-gray-200'}`} placeholder={placeholderText} value={scores[lid.id]?.score || ''} onChange={(e) => handleScoreChange(lid.id, e.target.value)} /></div>
                                                    <div className={`text-center font-bold text-xl transition-colors ${getScoreColorClass(scores[lid.id]?.rapportpunt)}`}>{scores[lid.id]?.isCalculating ? <span className="text-gray-400 animate-pulse">...</span> : (scores[lid.id]?.rapportpunt !== null && scores[lid.id]?.rapportpunt !== undefined) ? `${scores[lid.id]?.rapportpunt} pt` : '-'}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* --- AANGEPAST: MOBIELE KAARTEN (verborgen op desktop) --- */}
                                        <div className="md:hidden space-y-4">
                                            {gefilterdeLeerlingen.map(lid => (
                                                <div key={lid.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                                    <div className="font-medium text-slate-900 mb-3">{lid.data.naam}</div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1">
                                                            <input type="text" inputMode="text" className={`w-full p-3 border rounded-xl text-right transition-all shadow-sm ${scores[lid.id]?.isValid === false ? 'border-red-500' : 'border-gray-200'}`} placeholder={placeholderText} value={scores[lid.id]?.score || ''} onChange={(e) => handleScoreChange(lid.id, e.target.value)} />
                                                        </div>
                                                        <div className={`w-24 text-center font-bold text-xl transition-colors ${getScoreColorClass(scores[lid.id]?.rapportpunt)}`}>
                                                            {scores[lid.id]?.isCalculating ? <span className="text-gray-400 animate-pulse">...</span> : (scores[lid.id]?.rapportpunt !== null && scores[lid.id]?.rapportpunt !== undefined) ? `${scores[lid.id]?.rapportpunt} pt` : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-end mt-8">
                                    <button onClick={handleSaveScores} disabled={isSaving || validScoresCount === 0} className="w-full sm:w-auto flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl shadow-lg disabled:opacity-50 hover:scale-105"><CheckCircleIcon className="h-5 w-5 mr-2" />{isSaving ? 'Opslaan...' : `${validScoresCount} Score${validScoresCount !== 1 ? 's' : ''} Opslaan`}</button>
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