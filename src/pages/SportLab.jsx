// src/pages/SportLab.jsx
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    ChevronRightIcon,
    StarIcon,
    CheckCircleIcon,
    ClockIcon,
    ShieldExclamationIcon,
    PlayIcon,
    StopIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ─── API HELPER ───────────────────────────────────────────────────────────────
async function apiPost(action, body, token) {
    const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API fout');
    return data;
}

// ─── CONSTANTEN ───────────────────────────────────────────────────────────────
const SPORTEN = [
    'Basketbal', 'Volleybal', 'Voetbal', 'Badminton', 'Padel',
     'Handbal', 'Hockey',
    'Tafeltennis', 'Andere'
];

const ROLLEN = [
    {
        id: 'arbiter',
        naam: 'De Arbiter',
        subtitel: 'Scheidsrechter',
        emoji: '🟡',
        kleur: 'from-amber-400 to-orange-500',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        tekst: 'text-amber-800',
        beschrijving: 'Bewaar de spelregels, neem beslissingen en leid de wedstrijd in goede banen.',
        niveaus: [
            'Level 1 — Spelregel-bewaker: flitskaarten met regels, score bijhouden',
            'Level 2 — De Fluiter: tijdsregistratie, beslissingen bij fouten',
            'Level 3 — Game Manager: complexe beslissingen, wedstrijdscenario\'s',
        ],
        vrijgesteldOnly: false,
    },
    {
        id: 'coach',
        naam: 'De Coach',
        subtitel: 'Analist & Peer-teaching',
        emoji: '📋',
        kleur: 'from-blue-400 to-indigo-500',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        tekst: 'text-blue-800',
        beschrijving: 'Observeer je klasgenoten, analyseer bewegingen en geef opbouwende feedback.',
        niveaus: [
            'Level 1 — Spotter: visuele checklists invullen per medeleerling',
            'Level 2 — Analist: kritisch observeren, oorzaken van fouten benoemen',
            'Level 3 — Interveniënt: time-outs aanvragen, feedback verwoorden',
        ],
        vrijgesteldOnly: false,
    },
    {
        id: 'toernooileider',
        naam: 'De Toernooileider',
        subtitel: 'Organisator',
        emoji: '🏆',
        kleur: 'from-emerald-400 to-teal-500',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        tekst: 'text-emerald-800',
        beschrijving: 'Houd scores bij, verwerk resultaten en organiseer de rangschikking.',
        niveaus: [
            'Level 1 — Scorekeeper: scores bijhouden per team',
            'Level 2 — Rangschikker: volgorde berekenen, overzicht tonen',
            'Level 3 — Planner: poules organiseren, tijdschema bewaken',
        ],
        vrijgesteldOnly: false,
    },
    {
        id: 'alternatief',
        naam: 'Body Fixer',
        subtitel: 'Aangepaste training',
        emoji: '🩺',
        kleur: 'from-purple-400 to-violet-500',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        tekst: 'text-purple-800',
        beschrijving: 'Kies een zone die wel actief kan zijn en werk aan aangepaste oefeningen.',
        niveaus: [
            'Level 1 — Basis: eenvoudige oefeningen in toegestane zone',
            'Level 2 — Gericht: progressieve belasting met focus op herstel',
            'Level 3 — Zelfstandig: eigen revalidatieplan opvolgen',
        ],
        vrijgesteldOnly: true, // Enkel voor vrijgestelde leerlingen
    },
];

// ─── NIVEAU BADGE ─────────────────────────────────────────────────────────────
function NiveauBadge({ niveau }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-slate-700">
            {'⭐'.repeat(niveau)}{'☆'.repeat(3 - niveau)}
            <span className="ml-0.5">Lvl {niveau}</span>
        </span>
    );
}

// ─── LEERKRACHT: SESSIE STARTEN ───────────────────────────────────────────────
function SessieStartForm({ profile, onSessieGestart }) {
    const [sport, setSport] = useState('');
    const [geselecteerdeKlas, setGeselecteerdeKlas] = useState('');
    const [loading, setLoading] = useState(false);
    const [klassenEnGroepen, setKlassenEnGroepen] = useState({ klassen: [], groepen: [] });
    const [loadingKlassen, setLoadingKlassen] = useState(true);

    useEffect(() => {
        const fetchKlassenEnGroepen = async () => {
            try {
                const [klassenData, groepenData] = await Promise.all([
                    apiPost('get_mijn_klassen', { schoolId: profile.school_id }, profile._token),
                    apiPost('get_groepen', { schoolId: profile.school_id }, profile._token),
                ]);
                setKlassenEnGroepen({
                    klassen: klassenData.klassen || [],
                    groepen: groepenData.groepen || [],
                });
            } catch (e) {
                console.error('Fout bij laden klassen:', e);
            } finally {
                setLoadingKlassen(false);
            }
        };
        fetchKlassenEnGroepen();
    }, []);

    const [vrijgesteldeLeerlingen, setVrijgesteldeLeerlingen] = useState([]);
    const [loadingVrijgesteld, setLoadingVrijgesteld] = useState(false);

    // Vrijgestelde leerlingen ophalen bij klas selectie
    useEffect(() => {
        if (!geselecteerdeKlas || !profile?.school_id) {
            setVrijgesteldeLeerlingen([]);
            return;
        }
        const fetchVrijgesteld = async () => {
            setLoadingVrijgesteld(true);
            try {
                const data = await apiPost('get_klas_detail', {
                    klasNaam: geselecteerdeKlas,
                    schoolId: profile.school_id,
                }, profile._token);
                const vrijgesteld = (data.members || []).filter(m => m.vrijgesteld);
                setVrijgesteldeLeerlingen(vrijgesteld);
            } catch (e) {
                setVrijgesteldeLeerlingen([]);
            } finally {
                setLoadingVrijgesteld(false);
            }
        };
        fetchVrijgesteld();
    }, [geselecteerdeKlas, profile?.school_id]);

    const handleStart = async () => {
        if (!sport) { toast.error('Kies een sport.'); return; }
        setLoading(true);
        try {
            const data = await apiPost('start_sportlab_sessie', {
                schoolId: profile.school_id,
                sport,
                klas: geselecteerdeKlas || null,
            }, profile._token);
            toast.success(`SportLab sessie gestart voor ${sport}!`);
            onSessieGestart(data.sessie_id);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center"><div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-xl w-full">
            <div className="mb-6">
                <h2 className="font-bold text-slate-900 text-lg">Nieuwe SportLab Sessie</h2>
                <p className="text-sm text-slate-500 mt-1">Leerlingen kunnen daarna joinen via de app</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Sport <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-800"
                    >
                        <option value="">— Kies een sport —</option>
                        {SPORTEN.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Klas of groep <span className="text-gray-400 font-normal">(optioneel — leeg = iedereen)</span>
                    </label>
                    {loadingKlassen ? (
                        <div className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-400 text-sm">
                            Klassen laden...
                        </div>
                    ) : (
                        <select
                            value={geselecteerdeKlas}
                            onChange={e => setGeselecteerdeKlas(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-800"
                        >
                            <option value="">— Alle leerlingen —</option>
                            {klassenEnGroepen.klassen.length > 0 && (
                                <optgroup label="Klassen">
                                    {klassenEnGroepen.klassen.map(k => (
                                        <option key={k} value={k}>{k}</option>
                                    ))}
                                </optgroup>
                            )}
                            {klassenEnGroepen.groepen.length > 0 && (
                                <optgroup label="Mijn groepen">
                                    {klassenEnGroepen.groepen.map(g => (
                                        <option key={g.id} value={g.naam}>{g.naam}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    )}
                </div>

                {/* Vrijgestelde leerlingen preview */}
                {geselecteerdeKlas && !loadingVrijgesteld && vrijgesteldeLeerlingen.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs font-medium text-amber-800 mb-2">
                            🩺 Vrijgesteld in {geselecteerdeKlas} — krijgen toegang tot Body Fixer:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {vrijgesteldeLeerlingen.map(l => (
                                <span key={l.id} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                                    {l.naam}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleStart}
                    disabled={loading || !sport}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <PlayIcon className="w-5 h-5" />
                    {loading ? 'Starten...' : 'Sessie Starten'}
                </button>
            </div>
        </div></div>
    );
}

// ─── LEERKRACHT: ACTIEVE SESSIE BEHEER ────────────────────────────────────────
function ActieveSessieLeerkracht({ sessie, profile, onSessieGesloten }) {
    const [loading, setLoading] = useState(false);
    const [duur, setDuur] = useState(0);
    const [toonAfbreekBevestiging, setToonAfbreekBevestiging] = useState(false);
    const [deelnames, setDeelnames] = useState(sessie.deelnames || []);
    const [vrijgesteld, setVrijgesteld] = useState(sessie.vrijgestelde_leerlingen || []);

    // Live timer
    useEffect(() => {
        const startTijd = sessie.start_tijd ? new Date(sessie.start_tijd) : null;
        if (!startTijd) return;
        const updateDuur = () => setDuur(Math.floor((Date.now() - startTijd.getTime()) / 60000));
        updateDuur();
        const interval = setInterval(updateDuur, 30000);
        return () => clearInterval(interval);
    }, [sessie.start_tijd]);

    // Update deelnames wanneer sessie prop wijzigt (via polling)
    useEffect(() => {
        setDeelnames(sessie.deelnames || []);
        setVrijgesteld(sessie.vrijgestelde_leerlingen || []);
    }, [sessie]);

    const handleEvaluatieFase = async () => {
        setLoading(true);
        try {
            await apiPost('sluit_sportlab_sessie', {
                schoolId: profile.school_id,
                sessieId: sessie.id,
                definitief: false
            }, profile._token);
            toast.success('Evaluatievenster geopend — leerlingen hebben 10 minuten.');
            onSessieGesloten();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAfbreken = async () => {
        setLoading(true);
        try {
            await apiPost('sluit_sportlab_sessie', {
                schoolId: profile.school_id,
                sessieId: sessie.id,
                definitief: true
            }, profile._token);
            toast.success('Sessie afgebroken. Je kan een nieuwe starten.');
            setToonAfbreekBevestiging(false);
            onSessieGesloten();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center">
            <div className="max-w-xl w-full space-y-4">

                {/* Actieve sessie kaart */}
                <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-sm overflow-hidden">
                    {/* Status balk */}
                    <div className="bg-emerald-500 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span className="font-semibold text-white text-sm">
                                {sessie.status === 'evaluatie' ? 'Evaluatiefase' : 'Sessie Actief'}
                            </span>
                        </div>
                        <span className="text-emerald-100 text-sm">{duur} min</span>
                    </div>

                    <div className="p-5">
                        {/* Sport & klas */}
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-2xl font-bold text-slate-900">{sessie.sport}</h2>
                            {sessie.klas && (
                                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                    {sessie.klas}
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-slate-500 mb-4">
                            Leerlingen kiezen hun rol via de app. Klik op <strong className="text-slate-700">Evaluatiefase</strong> op het einde van de les.
                        </p>

                        {/* Live deelnames overzicht */}
                        <div className="mb-4 border border-slate-100 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600">Deelnames</span>
                                <span className="text-xs text-slate-400">{deelnames.length} gejoind</span>
                            </div>
                            {deelnames.length === 0 ? (
                                <div className="px-4 py-3 text-xs text-slate-400 italic">
                                    Nog niemand gekozen — leerlingen joinen via de app.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-50">
                                    {deelnames.map(d => (
                                        <li key={d.id} className="px-4 py-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-800">{d.nickname}</span>
                                                {d.is_vrijgesteld && (
                                                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">🩺</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">{d.rol_naam}</span>
                                                {d.voltooid && (
                                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">✓ reflectie</span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Vrijgestelde leerlingen zonder rol */}
                            {vrijgesteld.filter(v => !deelnames.some(d => d.is_vrijgesteld)).length > 0 && (
                                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                                    <p className="text-xs text-amber-700">
                                        🩺 Vrijgesteld zonder rol:{' '}
                                        {vrijgesteld
                                            .filter(v => !deelnames.some(d => d.is_vrijgesteld))
                                            .map(v => v.nickname)
                                            .join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Evaluatie fase melding */}
                        {sessie.status === 'evaluatie' && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 flex-shrink-0" />
                                Evaluatievenster open — leerlingen kunnen nu reflecteren.
                            </div>
                        )}

                        {/* Actieknoppen */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleEvaluatieFase}
                                disabled={loading || sessie.status === 'evaluatie'}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium py-3 px-4 rounded-xl transition-colors text-sm"
                            >
                                {sessie.status === 'evaluatie' ? 'Evaluatie loopt...' : 'Start Evaluatiefase'}
                            </button>
                            <button
                                onClick={() => setToonAfbreekBevestiging(true)}
                                disabled={loading}
                                className="px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium border border-slate-200 hover:border-red-200"
                            >
                                Afbreken
                            </button>
                        </div>
                    </div>
                </div>

                {/* Afbreek bevestiging */}
                {toonAfbreekBevestiging && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                        <p className="font-semibold text-red-800 mb-1">Sessie afbreken?</p>
                        <p className="text-sm text-red-700 mb-4">
                            Leerlingen die nog niet gereflecteerd hebben verliezen hun voortgang. Je kan daarna een nieuwe sessie starten.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setToonAfbreekBevestiging(false)}
                                className="flex-1 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={handleAfbreken}
                                disabled={loading}
                                className="flex-1 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50"
                            >
                                {loading ? 'Bezig...' : 'Ja, afbreken'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── LEERLING: ROL KEUZE ──────────────────────────────────────────────────────
function RolKeuze({ sessie, profile, isVrijgesteld, niveaus, onRolGekozen }) {
    const [loadingRol, setLoadingRol] = useState(null); // Houdt bij welke knop laadt

    const beschikbareRollen = ROLLEN.filter(r => !r.vrijgesteldOnly || isVrijgesteld);

    const handleKiesRol = async (rolId) => {
        setLoadingRol(rolId);
        try {
            await apiPost('join_sportlab_sessie', {
                schoolId: profile.school_id,
                sessieId: sessie.id,
                rol: rolId
            }, profile._token);
            toast.success('Rol gekozen!');
            onRolGekozen(rolId);
        } catch (e) {
            toast.error(e.message);
            setLoadingRol(null);
        }
    };

    return (
        <div>
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                <div>
                    <p className="font-semibold text-emerald-800">{sessie.sport} — Sessie actief</p>
                    <p className="text-sm text-emerald-600">Kies je rol voor deze les</p>
                </div>
            </div>

            {isVrijgesteld && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-800">
                    <ShieldExclamationIcon className="w-4 h-4 flex-shrink-0" />
                    Je bent vrijgesteld van sporttesten. De Body Fixer rol is voor jou beschikbaar.
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 mb-6">
                {beschikbareRollen.map(rol => {
                    const niveau = niveaus?.[rol.id] || 1;
                    const isLoading = loadingRol === rol.id;
                    const isDisabled = loadingRol !== null; // Blokkeer andere knoppen tijdens laden

                    return (
                        <button
                            key={rol.id}
                            onClick={() => handleKiesRol(rol.id)}
                            disabled={isDisabled}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all 
                                ${isDisabled && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                ${isLoading ? `${rol.border} ${rol.bg} scale-[1.01] shadow-md` : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}
                            `}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-bold text-gray-900">
                                                {rol.naam}
                                            </span>
                                            <NiveauBadge niveau={niveau} />
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">{rol.beschrijving}</p>
                                        <p className="text-xs font-medium text-gray-400">
                                            {rol.niveaus[niveau - 1]}
                                        </p>
                                    </div>
                                </div>
                                {isLoading && (
                                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-emerald-500 rounded-full flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── DIGITAAL SCOREBORD (Speciaal voor de Arbiter) ────────────────────────────
function Scorebord({ rolData, sessieId }) {
    // 1. Haal de opgeslagen score op (of begin bij 0)
    const [scoreA, setScoreA] = useState(() => {
        const opgeslagen = localStorage.getItem(`sportlab_scoreA_${sessieId}`);
        return opgeslagen !== null ? parseInt(opgeslagen, 10) : 0;
    });
    
    const [scoreB, setScoreB] = useState(() => {
        const opgeslagen = localStorage.getItem(`sportlab_scoreB_${sessieId}`);
        return opgeslagen !== null ? parseInt(opgeslagen, 10) : 0;
    });

    // 2. Sla de score direct op in localStorage als hij verandert
    useEffect(() => {
        localStorage.setItem(`sportlab_scoreA_${sessieId}`, scoreA);
    }, [scoreA, sessieId]);

    useEffect(() => {
        localStorage.setItem(`sportlab_scoreB_${sessieId}`, scoreB);
    }, [scoreB, sessieId]);

    const handleReset = () => {
        setScoreA(0);
        setScoreB(0);
        localStorage.removeItem(`sportlab_scoreA_${sessieId}`);
        localStorage.removeItem(`sportlab_scoreB_${sessieId}`);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                    <span className="text-xl">⏱️</span>
                    <h3 className="font-bold text-slate-800 text-sm">Digitaal Scorebord</h3>
                </div>
                <button 
                    onClick={handleReset} 
                    className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors bg-white px-2 py-1 rounded-md border border-slate-200"
                >
                    Reset
                </button>
            </div>
            
            <div className="p-5 flex justify-between items-center gap-4">
                {/* Team A */}
                <div className="flex-1 flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">Team A</span>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button 
                            onClick={() => setScoreA(Math.max(0, scoreA - 1))} 
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 text-slate-500 font-bold text-xl flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                            -
                        </button>
                        <span className="text-4xl sm:text-5xl font-black text-slate-800 w-12 sm:w-16 text-center tabular-nums">
                            {scoreA}
                        </span>
                        <button 
                            onClick={() => setScoreA(scoreA + 1)} 
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full text-white font-bold text-xl flex items-center justify-center shadow-sm transition-transform active:scale-95 bg-gradient-to-br ${rolData.kleur}`}
                        >
                            +
                        </button>
                    </div>
                </div>
                
                {/* Divider */}
                <div className="text-3xl font-black text-slate-200 mt-6">:</div>

                {/* Team B */}
                <div className="flex-1 flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">Team B</span>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button 
                            onClick={() => setScoreB(Math.max(0, scoreB - 1))} 
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 text-slate-500 font-bold text-xl flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                            -
                        </button>
                        <span className="text-4xl sm:text-5xl font-black text-slate-800 w-12 sm:w-16 text-center tabular-nums">
                            {scoreB}
                        </span>
                        <button 
                            onClick={() => setScoreB(scoreB + 1)} 
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full text-white font-bold text-xl flex items-center justify-center shadow-sm transition-transform active:scale-95 bg-gradient-to-br ${rolData.kleur}`}
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── LEERLING: ACTIEVE ROL VIEW ───────────────────────────────────────────────
function ActieveRolView({ rol, niveau, sessie, deelname, profile, onGereflecteerd, onTerug }) {
    const rolData = ROLLEN.find(r => r.id === rol) || ROLLEN[0];
    const [fase, setFase] = useState(
        sessie.status === 'evaluatie' ? 'reflectie' : 'actief'
    );
    const [rolContent, setRolContent] = useState(null);
    const [loadingContent, setLoadingContent] = useState(true);

   // Haal afgevinkte taken uit het geheugen (gekoppeld aan deze sessie)
const [afgevinkt, setAfgevinkt] = useState(() => {
    try {
        const opgeslagen = localStorage.getItem(`sportlab_taken_${sessie.id}`);
        return opgeslagen ? JSON.parse(opgeslagen) : {};
    } catch (e) {
        return {};
    }
});

// Sla afgevinkte taken op zodra er eentje wijzigt
useEffect(() => {
    localStorage.setItem(`sportlab_taken_${sessie.id}`, JSON.stringify(afgevinkt));
}, [afgevinkt, sessie.id]);

    // Spelregel flashcard index
    const [regelIndex, setRegelIndex] = useState(0);

    // Beslissing scenario index
    const [beslissingIndex, setBeslissingIndex] = useState(0);

    // Dynamische content laden
    useEffect(() => {
        const fetchContent = async () => {
            try {
                const data = await apiPost('get_sportlab_content', {
                    sport: sessie.sport.toLowerCase(),
                }, profile._token);
                setRolContent(data.content || null);
            } catch (e) {
                console.error('Content laden mislukt:', e);
            } finally {
                setLoadingContent(false);
            }
        };
        fetchContent();
    }, [sessie.sport]);

    // Auto-switch naar reflectie bij evaluatiefase
    useEffect(() => {
        if (sessie.status === 'evaluatie' && fase === 'actief') {
            setFase('reflectie');
            toast('Evaluatievenster geopend — vul je reflectie in!', { icon: '⏱️' });
        }
    }, [sessie.status]);

    const niveauInfo = rolData.niveaus[niveau - 1];

    const getTaken = () => {
        const niveauKey = `level${niveau}`;
        const dbContent = rolContent?.[rol]?.[niveauKey];
        if (dbContent?.taken?.length > 0) return dbContent.taken;
        return getTakenVoorRol(rol, niveau, sessie.sport);
    };

    const getSpelregels = () => {
        const niveauKey = `level${niveau}`;
        // Niveau-specifieke spelregels — valt terug op level1 als niet beschikbaar
        return rolContent?.[rol]?.[niveauKey]?.spelregels
            || rolContent?.[rol]?.level1?.spelregels
            || [];
    };

    const getNiveauUitleg = () => {
        const niveauKey = `level${niveau}`;
        return rolContent?.[rol]?.[niveauKey]?.uitleg || null;
    };
    const getBeslissingen = () => {
        const niveauKey = `level${niveau}`;
        return rolContent?.[rol]?.[niveauKey]?.beslissingen || [];
    };

    const taken = getTaken();
    const aantalAfgevinkt = Object.values(afgevinkt).filter(Boolean).length;
    const voortgang = taken.length > 0 ? Math.round((aantalAfgevinkt / taken.length) * 100) : 0;

    const spelregels = getSpelregels();
    const beslissingen = getBeslissingen();

    return (
        <div className="max-w-2xl mx-auto">
            {/* Terug knop */}
            <button
                onClick={onTerug}
                className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-5 group text-sm"
            >
                <ChevronRightIcon className="w-4 h-4 mr-1 rotate-180 transition-transform group-hover:-translate-x-1" />
                Terug naar overzicht
            </button>

            {/* ROL HEADER — gradient banner */}
            <div className={`bg-gradient-to-r ${rolData.kleur} rounded-2xl p-5 mb-5 text-white`}>
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">{sessie.sport}</p>
                        <h2 className="text-2xl font-bold">{rolData.naam}</h2>
                        <p className="text-white/80 text-sm mt-1">{niveauInfo}</p>
                {getNiveauUitleg() && (
    <p className="text-white/60 text-xs mt-2 leading-relaxed">{getNiveauUitleg()}</p>
)}
                    </div>
                    <NiveauBadge niveau={niveau} />
                </div>
            </div>

            {fase === 'actief' && (
                <div className="space-y-4 mb-4">

                    {/* ── DIGITAAL SCOREBORD (Enkel voor Arbiter en eventueel Toernooileider) ── */}
                    {(rol === 'arbiter' || rol === 'toernooileider') && (
                        <Scorebord rolData={rolData} sessieId={sessie.id} />
                    )}

                    {/* ── TAKEN MET CHECKBOXES + VOORTGANGSBALK ── */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="px-5 pt-5 pb-3">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-slate-800">Jouw missie vandaag</h3>
                                <span className="text-xs font-medium text-slate-500">
                                    {aantalAfgevinkt}/{taken.length}
                                </span>
                            </div>
                            {/* Voortgangsbalk */}
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                                <div
                                    className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${rolData.kleur}`}
                                    style={{ width: `${voortgang}%` }}
                                />
                            </div>
                        </div>

                        {loadingContent ? (
                            <div className="px-5 pb-5 text-sm text-slate-400">Laden...</div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {taken.map((taak, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setAfgevinkt(prev => ({ ...prev, [i]: !prev[i] }))}
                                        className={`w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors ${
                                            afgevinkt[i] ? 'bg-slate-50' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                                            afgevinkt[i]
                                                ? `border-transparent bg-gradient-to-r ${rolData.kleur}`
                                                : 'border-slate-300'
                                        }`}>
                                            {afgevinkt[i] && (
                                                <CheckCircleSolid className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <span className={`text-sm leading-relaxed ${
                                            afgevinkt[i] ? 'text-slate-400 line-through' : 'text-slate-700'
                                        }`}>
                                            {taak}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {voortgang === 100 && (
                            <div className={`mx-5 mb-5 mt-2 p-3 rounded-xl bg-gradient-to-r ${rolData.kleur} text-white text-center text-sm font-semibold`}>
                                Alle taken gedaan! 🎉
                            </div>
                        )}
                    </div>

                    {/* ── SPELREGEL FLASHCARDS (arbiter alle niveaus) ── */}
                    {rol === 'arbiter' && spelregels.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 text-sm">Spelregels {sessie.sport}</h3>
                                <span className="text-xs text-slate-400">{regelIndex + 1} / {spelregels.length}</span>
                            </div>
                            <div className="p-5">
                                {/* Flashcard */}
                                <div className={`${rolData.bg} ${rolData.border} border rounded-xl p-5 min-h-[80px] flex items-center mb-4`}>
                                    <div className="flex items-start gap-3">
                                        <span className={`text-2xl font-black ${rolData.tekst} flex-shrink-0 leading-none`}>
                                            {regelIndex + 1}
                                        </span>
                                        <p className={`text-sm leading-relaxed ${rolData.tekst} font-medium`}>
                                            {spelregels[regelIndex]}
                                        </p>
                                    </div>
                                </div>
                                {/* Navigatie */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRegelIndex(i => Math.max(0, i - 1))}
                                        disabled={regelIndex === 0}
                                        className="flex-1 py-2 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                                    >
                                        ← Vorige
                                    </button>
                                    <button
                                        onClick={() => setRegelIndex(i => Math.min(spelregels.length - 1, i + 1))}
                                        disabled={regelIndex === spelregels.length - 1}
                                        className={`flex-1 py-2 text-sm font-medium rounded-xl text-white disabled:opacity-30 transition-colors bg-gradient-to-r ${rolData.kleur}`}
                                    >
                                        Volgende →
                                    </button>
                                </div>
                                {/* Puntjes indicator */}
                                <div className="flex justify-center gap-1.5 mt-3">
                                    {spelregels.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setRegelIndex(i)}
                                            className={`w-2 h-2 rounded-full transition-all ${
                                                i === regelIndex ? `bg-gradient-to-r ${rolData.kleur} w-4` : 'bg-slate-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SCENARIO KAARTEN (arbiter L2 & L3) ── */}
                    {rol === 'arbiter' && niveau >= 2 && beslissingen.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 text-sm">
                                    {niveau === 2 ? 'Typische situaties — Level 2' : "Complexe scenario's — Level 3"}
                                </h3>
                                <span className="text-xs text-slate-400">{beslissingIndex + 1} / {beslissingen.length}</span>
                            </div>
                            <div className="p-5">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 min-h-[80px] flex items-center mb-4">
                                    <p className="text-sm leading-relaxed text-slate-700 font-medium">
                                        {beslissingen[beslissingIndex]}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setBeslissingIndex(i => Math.max(0, i - 1))}
                                        disabled={beslissingIndex === 0}
                                        className="flex-1 py-2 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                                    >
                                        ← Vorige
                                    </button>
                                    <button
                                        onClick={() => setBeslissingIndex(i => Math.min(beslissingen.length - 1, i + 1))}
                                        disabled={beslissingIndex === beslissingen.length - 1}
                                        className={`flex-1 py-2 text-sm font-medium rounded-xl text-white disabled:opacity-30 transition-colors bg-gradient-to-r ${rolData.kleur}`}
                                    >
                                        Volgende →
                                    </button>
                                </div>
                                <div className="flex justify-center gap-1.5 mt-3">
                                    {beslissingen.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setBeslissingIndex(i)}
                                            className={`w-2 h-2 rounded-full transition-all ${
                                                i === beslissingIndex ? `bg-gradient-to-r ${rolData.kleur} w-4` : 'bg-slate-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {fase === 'reflectie' && !deelname?.voltooid && (
                <ZelfreflectieForm
                    rol={rol}
                    rolData={rolData}
                    deelnameId={deelname?.id}
                    sessie={sessie}
                    profile={profile}
                    onIngediend={onGereflecteerd}
                />
            )}

            {deelname?.voltooid && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                    <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
                    <p className="font-bold text-green-800 text-lg">Goed gedaan!</p>
                    <p className="text-sm text-green-600 mt-1">Je reflectie is ingediend en XP is bijgeschreven.</p>
                </div>
            )}
        </div>
    );
}

// ─── ZELFREFLECTIE FORMULIER ──────────────────────────────────────────────────
function ZelfreflectieForm({ rol, rolData, deelnameId, sessie, profile, onIngediend }) {
    const [inzet, setInzet] = useState(0);
    const [samenwerking, setSamenwerking] = useState(0);
    const [leerwaarde, setLeerwaarde] = useState(0);
    const [oefeningenAfgevinkt, setOefeningenAfgevinkt] = useState(false);
    const [loading, setLoading] = useState(false);

    const isVolledig = inzet > 0 && samenwerking > 0 && leerwaarde > 0;

    const handleIndienen = async () => {
        if (!isVolledig) { toast.error('Vul alle velden in.'); return; }
        setLoading(true);
        try {
            const data = await apiPost('submit_zelfreflectie', {
                schoolId: profile.school_id,
                deelnameId,
                zelfreflectie: {
                    inzet,
                    samenwerking,
                    leerwaarde,
                    oefeningen_afgevinkt: oefeningenAfgevinkt,
                }
            }, profile._token);
            toast.success(`+${data.xp_earned} XP verdiend!`);
            onIngediend();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${rolData.bg} border ${rolData.border} rounded-2xl p-5`}>
            <h3 className={`font-bold ${rolData.tekst} mb-4`}>Zelfreflectie — Jouw les</h3>
            <div className="space-y-5">
                <SterrenRating label="Mijn inzet vandaag" waarde={inzet} onChange={setInzet} />
                <SterrenRating label="Mijn samenwerking met de klas" waarde={samenwerking} onChange={setSamenwerking} />
                <SterrenRating label="Wat ik heb bijgeleerd" waarde={leerwaarde} onChange={setLeerwaarde} />

                {rol === 'alternatief' && (
                    <div
                        onClick={() => setOefeningenAfgevinkt(!oefeningenAfgevinkt)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                            oefeningenAfgevinkt ? 'border-purple-400 bg-purple-100' : 'border-gray-200 bg-white'
                        }`}
                    >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            oefeningenAfgevinkt ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                        }`}>
                            {oefeningenAfgevinkt && <CheckCircleSolid className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                            Ik heb mijn aangepaste oefeningen voltooid (+25 XP)
                        </span>
                    </div>
                )}
            </div>

            <button
                onClick={handleIndienen}
                disabled={!isVolledig || loading}
                className="mt-5 w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
            >
                {loading ? 'Indienen...' : `Indienen (+20${rol === 'alternatief' && oefeningenAfgevinkt ? '+25' : ''} XP)`}
            </button>
        </div>
    );
}

// ─── STERREN RATING ───────────────────────────────────────────────────────────
function SterrenRating({ label, waarde, onChange }) {
    return (
        <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(ster => (
                    <button
                        key={ster}
                        onClick={() => onChange(ster)}
                        className="transition-transform hover:scale-110"
                    >
                        <StarIcon className={`w-8 h-8 ${
                            ster <= waarde
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                        }`} />
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── TAKEN PER ROL EN NIVEAU ──────────────────────────────────────────────────
function getTakenVoorRol(rol, niveau, sport) {
    const taken = {
        arbiter: {
            1: [`Leer de basisregels van ${sport}`, 'Houd de score bij', 'Geef aan bij welk team de volgende beurten is'],
            2: ['Houd de tijd bij met de timer', 'Fluit bij duidelijke overtredingen', 'Noteer beslissingen in de app'],
            3: ['Beheer complexe situaties', 'Communiceer beslissingen naar spelers', 'Houd wedstrijdverloop bij'],
        },
        coach: {
            1: [`Observeer de techniek van 2 klasgenoten bij ${sport}`, 'Vink de checklist aan', 'Noteer wat je opvalt'],
            2: ['Analyseer waarom bewegingen foutlopen', 'Geef 1 concrete tip aan een speler', 'Vergelijk voor/na'],
            3: ['Vraag een time-out aan', 'Verwoord je feedback duidelijk', 'Leid een korte bespreking'],
        },
        toernooileider: {
            1: ['Houd de scores bij per team', 'Noteer elke ronde', 'Rapporteer de tussenstand'],
            2: ['Bereken de rangschikking', 'Toon het klassement', 'Signaleer gelijken scores'],
            3: ['Organiseer de planning', 'Houd het tijdschema bij', 'Coördineer de poules'],
        },
        alternatief: {
            1: ['Voer de aangepaste oefeningen uit in de toegestane zone', 'Vink elke oefening af', 'Let op je houding'],
            2: ['Bouw progressief op', 'Noteer hoe de zone reageert', 'Rust voldoende tussen sets'],
            3: ['Volg je revalidatieplan', 'Pas indien nodig aan', 'Noteer je vooruitgang'],
        },
    };
    return taken[rol]?.[niveau] || ['Volg de instructies van je leerkracht'];
}

// ─── GEEN SESSIE — WACHTSCHERM ────────────────────────────────────────────────
function GeenSessieScherm({ isVrijgesteld }) {
    return (
        <div className="flex justify-center">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center max-w-md w-full">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Geen actieve sessie</h3>
                <p className="text-slate-500 text-sm">
                    Er is momenteel geen SportLab sessie actief voor jouw klas.
                    Wacht tot je leerkracht een sessie start.
                </p>
                {isVrijgesteld && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2 text-left">
                        <ShieldExclamationIcon className="w-4 h-4 flex-shrink-0" />
                        <span>Je bent vrijgesteld. Zodra de leerkracht een sessie start, heb je ook toegang tot de Body Fixer rol.</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── HOOFD COMPONENT ──────────────────────────────────────────────────────────
export default function SportLab() {
    const { profile } = useOutletContext();
    const [sessie, setSessie] = useState(null);
    const [eigenDeelname, setEigenDeelname] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gekozenRol, setGekozenRol] = useState(null);
    // Leerkracht: eigen actieve sessie apart bijhouden
    const [leerkrachtSessie, setLeerkrachtSessie] = useState(null);

    const isLeerling = profile?.rol === 'leerling';
    const isTeacher = ['leerkracht', 'administrator', 'super-administrator'].includes(profile?.rol);

    // Vrijstelling check
    // Firestore Timestamp heeft een .toDate() methode — new Date() werkt niet op een Timestamp object
    const einddatum = profile?.vrijstelling_einddatum
        ? (profile.vrijstelling_einddatum.toDate
            ? profile.vrijstelling_einddatum.toDate()
            : new Date(profile.vrijstelling_einddatum))
        : null;
    const isVrijgesteld = profile?.vrijgesteld_van_testen === true
        && einddatum && einddatum > new Date();

    // Niveaus van de leerling per rol
    const niveaus = profile?.sportlab_niveaus || {};

    // Reset rol bij elke mount → altijd overzicht tonen bij navigatie naar de pagina
    useEffect(() => {
        setGekozenRol(null);
        setEigenDeelname(null);
    }, []);

    const fetchSessie = useCallback(async () => {
        if (!profile?._token || !profile?.school_id) return;
        try {
            // Leerkracht: eigen sessies ophalen
            if (['leerkracht', 'administrator', 'super-administrator'].includes(profile?.rol)) {
                const data = await apiPost('get_sportlab_sessies', {
                    schoolId: profile.school_id
                }, profile._token);
                // Zoek actieve sessie — inclusief deelnames en vrijgestelde leerlingen
                const actief = (data.sessies || [])
                    .filter(s => ['actief', 'evaluatie'].includes(s.status))
                    .sort((a, b) => new Date(b.start_tijd) - new Date(a.start_tijd))[0] || null;
                setLeerkrachtSessie(actief || null);
            } else {
                // Leerling: actieve sessie ophalen
                const data = await apiPost('get_actieve_sportlab_sessie', {
                    schoolId: profile.school_id
                }, profile._token);
                setSessie(data.sessie || null);
                setEigenDeelname(data.eigen_deelname || null);
                // Niet automatisch gekozenRol instellen — veroorzaakt terugspringen
            }
        } catch (e) {
            console.error('Fout bij laden sessie:', e);
        } finally {
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchSessie();
        // Poll elke 15 seconden voor sessie-status updates
        const interval = setInterval(fetchSessie, 15000);
        return () => clearInterval(interval);
    }, [fetchSessie]);

    const handleSessieGestart = () => fetchSessie();
    const handleSessieGesloten = () => fetchSessie();
    const handleRolGekozen = (rol) => { setGekozenRol(rol); fetchSessie(); };
    const handleGereflecteerd = () => fetchSessie();
    const handleTerugNaarOverzicht = () => { setGekozenRol(null); setEigenDeelname(null); };

    if (loading) return (
        <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
    );

    return (
        <>
            <Toaster position="top-center" />
            <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8">

                    // HEADER
                    <div className="mb-8 mt-20">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">SportLab</h1>
                        <p className="text-slate-500">
                            {isTeacher 
                                ? 'Start een sessie en laat leerlingen hun rol kiezen via de app.' 
                                : (isLeerling && !gekozenRol) 
                                    ? 'Kies je rol voor de les en verdien XP door actief bij te dragen.' 
                                    : 'Jouw actieve SportLab missie.'
                            }
                        </p>
                    </div>

                    {/* LEERKRACHT VIEW */}
                    {isTeacher && (
                        <>
                            {leerkrachtSessie ? (
                                <ActieveSessieLeerkracht
                                    sessie={leerkrachtSessie}
                                    profile={profile}
                                    onSessieGesloten={handleSessieGesloten}
                                />
                            ) : (
                                <SessieStartForm
                                    profile={profile}
                                    onSessieGestart={handleSessieGestart}
                                />
                            )}
                        </>
                    )}

                    {/* LEERLING VIEW */}
                    {isLeerling && (
                        <>
                            {!sessie ? (
                                <GeenSessieScherm isVrijgesteld={isVrijgesteld} />
                            ) : gekozenRol ? (
                                <ActieveRolView
                                    rol={gekozenRol}
                                    niveau={niveaus[gekozenRol] || 1}
                                    sessie={sessie}
                                    deelname={eigenDeelname}
                                    profile={profile}
                                    onGereflecteerd={handleGereflecteerd}
                                    onTerug={handleTerugNaarOverzicht}
                                />
                            ) : (
                                <RolKeuze
                                    sessie={sessie}
                                    profile={profile}
                                    isVrijgesteld={isVrijgesteld}
                                    niveaus={niveaus}
                                    onRolGekozen={handleRolGekozen}
                                />
                            )}
                        </>
                    )}


                </div>
            </div>
        </>
    );
}

// Client-side sessie check (zonder server timestamp)
function isSessieActiefClient(sessie) {
    if (!sessie) return false;
    if (sessie.status === 'gesloten') return false;
    return true;
}