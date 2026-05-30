// src/components/WaarnemerPanel.jsx
// Leerkracht-zijde van de Waarnemer tool — gebruikt vanuit TestafnameDetail.jsx
//
// Tab 1 "Eigen chrono": leerkracht gebruikt chrono met echte namen uit testafname
//   → resultaten worden direct opgeslagen via update_score (geen koppelstap)
//
// Tab 2 "Ingediend door waarnemer": toont ingediende metingen van een leerling-Waarnemer
//   → leerkracht koppelt elke ingevoerde naam aan een echte leerling
//   → na koppeling: normtabel berekent punten → opslaan in scores

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import BeeptestTool from './BeeptestTool';
import {
    PlayIcon,
    StopIcon,
    XMarkIcon,
    CheckIcon,
    ArrowPathIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatTijd(ms) {
    if (ms === null || ms === undefined) return '--:--';
    const totalSec = Math.floor(ms / 1000);
    const min      = Math.floor(totalSec / 60);
    const sec      = totalSec % 60;
    const honderd  = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(honderd).padStart(2, '0')}`;
}

// Omzetten van ms naar seconden voor opslaan (het scores-systeem werkt in seconden voor tijden)
function msNaarSeconden(ms) {
    return ms / 1000;
}

// ─── API HELPER ────────────────────────────────────────────────────────────────
async function apiSaveScore(profile, groepId, testId, datum, leerlingId, klas, geslacht, score) {
    await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${profile._token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'save_score',
            schoolId: profile.school_id,
            groepId, testId, datum,
            leerlingId, klas: klas || null, geslacht: geslacht || null, score,
        }),
    });
}

// ─── AUTO-DETECTIE ────────────────────────────────────────────────────────────
// Geëxporteerd zodat NieuweTestafname de knop conditioneel kan tonen
export function detectWaarnemerModus(test) {
    if (!test) return { modus: 'onbekend', geschikt: false, reden: 'Geen test geselecteerd.' };

    const naam      = (test.naam      || test.test_naam || '').toLowerCase();
    const eenheid   = (test.eenheid   || '').toLowerCase();
    const categorie = (test.categorie || '').toLowerCase();

    // ❌ Niet geschikt — subjectieve beoordeling
    if (['sportprestaties', 'lenigheid', 'coördinatie', 'coordinatie'].some(c => categorie.includes(c))) {
        return { modus: 'niet_geschikt', geschikt: false, icon: '⛔',
            reden: `${test.categorie}-testen vereisen directe beoordeling door de leerkracht.` };
    }
    // ❌ Krachttesten met herhalingen
    if (categorie.includes('kracht') && (eenheid.includes('aantal') || eenheid.includes('rep'))) {
        return { modus: 'niet_geschikt', geschikt: false, icon: '⛔',
            reden: 'Krachttesten met herhalingen vereisen visuele controle van elke herhaling.' };
    }

    // ⏱️ Cooper test
    if (naam.includes('cooper')) {
        return { modus: 'cooper', geschikt: true, icon: '⏱️', label: 'Cooper — afteltimer 12 min' };
    }

    // 🔔 Beeptest / piepjestest / léger
    const BEEP_TERMEN = ['beep', 'bleep', 'piepjes', 'piep', 'léger', 'leger', 'shuttle run', 'msft', 'pacer'];
    if (BEEP_TERMEN.some(t => naam.includes(t))) {
        return { modus: 'beeptest', geschikt: true, icon: '🔔', label: 'Beeptest — Léger protocol' };
    }

    // ⬆️ Hoogspringen
    if (naam.includes('hoog') && (eenheid.includes('m') || eenheid.includes('cm'))) {
        return { modus: 'hoogspring', geschikt: true, icon: '⬆️', label: 'Hoogspring scoreformulier' };
    }

    // ↗️ Afstandsmeting
    if (eenheid.includes(' m') || eenheid === 'm' || eenheid.includes('cm') || eenheid.includes('meter')) {
        return { modus: 'meting', geschikt: true, icon: '↗️', label: 'Afstandsmeting' };
    }

    // 🏊 Zwemmen — sprint (<200m) vs lange afstand (≥200m)
    const ZWEM_TERMEN = ['zwem', 'baantj', 'crawl', 'schoolslag', 'rugslag', 'vlinderslag', 'borst', 'wisselslag'];
    if (ZWEM_TERMEN.some(t => naam.includes(t))) {
        const afstandMatch  = naam.match(/(\d+)\s*m/);
        const afstand       = afstandMatch ? parseInt(afstandMatch[1]) : null;
        const defaultBanen  = afstand ? Math.round(afstand / 25) : 16;
        const isLangAfstand = !afstand || afstand >= 200; // onbekend = veronderstel lange afstand

        if (isLangAfstand) {
            return { modus: 'zwem_wave', geschikt: true, icon: '🏊',
                label: 'Zwemmen — wave start', defaultBanen, afstand };
        }
        return { modus: 'chrono_eenmalig', geschikt: true, icon: '🏊',
            label: `Zwemmen sprint${afstand ? ` ${afstand}m` : ''} — eindtijd`,
            eenheidLabel: 'banen', eenheidSingular: 'Baan',
            isZwemmen: true, defaultRondes: defaultBanen };
    }

    // ↔️ Telling
    if (eenheid.includes('aantal')) {
        return { modus: 'telling', geschikt: true, icon: '↔️', label: 'Telling', eenheidLabel: eenheid };
    }

    // 🏃 Duurloop met rondes
    if (categorie.includes('uithouding') || ['km', 'duurloop'].some(w => naam.includes(w))) {
        return { modus: 'chrono_rondes', geschikt: true, icon: '🏃', label: 'Rondetijden',
            eenheidLabel: 'rondes', eenheidSingular: 'Ronde', defaultRondes: 7 };
    }

    // ⚡ Sprint
    if (['sec', 'seconden', 's', 'min'].some(e => eenheid.includes(e)) || categorie.includes('snelheid')) {
        return { modus: 'chrono_eenmalig', geschikt: true, icon: '⚡', label: 'Eindtijd',
            eenheidLabel: 'rondes', eenheidSingular: 'Ronde', defaultRondes: 1 };
    }

    return { modus: 'onbekend', geschikt: false, icon: '❓',
        reden: 'Onbekend testtype — de Waarnemer Tool kan dit type test niet automatisch verwerken.' };
}

// ─── NIET GESCHIKT SCHERM ─────────────────────────────────────────────────────
function NietGeschiktView({ detectie }) {
    return (
        <div className="text-center py-10">
            <p className="text-5xl mb-4">{detectie.icon || '⛔'}</p>
            <p className="font-semibold text-gray-800 text-lg mb-2">Waarnemer Tool niet beschikbaar</p>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">{detectie.reden}</p>
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-left max-w-xs mx-auto">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Gebruik in de plaats</p>
                <p className="text-sm text-gray-700">Voer de scores handmatig in via de scoretabel op deze pagina.</p>
            </div>
        </div>
    );
}

// ─── EIGEN CHRONO (leerkracht, echte namen) ───────────────────────────────────
function EigenChronoTab({ leerlingen, detectie, groepId, testId, datum, profile, onScoresOpgeslagen }) {
    const defaultRondes  = detectie?.defaultRondes ?? 1;
    const eenheidLabel   = detectie?.eenheidLabel   || 'rondes';
    const eenheidSingulier = detectie?.eenheidSingular || 'Ronde';
    const [rondes, setRondes]                       = useState(defaultRondes);
    const [perTwee, setPerTwee]                     = useState(false); // zwemmen: tellen per 2 banen
    const [gestart, setGestart]                     = useState(false);
    const [startTijd, setStartTijd]                 = useState(null);
    const [elapsed, setElapsed]                     = useState(0);
    const [gestopt, setGestopt]                     = useState(false);
    const [chronoLeerlingen, setChronoLeerlingen]   = useState(null);
    const [opgeslagen, setOpgeslagen]               = useState(false);
    const [saving, setSaving]                       = useState(false);
    const intervalRef                               = useRef(null);

    const handleStart = () => {
        const now = Date.now();
        setStartTijd(now);
        setGestart(true);
        setChronoLeerlingen(
            leerlingen.filter(l => !l.score).map(l => ({ ...l, rondetijden: [], gefinisht: false, eindtijd: null }))
        );
    };

    useEffect(() => {
        if (gestart && !gestopt) {
            intervalRef.current = setInterval(() => setElapsed(Date.now() - startTijd), 50);
        }
        return () => clearInterval(intervalRef.current);
    }, [gestart, gestopt, startTijd]);

    const handleStop = () => {
        const nogActief = chronoLeerlingen?.filter(l => !l.gefinisht).length || 0;
        if (nogActief > 0) {
            const bevestigd = window.confirm(
                `${nogActief} leerling${nogActief > 1 ? 'en hebben' : ' heeft'} de ${eenheidLabel.slice(0, -1) || 'test'} nog niet afgemaakt.\n\nBen je zeker dat je de chrono wil stoppen?`
            );
            if (!bevestigd) return;
        }
        clearInterval(intervalRef.current);
        setGestopt(true);
    };

    const registreerRonde = (id) => {
        if (!gestart || gestopt) return;
        const nu = Date.now() - startTijd;
        setChronoLeerlingen(prev => prev.map(l => {
            if (l.id !== id || l.gefinisht) return l;
            // perTwee: elke klik telt als 2 eenheden
            const stap = perTwee ? 2 : 1;
            const rt = [...l.rondetijden];
            for (let i = 0; i < stap; i++) rt.push(nu);
            const klaar = rt.length >= rondes;
            return { ...l, rondetijden: rt, gefinisht: klaar, eindtijd: klaar ? nu : null };
        }));
    };

    const handleOpslaan = async () => {
        const gefinisht = chronoLeerlingen?.filter(l => l.gefinisht) || [];
        if (!gefinisht.length) { toast.error('Geen gefinishte leerlingen'); return; }
        setSaving(true);
        const t = toast.loading(`${gefinisht.length} score(s) opslaan...`);
        let ok = 0;
        for (const l of gefinisht) {
            try {
                await apiSaveScore(profile, groepId, testId, datum, l.id, l.klas, l.geslacht, msNaarSeconden(l.eindtijd));
                ok++;
            } catch { /* doorgaan */ }
        }
        toast.dismiss(t);
        toast.success(`${ok} score(s) opgeslagen!`);
        setSaving(false);
        setOpgeslagen(true);
        if (onScoresOpgeslagen) onScoresOpgeslagen();
    };

    const actief    = chronoLeerlingen?.filter(l => !l.gefinisht) || [];
    const gefinisht = chronoLeerlingen?.filter(l => l.gefinisht).sort((a, b) => a.eindtijd - b.eindtijd) || [];

    if (opgeslagen) return (
        <div className="text-center py-10">
            <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 text-lg mb-1">Scores opgeslagen!</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {!gestart && detectie?.modus === 'chrono_rondes' && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Aantal {eenheidLabel} per leerling
                        </label>
                        <input type="number" min={1} max={99} value={rondes} onChange={e => setRondes(Number(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400" />
                        <p className="text-xs text-gray-400 mt-1 text-center">
                            {detectie?.isZwemmen
                                ? `bv. 800m in 25m bad = ${Math.round(800/25)} banen`
                                : 'bv. 3 km op 400 m piste = 7 rondes'}
                        </p>
                    </div>
                    {detectie?.isZwemmen && (
                        <button onClick={() => setPerTwee(p => !p)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${
                                perTwee ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}>
                            <div className="text-left">
                                <p className="font-medium text-sm">Tellen per 2 banen (per lengte)</p>
                                <p className="text-xs opacity-70 mt-0.5">
                                    {perTwee ? 'Elke klik = 2 banen — leerkracht staat aan 1 kant' : 'Elke klik = 1 baan — tellen bij elke passing'}
                                </p>
                            </div>
                            <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${perTwee ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${perTwee ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </button>
                    )}
                </div>
            )}
            <div className="bg-slate-900 rounded-2xl p-5 text-center">
                <div className="text-5xl font-mono font-bold text-white tracking-wider mb-4">{formatTijd(elapsed)}</div>
                {!gestart ? (
                    <button onClick={handleStart} disabled={!leerlingen.filter(l => !l.score).length}
                        className="bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold px-10 py-3.5 rounded-2xl text-lg flex items-center gap-2 mx-auto active:scale-95">
                        <PlayIcon className="w-6 h-6" /> START
                    </button>
                ) : !gestopt ? (
                    <button onClick={handleStop}
                        className="bg-red-500 hover:bg-red-400 text-white font-bold px-10 py-3.5 rounded-2xl text-lg flex items-center gap-2 mx-auto active:scale-95">
                        <StopIcon className="w-6 h-6" /> Stop chrono
                    </button>
                ) : (
                    <p className="text-green-400 font-semibold">Gestopt op {formatTijd(elapsed)}</p>
                )}
            </div>

            {actief.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-600">
                            {detectie?.icon || '🏃'} Actief ({actief.length})
                            {perTwee && <span className="ml-2 text-xs font-normal text-blue-600">• elke klik = 2 banen</span>}
                        </p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {actief.map((l, idx) => {
                            const rondeNr  = l.rondetijden.length + 1;
                            const isFinish = rondeNr === rondes;
                            const nummer   = (chronoLeerlingen?.indexOf(l) ?? idx) + 1;
                            return (
                                <div key={l.id} className="flex items-center px-3 py-3 gap-3">
                                    {/* Nummer badge */}
                                    <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                                        {nummer}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{l.naam}</p>
                                        {detectie?.modus === 'chrono_rondes' && (
                                            <p className="text-xs text-gray-400">
                                                {eenheidSingulier} {rondeNr}/{rondes}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={() => registreerRonde(l.id)} disabled={!gestart || gestopt}
                                        className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 disabled:opacity-30 ${isFinish ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-teal-100 hover:bg-teal-200 text-teal-800'}`}>
                                        {isFinish ? '🏁 Finish' : detectie?.modus === 'chrono_rondes'
                                            ? `${eenheidSingulier} ${rondeNr} ✓`
                                            : '🏁 Finish'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {gefinisht.length > 0 && (
                <div className="bg-white rounded-2xl border border-green-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-green-50 border-b border-green-100">
                        <p className="text-sm font-semibold text-green-700">✅ Gefinisht ({gefinisht.length})</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {gefinisht.map((l, i) => (
                            <div key={l.id} className="flex items-center px-4 py-3 gap-3">
                                <span className="w-6 text-center font-bold text-gray-400 text-sm">{i + 1}</span>
                                <span className="flex-1 font-medium text-gray-900">{l.naam}</span>
                                <span className="font-mono font-bold text-green-700">{formatTijd(l.eindtijd)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(gestopt || actief.length === 0) && gefinisht.length > 0 && (
                <button onClick={handleOpslaan} disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
                    {saving ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Opslaan...</> : <><CheckCircleSolid className="w-5 h-5" /> Scores opslaan in testafname</>}
                </button>
            )}
        </div>
    );
}

// ─── EIGEN METING (afstandsmeting: verspringen, kogelstoten, werpen) ──────────
function EigenMetingTab({ leerlingen, detectie, pogingen = 3, groepId, testId, datum, profile, onScoresOpgeslagen }) {
    const [metingen, setMetingen] = useState(() =>
        leerlingen.filter(l => !l.score).map(l => ({
            ...l,
            pogingen: Array(pogingen).fill({ waarde: '', ongeldig: false }),
            beste: null,
        }))
    );
    const [saving, setSaving]   = useState(false);
    const [opgeslagen, setOpgeslagen] = useState(false);

    const updatePoging = (id, idx, veld, val) => {
        setMetingen(prev => prev.map(l => {
            if (l.id !== id) return l;
            const ps = l.pogingen.map((p, i) => i === idx ? { ...p, [veld]: val } : p);
            const geldig = ps
                .filter(p => !p.ongeldig)
                .map(p => parseFloat(String(p.waarde).replace(',', '.')))
                .filter(n => !isNaN(n) && n > 0);
            return { ...l, pogingen: ps, beste: geldig.length ? Math.max(...geldig) : null };
        }));
    };

    const handleOpslaan = async () => {
        const metMetBeste = metingen.filter(l => l.beste !== null);
        if (!metMetBeste.length) { toast.error('Nog geen geldige metingen'); return; }
        setSaving(true);
        const t = toast.loading(`${metMetBeste.length} score(s) opslaan...`);
        let ok = 0;
        for (const l of metMetBeste) {
            try {
                await apiSaveScore(profile, groepId, testId, datum, l.id, l.klas, l.geslacht, l.beste);
                ok++;
            } catch { /* doorgaan */ }
        }
        toast.dismiss(t);
        toast.success(`${ok} score(s) opgeslagen!`);
        setSaving(false);
        setOpgeslagen(true);
        if (onScoresOpgeslagen) onScoresOpgeslagen();
    };

    if (opgeslagen) return (
        <div className="text-center py-10">
            <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 text-lg mb-1">Scores opgeslagen!</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-xl">{detectie.icon}</span>
                <p className="text-sm font-medium text-amber-800">
                    {detectie.label} — {pogingen} pogingen per leerling · tik <strong>O</strong> voor ongeldige poging
                </p>
            </div>

            {metingen.map(l => (
                <div key={l.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-900">{l.naam}</span>
                        {l.beste !== null && (
                            <span className="text-sm font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                                Beste: {l.beste} m
                            </span>
                        )}
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${pogingen}, 1fr)` }}>
                        {l.pogingen.map((p, idx) => {
                            const val = parseFloat(String(p.waarde).replace(',', '.'));
                            const isBeste = !isNaN(val) && val > 0 && val === l.beste && !p.ongeldig;
                            return (
                                <div key={idx}>
                                    <label className="block text-xs text-gray-500 mb-1 text-center">Poging {idx + 1}</label>
                                    <div className="flex gap-1">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={p.ongeldig ? '' : p.waarde}
                                            disabled={p.ongeldig}
                                            onChange={e => updatePoging(l.id, idx, 'waarde', e.target.value)}
                                            placeholder={p.ongeldig ? 'O' : '0.00'}
                                            className={`flex-1 px-2 py-2.5 border rounded-xl text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 min-w-0 ${
                                                p.ongeldig
                                                    ? 'bg-red-50 border-red-300 text-red-400 italic'
                                                    : isBeste
                                                        ? 'border-teal-400 bg-teal-50 text-teal-800'
                                                        : 'border-gray-200'
                                            }`}
                                        />
                                        <button
                                            onClick={() => updatePoging(l.id, idx, 'ongeldig', !p.ongeldig)}
                                            title={p.ongeldig ? 'Markeer als geldig' : 'Markeer als ongeldig'}
                                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                                p.ongeldig
                                                    ? 'bg-red-100 border-red-300 text-red-600 hover:bg-red-200'
                                                    : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500'
                                            }`}
                                        >
                                            O
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {metingen.some(l => l.beste !== null) && (
                <button onClick={handleOpslaan} disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
                    {saving ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Opslaan...</> : <><CheckCircleSolid className="w-5 h-5" /> Scores opslaan</>}
                </button>
            )}
        </div>
    );
}

// ─── EIGEN TELLING (zwemmen, shuttle run, touwspringen, ...) ──────────────────
function EigenTellingTab({ leerlingen, detectie, groepId, testId, datum, profile, onScoresOpgeslagen }) {
    const [tellingen, setTellingen]   = useState(() =>
        leerlingen.filter(l => !l.score).map(l => ({ ...l, waarde: '' }))
    );
    const [saving, setSaving]         = useState(false);
    const [opgeslagen, setOpgeslagen] = useState(false);

    const handleOpslaan = async () => {
        const ingevuld = tellingen.filter(l => l.waarde.toString().trim() !== '' && !isNaN(Number(l.waarde)));
        if (!ingevuld.length) { toast.error('Nog geen resultaten ingevuld'); return; }
        setSaving(true);
        const t = toast.loading(`${ingevuld.length} score(s) opslaan...`);
        let ok = 0;
        for (const l of ingevuld) {
            try {
                await apiSaveScore(profile, groepId, testId, datum, l.id, l.klas, l.geslacht, Number(l.waarde));
                ok++;
            } catch { /* doorgaan */ }
        }
        toast.dismiss(t);
        toast.success(`${ok} score(s) opgeslagen!`);
        setSaving(false);
        setOpgeslagen(true);
        if (onScoresOpgeslagen) onScoresOpgeslagen();
    };

    if (opgeslagen) return (
        <div className="text-center py-10">
            <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 text-lg mb-1">Scores opgeslagen!</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-xl">{detectie.icon}</span>
                <p className="text-sm font-medium text-amber-800">
                    {detectie.label} — noteer het aantal {detectie.eenheidLabel || ''} per leerling
                </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {tellingen.map((l, i) => (
                    <div key={l.id} className={`flex items-center px-4 py-3.5 gap-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                        <span className="flex-1 font-medium text-gray-900">{l.naam}</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={l.waarde}
                            onChange={e => setTellingen(prev => prev.map(t => t.id === l.id ? { ...t, waarde: e.target.value } : t))}
                            placeholder="0"
                            className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400"
                        />
                    </div>
                ))}
            </div>
            {tellingen.some(l => l.waarde.toString().trim() !== '') && (
                <button onClick={handleOpslaan} disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
                    {saving ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Opslaan...</> : <><CheckCircleSolid className="w-5 h-5" /> Scores opslaan</>}
                </button>
            )}
        </div>
    );
}

// ─── EIGEN HOOGSPRING (progressief scoreformulier) ────────────────────────────
//
// Werking:
//   - Leerkracht stelt beginhoogte + stapgrootte in
//   - Systeem genereert hoogtes automatisch
//   - Per hoogte, per leerling: ✓ (geslaagd) / ✗ (mislukt) / — (overgeslagen)
//   - Na 3 opeenvolgende mislukkingen (ongeacht hoogte) → automatisch uitgeschakeld
//   - Eindscore = laatste geslaagde hoogte in meter
//   - Leerling mag een hoogte overslaan (impasse) → telt niet als mislukking
//
function EigenHoogspringTab({ leerlingen, groepId, testId, datum, profile, onScoresOpgeslagen }) {
    // ── Setup state ──────────────────────────────────────────────────────────
    const [fase, setFase]             = useState('setup'); // 'setup' | 'actief' | 'opgeslagen'
    const [beginHoogte, setBeginHoogte] = useState(100);  // cm
    const [stapGrootte, setStapGrootte] = useState(5);    // cm
    const [saving, setSaving]         = useState(false);

    // ── Scorestate per leerling per hoogte ───────────────────────────────────
    // scores[leerlingId][hoogteCm] = 'geslaagd' | 'mislukt' | 'overgeslagen' | null
    const [scores, setScores]         = useState({});
    const [hoogtes, setHoogtes]       = useState([]);     // gesorteerde array van cm-waarden
    const [uitgeschakeld, setUitgeschakeld] = useState({}); // { leerlingId: true }

    // ── Initialiseer bij start ───────────────────────────────────────────────
    const handleStart = () => {
        const initHoogtes = [];
        for (let h = beginHoogte; h <= beginHoogte + stapGrootte * 20; h += stapGrootte) {
            initHoogtes.push(h);
        }
        setHoogtes(initHoogtes);
        const initScores = {};
        leerlingen.filter(l => !l.score).forEach(l => { initScores[l.id] = {}; });
        setScores(initScores);
        setUitgeschakeld({});
        setFase('actief');
    };

    // ── Hoogte toevoegen ─────────────────────────────────────────────────────
    const voegHoogteToe = () => {
        const volgende = (hoogtes[hoogtes.length - 1] || beginHoogte) + stapGrootte;
        setHoogtes(prev => [...prev, volgende]);
    };

    // ── Score registreren ────────────────────────────────────────────────────
    const setScore = (leerlingId, hoogte, waarde) => {
        if (uitgeschakeld[leerlingId]) return;

        setScores(prev => {
            const nieuw = {
                ...prev,
                [leerlingId]: { ...prev[leerlingId], [hoogte]: waarde },
            };

            // Controleer uitschakeling: 3 opeenvolgende mislukkingen over alle hoogtes
            const alleHoogtes = hoogtes.slice().sort((a, b) => a - b);
            let opeenvolgend = 0;
            let maxOpeenvolgend = 0;
            for (const h of alleHoogtes) {
                const s = nieuw[leerlingId]?.[h];
                if (s === 'mislukt') {
                    opeenvolgend++;
                    maxOpeenvolgend = Math.max(maxOpeenvolgend, opeenvolgend);
                } else if (s === 'geslaagd' || s === 'overgeslagen') {
                    opeenvolgend = 0;
                } // null = nog niet geprobeerd → stop tellen
                else break;
            }

            if (maxOpeenvolgend >= 3) {
                setUitgeschakeld(u => ({ ...u, [leerlingId]: true }));
            }
            return nieuw;
        });
    };

    // ── Beste hoogte per leerling ────────────────────────────────────────────
    const besteHoogte = (leerlingId) => {
        const ls = scores[leerlingId] || {};
        const geslaagd = Object.entries(ls)
            .filter(([, v]) => v === 'geslaagd')
            .map(([h]) => Number(h));
        return geslaagd.length ? Math.max(...geslaagd) : null;
    };

    // ── Scores opslaan ───────────────────────────────────────────────────────
    const handleOpslaan = async () => {
        const metScore = leerlingen
            .filter(l => !l.score)
            .map(l => ({ ...l, beste: besteHoogte(l.id) }))
            .filter(l => l.beste !== null);

        if (!metScore.length) { toast.error('Nog geen leerling heeft een hoogte gehaald'); return; }

        setSaving(true);
        const t = toast.loading(`${metScore.length} score(s) opslaan...`);
        let ok = 0;
        for (const l of metScore) {
            try {
                // Score in meter (1m = 100cm)
                await apiSaveScore(profile, groepId, testId, datum, l.id, l.klas, l.geslacht, l.beste / 100);
                ok++;
            } catch { /* doorgaan */ }
        }
        toast.dismiss(t);
        toast.success(`${ok} score(s) opgeslagen!`);
        setSaving(false);
        setFase('opgeslagen');
        if (onScoresOpgeslagen) onScoresOpgeslagen();
    };

    // ── Render: setup ────────────────────────────────────────────────────────
    if (fase === 'setup') return (
        <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-xl">⬆️</span>
                <p className="text-sm font-medium text-amber-800">
                    Stel de beginhoogte en stapgrootte in. Hoogtes worden automatisch gegenereerd.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Beginhoogte (cm)</label>
                    <input type="number" min={50} max={250} step={1} value={beginHoogte}
                        onChange={e => setBeginHoogte(Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stapgrootte (cm)</label>
                    <div className="flex gap-2">
                        {[3, 5, 10].map(s => (
                            <button key={s} onClick={() => setStapGrootte(s)}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold text-lg transition-all ${
                                    stapGrootte === s
                                        ? 'border-purple-500 bg-purple-50 text-purple-800'
                                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                }`}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Eerste 5 hoogtes</p>
                <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 5 }, (_, i) => beginHoogte + i * stapGrootte).map(h => (
                        <span key={h} className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                            {h} cm
                        </span>
                    ))}
                    <span className="px-3 py-1 text-sm text-gray-400">...</span>
                </div>
            </div>

            <button onClick={handleStart}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-2xl transition-colors">
                ⬆️ Start Scoreformulier
            </button>
        </div>
    );

    // ── Render: opgeslagen ───────────────────────────────────────────────────
    if (fase === 'opgeslagen') return (
        <div className="text-center py-10">
            <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 text-lg mb-1">Scores opgeslagen!</p>
        </div>
    );

    // ── Render: actief ───────────────────────────────────────────────────────
    const actieveLeerlingen  = leerlingen.filter(l => !l.score && !uitgeschakeld[l.id]);
    const uitgeschakeldeLeerlingen = leerlingen.filter(l => !l.score && uitgeschakeld[l.id]);

    return (
        <div className="space-y-4">
            {/* Scoreformulier tabel */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 min-w-[120px]">
                                    Leerling
                                </th>
                                {hoogtes.map(h => (
                                    <th key={h} className="px-3 py-3 font-semibold text-gray-600 text-center min-w-[64px]">
                                        {h} cm
                                    </th>
                                ))}
                                <th className="px-4 py-3 font-semibold text-teal-700 text-center min-w-[80px]">Beste</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leerlingen.filter(l => !l.score).map(l => {
                                const isUit  = uitgeschakeld[l.id];
                                const beste  = besteHoogte(l.id);
                                return (
                                    <tr key={l.id} className={isUit ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50/50'}>
                                        <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">
                                            <div className="flex items-center gap-1.5">
                                                {l.naam}
                                                {isUit && <span className="text-xs text-red-500 font-normal">(uit)</span>}
                                            </div>
                                        </td>
                                        {hoogtes.map(h => {
                                            const s = scores[l.id]?.[h] ?? null;
                                            return (
                                                <td key={h} className="px-2 py-2 text-center">
                                                    <div className="flex gap-0.5 justify-center">
                                                        {/* Geslaagd */}
                                                        <button
                                                            onClick={() => setScore(l.id, h, s === 'geslaagd' ? null : 'geslaagd')}
                                                            disabled={isUit}
                                                            title="Geslaagd"
                                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                                                s === 'geslaagd'
                                                                    ? 'bg-green-500 text-white'
                                                                    : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                                                            }`}
                                                        >✓</button>
                                                        {/* Mislukt */}
                                                        <button
                                                            onClick={() => setScore(l.id, h, s === 'mislukt' ? null : 'mislukt')}
                                                            disabled={isUit}
                                                            title="Mislukt"
                                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                                                s === 'mislukt'
                                                                    ? 'bg-red-500 text-white'
                                                                    : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                                                            }`}
                                                        >✗</button>
                                                        {/* Overgeslagen */}
                                                        <button
                                                            onClick={() => setScore(l.id, h, s === 'overgeslagen' ? null : 'overgeslagen')}
                                                            disabled={isUit}
                                                            title="Overgeslagen (impasse)"
                                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                                                s === 'overgeslagen'
                                                                    ? 'bg-amber-400 text-white'
                                                                    : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600'
                                                            }`}
                                                        >—</button>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-center font-bold text-teal-700">
                                            {beste !== null ? `${beste} cm` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legenda */}
            <div className="flex gap-3 text-xs text-gray-500 px-1">
                <span className="flex items-center gap-1"><span className="w-5 h-5 bg-green-500 rounded text-white flex items-center justify-center font-bold">✓</span> Geslaagd</span>
                <span className="flex items-center gap-1"><span className="w-5 h-5 bg-red-500 rounded text-white flex items-center justify-center font-bold">✗</span> Mislukt</span>
                <span className="flex items-center gap-1"><span className="w-5 h-5 bg-amber-400 rounded text-white flex items-center justify-center font-bold">—</span> Overgeslagen</span>
            </div>

            {/* Hoogte toevoegen */}
            <button onClick={voegHoogteToe}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors">
                + Volgende hoogte toevoegen ({(hoogtes[hoogtes.length - 1] || beginHoogte) + stapGrootte} cm)
            </button>

            {/* Uitgeschakeld */}
            {uitgeschakeldeLeerlingen.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-red-600 mb-1">Uitgeschakeld (3 opeenvolgende mislukkingen)</p>
                    <p className="text-sm text-red-700">
                        {uitgeschakeldeLeerlingen.map(l => l.naam).join(', ')}
                    </p>
                </div>
            )}

            {/* Opslaan */}
            {leerlingen.filter(l => !l.score).some(l => besteHoogte(l.id) !== null) && (
                <button onClick={handleOpslaan} disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
                    {saving ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Opslaan...</> : <><CheckCircleSolid className="w-5 h-5" /> Scores opslaan</>}
                </button>
            )}
        </div>
    );
}

// ─── EIGEN COOPER (afteltimer 12 min, ronden + eindmeting) ───────────────────
const COOPER_DUUR_MS = 12 * 60 * 1000;

function EigenCooperTab({ leerlingen, groepId, testId, datum, profile, onScoresOpgeslagen }) {
    const [fase, setFase]             = useState('setup');
    const [pisteAfstand, setPiste]    = useState(400);
    const [tijdOver, setTijdOver]     = useState(COOPER_DUUR_MS);
    const [gestart, setGestart]       = useState(false);
    const [startMs, setStartMs]       = useState(null);
    const [ronden, setRonden]         = useState({});      // { leerlingId: aantal }
    const [extraMeters, setExtra]     = useState({});      // { leerlingId: meters }
    const [saving, setSaving]         = useState(false);
    const intervalRef                 = useRef(null);

    const actieveLeerlingen = leerlingen.filter(l => !l.score);

    // ── Afteltimer ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!gestart || fase !== 'actief') return;
        intervalRef.current = setInterval(() => {
            const verstreken = Date.now() - startMs;
            const over = Math.max(0, COOPER_DUUR_MS - verstreken);
            setTijdOver(over);
            if (over === 0) {
                clearInterval(intervalRef.current);
                setFase('eindmeting');
            }
        }, 100);
        return () => clearInterval(intervalRef.current);
    }, [gestart, fase, startMs]);

    const handleStart = () => {
        const nu = Date.now();
        setStartMs(nu);
        setGestart(true);
        const initRonden = {};
        actieveLeerlingen.forEach(l => { initRonden[l.id] = 0; });
        setRonden(initRonden);
        setFase('actief');
    };

    const handleStop = () => {
        clearInterval(intervalRef.current);
        setFase('eindmeting');
    };

    const registreerRonde = (id) => {
        setRonden(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    };

    const setExtraSnelkeuze = (id, meters) => {
        setExtra(prev => ({ ...prev, [id]: meters }));
    };

    const berekenScore = (id) => (ronden[id] || 0) * pisteAfstand + (extraMeters[id] || 0);

    // ── Afteltimer formattering ───────────────────────────────────────────────
    const formatAfteltijd = (ms) => {
        const totalSec = Math.ceil(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const isKritiek = tijdOver <= 60000; // laatste minuut → rood

    const handleOpslaan = async () => {
        const metScore = actieveLeerlingen.filter(l => berekenScore(l.id) > 0);
        if (!metScore.length) { toast.error('Nog geen scores ingevoerd'); return; }
        setSaving(true);
        const t = toast.loading(`${metScore.length} score(s) opslaan...`);
        let ok = 0;
        for (const l of metScore) {
            try {
                await apiSaveScore(profile, groepId, testId, datum, l.id, l.klas, l.geslacht, berekenScore(l.id));
                ok++;
            } catch { /* doorgaan */ }
        }
        toast.dismiss(t);
        toast.success(`${ok} score(s) opgeslagen!`);
        setSaving(false);
        setFase('opgeslagen');
        if (onScoresOpgeslagen) onScoresOpgeslagen();
    };

    // ── Render: setup ────────────────────────────────────────────────────────
    if (fase === 'setup') return (
        <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                <p className="text-sm font-medium text-amber-800">
                    Cooper test — 12 minuten afteltimer. Klik per leerling bij elke voltooide ronde.
                </p>
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pisteafstand</label>
                <div className="flex gap-2">
                    {[200, 400].map(m => (
                        <button key={m} onClick={() => setPiste(m)}
                            className={`flex-1 py-3 rounded-xl border-2 font-bold text-lg transition-all ${
                                pisteAfstand === m ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}>{m} m</button>
                    ))}
                    <div className="flex-1 relative">
                        <input type="number" min={100} max={1000} placeholder="Andere"
                            onChange={e => setPiste(Number(e.target.value))}
                            className={`w-full py-3 px-3 rounded-xl border-2 font-bold text-lg text-center transition-all focus:outline-none ${
                                ![200, 400].includes(pisteAfstand) ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200'
                            }`} />
                    </div>
                </div>
            </div>
            <button onClick={handleStart}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-2xl transition-colors text-lg flex items-center justify-center gap-2">
                ⏱️ Start Cooper Test
            </button>
        </div>
    );

    // ── Render: opgeslagen ───────────────────────────────────────────────────
    if (fase === 'opgeslagen') return (
        <div className="text-center py-10">
            <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 text-lg mb-1">Scores opgeslagen!</p>
        </div>
    );

    // ── Render: actief ───────────────────────────────────────────────────────
    if (fase === 'actief') return (
        <div className="space-y-4">
            {/* Afteltimer */}
            <div className={`rounded-2xl p-5 text-center transition-colors ${isKritiek ? 'bg-red-900 animate-pulse' : 'bg-slate-900'}`}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-slate-400">
                    {isKritiek ? '⚠️ Laatste minuut!' : 'Resterende tijd'}
                </p>
                <div className={`text-6xl font-mono font-bold tracking-wider mb-4 ${isKritiek ? 'text-red-300' : 'text-white'}`}>
                    {formatAfteltijd(tijdOver)}
                </div>
                <button onClick={handleStop}
                    className="bg-red-500 hover:bg-red-400 text-white font-bold px-8 py-3 rounded-2xl text-sm flex items-center gap-2 mx-auto">
                    <StopIcon className="w-5 h-5" /> Stop vroeger
                </button>
            </div>

            {/* Leerlingen */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-600">🏃 Ronden bijhouden</p>
                </div>
                <div className="divide-y divide-gray-100">
                    {actieveLeerlingen.map((l, idx) => {
                        const aantalRonden = ronden[l.id] || 0;
                        const meters = aantalRonden * pisteAfstand;
                        return (
                            <div key={l.id} className="flex items-center px-3 py-3 gap-3">
                                <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{l.naam}</p>
                                    <p className="text-xs text-gray-400">{aantalRonden} ronde{aantalRonden !== 1 ? 'n' : ''} = {meters} m</p>
                                </div>
                                <button onClick={() => registreerRonde(l.id)}
                                    className="flex-shrink-0 px-4 py-2.5 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-xl font-semibold text-sm active:scale-95 transition-all">
                                    Ronde ✓
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    // ── Render: eindmeting ───────────────────────────────────────────────────
    if (fase === 'eindmeting') return (
        <div className="space-y-4">
            <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-center">
                <p className="font-bold text-green-800 text-lg">⏱️ Tijd om! — Noteer de eindpositie</p>
                <p className="text-sm text-green-700 mt-0.5">Hoeveel meter heeft elke leerling extra afgelegd na de laatste volledige ronde?</p>
            </div>

            <div className="space-y-3">
                {actieveLeerlingen.map((l, idx) => {
                    const aantalRonden = ronden[l.id] || 0;
                    const extra = extraMeters[l.id] ?? null;
                    const totaal = berekenScore(l.id);
                    return (
                        <div key={l.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                                    {idx + 1}
                                </span>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{l.naam}</p>
                                    <p className="text-xs text-gray-500">{aantalRonden} ronden × {pisteAfstand}m = {aantalRonden * pisteAfstand} m</p>
                                </div>
                                {extra !== null && (
                                    <span className="font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-sm">
                                        Totaal: {totaal} m
                                    </span>
                                )}
                            </div>

                            {/* Snelkeuze extra meters */}
                            <p className="text-xs font-medium text-gray-500 mb-2">Extra meters na laatste ronde:</p>
                            <div className="grid grid-cols-5 gap-1.5 mb-2">
                                {[0, 50, 100, 150, 200, 250, 300, 350, 380, pisteAfstand - 1].map(m => (
                                    <button key={m} onClick={() => setExtraSnelkeuze(l.id, m)}
                                        className={`py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                            extra === m
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700'
                                        }`}>
                                        {m}m
                                    </button>
                                ))}
                            </div>

                            {/* Handmatige invoer */}
                            <input type="number" min={0} max={pisteAfstand - 1}
                                value={extra ?? ''}
                                onChange={e => setExtraSnelkeuze(l.id, Number(e.target.value))}
                                placeholder={`0 – ${pisteAfstand - 1} m`}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-center text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                            />
                        </div>
                    );
                })}
            </div>

            <button onClick={handleOpslaan} disabled={saving}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
                {saving ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Opslaan...</> : <><CheckCircleSolid className="w-5 h-5" /> Scores opslaan</>}
            </button>
        </div>
    );

    return null;
}

// ─── ZWEM WAVE TOOL (lange afstand ≥200m) ────────────────────────────────────
// Één chrono, waves starten met instelbaar interval
// Netto tijd = eindtijd − wave-offset (automatisch afgetrokken)
function ZwemWaveTool({ leerlingen, detectie, groepId, testId, datum, profile, onScoresOpgeslagen }) {
    const [fase, setFase]           = useState('setup');
    const [aantalBanen, setAantalBanen] = useState(2);
    const [banen, setBanen]         = useState(detectie?.defaultBanen || 16);
    const [interval_, setInterval_] = useState(20);
    const [perTwee, setPerTwee]     = useState(false);
    const [saving, setSaving]       = useState(false);

    const [startMs, setStartMs]     = useState(null);
    const [elapsed, setElapsed]     = useState(0);
    const [waves, setWaves]         = useState([]);
    const [zwemmers, setZwemmers]   = useState({});
    const [wachtrij, setWachtrij]   = useState([]);

    // ── Anti-fouten ──────────────────────────────────────────────────────────
    const lastTapTs   = useRef({});
    const COOLDOWN_MS = 12000;
    const [lastBanen, setLastBanen] = useState({}); // { [id]: banenVoor } — altijd zichtbaar, geen timeout
    const [editId, setEditId]       = useState(null);
    const [finishModal, setFinishModal] = useState(null);

    const timerRef = useRef(null);
    const actief   = leerlingen?.filter(l => !l.score) || [];

    const formatTijd = (ms) => {
        if (ms === null || ms === undefined) return '--:--';
        const s   = Math.floor(ms / 1000);
        const min = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const getNettoTijd = useCallback((id, elapsedArg) => {
        const z = zwemmers[id];
        if (!z || z.waveIdx === null || z.waveIdx === undefined) return null;
        const waveOffset = waves[z.waveIdx]?.offset ?? 0;
        const t = (z.gefinisht && z.eindtijd !== null) ? z.eindtijd : (elapsedArg ?? elapsed);
        return Math.max(0, t - waveOffset);
    }, [zwemmers, waves, elapsed]);

    // ── Start ────────────────────────────────────────────────────────────────
    const handleStart = () => {
        const now = Date.now();
        setStartMs(now);
        const eersteWave = actief.slice(0, aantalBanen);
        const resterend  = actief.slice(aantalBanen);
        const initZ = {};
        actief.forEach(l => {
            initZ[l.id] = {
                id: l.id, naam: l.naam, klas: l.klas || null,
                geslacht: l.geslacht || null, dbId: l.id,
                waveIdx: eersteWave.find(e => e.id === l.id) !== undefined ? 0 : null,
                banen: 0, gefinisht: false, eindtijd: null,
            };
        });
        setWaves([{ offset: 0 }]);
        setZwemmers(initZ);
        setWachtrij(resterend.map(l => l.id));
        setFase('actief');
        timerRef.current = setInterval(() => setElapsed(Date.now() - now), 100);
    };

    useEffect(() => () => {
        clearInterval(timerRef.current);
    }, []);

    // ── Volgende wave ─────────────────────────────────────────────────────────
    const volgendeWave = () => {
        if (wachtrij.length === 0) return;
        const offset    = Date.now() - startMs;
        const waveIdx   = waves.length;
        const nieuweIds = wachtrij.slice(0, aantalBanen);
        setWaves(prev => [...prev, { offset }]);
        setWachtrij(prev => prev.slice(aantalBanen));
        setZwemmers(prev => {
            const upd = { ...prev };
            nieuweIds.forEach(id => { upd[id] = { ...upd[id], waveIdx }; });
            return upd;
        });
    };

    // ── Baan registreren (alert bij dubbele tap + undo tracking) ─────────────
    const registreerBaan = (id) => {
        const nu          = Date.now();
        const sindsLaatste = lastTapTs.current[id] ? nu - lastTapTs.current[id] : COOLDOWN_MS + 1;

        if (sindsLaatste < COOLDOWN_MS) {
            const naam = zwemmers[id]?.naam || 'deze leerling';
            const stap = perTwee ? 2 : 1;
            const bevestigd = window.confirm(
                `Wil je echt ${stap > 1 ? `${stap} extra banen` : 'een extra baan'} bijtellen voor ${naam}?\n\nJe hebt deze leerling net al geregistreerd.`
            );
            if (!bevestigd) return;
        }

        lastTapTs.current[id] = nu;
        const stap = perTwee ? 2 : 1;

        setZwemmers(prev => {
            const z = prev[id];
            if (!z || z.gefinisht) return prev;
            setLastBanen(lb => ({ ...lb, [id]: z.banen })); // sla op voor undo
            return { ...prev, [id]: { ...z, banen: z.banen + stap } };
        });
    };

    // ── Undo per zwemmer (altijd zichtbaar zolang er een tap was) ────────────
    const handleUndo = (id) => {
        const prevBanen = lastBanen[id];
        if (prevBanen === undefined) return;
        setZwemmers(prev => {
            const z = prev[id];
            if (!z) return prev;
            return { ...prev, [id]: { ...z, banen: prevBanen, gefinisht: false, eindtijd: null } };
        });
        setLastBanen(lb => { const upd = { ...lb }; delete upd[id]; return upd; });
        lastTapTs.current[id] = 0; // reset cooldown
    };

    // ── Handmatige +/- per zwemmer ────────────────────────────────────────────
    const pasAanBanen = (id, delta) => {
        setZwemmers(prev => {
            const z = prev[id];
            if (!z) return prev;
            const nieuw = Math.max(0, z.banen + delta);
            return { ...prev, [id]: { ...z, banen: nieuw, gefinisht: false, eindtijd: null } };
        });
    };

    // ── Finish: open bevestigingsdialoog ──────────────────────────────────────
    const openFinishModal = (id) => {
        const z = zwemmers[id];
        if (!z || z.gefinisht) return;
        setFinishModal({ id, banen: z.banen, eindtijd: elapsed });
    };

    const bevestigFinish = () => {
        if (!finishModal) return;
        const { id, banen: finalBanen, eindtijd } = finishModal;
        setZwemmers(prev => ({
            ...prev,
            [id]: { ...prev[id], gefinisht: true, banen: finalBanen, eindtijd },
        }));
        setFinishModal(null);
    };

    // ── Opslaan ───────────────────────────────────────────────────────────────
    const handleOpslaan = async () => {
        const klaar = Object.values(zwemmers).filter(z => z.gefinisht);
        if (!klaar.length) { toast.error('Nog niemand gefinisht'); return; }
        setSaving(true);
        const t = toast.loading(`${klaar.length} score(s) opslaan...`);
        let ok = 0;
        for (const z of klaar) {
            const netto = getNettoTijd(z.id, z.eindtijd);
            if (netto === null) continue;
            try {
                await apiSaveScore(profile, groepId, testId, datum,
                    z.dbId, z.klas, z.geslacht, netto / 1000);
                ok++;
            } catch { /* doorgaan */ }
        }
        toast.dismiss(t);
        toast.success(`${ok} score(s) opgeslagen!`);
        setSaving(false);
        clearInterval(timerRef.current);
        setFase('opgeslagen');
        if (onScoresOpgeslagen) onScoresOpgeslagen();
    };

    // ─── Render: setup ────────────────────────────────────────────────────────
    if (fase === 'setup') return (
        <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-xl">🏊</span>
                <div>
                    <p className="text-sm font-medium text-blue-800">
                        Wave start — {detectie?.afstand ? `${detectie.afstand}m` : 'lange afstand'} · {banen} banen
                    </p>
                    <p className="text-xs text-blue-600">Netto tijd = eindtijd − wave-offset</p>
                </div>
            </div>

            {/* Banen in het bad */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Beschikbare zwembanen</label>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(n => (
                        <button key={n} onClick={() => setAantalBanen(n)}
                            className={`flex-1 py-3 rounded-xl border-2 font-bold text-lg transition-all ${
                                aantalBanen === n ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200 bg-white text-gray-500'
                            }`}>{n}</button>
                    ))}
                </div>
            </div>

            {/* Interval */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Interval tussen waves</label>
                <div className="flex gap-2">
                    {[10, 15, 20, 30].map(s => (
                        <button key={s} onClick={() => setInterval_(s)}
                            className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                                interval_ === s ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200 bg-white text-gray-500'
                            }`}>{s}s</button>
                    ))}
                </div>
            </div>

            {/* Aantal banen */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Banen per zwemmer</label>
                <input type="number" min={1} max={200} value={banen}
                    onChange={e => setBanen(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400" />
                <p className="text-xs text-gray-400 mt-1 text-center">
                    {detectie?.afstand ? `${detectie.afstand}m ÷ 25m = ${Math.round(detectie.afstand / 25)} banen` : ''}
                </p>
            </div>

            {/* Per 2 toggle */}
            <button onClick={() => setPerTwee(p => !p)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${
                    perTwee ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600'
                }`}>
                <div className="text-left">
                    <p className="font-medium text-sm">Tellen per 2 banen (per lengte)</p>
                    <p className="text-xs opacity-70">{perTwee ? 'Elke klik = 2 banen' : 'Elke klik = 1 baan'}</p>
                </div>
                <div className={`w-10 h-6 rounded-full flex items-center px-1 ${perTwee ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${perTwee ? 'translate-x-4' : ''}`} />
                </div>
            </button>

            <button onClick={handleStart}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl text-lg transition-colors">
                🏊 Start Wave Timing
            </button>
        </div>
    );

    // ─── Render: opgeslagen ───────────────────────────────────────────────────
    if (fase === 'opgeslagen') return (
        <div className="text-center py-10">
            <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 text-lg">Scores opgeslagen!</p>
        </div>
    );

    // ─── Render: actief ───────────────────────────────────────────────────────
    const actieveZwemmers = Object.values(zwemmers).filter(z => z.waveIdx !== null && !z.gefinisht);
    const gefinisht       = Object.values(zwemmers).filter(z => z.gefinisht)
        .sort((a, b) => getNettoTijd(a.id, a.eindtijd) - getNettoTijd(b.id, b.eindtijd));
    const wachtrijLeerlingen = wachtrij.map(id => actief.find(l => l.id === id)).filter(Boolean);

    return (
        <div className="space-y-3">
            {/* Chrono + volgende wave */}
            <div className="bg-slate-900 rounded-2xl px-5 py-4 flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Chrono</p>
                    <p className="text-4xl font-mono font-bold text-white">{formatTijd(elapsed)}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Wave {waves.length} · {interval_}s interval</p>
                    <button onClick={volgendeWave} disabled={wachtrij.length === 0}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white font-semibold rounded-xl text-sm active:scale-95">
                        🏊 Volgende wave ({wachtrij.length})
                    </button>
                </div>
            </div>

            {/* Undo pill — VERWIJDERD: undo is nu altijd zichtbaar per zwemmer */}

            {/* Actieve zwemmers */}
            {actieveZwemmers.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-600">🏊 In het water ({actieveZwemmers.length})</p>
                        <p className="text-xs text-gray-400">✏️ = handmatig · ↩ = ongedaan</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {actieveZwemmers.map((z, idx) => {
                            const netto        = getNettoTijd(z.id);
                            const waveNr       = (z.waveIdx ?? 0) + 1;
                            const isEditing    = editId === z.id;
                            const heeftUndo    = lastBanen[z.id] !== undefined;

                            // Rood oplichten als zwemmer te lang wegblijft
                            const waveOffset   = waves[z.waveIdx]?.offset ?? 0;
                            const waveElapsed  = elapsed - waveOffset;
                            const avgBaanMs    = z.banen > 1 ? waveElapsed / z.banen : 40000;
                            const sindsLaatste = lastTapTs.current[z.id]
                                ? elapsed - (lastTapTs.current[z.id] - (startMs ?? 0))
                                : (z.banen > 0 ? waveElapsed : 0);
                            const isOverdue    = z.banen > 0 && sindsLaatste > avgBaanMs * 1.8
                                                 && sindsLaatste > 25000; // min. 25s wachten voor alert

                            return (
                                <div key={z.id}>
                                    <div className={`flex items-center px-3 py-3 gap-3 transition-colors ${
                                        isOverdue ? 'bg-red-50 border-l-4 border-red-400' : ''
                                    }`}>
                                        {/* Nummer */}
                                        <span className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0 ${
                                            isOverdue
                                                ? 'bg-red-500 text-white animate-pulse'
                                                : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {idx + 1}
                                        </span>

                                        {/* Naam + info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold truncate text-sm ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                                                {z.naam}
                                                {isOverdue && <span className="ml-1 text-xs">⚠️ vergeten?</span>}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono">
                                                W{waveNr} · {formatTijd(netto)} · {z.banen}/{banen} banen
                                            </p>
                                        </div>

                                        {/* Knoppen */}
                                        <div className="flex gap-1.5 flex-shrink-0">
                                            {/* Undo — altijd zichtbaar na minstens 1 tap */}
                                            {heeftUndo && (
                                                <button onClick={() => handleUndo(z.id)}
                                                    className="w-8 h-8 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm active:scale-95 transition-all"
                                                    title="Laatste tap ongedaan maken">
                                                    ↩
                                                </button>
                                            )}

                                            {/* Handmatig edit toggle */}
                                            <button onClick={() => setEditId(isEditing ? null : z.id)}
                                                className={`w-8 h-8 rounded-xl text-sm transition-colors ${
                                                    isEditing ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}>✏️</button>

                                            {/* Baan-knop — altijd actief, alert bij dubbele tap */}
                                            <button onClick={() => registreerBaan(z.id)}
                                                className={`px-3 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all ${
                                                    isOverdue
                                                        ? 'bg-red-500 hover:bg-red-400 text-white'
                                                        : 'bg-teal-100 hover:bg-teal-200 text-teal-800'
                                                }`}>
                                                {perTwee ? '+2🏊' : 'Baan ✓'}
                                            </button>

                                            {/* Finish */}
                                            <button onClick={() => openFinishModal(z.id)}
                                                className="px-2 py-2 bg-green-500 hover:bg-green-400 text-white rounded-xl font-semibold text-xs active:scale-95">
                                                🏁
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inline +/- editor */}
                                    {isEditing && (
                                        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-t border-amber-100">
                                            <span className="text-xs text-amber-700 font-medium flex-1">Handmatig aanpassen</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => pasAanBanen(z.id, -1)}
                                                    className="w-9 h-9 bg-white border border-amber-300 rounded-xl font-bold text-amber-700 text-lg hover:bg-amber-100 active:scale-95">−</button>
                                                <span className="w-10 text-center font-bold text-gray-900 text-lg">{z.banen}</span>
                                                <button onClick={() => pasAanBanen(z.id, 1)}
                                                    className="w-9 h-9 bg-white border border-amber-300 rounded-xl font-bold text-amber-700 text-lg hover:bg-amber-100 active:scale-95">+</button>
                                            </div>
                                            <button onClick={() => setEditId(null)} className="text-xs text-amber-600 hover:text-amber-800 font-medium">Sluiten</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Finish bevestigingsmodal */}
            {finishModal && (
                <div className="bg-white rounded-2xl border-2 border-green-400 p-4 shadow-lg">
                    <p className="font-bold text-gray-900 mb-1">
                        🏁 Finish bevestigen — {zwemmers[finishModal.id]?.naam}
                    </p>
                    <p className="text-sm text-gray-500 mb-3">Pas indien nodig het aantal banen aan:</p>
                    <div className="flex items-center gap-3 mb-4">
                        <button onClick={() => setFinishModal(m => ({ ...m, banen: Math.max(0, m.banen - 1) }))}
                            className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-gray-700 text-xl hover:bg-gray-200">−</button>
                        <span className="flex-1 text-center font-bold text-2xl text-gray-900">
                            {finishModal.banen} / {banen}
                        </span>
                        <button onClick={() => setFinishModal(m => ({ ...m, banen: m.banen + 1 }))}
                            className="w-10 h-10 bg-gray-100 rounded-xl font-bold text-gray-700 text-xl hover:bg-gray-200">+</button>
                    </div>
                    <p className="text-xs text-gray-400 text-center mb-4">
                        Netto tijd: {formatTijd(getNettoTijd(finishModal.id, finishModal.eindtijd))}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setFinishModal(null)}
                            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                            Annuleren
                        </button>
                        <button onClick={bevestigFinish}
                            className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl text-sm">
                            ✅ Bevestigen
                        </button>
                    </div>
                </div>
            )}

            {/* Gefinisht */}
            {gefinisht.length > 0 && (
                <div className="bg-white rounded-2xl border border-green-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-green-50 border-b border-green-100">
                        <p className="text-sm font-semibold text-green-700">✅ Gefinisht ({gefinisht.length})</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {gefinisht.map((z, i) => (
                            <div key={z.id} className="flex items-center px-4 py-2.5 gap-3">
                                <span className="w-6 text-center font-bold text-gray-400 text-sm">{i + 1}</span>
                                <span className="flex-1 font-medium text-gray-900 text-sm truncate">{z.naam}</span>
                                <span className="text-xs text-gray-400 font-mono">W{(z.waveIdx ?? 0) + 1}</span>
                                <span className="font-mono font-bold text-green-700 text-sm">
                                    {formatTijd(getNettoTijd(z.id, z.eindtijd))}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Wachtrij */}
            {wachtrijLeerlingen.length > 0 && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Wachtrij</p>
                    <div className="flex flex-wrap gap-2">
                        {wachtrijLeerlingen.map((l, i) => (
                            <span key={l.id} className="bg-white border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-700 font-medium">
                                {i + 1 + actieveZwemmers.length}. {l.naam}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Opslaan */}
            {gefinisht.length > 0 && (
                <button onClick={handleOpslaan} disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
                    {saving ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Opslaan...</> : <><CheckCircleSolid className="w-5 h-5" /> Scores opslaan</>}
                </button>
            )}
        </div>
    );
}

// ─── EIGEN TOOL WRAPPER (kiest automatisch de juiste tool) ────────────────────
function EigenToolTab({ leerlingen, test, groepId, testId, datum, profile, onScoresOpgeslagen }) {
    const detectie = detectWaarnemerModus(test);

    if (!detectie.geschikt) return <NietGeschiktView detectie={detectie} />;

    if (detectie.modus === 'beeptest') return (
        <BeeptestTool
            leerlingen={leerlingen}
            groepId={groepId} testId={testId} datum={datum}
            profile={profile}
            onScoresOpgeslagen={onScoresOpgeslagen}
        />
    );

    if (detectie.modus === 'zwem_wave') return (
        <ZwemWaveTool
            leerlingen={leerlingen} detectie={detectie}
            groepId={groepId} testId={testId} datum={datum}
            profile={profile} onScoresOpgeslagen={onScoresOpgeslagen}
        />
    );

    if (detectie.modus === 'cooper') return (
        <EigenCooperTab leerlingen={leerlingen}
            groepId={groepId} testId={testId} datum={datum} profile={profile} onScoresOpgeslagen={onScoresOpgeslagen} />
    );

    if (detectie.modus === 'hoogspring') return (
        <EigenHoogspringTab leerlingen={leerlingen}
            groepId={groepId} testId={testId} datum={datum} profile={profile} onScoresOpgeslagen={onScoresOpgeslagen} />
    );

    if (detectie.modus === 'meting') return (
        <EigenMetingTab leerlingen={leerlingen} detectie={detectie}
            groepId={groepId} testId={testId} datum={datum} profile={profile} onScoresOpgeslagen={onScoresOpgeslagen} />
    );

    if (detectie.modus === 'telling') return (
        <EigenTellingTab leerlingen={leerlingen} detectie={detectie}
            groepId={groepId} testId={testId} datum={datum} profile={profile} onScoresOpgeslagen={onScoresOpgeslagen} />
    );

    // chrono_rondes of chrono_eenmalig
    return (
        <EigenChronoTab leerlingen={leerlingen} detectie={detectie}
            groepId={groepId} testId={testId} datum={datum} profile={profile} onScoresOpgeslagen={onScoresOpgeslagen} />
    );
}

// ─── KOPPEL INTERFACE (ingediende metingen van leerling-waarnemer) ────────────
// FIX #1: Ondersteunt meerdere waarnemers — toont alle ongekoppelde inzendingen
// Leerkracht kiest eerst welke waarnemer hij/zij wil verwerken via een selector
function KoppelTab({ groepId, testId, datum, leerlingen, profile, onScoresOpgeslagen }) {
    const [inzendingen, setInzendingen]  = useState([]);
    const [actieveIndex, setActieveIndex] = useState(0);
    const [koppelingen, setKoppelingen]  = useState({});
    const [loading, setLoading]          = useState(false);
    const [fout, setFout]                = useState(false);   // stille fout — geen toast
    const [saving, setSaving]            = useState(false);
    const [verwerktIds, setVerwerktIds]  = useState([]);

    const fetchInzendingen = useCallback(async () => {
        setLoading(true);
        setFout(false);
        try {
            const res  = await fetch('/api/tests', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${profile._token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action:   'get_waarnemer_metingen',
                    schoolId: profile.school_id,
                    groepId, testId, datum,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setInzendingen(data.inzendingen || []);
        } catch {
            // Stille fout — geen toast, gewoon lege staat tonen
            setFout(true);
            setInzendingen([]);
        } finally {
            setLoading(false);
        }
    }, [groepId, testId, datum, profile]);

    useEffect(() => { fetchInzendingen(); }, [fetchInzendingen]);

    const actieveInzending = inzendingen[actieveIndex] || null;
    const nogTeVerwerken   = inzendingen.filter(i => !verwerktIds.includes(i.id));

    // Slimme auto-suggestie: koppel namen waarvan de voornaam overeenkomt
    // met exact één leerling. Reset bij wisselen van inzending.
    useEffect(() => {
        if (!actieveInzending) { setKoppelingen({}); return; }

        const normaliseer = (s) => (s || '').toLowerCase().trim();
        const voornaam    = (s) => normaliseer(s).split(/\s+/)[0];

        const auto = {};
        const alGebruikt = new Set();

        for (const m of actieveInzending.metingen) {
            const ingediendeVoornaam = voornaam(m.naam);
            if (!ingediendeVoornaam) continue;

            // Zoek leerlingen waarvan de (voor)naam overeenkomt
            const matches = leerlingen.filter(l => {
                if (alGebruikt.has(l.id)) return false;
                const lvoor = voornaam(l.naam);
                const lvol  = normaliseer(l.naam);
                return lvoor === ingediendeVoornaam
                    || lvol === normaliseer(m.naam)
                    || lvol.startsWith(ingediendeVoornaam + ' ');
            });

            // Enkel auto-koppelen bij een unieke match (geen dubbelzinnigheid)
            if (matches.length === 1) {
                auto[m.naam] = matches[0].id;
                alGebruikt.add(matches[0].id);
            }
        }
        setKoppelingen(auto);
    }, [actieveIndex, actieveInzending, leerlingen]);

    const handleKoppelChange = (ingediendeNaam, leerlingId) => {
        setKoppelingen(prev => ({ ...prev, [ingediendeNaam]: leerlingId }));
    };

    // Inzending verwijderen (na bevestiging)
    const handleVerwijder = async () => {
        if (!actieveInzending) return;
        const bevestigd = window.confirm(
            `Inzending van ${actieveInzending.waarnemer} (${actieveInzending.metingen.length} leerlingen) definitief verwijderen?\n\nDit kan niet ongedaan gemaakt worden.`
        );
        if (!bevestigd) return;

        try {
            const res = await fetch('/api/tests', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${profile._token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action:   'verwijder_waarnemer_metingen',
                    schoolId: profile.school_id,
                    metingId: actieveInzending.id,
                }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            toast.success('Inzending verwijderd');
            // Lokaal verwijderen + index corrigeren
            setInzendingen(prev => prev.filter(i => i.id !== actieveInzending.id));
            setActieveIndex(0);
        } catch (e) {
            toast.error('Verwijderen mislukt: ' + e.message);
        }
    };

    const handleOpslaan = async () => {
        if (!actieveInzending) return;

        const alGebruikt = Object.values(koppelingen).filter(Boolean);
        const gekoppeld  = actieveInzending.metingen
            .filter(m => koppelingen[m.naam])
            .map(m => {
                const leerling = leerlingen.find(l => l.id === koppelingen[m.naam]);
                let scoreWaarde = null;
                if (m.eindtijd !== null && m.eindtijd !== undefined) scoreWaarde = msNaarSeconden(m.eindtijd);
                else if (m.beste !== null && m.beste !== undefined) scoreWaarde = m.beste;
                else if (m.waarde !== null && m.waarde !== undefined) scoreWaarde = m.waarde;
                return {
                    leerlingId: leerling.id,
                    klas:       leerling.klas     || null,
                    geslacht:   leerling.geslacht || null,
                    score:      scoreWaarde,
                };
            })
            .filter(k => k.score !== null);

        if (gekoppeld.length === 0) { toast.error('Koppel minstens 1 naam aan een leerling'); return; }

        setSaving(true);
        const loadingToast = toast.loading(`${gekoppeld.length} score(s) opslaan...`);
        let succes = 0;

        for (const k of gekoppeld) {
            try {
                await fetch('/api/tests', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${profile._token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'save_score',
                        schoolId: profile.school_id,
                        groepId, testId, datum,
                        ...k,
                    }),
                });
                succes++;
            } catch { /* doorgaan */ }
        }

        // Markeer inzending als verwerkt + kent XP toe aan waarnemer (FIX #3 in backend)
        try {
            await fetch('/api/tests', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${profile._token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action:   'markeer_waarnemer_gekoppeld',
                    schoolId: profile.school_id,
                    metingId: actieveInzending.id,
                }),
            });
        } catch { /* niet kritisch */ }

        toast.dismiss(loadingToast);
        toast.success(`${succes} score(s) opgeslagen!`);
        setSaving(false);

        // Markeer lokaal als verwerkt en ga naar volgende inzending
        setVerwerktIds(prev => [...prev, actieveInzending.id]);
        const volgendeIndex = inzendingen.findIndex(
            (i, idx) => idx > actieveIndex && !verwerktIds.includes(i.id)
        );
        setActieveIndex(volgendeIndex >= 0 ? volgendeIndex : actieveIndex);

        if (nogTeVerwerken.length <= 1) {
            // Alle inzendingen verwerkt
            if (onScoresOpgeslagen) onScoresOpgeslagen();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
        );
    }

    if (inzendingen.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                <p className="text-4xl mb-3">🔭</p>
                <p className="font-medium text-gray-700 mb-1">Geen ingediende metingen</p>
                <p className="text-sm">
                    {fout
                        ? 'De Waarnemer Tool is enkel beschikbaar wanneer een leerling-Waarnemer resultaten heeft ingediend via SportLab.'
                        : 'Zodra een leerling-Waarnemer resultaten indient via SportLab, verschijnen ze hier.'
                    }
                </p>
                <button onClick={fetchInzendingen}
                    className="mt-4 flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 mx-auto">
                    <ArrowPathIcon className="w-4 h-4" /> Vernieuwen
                </button>
            </div>
        );
    }

    if (nogTeVerwerken.length === 0) {
        return (
            <div className="text-center py-10">
                <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 text-lg mb-1">Alles verwerkt!</p>
                <p className="text-sm text-gray-500">
                    Alle {inzendingen.length} inzending{inzendingen.length > 1 ? 'en zijn' : ' is'} gekoppeld en opgeslagen.
                </p>
            </div>
        );
    }

    // Waarnemers-selector (enkel tonen als er meerdere inzendingen zijn)
    const alGebruiktGlobaal = Object.values(koppelingen).filter(Boolean);
    const beschikbareLeerlingen = (ingediendeNaam) =>
        leerlingen.filter(l =>
            !alGebruiktGlobaal.includes(l.id) || koppelingen[ingediendeNaam] === l.id
        );

    return (
        <div className="space-y-4">

            {/* Waarnemer selector — enkel bij meerdere inzendingen */}
            {inzendingen.length > 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
                        Meerdere waarnemers ({nogTeVerwerken.length} nog te verwerken)
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {inzendingen.map((inz, idx) => (
                            <button
                                key={inz.id}
                                onClick={() => setActieveIndex(idx)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    verwerktIds.includes(inz.id)
                                        ? 'bg-green-100 text-green-700 line-through opacity-60'
                                        : idx === actieveIndex
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                                }`}
                            >
                                {verwerktIds.includes(inz.id) ? '✓ ' : ''}{inz.waarnemer}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {actieveInzending && (
                <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                        <p className="text-sm font-medium text-blue-800">
                            Inzending van <strong>{actieveInzending.waarnemer}</strong> — {actieveInzending.metingen.length} leerlingen.
                            Koppel elke naam aan de juiste leerling.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {actieveInzending.metingen.map((m) => {
                            let resultaatLabel = '—';
                            if (m.eindtijd !== null && m.eindtijd !== undefined) resultaatLabel = formatTijd(m.eindtijd);
                            else if (m.beste !== null && m.beste !== undefined) resultaatLabel = `${m.beste} ${actieveInzending.eenheid}`;
                            else if (m.waarde !== null && m.waarde !== undefined) resultaatLabel = `${m.waarde} ${actieveInzending.eenheid}`;

                            return (
                                <div
                                    key={m.naam}
                                    className={`bg-white rounded-xl border p-4 transition-colors ${
                                        koppelingen[m.naam] ? 'border-green-300 bg-green-50' : 'border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-gray-900">"{m.naam}"</p>
                                            <p className="text-sm font-mono text-teal-700 font-bold">{resultaatLabel}</p>
                                        </div>
                                        {koppelingen[m.naam] && (
                                            <CheckCircleSolid className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <select
                                        value={koppelingen[m.naam] || ''}
                                        onChange={e => handleKoppelChange(m.naam, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400"
                                    >
                                        <option value="">— Koppel aan leerling —</option>
                                        {beschikbareLeerlingen(m.naam).map(l => (
                                            <option key={l.id} value={l.id}>{l.naam}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleVerwijder}
                            disabled={saving}
                            className="px-4 py-4 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 font-medium rounded-2xl transition-colors flex items-center justify-center"
                            title="Inzending verwijderen"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleOpslaan}
                            disabled={saving || !Object.values(koppelingen).some(Boolean)}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
                        >
                            {saving
                                ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Opslaan...</>
                                : <><CheckCircleSolid className="w-5 h-5" />
                                    Scores opslaan ({Object.values(koppelingen).filter(Boolean).length}/{actieveInzending.metingen.length} gekoppeld)
                                  </>
                            }
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── HOOFD COMPONENT ─────────────────────────────────────────────────────────
// Gebruik: <WaarnemerPanel leerlingen={...} test={selectedTest} testInfo={...} ... />
export default function WaarnemerPanel({ leerlingen, test, testInfo, groepId, testId, datum, profile, defaultTab = 'eigen', onClose, onScoresOpgeslagen }) {
    const [tab, setTab]     = useState(defaultTab);
    const detectie          = detectWaarnemerModus(test);
    const toolLabel         = detectie.geschikt ? `${detectie.icon} ${detectie.label}` : '⛔ Niet beschikbaar';

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-gray-900 text-lg">🔭 Waarnemer Tool</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {testInfo.test_naam} — {testInfo.groep_naam}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-4 pb-1 flex-shrink-0">
                    <button
                        onClick={() => setTab('eigen')}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                            tab === 'eigen'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {toolLabel}
                    </button>
                    <button
                        onClick={() => setTab('koppel')}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                            tab === 'koppel'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Ingediend door waarnemer
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {tab === 'eigen' && (
                        <EigenToolTab
                            leerlingen={leerlingen}
                            test={test}
                            groepId={groepId}
                            testId={testId}
                            datum={datum}
                            profile={profile}
                            onScoresOpgeslagen={onScoresOpgeslagen}
                        />
                    )}
                    {tab === 'koppel' && (
                        <KoppelTab
                            groepId={groepId}
                            testId={testId}
                            datum={datum}
                            leerlingen={leerlingen}
                            profile={profile}
                            onScoresOpgeslagen={onScoresOpgeslagen}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}