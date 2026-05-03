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
    'Basketbal', 'Volleybal', 'Voetbal', 'Badminton', 'Tennis',
    'Atletiek', 'Zwemmen', 'Turnen', 'Handbal', 'Hockey',
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

    const handleStart = async () => {
        if (!sport) { toast.error('Kies een sport.'); return; }
        setLoading(true);
        try {
            const data = await apiPost('start_sportlab_sessie', {
                schoolId: profile.school_id,
                sport,
                klas: geselecteerdeKlas || null,
            }, profile._token);
            toast.success(`Sport Lab sessie gestart voor ${sport}!`);
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
                <h2 className="font-bold text-slate-900 text-lg">Nieuwe Sport Lab Sessie</h2>
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

    const handleSluitDefinitief = async () => {
        setLoading(true);
        try {
            await apiPost('sluit_sportlab_sessie', {
                schoolId: profile.school_id,
                sessieId: sessie.id,
                definitief: true
            }, profile._token);
            toast.success('Sessie definitief gesloten.');
            onSessieGesloten();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const startTijd = sessie.start_tijd ? new Date(sessie.start_tijd) : null;
    const duur = startTijd
        ? Math.floor((Date.now() - startTijd.getTime()) / 60000)
        : 0;

    return (
        <div className="flex justify-center"><div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-sm p-6 max-w-xl w-full">
            <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-emerald-700">Sessie Actief</span>
                <span className="text-sm text-slate-500">{duur} min bezig</span>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                <p className="text-2xl font-bold text-emerald-800 mb-1">{sessie.sport}</p>
                {sessie.klas && <p className="text-sm text-emerald-600">Klas {sessie.klas}</p>}
            </div>

            <p className="text-sm text-gray-600 mb-4">
                Vertel de leerlingen verbaal welke rol ze kunnen opnemen. Ze kiezen zelf in de app.
                Klik op <strong>Evaluatiefase</strong> aan het einde van de les om de reflectie te starten.
            </p>

            <div className="flex gap-3">
                <button
                    onClick={handleEvaluatieFase}
                    disabled={loading || sessie.status === 'evaluatie'}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <StopIcon className="w-4 h-4" />
                    Evaluatiefase (3 min)
                </button>
                <button
                    onClick={handleSluitDefinitief}
                    disabled={loading}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors text-sm"
                >
                    Sluiten
                </button>
            </div>

            {sessie.status === 'evaluatie' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 flex-shrink-0" />
                    Evaluatievenster open — leerlingen kunnen nu reflecteren.
                </div>
            )}
        </div></div>
    );
}

// ─── LEERLING: ROL KEUZE ──────────────────────────────────────────────────────
function RolKeuze({ sessie, profile, isVrijgesteld, niveaus, onRolGekozen }) {
    const [geselecteerdeRol, setGeselecteerdeRol] = useState(null);
    const [loading, setLoading] = useState(false);

    const beschikbareRollen = ROLLEN.filter(r => !r.vrijgesteldOnly || isVrijgesteld);

    const handleBevestig = async () => {
        if (!geselecteerdeRol) return;
        setLoading(true);
        try {
            await apiPost('join_sportlab_sessie', {
                schoolId: profile.school_id,
                sessieId: sessie.id,
                rol: geselecteerdeRol
            }, profile._token);
            toast.success('+10 XP verdiend voor deelname!');
            onRolGekozen(geselecteerdeRol);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
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
                    const isGekozen = geselecteerdeRol === rol.id;
                    return (
                        <button
                            key={rol.id}
                            onClick={() => setGeselecteerdeRol(rol.id)}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                                isGekozen
                                    ? `${rol.border} ${rol.bg} scale-[1.01] shadow-md`
                                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className={`font-bold ${isGekozen ? rol.tekst : 'text-gray-900'}`}>
                                                {rol.naam}
                                            </span>
                                            <NiveauBadge niveau={niveau} />
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">{rol.beschrijving}</p>
                                        <p className={`text-xs font-medium ${isGekozen ? rol.tekst : 'text-gray-400'}`}>
                                            {rol.niveaus[niveau - 1]}
                                        </p>
                                    </div>
                                </div>
                                {isGekozen && (
                                    <CheckCircleSolid className={`w-5 h-5 flex-shrink-0 ${rol.tekst}`} />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                onClick={handleBevestig}
                disabled={!geselecteerdeRol || loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
                <ChevronRightIcon className="w-5 h-5" />
                {loading ? 'Bezig...' : 'Bevestig rol (+10 XP)'}
            </button>
        </div>
    );
}

// ─── LEERLING: ACTIEVE ROL VIEW ───────────────────────────────────────────────
function ActieveRolView({ rol, niveau, sessie, deelname, profile, onGereflecteerd, onTerug }) {
    const rolData = ROLLEN.find(r => r.id === rol) || ROLLEN[0];
    const [fase, setFase] = useState(
        sessie.status === 'evaluatie' ? 'reflectie' : 'actief'
    );

    // Auto-switch naar reflectie als sessie in evaluatiefase gaat
    useEffect(() => {
        if (sessie.status === 'evaluatie' && fase === 'actief') {
            setFase('reflectie');
            toast('Evaluatievenster geopend — vul je reflectie in!', { icon: '⏱️' });
        }
    }, [sessie.status]);

    const niveauInfo = rolData.niveaus[niveau - 1];

    return (
        <div className="max-w-2xl">
            {/* Terug knop */}
            <button
                onClick={onTerug}
                className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-6 group text-sm"
            >
                <ChevronRightIcon className="w-4 h-4 mr-1 rotate-180 transition-transform group-hover:-translate-x-1" />
                Terug naar overzicht
            </button>

            {/* Actieve rol banner */}
            <div className={`${rolData.bg} border ${rolData.border} rounded-2xl p-5 mb-6`}>
                <div className="flex items-center justify-between mb-2">
                    <h2 className={`text-xl font-bold ${rolData.tekst}`}>{rolData.naam}</h2>
                    <NiveauBadge niveau={niveau} />
                </div>
                <p className="text-slate-500 text-sm">{sessie.sport}</p>
                <p className={`text-sm mt-2 font-medium ${rolData.tekst}`}>{niveauInfo}</p>
            </div>

            {fase === 'actief' && (
                <div className={`${rolData.bg} border ${rolData.border} rounded-2xl p-5 mb-4`}>
                    <h3 className={`font-bold ${rolData.tekst} mb-3`}>Jouw taken vandaag</h3>
                    <div className="space-y-2">
                        {getTakenVoorRol(rol, niveau, sessie.sport).map((taak, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <CheckCircleIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${rolData.tekst}`} />
                                <span>{taak}</span>
                            </div>
                        ))}
                    </div>
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
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                    <CheckCircleSolid className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="font-bold text-green-800">Reflectie ingediend!</p>
                    <p className="text-sm text-green-600 mt-1">XP is bijgeschreven op je account.</p>
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
                    Er is momenteel geen Sport Lab sessie actief voor jouw klas.
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

    const isLeerling = profile?.rol === 'leerling';
    const isTeacher = ['leerkracht', 'administrator', 'super-administrator'].includes(profile?.rol);

    // Vrijstelling check
    const einddatum = profile?.vrijstelling_einddatum
        ? new Date(profile.vrijstelling_einddatum)
        : null;
    const isVrijgesteld = profile?.vrijgesteld_van_testen === true
        && einddatum && einddatum > new Date();

    // Niveaus van de leerling per rol
    const niveaus = profile?.sportlab_niveaus || {};

    const fetchSessie = useCallback(async () => {
        if (!profile?._token || !profile?.school_id) return;
        try {
            const data = await apiPost('get_actieve_sportlab_sessie', {
                schoolId: profile.school_id
            }, profile._token);
            setSessie(data.sessie || null);
            setEigenDeelname(data.eigen_deelname || null);
            if (data.eigen_deelname?.rol) {
                setGekozenRol(data.eigen_deelname.rol);
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

                    {/* HEADER */}
                    <div className="mb-8 mt-20">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Sport Lab</h1>
                        <p className="text-slate-500">
                            {isLeerling
                                ? 'Kies je rol voor de les en verdien XP door actief bij te dragen.'
                                : 'Start een sessie en laat leerlingen hun rol kiezen via de app.'}
                        </p>
                    </div>

                    {/* LEERKRACHT VIEW */}
                    {isTeacher && (
                        <>
                            {sessie && isSessieActiefClient(sessie) ? (
                                <ActieveSessieLeerkracht
                                    sessie={sessie}
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