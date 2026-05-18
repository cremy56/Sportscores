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
function WaarnemerSetup({ onStart }) {
    const [sportType, setSportType] = useState('');
    const [rondes, setRondes] = useState(7);
    const [pogingen, setPogingen] = useState(3);
    const [namen, setNamen] = useState([]);
    const [naamInput, setNaamInput] = useState('');
    const inputRef = useRef(null);

    const sportConfig = SPORT_TYPES.find(s => s.id === sportType);

    const voegNaamToe = () => {
        const naam = naamInput.trim();
        if (!naam) return;
        if (namen.map(n => n.toLowerCase()).includes(naam.toLowerCase())) {
            toast.error('Naam al toegevoegd');
            return;
        }
        setNamen(prev => [...prev, naam]);
        setNaamInput('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); voegNaamToe(); }
    };

    const handleStart = () => {
        if (!sportType) { toast.error('Kies een activiteit'); return; }
        if (namen.length < 1) { toast.error('Voeg minstens 1 naam toe'); return; }
        if (sportConfig.modus === 'chrono_rondes' && (!rondes || rondes < 1)) {
            toast.error('Stel het aantal rondes in');
            return;
        }
        onStart({
            sportType,
            sportConfig,
            rondes: Number(rondes),
            pogingen: Number(pogingen),
            namen,
        });
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto">

            {/* Activiteit kiezen */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Type activiteit</label>
                <div className="grid grid-cols-2 gap-2">
                    {SPORT_TYPES.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSportType(s.id)}
                            className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                                sportType === s.id
                                    ? 'border-teal-500 bg-teal-50 text-teal-800'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <span className="text-xl flex-shrink-0">{s.icon}</span>
                            <span className="leading-tight">{s.naam}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Configuratie rondes */}
            {sportConfig?.modus === 'chrono_rondes' && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Aantal rondes per leerling
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
                        bv. 3 km op 400 m piste = 7 rondes + 1 korte schoot (stel in als 8)
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
                        Gebruik voornamen of bijnamen zoals jij ze kent — geen echte namen vereist.
                    </p>
                    <div className="flex gap-2 mb-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={naamInput}
                            onChange={e => setNaamInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="bv. Thomas, Grote Jan, Robin..."
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
        </div>
    );
}

// ─── FASE 2A: CHRONO (loop / sprint) ─────────────────────────────────────────
function ChronoView({ config, onIndienen }) {
    const { namen, rondes, sportConfig } = config;
    const maxRondes = sportConfig.modus === 'chrono_eenmalig' ? 1 : rondes;

    const [gestart, setGestart] = useState(false);
    const [startTijd, setStartTijd] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [gestopt, setGestopt] = useState(false);

    const [leerlingen, setLeerlingen] = useState(() =>
        namen.map(naam => ({
            naam,
            rondetijden: [],   // absolute ms per ronde tov startTijd
            gefinisht: false,
            eindtijd: null,
        }))
    );

    const intervalRef = useRef(null);

    useEffect(() => {
        if (gestart && !gestopt) {
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

    const registreerRonde = (naam) => {
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

    const actief   = leerlingen.filter(l => !l.gefinisht);
    const gefinisht = leerlingen.filter(l => l.gefinisht).sort((a, b) => a.eindtijd - b.eindtijd);
    const alleKlaar = actief.length === 0;

    const handleIndienen = () => {
        const metingen = leerlingen.map(l => ({
            naam:        l.naam,
            rondetijden: l.rondetijden,    // ms per ronde (cumulatief)
            eindtijd:    l.eindtijd,       // ms totale tijd (null als niet gefinisht)
            gefinisht:   l.gefinisht,
        }));
        onIndienen(metingen);
    };

    return (
        <div className="space-y-4">

            {/* Chrono display */}
            <div className="bg-slate-900 rounded-2xl p-6 text-center">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
                    {sportConfig.naam}
                    {sportConfig.modus === 'chrono_rondes' && ` — ${maxRondes} ronde${maxRondes > 1 ? 's' : ''}`}
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

                            return (
                                <div key={l.naam} className="flex items-center px-4 py-3.5 gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{l.naam}</p>
                                        <p className="text-xs text-gray-400">
                                            Ronde {rondeNr} / {maxRondes}
                                            {huidigeRondeTijd !== null && (
                                                <span className="ml-2 text-teal-500 font-mono">
                                                    laatste: {formatRondetijd(huidigeRondeTijd)}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => registreerRonde(l.naam)}
                                        disabled={!gestart || gestopt}
                                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-30 ${
                                            isFinish
                                                ? 'bg-green-500 hover:bg-green-400 text-white'
                                                : 'bg-teal-100 hover:bg-teal-200 text-teal-800'
                                        }`}
                                    >
                                        {isFinish ? '🏁 Finish' : `Ronde ${rondeNr} ✓`}
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

    const [metingen, setMetingen] = useState(() =>
        namen.map(naam => ({
            naam,
            pogingen: Array(pogingen).fill(''),
            beste: null,
        }))
    );

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
        onIndienen(resultaten);
    };

    const heeftResultaten = metingen.some(l => l.pogingen.some(p => String(p).trim() !== ''));

    return (
        <div className="space-y-4">
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

    const [tellingen, setTellingen] = useState(() =>
        namen.map(naam => ({ naam, waarde: '' }))
    );

    const handleIndienen = () => {
        const resultaten = tellingen.map(l => ({
            naam:   l.naam,
            waarde: parseFloat(l.waarde) || null,
        }));
        onIndienen(resultaten);
    };

    const heeftResultaten = tellingen.some(l => l.waarde.toString().trim() !== '');

    return (
        <div className="space-y-4">
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
    const [fase, setFase]                   = useState('setup');
    const [config, setConfig]               = useState(null);
    const [ingediendMetingen, setIngediend] = useState(null);
    const [loading, setLoading]             = useState(false);

    const handleStart = (cfg) => {
        setConfig(cfg);
        setFase('actief');
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
                    modus:        config.sportConfig.modus,
                    eenheid:      config.sportConfig.eenheid,
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
                        onClick={fase === 'setup' ? onTerug : () => setFase('setup')}
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
            {fase === 'setup' && <WaarnemerSetup onStart={handleStart} />}

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
