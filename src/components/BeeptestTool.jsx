// src/components/BeeptestTool.jsx
// Volledige beeptest / piepjestest / léger test tool
// Brondata: Léger protocol — 21 niveaus — 20m shuttle run
// Audio: Web Audio API (lookahead scheduler) + Speech Synthesis voor level-aankondigingen
// Eliminatie: 2 waarschuwingen → uitgevallen, ↩ om ongedaan te maken

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── LEVEL DATA ───────────────────────────────────────────────────────────────
// Shuttles per niveau: officieel Léger-protocol
const SHUTTLES_PER_LEVEL = [7, 8, 8, 9, 9, 10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16];

// Snelheid: niveau 1 = 8 km/h, +0.5 km/h per niveau
// Tijd per shuttle (20m): 72 / snelheid (seconden)
function getTps(level) {
    return 72 / (8 + 0.5 * (level - 1));
}

function getSpeed(level) {
    return (8 + 0.5 * (level - 1)).toFixed(1);
}

// Volledige tijdlijn: { time, level, shuttle, isLevelStart }
const SCHEDULE = (() => {
    const events = [];
    let t = 0;
    for (let lvl = 1; lvl <= 21; lvl++) {
        const tps = getTps(lvl);
        for (let s = 1; s <= SHUTTLES_PER_LEVEL[lvl - 1]; s++) {
            events.push({ time: t, level: lvl, shuttle: s, isLevelStart: s === 1 });
            t += tps;
        }
    }
    return events;
})();

// Cumulatieve afstand: CUM[level-1] = meters vóór niveau level
const CUM = (() => {
    const d = [0];
    for (let i = 0; i < 21; i++) d.push(d[i] + SHUTTLES_PER_LEVEL[i] * 20);
    return d;
})();

function getDistance(level, shuttle) {
    return CUM[level - 1] + shuttle * 20;
}

function formatScore(level, shuttle) {
    return `${level}.${shuttle}`;
}

// ─── WEB AUDIO ────────────────────────────────────────────────────────────────
function playTone(ctx, t, freq, dur, vol = 0.5) {
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    } catch { /* ignore */ }
}

function scheduleBeep(ctx, t, isLevelStart) {
    if (isLevelStart) {
        // Drievoudige piep bij nieuw niveau
        playTone(ctx, t,        1046, 0.07, 0.6);
        playTone(ctx, t + 0.11, 1046, 0.07, 0.6);
        playTone(ctx, t + 0.22, 1046, 0.07, 0.6);
    } else {
        // Enkelvoudige piep per shuttle
        playTone(ctx, t, 880, 0.07, 0.5);
    }
}

// ─── HOOFD COMPONENT ──────────────────────────────────────────────────────────
// leerlingen prop: aanwezig = leerkracht-modus (klas al bekend, geen handmatige invoer)
// leerlingen null/undefined = leerling-waarnemer modus (handmatige invoer)
export default function BeeptestTool({
    leerlingen: leerlingenProp = null,
    groepId, testId, datum, profile,
    onScoresOpgeslagen,
}) {
    const heeftKlas = leerlingenProp !== null && leerlingenProp !== undefined;

    // In leerkracht-modus: zet leerlingen direct klaar, sla setupfase over
    const initStudenten = () => {
        if (!heeftKlas) return [];
        return leerlingenProp
            .filter(l => !l.score) // enkel leerlingen zonder bestaande score
            .map((l, i) => ({
                id:      i + 1,
                naam:    l.naam,
                klas:    l.klas    || null,
                geslacht: l.geslacht || null,
                dbId:    l.id,      // origineel Firestore ID voor opslaan
                status:  'actief',
                warnings: 0,
                level:   null, shuttle: null, dist: null,
            }));
    };

    const [fase, setFase]           = useState(heeftKlas ? 'klaar' : 'setup'); // setup | klaar | actief | resultaten
    const [invoer, setInvoer]       = useState('');
    const [studenten, setStudenten] = useState(initStudenten);
    const [curIdx, setCurIdx]       = useState(0);
    const [saving, setSaving]       = useState(false);

    const ctxRef          = useRef(null);
    const audioStartRef   = useRef(0);
    const realStartRef    = useRef(0);
    const nextEvRef       = useRef(0);
    const schedTimerRef   = useRef(null);
    const uiTimerRef      = useRef(null);
    const speechTimersRef = useRef([]);

    const cur = SCHEDULE[Math.min(curIdx, SCHEDULE.length - 1)] || { level: 1, shuttle: 0 };
    const shuttlesInLevel = SHUTTLES_PER_LEVEL[cur.level - 1] || 1;
    const progress        = cur.shuttle / shuttlesInLevel;

    // ── Lookahead audio scheduler ─────────────────────────────────────────────
    const runScheduler = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const until = ctx.currentTime + 0.8; // 800ms vooruit plannen
        while (nextEvRef.current < SCHEDULE.length) {
            const ev = SCHEDULE[nextEvRef.current];
            const evT = audioStartRef.current + ev.time;
            if (evT > until) break;
            scheduleBeep(ctx, evT, ev.isLevelStart);
            nextEvRef.current++;
        }
    }, []);

    const cleanup = useCallback(() => {
        clearInterval(schedTimerRef.current);
        clearInterval(uiTimerRef.current);
        speechTimersRef.current.forEach(clearTimeout);
        speechTimersRef.current = [];
        try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
        try { ctxRef.current?.close(); } catch { /* ignore */ }
        ctxRef.current = null;
    }, []);

    useEffect(() => () => cleanup(), [cleanup]);

    // ── Test starten ─────────────────────────────────────────────────────────
    const startTest = useCallback(() => {
        if (!studenten.length) return;
        cleanup();

        let ctx;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            ctx.resume();
        } catch {
            alert('Audio niet beschikbaar in deze browser.');
            return;
        }
        ctxRef.current    = ctx;
        nextEvRef.current = 0;

        const DELAY = 0.3; // 300ms aanlooptijd
        audioStartRef.current = ctx.currentTime + DELAY;
        realStartRef.current  = Date.now() + DELAY * 1000;

        // Speech synthesis timeouts voor niveau-aankondigingen
        const timers = SCHEDULE
            .filter(e => e.isLevelStart)
            .map(e => setTimeout(() => {
                try {
                    window.speechSynthesis?.cancel();
                    const u = new SpeechSynthesisUtterance(`Niveau ${e.level}`);
                    u.lang = 'nl-NL';
                    u.rate = 1.1;
                    u.volume = 1;
                    window.speechSynthesis?.speak(u);
                } catch { /* ignore */ }
            }, DELAY * 1000 + e.time * 1000 + 400));
        speechTimersRef.current = timers;

        // Audio scheduler
        runScheduler();
        schedTimerRef.current = setInterval(runScheduler, 50);

        // UI timer: bijwerken wat niveau/shuttle er op het scherm staat
        uiTimerRef.current = setInterval(() => {
            const elapsedSec = (Date.now() - realStartRef.current) / 1000;
            if (elapsedSec < 0) return;

            // Binair zoeken naar huidig schema-item
            let lo = 0, hi = SCHEDULE.length - 1;
            while (lo < hi) {
                const mid = Math.ceil((lo + hi) / 2);
                if (SCHEDULE[mid].time <= elapsedSec) lo = mid; else hi = mid - 1;
            }
            setCurIdx(lo);

            // Einde test
            if (elapsedSec >= SCHEDULE[SCHEDULE.length - 1].time + 2) {
                cleanup();
                setFase('resultaten');
            }
        }, 100);

        setCurIdx(0);
        setFase('actief');
    }, [studenten, cleanup, runScheduler]);

    const stopTest = useCallback(() => {
        cleanup();
        setFase('resultaten');
    }, [cleanup]);

    // Scores opslaan naar testafname (enkel in leerkracht-modus)
    const slaScoresOp = useCallback(async () => {
        if (!heeftKlas || !profile) return;
        const metScore = studenten.filter(s => s.dist !== null && s.dbId);
        if (!metScore.length) { return; }
        setSaving(true);
        const t = typeof toast !== 'undefined' ? toast.loading(`${metScore.length} score(s) opslaan...`) : null;
        let ok = 0;
        for (const s of metScore) {
            try {
                await fetch('/api/tests', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${profile._token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'save_score',
                        schoolId: profile.school_id,
                        groepId, testId, datum,
                        leerlingId: s.dbId,
                        klas:       s.klas     || null,
                        geslacht:   s.geslacht || null,
                        score:      s.dist,    // afstand in meters als score
                    }),
                });
                ok++;
            } catch { /* doorgaan */ }
        }
        if (t) toast.dismiss(t);
        if (typeof toast !== 'undefined') toast.success(`${ok} score(s) opgeslagen!`);
        setSaving(false);
        if (onScoresOpgeslagen) onScoresOpgeslagen();
    }, [heeftKlas, profile, studenten, groepId, testId, datum, onScoresOpgeslagen]);

    // ── Student management ────────────────────────────────────────────────────
    const voegToe = () => {
        const naam = invoer.trim();
        if (!naam) return;
        setStudenten(p => [...p, { id: p.length + 1, naam, status: 'actief', warnings: 0, level: null, shuttle: null, dist: null }]);
        setInvoer('');
    };

    const waarschuw = (id) => {
        setStudenten(p => p.map(s => {
            if (s.id !== id || s.status === 'uitgevallen') return s;
            if (s.warnings < 1) return { ...s, warnings: 1, status: 'gewaarschuwd' };
            return {
                ...s, warnings: 2, status: 'uitgevallen',
                level: cur.level, shuttle: cur.shuttle,
                dist: getDistance(cur.level, cur.shuttle),
            };
        }));
    };

    const herstel = (id) => {
        setStudenten(p => p.map(s => {
            if (s.id !== id) return s;
            if (s.status === 'uitgevallen')   return { ...s, warnings: 1, status: 'gewaarschuwd', level: null, shuttle: null, dist: null };
            if (s.status === 'gewaarschuwd')  return { ...s, warnings: 0, status: 'actief' };
            return s;
        }));
    };

    // Alle leerlingen uitgevallen → test stoppen
    useEffect(() => {
        if (fase === 'actief' && studenten.length > 0 && studenten.every(s => s.status === 'uitgevallen')) {
            stopTest();
        }
    }, [studenten, fase, stopTest]);

    // ─── RENDER: KLAAR (leerkracht-modus — klas al geladen) ─────────────────
    if (fase === 'klaar') return (
        <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <p className="text-sm font-medium text-amber-800">
                    Beeptest · Léger-protocol · 21 niveaus · max 4940m
                </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">{studenten.length} deelnemers geladen</p>
                </div>
                <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                    {studenten.map(s => (
                        <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{s.id}</span>
                            <span className="flex-1 font-medium text-gray-900 text-sm">{s.naam}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                <p className="font-semibold mb-0.5">Regels</p>
                <p>1ste mislukking = ⚠️. 2de mislukking = ❌ uitgevallen. Score = afstand in meter.</p>
            </div>
            <button onClick={startTest}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl text-lg transition-colors">
                🔔 Start Beeptest
            </button>
        </div>
    );

    // ─── RENDER: SETUP (leerling-waarnemer modus — handmatige invoer) ─────────
    if (fase === 'setup') return (
        <div className="min-h-screen bg-slate-50 p-5 max-w-md mx-auto">
            <div className="mb-8 pt-2">
                <p className="text-4xl mb-1">🏃</p>
                <h1 className="text-3xl font-black text-slate-900">Beeptest</h1>
                <p className="text-slate-500 text-sm mt-1">20m shuttle run · Léger-protocol · 21 niveaus · max 4940m</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-4">
                <h2 className="font-bold text-slate-800 mb-3 text-base">Deelnemers toevoegen</h2>
                <div className="flex gap-2 mb-3">
                    <input value={invoer} onChange={e => setInvoer(e.target.value)} onKeyDown={e => e.key === 'Enter' && voegToe()}
                        placeholder="Naam leerling..." className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400" />
                    <button onClick={voegToe} className="w-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xl transition-colors">+</button>
                </div>
                {studenten.length === 0 && <p className="text-center text-slate-400 text-sm py-2">Nog geen leerlingen toegevoegd</p>}
                <div className="space-y-1.5">
                    {studenten.map(s => (
                        <div key={s.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                            <span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{s.id}</span>
                            <span className="flex-1 font-medium text-slate-800 text-sm">{s.naam}</span>
                            <button onClick={() => setStudenten(p => p.filter(x => x.id !== s.id))} className="text-slate-400 hover:text-red-500 text-sm px-1">✕</button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Regels</p>
                <p className="leading-relaxed">1ste mislukking = ⚠️ waarschuwing. 2de mislukking = ❌ uitgevallen. Score = laatste niveau.shuttle voor uitvallen.</p>
            </div>
            <button onClick={startTest} disabled={!studenten.length}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-5 rounded-2xl text-xl transition-colors">
                ▶ Start Beeptest
            </button>
        </div>
    );

    // ─── RENDER: ACTIEF ───────────────────────────────────────────────────────
    const actief     = studenten.filter(s => s.status !== 'uitgevallen');
    const uitgevallen = studenten.filter(s => s.status === 'uitgevallen').sort((a, b) => (b.dist || 0) - (a.dist || 0));

    if (fase === 'actief') return (
        <div style={{ minHeight: '100vh', background: '#0f172a', padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

            {/* ── Niveau display ─────────────────────────────────────────── */}
            <div style={{ textAlign: 'center', paddingTop: '20px', paddingBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Niveau
                </div>
                <div style={{ fontSize: '100px', fontWeight: 900, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {cur.level}
                </div>
                <div style={{ fontSize: '20px', color: '#94a3b8', fontFamily: 'ui-monospace, monospace', marginBottom: '14px' }}>
                    shuttle {cur.shuttle} / {shuttlesInLevel}
                    <span style={{ fontSize: '14px', marginLeft: '12px', color: '#475569' }}>
                        {getSpeed(cur.level)} km/h
                    </span>
                </div>

                {/* Progress bar */}
                <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', margin: '0 32px 8px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#7c3aed', borderRadius: '3px', width: `${Math.min(progress, 1) * 100}%`, transition: 'width 0.2s ease' }} />
                </div>

                <div style={{ fontSize: '13px', color: '#475569' }}>
                    {getDistance(cur.level, cur.shuttle)} m afgelegd
                </div>
            </div>

            {/* ── Actieve leerlingen ─────────────────────────────────────── */}
            <div style={{ marginBottom: '10px' }}>
                {actief.map(s => (
                    <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        background: s.status === 'gewaarschuwd' ? 'rgba(245,158,11,0.12)' : '#1e293b',
                        border: `1.5px solid ${s.status === 'gewaarschuwd' ? 'rgba(245,158,11,0.35)' : '#334155'}`,
                        borderRadius: '18px', padding: '14px', marginBottom: '8px',
                    }}>
                        {/* Nummer badge */}
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                            background: s.status === 'gewaarschuwd' ? '#f59e0b' : '#334155',
                            color: s.status === 'gewaarschuwd' ? 'white' : '#94a3b8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '16px',
                        }}>{s.id}</div>

                        {/* Naam */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: 'white', fontSize: '17px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.naam}</div>
                            {s.status === 'gewaarschuwd' && (
                                <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>⚠️ Eerste waarschuwing</div>
                            )}
                        </div>

                        {/* Knoppen */}
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            {s.status !== 'actief' && (
                                <button
                                    onClick={() => herstel(s.id)}
                                    title="Ongedaan maken"
                                    style={{ width: '42px', height: '42px', background: '#334155', border: 'none', borderRadius: '12px', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >↩</button>
                            )}
                            <button
                                onClick={() => waarschuw(s.id)}
                                style={{
                                    padding: '0 18px', height: '42px', border: 'none', borderRadius: '12px', cursor: 'pointer',
                                    fontWeight: 800, fontSize: '14px', letterSpacing: '0.5px',
                                    background: s.status === 'gewaarschuwd' ? '#ef4444' : '#f59e0b',
                                    color: 'white', transition: 'transform 0.1s', flexShrink: 0,
                                }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
                                onMouseUp={e => e.currentTarget.style.transform = ''}
                                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.93)'}
                                onTouchEnd={e => e.currentTarget.style.transform = ''}
                            >
                                {s.status === 'gewaarschuwd' ? '❌ UIT' : '⚠️ WARN'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Uitgevallen leerlingen ─────────────────────────────────── */}
            {uitgevallen.length > 0 && (
                <div style={{ background: '#1e293b', borderRadius: '16px', padding: '12px 14px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Uitgevallen ({uitgevallen.length})
                    </div>
                    {uitgevallen.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 2px', borderBottom: '1px solid #0f172a' }}>
                            <span style={{ width: '28px', height: '28px', background: 'rgba(239,68,68,0.12)', color: '#f87171', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                                {s.id}
                            </span>
                            <span style={{ flex: 1, color: '#64748b', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.naam}</span>
                            <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                                {s.level ? formatScore(s.level, s.shuttle) : '—'}
                            </span>
                            <span style={{ color: '#475569', fontSize: '12px', flexShrink: 0, minWidth: '46px', textAlign: 'right' }}>
                                {s.dist ? `${s.dist}m` : '—'}
                            </span>
                            <button onClick={() => herstel(s.id)} title="Terugzetten" style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', flexShrink: 0 }}>↩</button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Stop knop ─────────────────────────────────────────────── */}
            <button
                onClick={stopTest}
                style={{ width: '100%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '14px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
                ■ Test stoppen
            </button>
        </div>
    );

    // ─── RENDER: RESULTATEN ───────────────────────────────────────────────────
    const gesorteerd = [...studenten].sort((a, b) => (b.dist || 0) - (a.dist || 0));
    const MEDAILLE = ['🥇', '🥈', '🥉'];

    return (
        <div className="min-h-screen bg-slate-50 p-5 max-w-md mx-auto">
            <h1 className="text-2xl font-black text-slate-900 mb-6">🏆 Resultaten Beeptest</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
                {gesorteerd.map((s, i) => (
                    <div key={s.id} className={`flex items-center gap-3 px-4 py-4 ${i < gesorteerd.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <span className="w-8 text-center text-xl flex-shrink-0">{MEDAILLE[i] || `${i + 1}.`}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{s.naam}</p>
                            {s.level
                                ? <p className="text-xs text-slate-500">Niveau {s.level} · shuttle {s.shuttle} · {getSpeed(s.level)} km/h</p>
                                : <p className="text-xs text-slate-400">Geen score</p>
                            }
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="font-black text-slate-900 font-mono text-lg">{s.level ? formatScore(s.level, s.shuttle) : '—'}</p>
                            <p className="text-xs text-slate-500">{s.dist ? `${s.dist} m` : '—'}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Scoretabel per niveau */}
            <details className="bg-white rounded-2xl border border-slate-200 mb-4 overflow-hidden">
                <summary className="px-4 py-3 font-semibold text-slate-700 cursor-pointer text-sm">📊 Referentietabel alle niveaus</summary>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-y border-slate-200">
                                <th className="px-3 py-2 text-left text-slate-600 font-semibold">Niveau</th>
                                <th className="px-3 py-2 text-slate-600 font-semibold text-center">Shuttles</th>
                                <th className="px-3 py-2 text-slate-600 font-semibold text-center">km/h</th>
                                <th className="px-3 py-2 text-slate-600 font-semibold text-right">Totaal (m)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 21 }, (_, i) => i + 1).map(lvl => (
                                <tr key={lvl} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-3 py-2 font-bold text-purple-700">{lvl}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{SHUTTLES_PER_LEVEL[lvl - 1]}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{getSpeed(lvl)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-700">{CUM[lvl]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>

            <button
                onClick={() => { cleanup(); setFase(heeftKlas ? 'klaar' : 'setup'); setStudenten(heeftKlas ? initStudenten() : []); setCurIdx(0); }}
                className="w-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-bold py-4 rounded-2xl transition-colors"
            >
                ↩ Nieuwe test
            </button>

            {heeftKlas && studenten.some(s => s.dist !== null) && (
                <button onClick={slaScoresOp} disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2">
                    {saving ? 'Opslaan...' : '✅ Scores opslaan in testafname'}
                </button>
            )}
        </div>
    );
}