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

// ─── EIGEN CHRONO (leerkracht, echte namen) ───────────────────────────────────
function EigenChronoTab({ leerlingen, testInfo, groepId, testId, datum, profile, onScoresOpgeslagen }) {
    // leerlingen = [{ id, naam, score_id, klas, geslacht, score, punt }]

    const [rondes, setRondes] = useState(testInfo?.eenheid?.toLowerCase().includes('sec') ? 1 : 7);
    const [gestart, setGestart] = useState(false);
    const [startTijd, setStartTijd] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [gestopt, setGestopt] = useState(false);
    const [chronoLeerlingen, setChronoLeerlingen] = useState(null); // null = nog niet gestart
    const [opgeslagen, setOpgeslagen] = useState(false);
    const [saving, setSaving] = useState(false);
    const intervalRef = useRef(null);

    // Initialiseer chronoLeerlingen bij start
    const handleStart = () => {
        const now = Date.now();
        setStartTijd(now);
        setGestart(true);
        setChronoLeerlingen(
            leerlingen
                .filter(l => !l.score) // Enkel leerlingen zonder score
                .map(l => ({
                    ...l,
                    rondetijden: [],
                    gefinisht: false,
                    eindtijd: null,
                }))
        );
    };

    useEffect(() => {
        if (gestart && !gestopt) {
            intervalRef.current = setInterval(() => setElapsed(Date.now() - startTijd), 50);
        }
        return () => clearInterval(intervalRef.current);
    }, [gestart, gestopt, startTijd]);

    const handleStop = () => {
        clearInterval(intervalRef.current);
        setGestopt(true);
    };

    const registreerRonde = (id) => {
        if (!gestart || gestopt) return;
        const nu = Date.now() - startTijd;
        setChronoLeerlingen(prev => prev.map(l => {
            if (l.id !== id || l.gefinisht) return l;
            const nieuweRondetijden = [...l.rondetijden, nu];
            const isKlaar = nieuweRondetijden.length >= rondes;
            return { ...l, rondetijden: nieuweRondetijden, gefinisht: isKlaar, eindtijd: isKlaar ? nu : null };
        }));
    };

    const handleOpslaan = async () => {
        if (!chronoLeerlingen) return;
        const gefinisht = chronoLeerlingen.filter(l => l.gefinisht);
        if (gefinisht.length === 0) { toast.error('Geen gefinishte leerlingen'); return; }

        setSaving(true);
        const loadingToast = toast.loading(`${gefinisht.length} score(s) opslaan...`);
        let succes = 0;
        let fout   = 0;

        for (const l of gefinisht) {
            const scoreWaarde = msNaarSeconden(l.eindtijd);
            try {
                await fetch('/api/tests', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${profile._token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action:   'save_score',
                        schoolId: profile.school_id,
                        groepId,
                        testId,
                        datum,
                        leerlingId: l.id,
                        score:      scoreWaarde,
                        klas:       l.klas || null,
                        geslacht:   l.geslacht || null,
                    }),
                }).then(r => r.json());
                succes++;
            } catch {
                fout++;
            }
        }

        toast.dismiss(loadingToast);
        if (succes > 0) toast.success(`${succes} score(s) opgeslagen!`);
        if (fout > 0)   toast.error(`${fout} score(s) konden niet worden opgeslagen.`);
        setSaving(false);
        setOpgeslagen(true);
        if (onScoresOpgeslagen) onScoresOpgeslagen();
    };

    const actief    = chronoLeerlingen?.filter(l => !l.gefinisht) || [];
    const gefinisht = chronoLeerlingen?.filter(l => l.gefinisht).sort((a, b) => a.eindtijd - b.eindtijd) || [];

    if (opgeslagen) {
        return (
            <div className="text-center py-10">
                <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 text-lg mb-1">Scores opgeslagen!</p>
                <p className="text-sm text-gray-500">De testafname is bijgewerkt.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Rondes instellen (vóór start) */}
            {!gestart && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Aantal rondes (voor lopen)
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={99}
                        value={rondes}
                        onChange={e => setRondes(Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">
                        Stel 1 in voor éénmalige meting (sprint, ...)
                    </p>
                </div>
            )}

            {/* Chrono display */}
            <div className="bg-slate-900 rounded-2xl p-5 text-center">
                <div className="text-5xl font-mono font-bold text-white tracking-wider mb-4">
                    {formatTijd(elapsed)}
                </div>
                {!gestart ? (
                    <button
                        onClick={handleStart}
                        disabled={leerlingen.filter(l => !l.score).length === 0}
                        className="bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold px-10 py-3.5 rounded-2xl text-lg transition-all active:scale-95 flex items-center gap-2 mx-auto"
                    >
                        <PlayIcon className="w-6 h-6" /> START
                    </button>
                ) : !gestopt ? (
                    <button
                        onClick={handleStop}
                        className="bg-red-500 hover:bg-red-400 text-white font-bold px-10 py-3.5 rounded-2xl text-lg transition-all active:scale-95 flex items-center gap-2 mx-auto"
                    >
                        <StopIcon className="w-6 h-6" /> Stop chrono
                    </button>
                ) : (
                    <p className="text-green-400 font-semibold">Gestopt op {formatTijd(elapsed)}</p>
                )}
            </div>

            {/* Actief */}
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
                                        <p className="text-xs text-gray-400">Ronde {rondeNr}/{rondes}</p>
                                    </div>
                                    <button
                                        onClick={() => registreerRonde(l.id)}
                                        disabled={!gestart || gestopt}
                                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-30 ${
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

            {/* Opslaan */}
            {(gestopt || actief.length === 0) && gefinisht.length > 0 && (
                <button
                    onClick={handleOpslaan}
                    disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                    {saving
                        ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Opslaan...</>
                        : <><CheckCircleSolid className="w-5 h-5" /> Scores opslaan in testafname</>
                    }
                </button>
            )}
        </div>
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
// Gebruik: <WaarnemerPanel leerlingen={details.leerlingen} testInfo={details} ... onClose={() => setShowWaarnemer(false)} />
export default function WaarnemerPanel({ leerlingen, testInfo, groepId, testId, datum, profile, onClose, onScoresOpgeslagen }) {
    const [tab, setTab] = useState('eigen');

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
                        Eigen chrono
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
                        <EigenChronoTab
                            leerlingen={leerlingen}
                            testInfo={testInfo}
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
