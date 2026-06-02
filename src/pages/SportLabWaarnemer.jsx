// src/pages/SportLabWaarnemer.jsx
// Rol: De Waarnemer — tijdregistratie & metingen
// Leerling stelt eigen namenlijst op (geen namen uit DB → GDPR)
// Resultaten worden ingediend via sport_lab_waarnemer_metingen
// Leerkracht koppelt nadien ingevoerde namen aan echte leerlingen

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    PlayIcon,
    StopIcon,
    PlusIcon,
    TrashIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, FlagIcon } from '@heroicons/react/24/solid';

// ─── SPORT TYPES ──────────────────────────────────────────────────────────────
const SPORT_TYPES = [
    { id: 'loop',         naam: 'Loop / Duurloop',      eenheid: 'seconden', icon: '🏃', modus: 'chrono_rondes'   },
    { id: 'sprint',       naam: 'Sprint (60m / 100m)',  eenheid: 'seconden', icon: '⚡', modus: 'chrono_eenmalig' },
    { id: 'zwemmen',      naam: 'Zwemmen',              eenheid: 'seconden', icon: '🏊', modus: 'chrono_rondes'   },
    { id: 'shuttle',      naam: 'Shuttle Run',          eenheid: 'aantal',   icon: '↔️', modus: 'telling'         },
    { id: 'verspringen',  naam: 'Verspringen',          eenheid: 'm',        icon: '↗️', modus: 'meting_pogingen' },
    { id: 'hoogspringen', naam: 'Hoogspringen',         eenheid: 'm',        icon: '⬆️', modus: 'meting_pogingen' },
    { id: 'werpen',       naam: 'Werpen / Kogelstoten', eenheid: 'm',        icon: '🥏', modus: 'meting_pogingen' },
    { id: 'touwspringen', naam: 'Touwspringen',         eenheid: 'aantal',   icon: '🪢', modus: 'telling'         },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatTijd(ms) {
    if (ms === null || ms === undefined) return '--:--';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const honderdsten = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(honderdsten).padStart(2, '0')}`;
}

function formatRondetijd(ms) {
    if (!ms && ms !== 0) return '';
    const sec = Math.floor(ms / 1000);
    const honderdsten = Math.floor((ms % 1000) / 10);
    return `${sec}.${String(honderdsten).padStart(2, '0')}s`;
}

// ─── FASE 1: SETUP ────────────────────────────────────────────────────────────
// Matcht een test aan een activiteit op basis van naam/eenheid/categorie
function testMatchtActiviteit(test, sportId) {
    const naam      = (test.naam || '').toLowerCase();
    const eenheid   = (test.eenheid || '').toLowerCase();
    const categorie = (test.categorie || '').toLowerCase();

    switch (sportId) {
        case 'loop':
            return categorie.includes('uithouding') || ['cooper', 'km', 'duurloop', 'loop'].some(w => naam.includes(w));
        case 'sprint':
            return ['sprint', '50m', '60m', '100m', 'snelheid'].some(w => naam.includes(w) || categorie.includes(w));
        case 'zwemmen':
            return ['zwem', 'crawl', 'schoolslag', 'rugslag', 'vlinderslag', 'borst', 'wisselslag', 'baantj'].some(w => naam.includes(w));
        case 'shuttle':
            return ['shuttle', 'beep', 'piepjes', 'léger', 'leger'].some(w => naam.includes(w));
        case 'verspringen':
            return naam.includes('verspring') || (naam.includes('spring') && !naam.includes('hoog'));
        case 'hoogspringen':
            return naam.includes('hoog');
        case 'werpen':
            return ['werp', 'kogel', 'bal', 'speer', 'discus'].some(w => naam.includes(w));
        case 'touwspringen':
            return naam.includes('touw');
        default:
            return false;
    }
}

function WaarnemerSetup({ onStart, profile }) {
    const [sportType, setSportType] = useState('');
    const [rondes, setRondes] = useState(7);
    const [pogingen, setPogingen] = useState(3);
    const [namen, setNamen] = useState([]);
    const [naamInput, setNaamInput] = useState('');
    const inputRef = useRef(null);

    // Test-keuze flow
    const [testDialog, setTestDialog]   = useState(false);   // toont "test afnemen?" dialog
    const [testen, setTesten]           = useState(null);    // null = nog niet geladen
    const [laadtTesten, setLaadtTesten] = useState(false);
    const [gekozenTest, setGekozenTest] = useState(null);

    const sportConfig = SPORT_TYPES.find(s => s.id === sportType);

    const voegNaamToe = () => {
        // Splits op komma, puntkomma, slash of plus (per ongeluk of bewust gebruikt)
        const losseNamen = naamInput
            .split(/[,;/+]/)
            .map(n => n.trim())
            .filter(n => n.length > 0);

        if (losseNamen.length === 0) return;

        setNamen(prev => {
            const bestaand = new Set(prev.map(n => n.toLowerCase()));
            const toegevoegd = [];
            let duplicaten = 0;

            for (const naam of losseNamen) {
                const sleutel = naam.toLowerCase();
                if (bestaand.has(sleutel)) { duplicaten++; continue; }
                bestaand.add(sleutel);
                toegevoegd.push(naam);
            }

            if (toegevoegd.length === 0) {
                toast.error(losseNamen.length === 1 ? 'Naam al toegevoegd' : 'Deze namen staan er al');
            } else if (duplicaten > 0) {
                toast.success(`${toegevoegd.length} toegevoegd, ${duplicaten} stond er al`);
            }

            return [...prev, ...toegevoegd];
        });

        setNaamInput('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); voegNaamToe(); }
    };

    // Tests ophalen + filteren op activiteit
    const laadTesten = async () => {
        setLaadtTesten(true);
        try {
            const res = await fetch('/api/tests', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${profile._token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_tests', schoolId: profile.school_id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Geen toegang');
            const alle = data.testen || data.tests || [];
            const gefilterd = alle.filter(t => testMatchtActiviteit(t, sportType));
            setTesten(gefilterd);
        } catch {
            // Leerling heeft mogelijk geen toegang tot tests — ga gewoon door zonder test
            setTesten([]);
        } finally {
            setLaadtTesten(false);
        }
    };

    const startMetTest = () => {
        // bepaal banen/afstand uit testnaam indien zwemmen
        let autoRondes = Number(rondes);
        if (gekozenTest) {
            const m = (gekozenTest.naam || '').match(/(\d+)\s*m/);
            if (sportType === 'zwemmen' && m) autoRondes = Math.round(parseInt(m[1]) / 25);
        }
        onStart({
            sportType, sportConfig,
            rondes: autoRondes,
            pogingen: Number(pogingen),
            namen,
            test: gekozenTest,           // { id, naam, eenheid } of null
            banenVast: !!gekozenTest && sportType === 'zwemmen', // banen niet wijzigbaar
        });
    };

    const handleStart = () => {
        if (!sportType) { toast.error('Kies een activiteit'); return; }
        if (namen.length < 1) { toast.error('Voeg minstens 1 naam toe'); return; }
        if (sportConfig.modus === 'chrono_rondes' && !gekozenTest && (!rondes || rondes < 1)) {
            toast.error('Stel het aantal rondes in');
            return;
        }
        startMetTest();
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto">

            {/* Activiteit kiezen */}
            <div>
                {!sportType ? (
                    <>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Type activiteit</label>
                        <div className="grid grid-cols-2 gap-2">
                            {SPORT_TYPES.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        setSportType(s.id);
                                        setGekozenTest(null);
                                        setTesten(null);
                                        setTestDialog(true); // dialog meteen na sportkeuze
                                    }}
                                    className="flex items-center gap-2 px-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 hover:border-gray-300 text-sm font-medium transition-all text-left"
                                >
                                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                                    <span className="leading-tight">{s.naam}</span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-between bg-teal-50 border-2 border-teal-500 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-2xl flex-shrink-0">{sportConfig?.icon}</span>
                            <span className="font-semibold text-teal-800 truncate">{sportConfig?.naam}</span>
                        </div>
                        <button
                            onClick={() => {
                                setSportType('');
                                setGekozenTest(null);
                                setTesten(null);
                            }}
                            className="text-sm text-teal-600 hover:text-teal-800 font-medium flex-shrink-0 ml-3"
                        >
                            Wijzig
                        </button>
                    </div>
                )}
            </div>

            {/* Gekozen test badge */}
            {gekozenTest && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-teal-800">📋 Test: {gekozenTest.naam}</p>
                        {sportType === 'zwemmen' && (
                            <p className="text-xs text-teal-600">{rondes} banen — automatisch ingesteld</p>
                        )}
                    </div>
                    <button onClick={() => { setGekozenTest(null); }} className="text-teal-600 hover:text-teal-800 text-sm">✕</button>
                </div>
            )}

            {/* Configuratie rondes / banen — verborgen als test de banen vastzet */}
            {sportConfig?.modus === 'chrono_rondes' && !(gekozenTest && sportType === 'zwemmen') && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Aantal {sportConfig.id === 'zwemmen' ? 'banen' : 'rondes'} per leerling
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={99}
                        value={rondes}
                        onChange={e => setRondes(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    />
                    <p className="text-xs text-gray-400 mt-1.5 text-center">
                        {sportConfig.id === 'zwemmen'
                            ? 'bv. 200m in 25m bad = 8 banen'
                            : 'bv. 3 km op 400 m piste = 7 rondes + 1 korte schoot (stel in als 8)'}
                    </p>
                </div>
            )}

            {/* Configuratie pogingen */}
            {sportConfig?.modus === 'meting_pogingen' && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Aantal pogingen per leerling
                    </label>
                    <div className="flex gap-2">
                        {[2, 3, 4, 5].map(n => (
                            <button
                                key={n}
                                onClick={() => setPogingen(n)}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold text-lg transition-all ${
                                    pogingen === n
                                        ? 'border-teal-500 bg-teal-50 text-teal-800'
                                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                {n}×
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Namen invoeren */}
            {sportType && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Leerlingen toevoegen
                    </label>
                    <p className="text-xs text-gray-400 mb-3">
                        Voeg de voornamen van de leerlingen toe, indien 2 dezelfde voornamen ook de eerste letter van de familienaam. Je kan meerdere namen in 1 keer toevoegen door ze af te scheiden met een komma.
                    </p>
                    <div className="flex gap-2 mb-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={naamInput}
                            onChange={e => setNaamInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="bv. Thomas, Jan D, Jan V, Robin"
                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                        />
                        <button
                            onClick={voegNaamToe}
                            className="px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-colors"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {namen.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {namen.map(naam => (
                                <div key={naam} className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1.5">
                                    <span className="text-sm font-medium text-teal-800">{naam}</span>
                                    <button
                                        onClick={() => setNamen(prev => prev.filter(n => n !== naam))}
                                        className="text-teal-400 hover:text-teal-700 transition-colors"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-gray-400">
                        {namen.length === 0
                            ? 'Nog geen leerlingen toegevoegd'
                            : `${namen.length} ${namen.length === 1 ? 'leerling' : 'leerlingen'} toegevoegd`
                        }
                    </p>
                </div>
            )}

            {/* Start knop */}
            {sportType && namen.length > 0 && (
                <button
                    onClick={handleStart}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-lg mt-2"
                >
                    <PlayIcon className="w-6 h-6" />
                    Start Registratie
                </button>
            )}

            {/* ── Test-afnemen dialog ───────────────────────────────────── */}
            {testDialog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
                        {testen === null ? (
                            // Stap 1: vraag of er een test afgenomen wordt
                            <>
                                <p className="text-4xl text-center mb-3">📋</p>
                                <h3 className="font-bold text-gray-900 text-center text-lg mb-2">
                                    Test afnemen?
                                </h3>
                                <p className="text-sm text-gray-500 text-center mb-5">
                                    Wenst de leerkracht een test af te nemen voor deze {sportConfig?.naam.toLowerCase()}?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setGekozenTest(null); setTestDialog(false); }}
                                        className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50"
                                    >
                                        Nee, vrij meten
                                    </button>
                                    <button
                                        onClick={laadTesten}
                                        disabled={laadtTesten}
                                        className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl disabled:opacity-50"
                                    >
                                        {laadtTesten ? 'Laden...' : 'Ja, kies test'}
                                    </button>
                                </div>
                            </>
                        ) : testen.length === 0 ? (
                            // Geen tests gevonden/toegankelijk
                            <>
                                <p className="text-4xl text-center mb-3">🤷</p>
                                <h3 className="font-bold text-gray-900 text-center mb-2">Geen tests gevonden</h3>
                                <p className="text-sm text-gray-500 text-center mb-5">
                                    Er zijn geen tests gekoppeld aan deze activiteit. Je kan vrij meten en de leerkracht koppelt later.
                                </p>
                                <button
                                    onClick={() => { setGekozenTest(null); setTestDialog(false); }}
                                    className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl"
                                >
                                    Doorgaan zonder test
                                </button>
                            </>
                        ) : (
                            // Stap 2: kies een test uit de gefilterde lijst
                            <>
                                <h3 className="font-bold text-gray-900 mb-1">Kies de test</h3>
                                <p className="text-xs text-gray-500 mb-3">Tests voor {sportConfig?.naam.toLowerCase()}</p>
                                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                                    {testen.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                setGekozenTest({ id: t.id, naam: t.naam, eenheid: t.eenheid });
                                                // banen automatisch instellen bij zwemmen
                                                const m = (t.naam || '').match(/(\d+)\s*m/);
                                                if (sportType === 'zwemmen' && m) setRondes(Math.round(parseInt(m[1]) / 25));
                                                setTestDialog(false);
                                            }}
                                            className="w-full text-left px-4 py-3 border border-gray-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-colors"
                                        >
                                            <p className="font-medium text-gray-900 text-sm">{t.naam}</p>
                                            <p className="text-xs text-gray-400">{t.eenheid}</p>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => { setGekozenTest(null); setTestDialog(false); }}
                                    className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Overslaan, vrij meten
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── FASE 2A: CHRONO (loop / sprint) ─────────────────────────────────────────
function ChronoView({ config, onIndienen }) {
    const { namen, rondes, sportConfig } = config;
    const maxRondes = sportConfig.modus === 'chrono_eenmalig' ? 1 : rondes;
    const isZwem = sportConfig.id === 'zwemmen';
    const rondeWoord = isZwem ? 'baan' : 'ronde';
    const rondeWoordMv = isZwem ? 'banen' : 'rondes';

    // Unieke sleutel voor crash-herstel in localStorage (per sessie+test+namen)
    const storageKey = `chrono_${config.test?.id || sportConfig.id}_${namen.join('_')}`.slice(0, 120);

    const COOLDOWN_MS = 3000; // dubbelklik-beveiliging: min. 3s tussen taps per leerling

    // Herstel uit localStorage bij mount (crash/herlaad-bescherming)
    const hersteld = (() => {
        try {
            const raw = localStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    })();

    const [gestart, setGestart]     = useState(hersteld?.gestart ?? false);
    const [startTijd, setStartTijd] = useState(hersteld?.startTijd ?? null);
    const [elapsed, setElapsed]     = useState(0);
    const [gestopt, setGestopt]     = useState(hersteld?.gestopt ?? false);
    const [toonHersteld, setToonHersteld] = useState(!!hersteld);

    const [leerlingen, setLeerlingen] = useState(() =>
        hersteld?.leerlingen ?? namen.map(naam => ({
            naam,
            rondetijden: [],
            gefinisht: false,
            eindtijd: null,
        }))
    );

    const intervalRef = useRef(null);
    const lastTapRef  = useRef({});  // { naam: timestampMs } voor cooldown
    const [bevestigDialog, setBevestigDialog] = useState(null); // { naam, actie } bij dubbele tap

    // Continu wegschrijven naar localStorage (crash-herstel + internet-uitval)
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify({
                gestart, startTijd, gestopt, leerlingen,
            }));
        } catch { /* opslag vol of geblokkeerd — negeer */ }
    }, [gestart, startTijd, gestopt, leerlingen, storageKey]);

    useEffect(() => {
        if (gestart && !gestopt && startTijd) {
            intervalRef.current = setInterval(() => {
                setElapsed(Date.now() - startTijd);
            }, 50);
        }
        return () => clearInterval(intervalRef.current);
    }, [gestart, gestopt, startTijd]);

    const handleStart = () => {
        const now = Date.now();
        setStartTijd(now);
        setGestart(true);
    };

    const handleStop = () => {
        clearInterval(intervalRef.current);
        setGestopt(true);
    };

    // Ronde registreren met dubbelklik-cooldown
    const doeRonde = (naam) => {
        if (!gestart || gestopt) return;
        const nu = Date.now() - startTijd;

        setLeerlingen(prev => prev.map(l => {
            if (l.naam !== naam || l.gefinisht) return l;
            const nieuweRondetijden = [...l.rondetijden, nu];
            const isKlaar = nieuweRondetijden.length >= maxRondes;
            return {
                ...l,
                rondetijden: nieuweRondetijden,
                gefinisht: isKlaar,
                eindtijd: isKlaar ? nu : null,
            };
        }));
    };

    const registreerRonde = (naam) => {
        if (!gestart || gestopt) return;
        const nu = Date.now();
        const laatste = lastTapRef.current[naam];
        // Dubbelklik-beveiliging: binnen cooldown → vraag bevestiging
        if (laatste && nu - laatste < COOLDOWN_MS) {
            setBevestigDialog({ naam });
            return;
        }
        lastTapRef.current[naam] = nu;
        doeRonde(naam);
    };

    const bevestigExtraRonde = () => {
        const naam = bevestigDialog.naam;
        lastTapRef.current[naam] = Date.now();
        doeRonde(naam);
        setBevestigDialog(null);
    };

    // Ronde ongedaan maken (laatste tap terugdraaien)
    const undoRonde = (naam) => {
        setLeerlingen(prev => prev.map(l => {
            if (l.naam !== naam || l.rondetijden.length === 0) return l;
            const nieuweRondetijden = l.rondetijden.slice(0, -1);
            return {
                ...l,
                rondetijden: nieuweRondetijden,
                gefinisht: false,
                eindtijd: null,
            };
        }));
        lastTapRef.current[naam] = 0; // reset cooldown
    };

    const actief   = leerlingen.filter(l => !l.gefinisht);
    const gefinisht = leerlingen.filter(l => l.gefinisht).sort((a, b) => a.eindtijd - b.eindtijd);
    const alleKlaar = actief.length === 0;

    const handleIndienen = () => {
        const metingen = leerlingen.map(l => ({
            naam:        l.naam,
            rondetijden: l.rondetijden,
            eindtijd:    l.eindtijd,
            gefinisht:   l.gefinisht,
        }));
        try { localStorage.removeItem(storageKey); } catch { /* */ }
        onIndienen(metingen);
    };

    return (
        <div className="space-y-4">

            {/* Herstel-melding na crash/herlaad */}
            {toonHersteld && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-amber-800">
                        ↩ Je vorige meting is hersteld. Je kan gewoon verdergaan.
                    </p>
                    <button onClick={() => setToonHersteld(false)}
                        className="text-amber-600 hover:text-amber-800 text-sm font-medium flex-shrink-0">OK</button>
                </div>
            )}

            {/* Chrono display — sticky zodat hij in beeld blijft bij scrollen */}
            <div className="sticky top-2 z-20 bg-slate-900 rounded-2xl p-6 text-center shadow-lg">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
                    {sportConfig.naam}
                    {sportConfig.modus === 'chrono_rondes' && ` — ${maxRondes} ${maxRondes > 1 ? rondeWoordMv : rondeWoord}`}
                </p>
                <div className="text-5xl font-mono font-bold text-white tracking-wider mb-5">
                    {formatTijd(elapsed)}
                </div>

                {!gestart ? (
                    <button
                        onClick={handleStart}
                        className="bg-green-500 hover:bg-green-400 active:scale-95 text-white font-bold px-12 py-4 rounded-2xl text-xl transition-all flex items-center gap-3 mx-auto"
                    >
                        <PlayIcon className="w-7 h-7" />
                        START
                    </button>
                ) : !gestopt ? (
                    <button
                        onClick={handleStop}
                        className="bg-red-500 hover:bg-red-400 active:scale-95 text-white font-bold px-10 py-4 rounded-2xl text-xl transition-all flex items-center gap-3 mx-auto"
                    >
                        <StopIcon className="w-7 h-7" />
                        Stop chrono
                    </button>
                ) : (
                    <p className="text-green-400 font-semibold">Chrono gestopt — {formatTijd(elapsed)}</p>
                )}
            </div>

            {/* Bevestigingsdialog bij dubbele tap */}
            {bevestigDialog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
                        <p className="text-3xl text-center mb-2">⚠️</p>
                        <h3 className="font-bold text-gray-900 text-center mb-2">Extra {rondeWoord} bijtellen?</h3>
                        <p className="text-sm text-gray-500 text-center mb-5">
                            Je hebt <strong>{bevestigDialog.naam}</strong> net al geregistreerd. Wil je echt nog een {rondeWoord} bijtellen?
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setBevestigDialog(null)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">
                                Nee
                            </button>
                            <button onClick={bevestigExtraRonde}
                                className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl">
                                Ja, bijtellen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Actieve lopers */}
            {actief.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-600">🏃 Actief ({actief.length})</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {actief.map(l => {
                            const rondeNr     = l.rondetijden.length + 1;
                            const isFinish    = rondeNr === maxRondes;
                            const vorigeRonde = l.rondetijden[l.rondetijden.length - 2] || 0;
                            const huidigeRondeTijd = l.rondetijden.length > 0
                                ? l.rondetijden[l.rondetijden.length - 1] - vorigeRonde
                                : null;
                            const heeftRondes = l.rondetijden.length > 0;

                            return (
                                <div key={l.naam} className="flex items-center px-4 py-3.5 gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{l.naam}</p>
                                        <p className="text-xs text-gray-400">
                                            {isZwem ? 'Baan' : 'Ronde'} {rondeNr} / {maxRondes}
                                            {huidigeRondeTijd !== null && (
                                                <span className="ml-2 text-teal-500 font-mono">
                                                    laatste: {formatTijd(huidigeRondeTijd)}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {/* Undo — zichtbaar zodra er minstens 1 ronde is */}
                                    {heeftRondes && !gestopt && (
                                        <button
                                            onClick={() => undoRonde(l.naam)}
                                            className="flex-shrink-0 w-9 h-9 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm active:scale-95"
                                            title={`Laatste ${rondeWoord} ongedaan maken`}
                                        >↩</button>
                                    )}
                                    <button
                                        onClick={() => registreerRonde(l.naam)}
                                        disabled={!gestart || gestopt}
                                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-30 ${
                                            isFinish
                                                ? 'bg-green-500 hover:bg-green-400 text-white'
                                                : 'bg-teal-100 hover:bg-teal-200 text-teal-800'
                                        }`}
                                    >
                                        {isFinish ? '🏁 Finish' : `${isZwem ? 'Baan' : 'Ronde'} ${rondeNr} ✓`}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Gefinisht */}
            {gefinisht.length > 0 && (
                <div className="bg-white rounded-2xl border border-green-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-green-100 bg-green-50">
                        <p className="text-sm font-semibold text-green-700">✅ Gefinisht ({gefinisht.length})</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {gefinisht.map((l, i) => (
                            <div key={l.naam} className="flex items-center px-4 py-3 gap-3">
                                <span className="w-7 text-center font-bold text-gray-400 text-sm flex-shrink-0">
                                    {i + 1}
                                </span>
                                <span className="flex-1 font-medium text-gray-900">{l.naam}</span>
                                <span className="font-mono text-green-700 font-bold">
                                    {formatTijd(l.eindtijd)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Indienen */}
            {(alleKlaar || gestopt) && leerlingen.some(l => l.gefinisht) && (
                <button
                    onClick={handleIndienen}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                    <CheckCircleSolid className="w-5 h-5" />
                    Resultaten indienen bij leerkracht
                </button>
            )}

            {gestopt && !leerlingen.some(l => l.gefinisht) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-sm text-amber-700">
                    Geen enkel resultaat gefinisht — niets om in te dienen.
                </div>
            )}
        </div>
    );
}

// ─── FASE 2B: METING (verspringen, hoogspringen, werpen) ─────────────────────
function MetingView({ config, onIndienen }) {
    const { namen, pogingen, sportConfig } = config;

    const storageKey = `meting_${config.test?.id || sportConfig.id}_${namen.join('_')}`.slice(0, 120);
    const hersteld = (() => {
        try { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : null; }
        catch { return null; }
    })();
    const [toonHersteld, setToonHersteld] = useState(!!hersteld);

    const [metingen, setMetingen] = useState(() =>
        hersteld?.metingen ?? namen.map(naam => ({
            naam,
            pogingen: Array(pogingen).fill(''),
            beste: null,
        }))
    );

    // Continu wegschrijven (crash-herstel)
    useEffect(() => {
        try { localStorage.setItem(storageKey, JSON.stringify({ metingen })); }
        catch { /* */ }
    }, [metingen, storageKey]);

    const updatePoging = (naam, idx, waarde) => {
        setMetingen(prev => prev.map(l => {
            if (l.naam !== naam) return l;
            const nieuwePogingen = [...l.pogingen];
            nieuwePogingen[idx] = waarde;
            const geldig = nieuwePogingen
                .map(p => parseFloat(String(p).replace(',', '.')))
                .filter(n => !isNaN(n) && n > 0);
            return {
                ...l,
                pogingen: nieuwePogingen,
                beste: geldig.length > 0 ? Math.max(...geldig) : null,
            };
        }));
    };

    const handleIndienen = () => {
        const resultaten = metingen.map(l => ({
            naam:     l.naam,
            pogingen: l.pogingen.map(p => parseFloat(String(p).replace(',', '.')) || null),
            beste:    l.beste,
        }));
        try { localStorage.removeItem(storageKey); } catch { /* */ }
        onIndienen(resultaten);
    };

    const heeftResultaten = metingen.some(l => l.pogingen.some(p => String(p).trim() !== ''));

    return (
        <div className="space-y-4">
            {toonHersteld && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-amber-800">↩ Je vorige invoer is hersteld. Je kan gewoon verdergaan.</p>
                    <button onClick={() => setToonHersteld(false)} className="text-amber-600 hover:text-amber-800 text-sm font-medium flex-shrink-0">OK</button>
                </div>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-xl">{sportConfig.icon}</span>
                <p className="text-sm font-medium text-amber-800">
                    {sportConfig.naam} — {pogingen} pogingen per leerling (in {sportConfig.eenheid})
                </p>
            </div>

            {metingen.map(l => (
                <div key={l.naam} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-900">{l.naam}</span>
                        {l.beste !== null && (
                            <span className="text-sm font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                                Beste: {l.beste} {sportConfig.eenheid}
                            </span>
                        )}
                    </div>
                    <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${pogingen}, 1fr)` }}
                    >
                        {l.pogingen.map((p, idx) => {
                            const val = parseFloat(String(p).replace(',', '.'));
                            const isBeste = !isNaN(val) && val > 0 && val === l.beste;
                            return (
                                <div key={idx}>
                                    <label className="block text-xs text-gray-500 mb-1 text-center">
                                        Poging {idx + 1}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={p}
                                        onChange={e => updatePoging(l.naam, idx, e.target.value)}
                                        placeholder="0.00"
                                        className={`w-full px-2 py-2.5 border rounded-xl text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors ${
                                            isBeste
                                                ? 'border-teal-400 bg-teal-50 text-teal-800'
                                                : 'border-gray-200'
                                        }`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {heeftResultaten && (
                <button
                    onClick={handleIndienen}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                    <CheckCircleSolid className="w-5 h-5" />
                    Resultaten indienen bij leerkracht
                </button>
            )}
        </div>
    );
}

// ─── FASE 2C: TELLING (shuttle run, touwspringen) ─────────────────────────────
function TellingView({ config, onIndienen }) {
    const { namen, sportConfig } = config;

    const storageKey = `telling_${config.test?.id || sportConfig.id}_${namen.join('_')}`.slice(0, 120);
    const hersteld = (() => {
        try { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : null; }
        catch { return null; }
    })();
    const [toonHersteld, setToonHersteld] = useState(!!hersteld);

    const [tellingen, setTellingen] = useState(() =>
        hersteld?.tellingen ?? namen.map(naam => ({ naam, waarde: '' }))
    );

    useEffect(() => {
        try { localStorage.setItem(storageKey, JSON.stringify({ tellingen })); }
        catch { /* */ }
    }, [tellingen, storageKey]);

    const handleIndienen = () => {
        const resultaten = tellingen.map(l => ({
            naam:   l.naam,
            waarde: parseFloat(l.waarde) || null,
        }));
        try { localStorage.removeItem(storageKey); } catch { /* */ }
        onIndienen(resultaten);
    };

    const heeftResultaten = tellingen.some(l => l.waarde.toString().trim() !== '');

    return (
        <div className="space-y-4">
            {toonHersteld && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-amber-800">↩ Je vorige invoer is hersteld. Je kan gewoon verdergaan.</p>
                    <button onClick={() => setToonHersteld(false)} className="text-amber-600 hover:text-amber-800 text-sm font-medium flex-shrink-0">OK</button>
                </div>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-xl">{sportConfig.icon}</span>
                <p className="text-sm font-medium text-amber-800">
                    {sportConfig.naam} — noteer het resultaat per leerling ({sportConfig.eenheid})
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {tellingen.map((l, i) => (
                    <div
                        key={l.naam}
                        className={`flex items-center px-4 py-3.5 gap-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                        <span className="flex-1 font-medium text-gray-900">{l.naam}</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={l.waarde}
                            onChange={e => setTellingen(prev =>
                                prev.map(t => t.naam === l.naam ? { ...t, waarde: e.target.value } : t)
                            )}
                            placeholder="0"
                            className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                        />
                    </div>
                ))}
            </div>

            {heeftResultaten && (
                <button
                    onClick={handleIndienen}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                    <CheckCircleSolid className="w-5 h-5" />
                    Resultaten indienen bij leerkracht
                </button>
            )}
        </div>
    );
}

// ─── FASE 3: INGEDIEND ────────────────────────────────────────────────────────
function WaarnemerIngediend({ metingen, sportConfig }) {
    return (
        <div className="text-center py-10">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Resultaten ingediend!</h3>
            <p className="text-gray-500 text-sm mb-6">
                De leerkracht koppelt de namen aan de leerlingenlijst en slaat de scores op.
            </p>

            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-left max-w-sm mx-auto">
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">
                    Jouw registraties ({metingen.length})
                </p>
                <div className="space-y-1.5">
                    {metingen.map((m, i) => {
                        let resultaatLabel = '—';
                        if (m.eindtijd !== undefined && m.eindtijd !== null) resultaatLabel = formatTijd(m.eindtijd);
                        else if (m.beste !== undefined && m.beste !== null) resultaatLabel = `${m.beste} ${sportConfig?.eenheid || ''}`;
                        else if (m.waarde !== undefined && m.waarde !== null) resultaatLabel = `${m.waarde} ${sportConfig?.eenheid || ''}`;

                        return (
                            <div key={i} className="flex justify-between items-center py-1.5 border-b border-teal-100 last:border-0">
                                <span className="text-sm font-medium text-teal-800">{m.naam}</span>
                                <span className="text-sm text-teal-600 font-mono">{resultaatLabel}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── HOOFD EXPORT ─────────────────────────────────────────────────────────────
export function WaarnemerView({ sessie, profile, onTerug }) {
    const faseKey = `waarnemer_fase_${sessie?.id}`;

    // Herstel fase + config na herlaad/swipe
    const hersteld = (() => {
        try {
            const raw = localStorage.getItem(faseKey);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    })();

    const [fase, setFaseState]              = useState(hersteld?.fase || 'setup');
    const [config, setConfig]               = useState(hersteld?.config || null);
    const [ingediendMetingen, setIngediend] = useState(null);
    const [loading, setLoading]             = useState(false);
    const [setupKey, setSetupKey]           = useState(0); // verhoogt bij terugkeer → verse setup

    // fase + config bewaren zodat een herlaad terugkeert naar de actieve meting
    const setFase = (nieuweFase, nieuweConfig) => {
        setFaseState(nieuweFase);
        try {
            if (nieuweFase === 'actief') {
                localStorage.setItem(faseKey, JSON.stringify({
                    fase: 'actief',
                    config: nieuweConfig ?? config,
                }));
                // Vlag voor navigatie-waarschuwing: er loopt een meting
                localStorage.setItem('waarnemer_meting_actief', '1');
            } else {
                localStorage.removeItem(faseKey);
                localStorage.removeItem('waarnemer_meting_actief');
            }
        } catch { /* */ }
    };

    // Browser-waarschuwing bij tab sluiten / herladen / URL wijzigen tijdens actieve meting
    useEffect(() => {
        const handler = (e) => {
            if (fase === 'actief') {
                e.preventDefault();
                e.returnValue = ''; // vereist door sommige browsers om de dialog te tonen
                return '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [fase]);

    // Vlag opruimen wanneer de component verdwijnt zonder actieve meting
    useEffect(() => {
        return () => {
            if (fase !== 'actief') {
                try { localStorage.removeItem('waarnemer_meting_actief'); } catch { /* */ }
            }
        };
    }, [fase]);

    const handleStart = (cfg) => {
        setConfig(cfg);
        setFase('actief', cfg);
    };

    const handleIndienen = async (metingen) => {
        setLoading(true);
        try {
            const res = await fetch('/api/tests', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${profile._token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action:       'submit_waarnemer_metingen',
                    schoolId:     profile.school_id,
                    sessieId:     sessie.id,
                    sportType:    config.sportType,
                    testId:       config.test?.id   || null,
                    testNaam:     config.test?.naam || null,
                    modus:        config.sportConfig.modus,
                    eenheid:      config.test?.eenheid || config.sportConfig.eenheid,
                    configuratie: { rondes: config.rondes, pogingen: config.pogingen },
                    metingen,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setIngediend(metingen);
            setFase('ingediend');
            toast.success('Resultaten ingediend!');
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const faseLabels = {
        setup:    'Stel je registratie in',
        actief:   config ? `${config.sportConfig.naam} — ${config.namen.length} leerlingen` : '',
        ingediend: 'Ingediend bij leerkracht',
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                {fase !== 'ingediend' && (
                    <button
                        onClick={() => {
                            if (fase === 'setup') {
                                onTerug();
                            } else {
                                // Vanuit actieve meting terug: waarschuwen, want meting gaat verloren
                                const verder = window.confirm('Weet je zeker dat je terug wil? Je huidige meting gaat verloren.');
                                if (verder) {
                                    setConfig(null);
                                    setSetupKey(k => k + 1); // verse setup, geen oude test
                                    setFase('setup');
                                }
                            }
                        }}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                    </button>
                )}
                <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900">De Waarnemer 🔭</h2>
                    <p className="text-sm text-gray-500 truncate">{faseLabels[fase]}</p>
                </div>
                {loading && (
                    <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            {/* Fasen */}
            {fase === 'setup' && <WaarnemerSetup key={setupKey} onStart={handleStart} profile={profile} />}

            {fase === 'actief' && config && (() => {
                const { modus } = config.sportConfig;
                if (modus === 'chrono_rondes' || modus === 'chrono_eenmalig') {
                    return <ChronoView config={config} onIndienen={handleIndienen} />;
                }
                if (modus === 'meting_pogingen') {
                    return <MetingView config={config} onIndienen={handleIndienen} />;
                }
                if (modus === 'telling') {
                    return <TellingView config={config} onIndienen={handleIndienen} />;
                }
                return null;
            })()}

            {fase === 'ingediend' && (
                <WaarnemerIngediend metingen={ingediendMetingen} sportConfig={config?.sportConfig} />
            )}
        </div>
    );
}