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

import { Scorebord, DigitaalKlembord, ToernooiBuilder, ToernooiDashboard } from './SportLabToernooi';

// ─── API HELPER ───────────────────────────────────────────────────────────────
async function apiPost(action, body, token) {
    const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body })
    });
    const data = await res.json();
    if (!res.ok) {
        const errMsg = data.error || 'API fout';
        // Als het token vervallen is (bv. na slaapstand laptop), forceer een reload
        if (errMsg.toLowerCase().includes('token') || errMsg.toLowerCase().includes('geauthenticeerd')) {
            window.location.reload();
            return new Promise(() => {}); // Pauzeer code executie terwijl pagina herlaadt
        }
        throw new Error(errMsg);
    }
    return data;
}
// Helper voor privacy: "Jan Peeters" -> "Jan P."
const formatPrivacyNaam = (naam) => {
    if (!naam || naam === 'Onbekend') return 'Speler';
    const delen = naam.trim().split(' ');
    if (delen.length === 1) return delen[0];
    return `${delen[0]} ${delen[delen.length - 1].charAt(0)}.`;
};

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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-slate-700 whitespace-nowrap flex-shrink-0 shadow-sm">
            {'⭐'.repeat(niveau)}{'☆'.repeat(3 - niveau)}
            <span className="ml-0.5">Lvl {niveau}</span>
        </span>
    );
}

// ─── LEERKRACHT: SESSIE STARTEN ───────────────────────────────────────────────
function SessieStartForm({ profile, onSessieGestart }) {
    const [sport, setSport] = useState('');
    const [doelgroep, setDoelgroep] = useState(''); // Formaat: "klas:4A", "groep:ID" of ""
    const [loading, setLoading] = useState(false);
    
    const [klassenEnGroepen, setKlassenEnGroepen] = useState({ klassen: [], groepen: [] });
    const [loadingKlassen, setLoadingKlassen] = useState(true);
    
    const [vrijgesteldeLeerlingen, setVrijgesteldeLeerlingen] = useState([]);
    const [loadingVrijgesteld, setLoadingVrijgesteld] = useState(false);

    // Ophalen van Klassen & Groepen
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
    }, [profile?.school_id, profile?._token]);

    // Vrijgestelde leerlingen ophalen voor preview (enkel bij klas-selectie)
    useEffect(() => {
        if (!doelgroep || !profile?.school_id || !doelgroep.startsWith('klas:')) {
            setVrijgesteldeLeerlingen([]);
            return;
        }
        
        const fetchVrijgesteld = async () => {
            setLoadingVrijgesteld(true);
            try {
                const klasNaam = doelgroep.split(':')[1];
                const data = await apiPost('get_klas_detail', {
                    klasNaam: klasNaam,
                    schoolId: profile.school_id,
                }, profile._token);
                
                const vrijgesteld = (data.members || []).filter(m => m.vrijgesteld);
                setVrijgesteldeLeerlingen(vrijgesteld);
            } catch (e) {
                console.error('Fout bij ophalen vrijstellingen:', e);
                setVrijgesteldeLeerlingen([]);
            } finally {
                setLoadingVrijgesteld(false);
            }
        };
        fetchVrijgesteld();
    }, [doelgroep, profile?.school_id, profile?._token]);

    const handleStart = async () => {
        if (!sport) { toast.error('Kies een sport.'); return; }
        setLoading(true);
        
        let doelType = null;
        let doelId = null;
        
        // Formaat parsen naar backend structuur
        if (doelgroep.startsWith('klas:')) { 
            doelType = 'klas'; 
            doelId = doelgroep.split(':')[1]; 
        } else if (doelgroep.startsWith('groep:')) { 
            doelType = 'groep'; 
            doelId = doelgroep.split(':')[1]; 
        }

        try {
            const data = await apiPost('start_sportlab_sessie', {
                schoolId: profile.school_id,
                sport,
                doelType,
                doelId
            }, profile._token);
            toast.success(`Sport Lab sessie gestart voor ${sport}!`);
            
            // Wacht nu écht tot de pagina ververst is voordat we de loading-state stoppen
            await onSessieGestart(data.sessie_id); 
            
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-xl w-full">
                <div className="mb-6">
                    <h2 className="font-bold text-slate-900 text-lg">Nieuwe Sport Lab Sessie</h2>
                    <p className="text-sm text-slate-500 mt-1">Leerlingen kunnen daarna joinen via de app</p>
                </div>

                <div className="space-y-4">
                    {/* SPORT SELECTIE */}
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

                    {/* KLAS OF GROEP SELECTIE */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Klas of groep <span className="text-gray-400 font-normal">(optioneel — leeg = iedereen)</span>
                        </label>
                        {loadingKlassen ? (
                            <div className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-400 text-sm">
                                Klassen en groepen laden...
                            </div>
                        ) : (
                            <select
                                value={doelgroep}
                                onChange={e => setDoelgroep(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-800"
                            >
                                <option value="">— Alle leerlingen —</option>
                                
                                {klassenEnGroepen.klassen.length > 0 && (
                                    <optgroup label="Klassen">
                                        {klassenEnGroepen.klassen.map(k => (
                                            <option key={`klas-${k}`} value={`klas:${k}`}>{k}</option>
                                        ))}
                                    </optgroup>
                                )}
                                
                                {klassenEnGroepen.groepen.length > 0 && (
                                    <optgroup label="Mijn groepen">
                                        {klassenEnGroepen.groepen.map(g => (
                                            <option key={`groep-${g.id}`} value={`groep:${g.id}`}>{g.naam}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        )}
                    </div>

                    {/* VRIJGESTELDE LEERLINGEN PREVIEW (Enkel bij klas) */}
                    {doelgroep.startsWith('klas:') && !loadingVrijgesteld && vrijgesteldeLeerlingen.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-xs font-medium text-amber-800 mb-2">
                                🩺 Vrijgesteld in {doelgroep.split(':')[1]} — krijgen toegang tot Body Fixer:
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

                    {/* START KNOP */}
                    <button
                        onClick={handleStart}
                        disabled={loading || !sport}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                        <PlayIcon className="w-5 h-5" />
                        {loading ? 'Starten...' : 'Sessie Starten'}
                    </button>
                    
                </div>
            </div>
        </div>
    );
}

// ─── LEERKRACHT: ACTIEVE SESSIE BEHEER ────────────────────────────────────────
// ─── HELPER COMPONENT VOOR DE DOCENT EVALUATIE ────────────────────────────────
function BeoordelingRij({ d, sessie, profile, onOpgeslagen }) {
    const [score, setScore] = useState(d.beoordeling?.score || '');
    const [geefLevelUp, setGeefLevelUp] = useState(false);
    const [loading, setLoading] = useState(false);

    const opslaan = async () => {
        if (score === '') { toast.error('Vul een score in.'); return; }
        setLoading(true);
        try {
            await apiPost('save_sportlab_score', {
                schoolId: profile.school_id, 
                sessieId: sessie.id,
                leerlingUid: d.leerling_uid, 
                rol: d.rol,
                score: score, 
                maxScore: 10,
                groepId: sessie.groep_id, 
                levelUp: geefLevelUp
            }, profile._token);
            
            toast.success(`Score opgeslagen voor ${d.echte_naam}`);
            onOpgeslagen(); 
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <li className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between transition-colors hover:bg-slate-50">
            <div>
                <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800">{d.echte_naam}</p>
                   {/* HET OOGJE VOOR DE COACH */}
                    {d.rol === 'coach' && d.observaties_aantal > 0 && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                            👁️ {d.observaties_aantal}
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-500">Nickname: {d.nickname} | {d.rol_naam} (Lvl {d.niveau})</p>
            </div>
            
            {d.beoordeeld ? (
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        {d.beoordeling.score} / {d.beoordeling.max_score}
                    </span>
                    {d.beoordeling.level_up_toegekend && (
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-lg flex items-center gap-1">
                            <CheckCircleSolid className="w-4 h-4" /> Level↑
                        </span>
                    )}
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <CheckCircleSolid className="w-4 h-4" /> Opgeslagen
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <input 
                        type="number" max="10" min="0" step="0.5" placeholder="/10" 
                        value={score} onChange={e => setScore(e.target.value)}
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-purple-500" 
                    />
                    {d.rol !== 'alternatief' && d.niveau < 3 && (
                        <label className="text-xs font-medium text-purple-700 flex items-center gap-1 bg-purple-50 px-2 py-1.5 rounded-lg border border-purple-200 cursor-pointer">
                            <input type="checkbox" checked={geefLevelUp} onChange={e => setGeefLevelUp(e.target.checked)} className="accent-purple-600" />
                            Level↑
                        </label>
                    )}
                    <button onClick={opslaan} disabled={loading} className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded-lg">
                        {loading ? '...' : 'Opslaan'}
                    </button>
                </div>
            )}
        </li>
    );
}

// ─── LEERKRACHT: ACTIEVE SESSIE BEHEER ────────────────────────────────────────
function ActieveSessieLeerkracht({ sessie, profile, onSessieGesloten, onRefresh }) {
    const [loading, setLoading] = useState(false);
    const [duur, setDuur] = useState(0);
    const [toonAfbreekBevestiging, setToonAfbreekBevestiging] = useState(false);
    const [deelnames, setDeelnames] = useState(sessie.deelnames || []);
    const [vrijgesteld, setVrijgesteld] = useState(sessie.vrijgestelde_leerlingen || []);
    
    // Toernooi beheerders-states
    const [toonToernooiBuilder, setToonToernooiBuilder] = useState(false);
    const heeftToernooileider = deelnames.some(d => d.rol === 'toernooileider');

    // Live timer
    useEffect(() => {
        const startTijd = sessie.start_tijd ? new Date(sessie.start_tijd) : null;
        if (!startTijd) return;
        const updateDuur = () => setDuur(Math.floor((Date.now() - startTijd.getTime()) / 60000));
        updateDuur();
        const interval = setInterval(updateDuur, 30000);
        return () => clearInterval(interval);
    }, [sessie.start_tijd]);

    // Polling sync voor live updates van leerlingen
    useEffect(() => {
        setDeelnames(sessie.deelnames || []);
        setVrijgesteld(sessie.vrijgestelde_leerlingen || []);
    }, [sessie]);

    const alleReflectiesBinnen = deelnames.length > 0 && deelnames.every(d => d.voltooid);

   const veranderStatus = async (definitief, naarDocentEvaluatie = false) => {
        setLoading(true);
        try {
            await apiPost('sluit_sportlab_sessie', {
                schoolId: profile.school_id,
                sessieId: sessie.id,
                definitief,
                naarDocentEvaluatie
            }, profile._token);
            
            if (definitief) {
                toast.success('Sessie definitief gesloten.');
                setToonAfbreekBevestiging(false);
                
                // FIX: Verwijder de sessie onmiddellijk uit het geheugen!
                // Laat dit NIET over aan onSessieGesloten() -> fetchSessie()
                // want die gaat de sessie toch niet meer vinden (omdat hij gesloten is).
                onSessieGesloten(null); 
                return; // Stop direct de uitvoering van deze functie
            } else if (naarDocentEvaluatie) {
                toast.success('Jouw evaluatiefase is gestart!');
            } else {
                toast.success('Evaluatievenster voor leerlingen geopend.');
            }
            onSessieGesloten(); // Dit triggert fetchSessie() voor de andere statussen
        } catch (e) {
            toast.error(e.message);
        } finally {
            if(!definitief) setLoading(false); // Zet loading enkel false als we niet gesloten zijn
        }
    };

    // ─── RENDER: DOCENT EVALUATIE FASE (Punten geven) ───
    if (sessie.status === 'docent_evaluatie' || sessie.status === 'gesloten') {
        const onbeoordeeld = deelnames.filter(d => !d.beoordeeld).length;
        
        return (
            <div className="flex justify-center">
                <div className="max-w-2xl w-full bg-white rounded-2xl border-2 border-purple-400 shadow-sm overflow-hidden mb-6">
                    <div className="bg-purple-500 px-5 py-3 flex justify-between items-center text-white">
                        <span className="font-semibold text-sm">Leerkracht Evaluatie ({sessie.sport})</span>
                        <span className="text-purple-100 text-xs font-medium uppercase tracking-wider">
                            {sessie.klas ? `Klas ${sessie.klas}` : (sessie.groep_id ? 'Groep' : 'Iedereen')}
                        </span>
                    </div>
                    <div className="p-5">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Deelnames Beoordelen</h2>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Vul hier de scores in. Vink <b>Level↑</b> aan als een leerling klaar is voor de volgende stap (+100 XP).
                        </p>

                        {deelnames.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-400 italic bg-slate-50 rounded-xl mb-6">
                                Er waren geen actieve deelnemers in deze sessie.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                                {deelnames.map(d => (
                                    <BeoordelingRij 
                                        key={d.id} 
                                        d={d} 
                                        sessie={sessie} 
                                        profile={profile} 
                                        onOpgeslagen={() => {}} 
                                    />
                                ))}
                            </ul>
                        )}

                        {sessie.status !== 'gesloten' && (
                            <div className="mt-6 flex items-center justify-between">
                                {onbeoordeeld > 0 ? (
                                    <span className="text-sm font-medium text-amber-600">
                                        Nog {onbeoordeeld} leerling(en) te beoordelen.
                                    </span>
                                ) : (
                                    <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                                        <CheckCircleSolid className="w-5 h-5" /> Alles beoordeeld!
                                    </span>
                                )}
                                
                                <button 
                                    onClick={() => veranderStatus(true)} 
                                    disabled={loading}
                                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50 shadow-md"
                                >
                                    {loading ? 'Bezig...' : 'Sessie Definitief Sluiten'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── RENDER: ACTIEVE LES FASE ───
    return (
        <div className="flex justify-center">
            <div className="max-w-xl w-full space-y-4">
                <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-sm overflow-hidden">
                    
                    {/* Status Balk */}
                    <div className="bg-emerald-500 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span className="font-semibold text-white text-sm">
                                {sessie.status === 'evaluatie' ? 'Leerling Evaluatiefase' : 'Sessie Actief'}
                            </span>
                        </div>
                        <span className="text-emerald-100 text-sm font-medium">{duur} min</span>
                    </div>

                    <div className="p-5">
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-2xl font-bold text-slate-900">{sessie.sport}</h2>
                            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                {sessie.klas ? sessie.klas : (sessie.groep_id ? 'Groep' : 'Alle leerlingen')}
                            </span>
                        </div>

                        {/* Live Deelnames Overzicht */}
                        <div className="mb-2 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Deelnames</span>
                                <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                    {deelnames.length} in sessie
                                </span>
                            </div>
                            
                            {deelnames.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-center text-slate-400 italic">
                                    Nog geen rollen gekozen.<br/>Leerlingen kunnen nu joinen via de app.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-50">
                                    {deelnames.map(d => (
                                        <li key={d.id} className="px-4 py-3 flex flex-wrap gap-2 items-center justify-between transition-colors hover:bg-slate-50">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800">{d.echte_naam}</span>
                                                {d.is_vrijgesteld && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md font-semibold">🩺</span>}
                                                {/* Live observatie teller voor coaches */}
                                                {d.rol === 'coach' && d.observaties_aantal > 0 && (
                                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                                        👁️ {d.observaties_aantal}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                    {d.rol_naam}
                                                </span>
                                                {d.voltooid && (
                                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                        <CheckCircleSolid className="w-3 h-3" /> OK
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* ── TOERNOOI BEHEER (Onder de deelnames geplaatst) ── */}
                        <div className="my-6 border-t border-slate-200 pt-6">
                            {sessie.toernooi ? (
                                <ToernooiDashboard 
                                toernooi={sessie.toernooi} 
                                rolData={ROLLEN.find(r => r.id === 'toernooileider')} 
                                isLeerkracht={true}
                                profile={profile}        
                                onRefresh={onRefresh}     
                            />
                            ) : (heeftToernooileider || toonToernooiBuilder) ? (
                                <ToernooiBuilder 
                                    mode="database" sessie={sessie} profile={profile}
                                    rolData={ROLLEN.find(r => r.id === 'toernooileider')}
                                    onStart={async (toernooiData) => {
                                        try {
                                            const toastId = toast.loading('Schema berekenen...');
                                            await apiPost('start_toernooi', {
                                                schoolId: profile.school_id,
                                                sessieId: sessie.id,
                                                teams: toernooiData.teams,
                                                type: toernooiData.type
                                            }, profile._token);
                                            toast.success('Toernooi gestart!', { id: toastId });
                                            if (onRefresh) onRefresh(); // <--- ZORGT VOOR ONMIDDELLIJK BEELD!
                                        } catch(e) {
                                            toast.error('Fout bij starten: ' + e.message);
                                        }
                                    }}
                                />
                            ) : (
                                <button
                                    onClick={() => setToonToernooiBuilder(true)}
                                    className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <span>🏆</span> Toernooi schema aanmaken voor de klas
                                </button>
                            )}
                        </div>

                        {/* ── AFGESCHEIDEN BEDIENINGS-PANEEL ONDERAAN ── */}
                        <div className="mt-8 pt-6 border-t-4 border-slate-100/80 bg-slate-50/50 -mx-5 px-5 pb-5 mb-[-20px] rounded-b-2xl">
                            {sessie.status === 'evaluatie' && alleReflectiesBinnen ? (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
                                    <p className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-sm text-center justify-center">
                                        🎉 Alle leerlingen hebben gereflecteerd!
                                    </p>
                                    <button
                                        onClick={() => veranderStatus(false, true)}
                                        disabled={loading}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md"
                                    >
                                        Start Jouw Evaluatie (Punten & Levels)
                                    </button>
                                </div>
                            ) : sessie.status === 'evaluatie' ? (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 justify-center">
                                        <ClockIcon className="w-4 h-4 animate-pulse" />
                                        Wachten tot leerlingen klaar zijn met reflecteren...
                                    </div>
                                    <button
                                        onClick={() => veranderStatus(false, true)}
                                        className="text-[10px] font-black text-amber-700 hover:text-amber-900 underline uppercase tracking-widest transition-colors text-center"
                                    >
                                        Forceer: overslaan en ga nu al naar mijn evaluatie
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => veranderStatus(false, false)}
                                        disabled={loading || deelnames.length === 0}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold py-3.5 px-4 rounded-xl transition-colors text-sm shadow-md"
                                    >
                                        Start Leerling Evaluatie
                                    </button>
                                    <button
                                        onClick={() => setToonAfbreekBevestiging(true)}
                                        disabled={loading}
                                        className="px-5 py-3.5 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl transition-colors text-sm font-bold border border-slate-200 bg-white shadow-sm"
                                    >
                                        Afbreken
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── ECHTE POP-UP MODAL VOOR AFBREEK BEVESTIGING ── */}
                {toonAfbreekBevestiging && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-auto transform scale-100">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto border-4 border-white shadow-sm">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Sessie afbreken?</h3>
                            <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                                Let op: leerlingen verliezen hun onopgeslagen werk en worden uit de sessie gehaald.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setToonAfbreekBevestiging(false)} 
                                    className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    Annuleren
                                </button>
                                <button 
                                    onClick={() => veranderStatus(true)} 
                                    disabled={loading} 
                                    className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-sm transition-colors"
                                >
                                    Ja, afbreken
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── LEERLING: ROL KEUZE ──────────────────────────────────────────────────────
function RolKeuze({ sessie, profile, isVrijgesteld, niveaus, eigenDeelname, onRolGekozen }) {
    const [loadingRol, setLoadingRol] = useState(null);

    const beschikbareRollen = ROLLEN.filter(r => !r.vrijgesteldOnly || isVrijgesteld);

    const handleKiesRol = async (rolId) => {
        // NIEUW: Als de leerling deze rol al heeft, skip de API en laat ze direct weer binnen!
        if (eigenDeelname && eigenDeelname.rol === rolId) {
            onRolGekozen(rolId);
            return;
        }

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
// ─── LEERLING: ACTIEVE ROL VIEW ───────────────────────────────────────────────
function ActieveRolView({ rol, niveau, sessie, deelname, profile, onGereflecteerd, onTerug, onRefresh }) {
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
    }, [sessie.sport, profile._token]);

    // Auto-switch naar reflectie bij evaluatiefase
    useEffect(() => {
        if (sessie.status === 'evaluatie' && fase === 'actief') {
            setFase('reflectie');
            toast('Evaluatievenster geopend — vul je reflectie in!', { icon: '⏱️' });
        }
    }, [sessie.status, fase]);

    const niveauInfo = rolData.niveaus[niveau - 1];

    const getTaken = () => {
        const niveauKey = `level${niveau}`;
        const dbContent = rolContent?.[rol]?.[niveauKey];
        if (dbContent?.taken?.length > 0) return dbContent.taken;
        return getTakenVoorRol(rol, niveau, sessie.sport);
    };

    const getSpelregels = () => {
        const niveauKey = `level${niveau}`;
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

            {/* ROL HEADER */}
            <div className={`bg-gradient-to-r ${rolData.kleur} rounded-2xl p-4 mb-5 text-white shadow-sm mt-4`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-0.5">{sessie.sport}</p>
                        <h2 className="text-xl font-bold leading-tight">{rolData.naam}</h2>
                        <p className="text-white/90 text-sm mt-1.5 leading-snug">
                            {getNiveauUitleg() || niveauInfo}
                        </p>
                    </div>
                    <div className="mt-1">
                        <NiveauBadge niveau={niveau} />
                    </div>
                </div>
            </div>

            {fase === 'actief' && (
                <div className="space-y-4 mb-4">

                    {/* ── DIGITAAL KLEMBORD (Coach) ── */}
                    {rol === 'coach' && !loadingContent && (
                        <DigitaalKlembord 
                            rolData={rolData} 
                            sessie={sessie} 
                            niveau={niveau} 
                            content={rolContent?.coach?.[`level${niveau}`]} 
                            deelnameId={deelname?.id}
                            profile={profile}
                        />
                    )}

                    {/* ── DIGITAAL SCOREBORD (Arbiter) ── */}
                    {rol === 'arbiter' && (
                        <Scorebord rolData={rolData} sessieId={sessie.id} />
                    )}

                    {/* ── DIGITAAL WEDSTRIJDSECRETARIAAT (Toernooileider) ── */}
                    {rol === 'toernooileider' && (
                        <>
                            {sessie.toernooi ? (
                                /* Als er een toernooi is: toon dashboard voor alle niveaus */
                                <ToernooiDashboard 
                                toernooi={sessie.toernooi} 
                                rolData={rolData} 
                                isLeerkracht={false} 
                                profile={profile}         
                                onRefresh={onRefresh}      
                            />
                            ) : niveau === 1 ? (
                                /* LEVEL 1: Wacht op de leerkracht */
                                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm mb-4">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">⏳</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-2">Wachten op Toernooi...</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Als Level 1 Scorekeeper zet de leerkracht het toernooi voor je klaar. 
                                        Zodra het toernooi is ingedeeld, verschijnt hier je wedstrijd-lijst!
                                    </p>
                                </div>
                            ) : (
                                /* LEVEL 2 & 3: Mogen zelf bouwen (Privacy Mode) */
                                <ToernooiBuilder 
                                    mode="manual"
                                    rolData={rolData}
                                    onStart={async (toernooiData) => {
                                        try {
                                            const toastId = toast.loading('Schema berekenen...');
                                            await apiPost('start_toernooi', {
                                                schoolId: profile.school_id,
                                                sessieId: sessie.id,
                                                teams: toernooiData.teams,
                                                type: toernooiData.type
                                            }, profile._token);
                                            toast.success('Toernooi gestart!', { id: toastId });
                                            if (onRefresh) onRefresh(); // <--- ZORGT VOOR ONMIDDELLIJK BEELD!
                                        } catch(e) {
                                            toast.error('Fout bij starten: ' + e.message);
                                        }
                                    }}
                                />
                            )}
                        </>
                    )}

                    {/* ── TAKENLIJST (Niet voor de coach) ── */}
                    {rol !== 'coach' && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
                            <div className="px-5 pt-5 pb-3">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-slate-800">Jouw missie vandaag</h3>
                                    <span className="text-xs font-medium text-slate-500">
                                        {aantalAfgevinkt}/{taken.length}
                                    </span>
                                </div>
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
                                                {afgevinkt[i] && <CheckCircleSolid className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className={`text-sm leading-relaxed ${afgevinkt[i] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                {taak}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── SPELREGEL FLASHCARDS (Arbiter) ── */}
                    {rol === 'arbiter' && spelregels.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4 shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 text-sm">Spelregels {sessie.sport}</h3>
                                <span className="text-xs text-slate-400">{regelIndex + 1} / {spelregels.length}</span>
                            </div>
                            <div className="p-5">
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
                <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center animate-fade-in mb-4">
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
    const [hoofdtip, setHoofdtip] = useState(''); // NIEUW VOOR COACH
    const [loading, setLoading] = useState(false);

    // Is formulier geldig? (Voor coach moet de tip ook ingevuld zijn)
    const isVolledig = inzet > 0 && samenwerking > 0 && leerwaarde > 0 && (rol !== 'coach' || hoofdtip !== '');

    const handleIndienen = async () => {
        if (!isVolledig) { toast.error('Vul alle verplichte velden in.'); return; }
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
                    hoofdtip_gegeven: hoofdtip || null, // Stuur de tip mee
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

                {/* Specifieke Coach Vraag */}
                {rol === 'coach' && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100">
                        <label className="block text-sm font-bold text-blue-900 mb-2">
                            Verantwoording Klembord
                        </label>
                        <p className="text-xs text-slate-500 mb-2">Welk type tip heb jij vandaag het vaakst gegeven?</p>
                        <select 
                            value={hoofdtip} 
                            onChange={e => setHoofdtip(e.target.value)}
                            className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">— Kies een optie —</option>
                            <option value="techniek_verbeteren">Techniek & Houding verbeteren</option>
                            <option value="tactiek_ruimte">Tactiek: Ruimtegebruik / Vrijlopen</option>
                            <option value="keuzes_maken">Betere keuzes maken (minder forceren)</option>
                            <option value="communicatie">Onderlinge communicatie stimuleren</option>
                            <option value="complimenten">Vooral complimenten uitgedeeld (ging perfect)</option>
                        </select>
                    </div>
                )}

                {/* Alternatief rol checkbox */}
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
    const [leerkrachtSessie, setLeerkrachtSessie] = useState(null);

    const isLeerling = profile?.rol === 'leerling';
    const isTeacher = ['leerkracht', 'administrator', 'super-administrator'].includes(profile?.rol);

    const einddatum = profile?.vrijstelling_einddatum
        ? (profile.vrijstelling_einddatum.toDate
            ? profile.vrijstelling_einddatum.toDate()
            : new Date(profile.vrijstelling_einddatum))
        : null;
    const isVrijgesteld = profile?.vrijgesteld_van_testen === true && einddatum && einddatum > new Date();

    const niveaus = profile?.sportlab_niveaus || {};

    useEffect(() => {
        if (!sessie) {
            setGekozenRol(null);
            setEigenDeelname(null);
        }
    }, [sessie?.id]);

    const fetchSessie = useCallback(async () => {
        if (!profile?._token || !profile?.school_id) return;
        try {
            if (['leerkracht', 'administrator', 'super-administrator'].includes(profile?.rol)) {
                const data = await apiPost('get_sportlab_sessies', { schoolId: profile.school_id }, profile._token);
                const actief = (data.sessies || [])
                    .filter(s => {
                        if (!['actief', 'evaluatie', 'docent_evaluatie'].includes(s.status)) return false;
                        
                        // SLIMME FIX: Negeer achtergelaten sessies ouder dan 12 uur 
                        // (behalve degene waar je nog punten voor moet geven, die blijven staan)
                        const startTijd = new Date(s.start_tijd).getTime();
                        const isVerlaten = (Date.now() - startTijd) > (12 * 60 * 60 * 1000);
                        if (isVerlaten && s.status !== 'docent_evaluatie') return false;
                        
                        return true;
                    })
                    .sort((a, b) => new Date(b.start_tijd) - new Date(a.start_tijd))[0] || null;
                setLeerkrachtSessie(actief || null);
            } else {
                const data = await apiPost('get_actieve_sportlab_sessie', { schoolId: profile.school_id }, profile._token);
                setSessie(data.sessie || null);
                setEigenDeelname(data.eigen_deelname || null);
            }
        } catch (e) {
            console.error('Fout bij laden sessie:', e);
        } finally {
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchSessie();
        const interval = setInterval(fetchSessie, 15000);
        return () => clearInterval(interval);
    }, [fetchSessie]);

    // NIEUW: Onderschep de hardware 'terug'-knop op de smartphone
    useEffect(() => {
        if (gekozenRol) {
            window.history.pushState({ roleActive: true }, '');
            const handlePopState = () => setGekozenRol(null);
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [gekozenRol]);

    const handleSessieGestart = () => fetchSessie();
  
    // FIX: Als we 'null' doorkrijgen, wissen we direct het scherm!
    const handleSessieGesloten = (forceerLeeg) => { 
        if (forceerLeeg === null) {
            setLeerkrachtSessie(null);
        } else {
            fetchSessie(); 
        }
    };
    
    const handleRolGekozen = (rol) => { setGekozenRol(rol); fetchSessie(); };
    
    const handleTerugNaarOverzicht = () => { 
        setGekozenRol(null); 
        // Forceer browser-back zodat de geschiedenis netjes opgeruimd blijft
        if (window.history.state?.roleActive) {
            window.history.back();
        }
    };
    
    const handleGereflecteerd = () => fetchSessie();

    if (loading) return (
        <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
    );

    return (
        <>
            <Toaster position="top-center" />
            <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
                {/* HIER ZIT DE FIX: pt-24 toegevoegd aan de container zodat hij NOOIT onder de navigatiebalk schuift */}
                <div className="max-w-7xl mx-auto px-4 pt-24 pb-8 lg:px-8">

                   {/* HEADER (Nu is enkel de tekst verborgen op mobiel, zonder dat we de lay-out kapot maken) */}
                    <div className="mb-6 hidden md:block">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">SportLab</h1>
                        <p className="text-slate-500 text-sm">
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
                                    onRefresh={fetchSessie} 
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
                                    onRefresh={fetchSessie}
                                />
                            ) : (
                                <RolKeuze
                                    sessie={sessie}
                                    profile={profile}
                                    isVrijgesteld={isVrijgesteld}
                                    niveaus={niveaus}
                                    eigenDeelname={eigenDeelname}
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