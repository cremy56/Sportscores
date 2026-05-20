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
import {
    PlayIcon,
    StopIcon,
    XMarkIcon,
    CheckIcon,
    ArrowPathIcon,
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
// Bepaalt welke tool getoond wordt op basis van test.naam, .eenheid, .categorie
function detectWaarnemerModus(test) {
    if (!test) return { modus: 'onbekend', geschikt: false, reden: 'Geen test geselecteerd.' };

    const naam      = (test.naam      || test.test_naam || '').toLowerCase();
    const eenheid   = (test.eenheid   || '').toLowerCase();
    const categorie = (test.categorie || '').toLowerCase();

    // ❌ Niet geschikt — subjectieve beoordeling
    if (['sportprestaties', 'lenigheid', 'coördinatie', 'coordinatie'].some(c => categorie.includes(c))) {
        return { modus: 'niet_geschikt', geschikt: false, icon: '⛔',
            reden: `${test.categorie}-testen vereisen directe beoordeling door de leerkracht.` };
    }
    // ❌ Krachttesten met herhalingen (pull-up, push-up, ...)
    if (categorie.includes('kracht') && (eenheid.includes('aantal') || eenheid.includes('rep'))) {
        return { modus: 'niet_geschikt', geschikt: false, icon: '⛔',
            reden: 'Krachttesten met herhalingen vereisen visuele controle van elke herhaling.' };
    }

    // ⬆️ Hoogspringen — apart scoreformulier (progressieve hoogtes)
    if (naam.includes('hoog') && (eenheid.includes('m') || eenheid.includes('cm'))) {
        return { modus: 'hoogspring', geschikt: true, icon: '⬆️', label: 'Hoogspring scoreformulier' };
    }

    // ↗️ Afstandsmeting — verspringen, kogelstoten, werpen
    if (eenheid.includes(' m') || eenheid === 'm' || eenheid.includes('cm') || eenheid.includes('meter')) {
        return { modus: 'meting', geschikt: true, icon: '↗️', label: 'Afstandsmeting' };
    }

    // 🏊 Zwemmen — baantjes tellen
    if (naam.includes('zwem') || naam.includes('baantj')) {
        return { modus: 'telling', geschikt: true, icon: '🏊', label: 'Baantjes tellen', eenheidLabel: 'baantjes' };
    }

    // ↔️ Overige telling (shuttle run, touwspringen, ...)
    if (eenheid.includes('aantal')) {
        return { modus: 'telling', geschikt: true, icon: '↔️', label: 'Telling', eenheidLabel: eenheid };
    }

    // 🏃 Duurloop met rondes
    if (categorie.includes('uithouding') || ['cooper', 'km', 'duurloop'].some(w => naam.includes(w))) {
        return { modus: 'chrono_rondes', geschikt: true, icon: '🏃', label: 'Rondetijden', defaultRondes: 7 };
    }

    // ⚡ Sprint / éénmalige tijdmeting
    if (['sec', 'seconden', 's', 'min'].some(e => eenheid.includes(e)) || categorie.includes('snelheid')) {
        return { modus: 'chrono_eenmalig', geschikt: true, icon: '⚡', label: 'Eindtijd', defaultRondes: 1 };
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
    const defaultRondes = detectie?.defaultRondes ?? 1;
    const [rondes, setRondes]                       = useState(defaultRondes);
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

    const handleStop = () => { clearInterval(intervalRef.current); setGestopt(true); };

    const registreerRonde = (id) => {
        if (!gestart || gestopt) return;
        const nu = Date.now() - startTijd;
        setChronoLeerlingen(prev => prev.map(l => {
            if (l.id !== id || l.gefinisht) return l;
            const rt = [...l.rondetijden, nu];
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
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aantal rondes</label>
                    <input type="number" min={1} max={99} value={rondes} onChange={e => setRondes(Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400" />
                    <p className="text-xs text-gray-400 mt-1 text-center">bv. 3 km op 400 m piste = 7 rondes</p>
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
                        <p className="text-sm font-semibold text-gray-600">🏃 Actief ({actief.length})</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {actief.map(l => {
                            const rondeNr  = l.rondetijden.length + 1;
                            const isFinish = rondeNr === rondes;
                            return (
                                <div key={l.id} className="flex items-center px-4 py-3 gap-3">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{l.naam}</p>
                                        {detectie?.modus === 'chrono_rondes' && (
                                            <p className="text-xs text-gray-400">Ronde {rondeNr}/{rondes}</p>
                                        )}
                                    </div>
                                    <button onClick={() => registreerRonde(l.id)} disabled={!gestart || gestopt}
                                        className={`px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 disabled:opacity-30 ${isFinish ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-teal-100 hover:bg-teal-200 text-teal-800'}`}>
                                        {isFinish ? '🏁 Finish' : detectie?.modus === 'chrono_rondes' ? `Ronde ${rondeNr} ✓` : '🏁 Finish'}
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

// ─── EIGEN TOOL WRAPPER (kiest automatisch de juiste tool) ────────────────────
function EigenToolTab({ leerlingen, test, groepId, testId, datum, profile, onScoresOpgeslagen }) {
    const detectie = detectWaarnemerModus(test);

    if (!detectie.geschikt) return <NietGeschiktView detectie={detectie} />;

    if (detectie.modus === 'hoogspring') return (
        <div className="text-center py-10">
            <p className="text-5xl mb-3">⬆️</p>
            <p className="font-semibold text-gray-800 mb-2">Hoogspring scoreformulier</p>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Het progressieve hoogspring-scoreformulier (geslaagd/mislukt per hoogte) wordt binnenkort toegevoegd.
                Gebruik voorlopig de handmatige scoretabel.
            </p>
        </div>
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
    const [inzendingen, setInzendingen]     = useState([]);     // alle ongekoppelde inzendingen
    const [actieveIndex, setActieveIndex]   = useState(0);      // welke inzending nu verwerkt wordt
    const [koppelingen, setKoppelingen]     = useState({});     // naam → leerlingId
    const [loading, setLoading]             = useState(false);
    const [saving, setSaving]               = useState(false);
    const [verwerktIds, setVerwerktIds]     = useState([]);     // al verwerkte inzending-ids

    const fetchInzendingen = useCallback(async () => {
        setLoading(true);
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
        } catch (e) {
            toast.error('Fout bij laden: ' + e.message);
        } finally {
            setLoading(false);
        }
    }, [groepId, testId, datum, profile]);

    useEffect(() => { fetchInzendingen(); }, [fetchInzendingen]);

    // Reset koppelingen bij wisselen van actieve inzending
    useEffect(() => { setKoppelingen({}); }, [actieveIndex]);

    const actieveInzending = inzendingen[actieveIndex] || null;
    const nogTeVerwerken   = inzendingen.filter(i => !verwerktIds.includes(i.id));

    const handleKoppelChange = (ingediendeNaam, leerlingId) => {
        setKoppelingen(prev => ({ ...prev, [ingediendeNaam]: leerlingId }));
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
                    Zodra een leerling-Waarnemer resultaten indient via SportLab, verschijnen ze hier.
                </p>
                <button
                    onClick={fetchInzendingen}
                    className="mt-4 flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 mx-auto"
                >
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

                    <button
                        onClick={handleOpslaan}
                        disabled={saving || !Object.values(koppelingen).some(Boolean)}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
                    >
                        {saving
                            ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Opslaan...</>
                            : <><CheckCircleSolid className="w-5 h-5" />
                                Scores opslaan ({Object.values(koppelingen).filter(Boolean).length}/{actieveInzending.metingen.length} gekoppeld)
                              </>
                        }
                    </button>
                </>
            )}
        </div>
    );
}

// ─── HOOFD COMPONENT ─────────────────────────────────────────────────────────
// Gebruik: <WaarnemerPanel leerlingen={...} test={selectedTest} testInfo={...} ... />
export default function WaarnemerPanel({ leerlingen, test, testInfo, groepId, testId, datum, profile, onClose, onScoresOpgeslagen }) {
    const [tab, setTab]     = useState('eigen');
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