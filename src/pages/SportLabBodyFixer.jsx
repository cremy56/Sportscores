// src/pages/SportLabBodyFixer.jsx
// Body Fixer — aangepaste training voor vrijgestelde leerlingen
//
// Oefeningen zijn UITSLUITEND voor niet-geblesseerde zones.
// Geen medisch advies — revalidatie komt van de kinesist.
//
// Niveau bepaald door:
//   - Blessureduur (auto-detect via geregistreerd_op, overrideable)
//   - Sporturen per week (leerling kiest)
//
// Matrix:
//   Week 1-2 × elke sportintensiteit  → niveau_1
//   Week 3-5 × weinig sport           → niveau_1
//   Week 3-5 × matig/veel sport       → niveau_2
//   Week 6+  × weinig/matig sport     → niveau_2
//   Week 6+  × veel sport             → niveau_3

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

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

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Klas → leeftijdsgroep (Belgisch secundair onderwijs)
// 1e-2e jaar (~12-14j) → leeftijd_12_14
// 3e jaar en hoger (~14-18j) → leeftijd_15_18
function klasNaarLeeftijd(klas) {
    if (!klas) return 'leeftijd_15_18'; // fallback
    const jaar = parseInt(klas.charAt(0));
    return !isNaN(jaar) && jaar <= 2 ? 'leeftijd_12_14' : 'leeftijd_15_18';
}

// geregistreerd_op → aantal weken geblesseerd
// Ondersteunt: ISO string, Firestore Timestamp, {_seconds} object, Date
function berekenWekenGeblesseerd(geregistreerdOp) {
    if (!geregistreerdOp) return null;
    let start;
    if (geregistreerdOp?.toDate) {
        start = geregistreerdOp.toDate();                         // Firestore Timestamp
    } else if (geregistreerdOp?._seconds) {
        start = new Date(geregistreerdOp._seconds * 1000);        // geserialiseerde Timestamp
    } else {
        start = new Date(geregistreerdOp);                        // ISO string of Date
    }
    if (isNaN(start.getTime())) return null;
    return Math.floor((Date.now() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

// Weken → fase (1/2/3)
function wekenNaarFase(weken) {
    if (weken === null) return 1; // onbekend → voorzichtig beginnen
    if (weken <= 2) return 1;
    if (weken <= 5) return 2;
    return 3;
}

// Fase + sporturen → oefenniveau
function berekenNiveau(fase, sportUren) {
    if (fase === 1) return 'niveau_1';
    if (fase === 2) return sportUren >= 2 ? 'niveau_2' : 'niveau_1';
    if (fase === 3) return sportUren === 3 ? 'niveau_3' : 'niveau_2';
    return 'niveau_1';
}

const SPORT_UREN = [
    { id: 1, label: 'Weinig sport',    detail: 'Minder dan 3u per week',   emoji: '🚶' },
    { id: 2, label: 'Gemiddeld sport', detail: '3 tot 6u per week',         emoji: '🏃' },
    { id: 3, label: 'Veel sport',      detail: 'Meer dan 6u per week',      emoji: '⚡' },
];

const NIVEAU_LABELS = {
    niveau_1: 'Lichte oefeningen',
    niveau_2: 'Matige intensiteit',
    niveau_3: 'Intensieve training',
};

const ZONE_LABELS = {
    bovenlichaam: 'Bovenlichaam 💪',
    core:         'Core / Romp 🔥',
    onderlichaam: 'Onderlichaam 🦵',
    mobiliteit:   'Mobiliteit 🧘',
    armen:        'Armen & Handen 🤲',
};

// ─── OEFENING KAART ───────────────────────────────────────────────────────────
function OefeningKaart({ oefening, afgevinkt, onToggle }) {
    return (
        <button onClick={onToggle}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                afgevinkt ? 'bg-purple-50 border-purple-300' : 'bg-white border-slate-100 hover:border-purple-200'
            }`}>
            <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    afgevinkt ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                }`}>
                    {afgevinkt && <CheckCircleSolid className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${afgevinkt ? 'line-through opacity-50 text-slate-500' : 'text-slate-800'}`}>
                        {oefening.naam}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{oefening.duur}</p>
                    {!afgevinkt && (
                        <>
                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{oefening.uitleg}</p>
                            {oefening.tip && (
                                <p className="text-xs text-purple-600 mt-1.5 italic">💡 {oefening.tip}</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </button>
    );
}

// ─── KINE OEFENINGEN ─────────────────────────────────────────────────────────
function KineOefeningen({ oefeningen, afgevinkt, onToggle, onVoegToe, onVerwijder, nieuweTekst, setNieuweTekst }) {
    return (
        <div className="bg-white border-2 border-teal-200 rounded-2xl overflow-hidden">
            <div className="bg-teal-50 px-5 py-4">
                <p className="font-bold text-teal-800 text-sm">🩺 Oefeningen van mijn kinesist</p>
                <p className="text-xs text-teal-600 mt-0.5">
                    Voeg hier de oefeningen in die jouw kinesist of arts heeft voorgeschreven. Vink ze af als je ze hebt gedaan.
                </p>
            </div>
            <div className="p-4 space-y-2">
                {oefeningen.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2 italic">
                        Nog geen oefeningen toegevoegd.
                    </p>
                )}
                {oefeningen.map((oe, i) => (
                    <div key={i} className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        afgevinkt[`kine_${i}`] ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100'
                    }`}>
                        <button onClick={() => onToggle(`kine_${i}`)}
                            className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                afgevinkt[`kine_${i}`] ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                            }`}>
                            {afgevinkt[`kine_${i}`] && <CheckCircleSolid className="w-4 h-4 text-white" />}
                        </button>
                        <p className={`flex-1 text-sm ${afgevinkt[`kine_${i}`] ? 'line-through opacity-50 text-slate-400' : 'text-slate-700'}`}>
                            {oe}
                        </p>
                        <button onClick={() => onVerwijder(i)} className="text-slate-300 hover:text-red-400 text-xl leading-none px-1">×</button>
                    </div>
                ))}
                <div className="flex gap-2 pt-1">
                    <input type="text" value={nieuweTekst} onChange={e => setNieuweTekst(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onVoegToe()}
                        placeholder="bv. Kuitstretch 3 × 30 sec"
                        className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-400" />
                    <button onClick={onVoegToe} disabled={!nieuweTekst.trim()}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-30 text-white text-sm font-bold rounded-xl transition-colors">
                        +
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── BLESSURE INFO ─────────────────────────────────────────────────────────
function BlessureInfo({ info, naam }) {
    const [open, setOpen] = useState(false);
    const items = [
        { label: 'Wat is het?',             tekst: info.wat_is_het,  icon: '📖' },
        { label: 'Hoe herken je het?',      tekst: info.herkennen,   icon: '🔍' },
        { label: 'Wat moet je vermijden?',  tekst: info.vermijden,   icon: '⛔' },
        { label: 'Wanneer naar de dokter?', tekst: info.wanneer_arts, icon: '🏥' },
    ];
    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full px-5 py-4 flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span className="font-semibold text-slate-800 text-sm">Info: {naam}</span>
                </div>
                <span className={`text-slate-400 text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {open && (
                <div className="px-5 pb-5 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-xs text-amber-700">
                            ⚠️ Algemene informatie — geen medisch advies. Raadpleeg altijd je arts of kinesist.
                        </p>
                    </div>
                    {items.map(item => (
                        <div key={item.label}>
                            <p className="text-xs font-bold text-slate-700 mb-1">{item.icon} {item.label}</p>
                            <p className="text-sm text-slate-600 leading-relaxed">{item.tekst}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── ZELFREFLECTIE ─────────────────────────────────────────────────────────
function BodyFixerReflectie({ deelname, aantalAfgevinkt, profile, onIngediend }) {
    const [inzet, setInzet] = useState(0);
    const [leerwaarde, setLeerwaarde] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleIndienen = async () => {
        if (!inzet || !leerwaarde) { toast.error('Vul alle sterren in.'); return; }
        setLoading(true);
        try {
            const data = await apiPost('submit_zelfreflectie', {
                schoolId: profile.school_id,
                deelnameId: deelname.id,
                zelfreflectie: {
                    inzet, samenwerking: inzet, leerwaarde,
                    oefeningen_afgevinkt: aantalAfgevinkt > 0,
                }
            }, profile._token);
            toast.success(`+${data.xp_earned || 20} XP verdiend!`);
            onIngediend();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
            <h3 className="font-bold text-purple-800 mb-4">Zelfreflectie — Body Fixer</h3>
            {aantalAfgevinkt > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                    <CheckCircleSolid className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm text-emerald-700 font-medium">
                        {aantalAfgevinkt} oefening{aantalAfgevinkt !== 1 ? 'en' : ''} gedaan — goed bezig!
                    </p>
                </div>
            )}
            <div className="space-y-5">
                <Sterren label="Mijn inzet tijdens de aangepaste training" waarde={inzet} onChange={setInzet} />
                <Sterren label="Wat ik heb bijgeleerd" waarde={leerwaarde} onChange={setLeerwaarde} />
            </div>
            <button onClick={handleIndienen} disabled={!inzet || !leerwaarde || loading}
                className="mt-5 w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? 'Indienen...' : 'Indienen (+20 XP)'}
            </button>
        </div>
    );
}

function Sterren({ label, waarde, onChange }) {
    return (
        <div>
            <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
            <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => onChange(s)} className="transition-transform hover:scale-110 active:scale-95">
                        <span className="text-3xl">{s <= waarde ? '⭐' : '☆'}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── HOOFD COMPONENT ──────────────────────────────────────────────────────────
export function BodyFixerView({ sessie, deelname, profile, onGereflecteerd, onTerug }) {

    // Laad blessures + oefenlib
    const [blessures, setBlessures] = useState([]);
    const [oefenLib, setOefenLib] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    // Auto-detect leeftijd en blessureduur — geen vragen aan de leerling
    const gekozenLeeftijd = klasNaarLeeftijd(profile?.klas);
    const autoWeken = berekenWekenGeblesseerd(profile?.vrijstelling_geregistreerd_op);
    const autoFase = wekenNaarFase(autoWeken);

    // Leerling keuzes
    const [gekozenBlessure, setGekozenBlessure] = useState(null);
    const [blessureDoc, setBlessureDoc] = useState(null);
    const [gekozenSportUren, setGekozenSportUren] = useState(null);
    const [actieveZone, setActieveZone] = useState(null);

    // Oefeningen afvinken
    const [afgevinkt, setAfgevinkt] = useState({});

    // Kine oefeningen
    const [kineOefeningen, setKineOefeningen] = useState([]);
    const [nieuweTekst, setNieuweTekst] = useState('');

    // Reflectie
    const [reflectie, setReflectie] = useState(sessie.status === 'evaluatie');

    useEffect(() => {
        if (sessie.status === 'evaluatie' && !reflectie) {
            setReflectie(true);
            toast('Evaluatievenster geopend!', { icon: '⏱️' });
        }
    }, [sessie.status]);

    // Laad data bij mount
    useEffect(() => {
        apiPost('get_blessure_content', {}, profile._token)
            .then(d => setBlessures(d.blessures?.filter(b => b.id !== '_oefeningen') || []))
            .catch(() => {})
            .finally(() => setLoadingData(false));

        apiPost('get_blessure_content', { blessureKey: '_oefeningen' }, profile._token)
            .then(d => setOefenLib(d.blessure?.zones || null))
            .catch(() => {});
    }, []);

    // Laad volledig blessure-document bij selectie
    useEffect(() => {
        if (!gekozenBlessure) return;
        apiPost('get_blessure_content', { blessureKey: gekozenBlessure }, profile._token)
            .then(d => {
                setBlessureDoc(d.blessure);
                const zones = d.blessure?.toegestane_zones || [];
                if (zones.length > 0) setActieveZone(zones[0]);
            })
            .catch(() => {});
    }, [gekozenBlessure]);

    const aantalAfgevinkt = Object.values(afgevinkt).filter(Boolean).length;
    const toggle = (key) => setAfgevinkt(prev => ({ ...prev, [key]: !prev[key] }));

    // Niveau berekening
    const niveau = gekozenSportUren ? berekenNiveau(autoFase, gekozenSportUren) : null;

    // Actieve oefeningen
    const activeOefeningen = (() => {
        if (!actieveZone || !niveau || !oefenLib || !gekozenLeeftijd) return [];
        const zoneData = oefenLib[actieveZone]?.[niveau];
        if (!zoneData) return [];
        return (gekozenLeeftijd === 'leeftijd_12_14' ? zoneData.leeftijd_12_14 : zoneData.leeftijd_15_18) || [];
    })();

    const alleIngesteld = gekozenBlessure && gekozenSportUren;

    if (deelname?.voltooid) return (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="font-bold text-green-800 text-lg">Goed gedaan, Body Fixer!</p>
            <p className="text-sm text-green-600 mt-1">Je reflectie is ingediend.</p>
        </div>
    );

    if (reflectie && deelname?.id) return (
        <BodyFixerReflectie deelname={deelname} aantalAfgevinkt={aantalAfgevinkt}
            profile={profile} onIngediend={onGereflecteerd} />
    );

    if (loadingData) return <div className="text-center py-12 text-slate-400 text-sm">Laden...</div>;

    return (
        <div className="space-y-4">

            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-purple-400 to-violet-500 rounded-2xl p-5 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
                            {sessie.sport} — Body Fixer
                        </p>
                        <h2 className="text-xl font-bold">Aangepaste Training</h2>
                        <p className="text-white/80 text-sm mt-1">Train de zones die jij wél kunt belasten.</p>
                    </div>
                    {aantalAfgevinkt > 0 && (
                        <div className="bg-white/20 rounded-xl px-3 py-1.5 flex-shrink-0">
                            <span className="text-white text-xs font-semibold">✓ {aantalAfgevinkt}</span>
                        </div>
                    )}
                </div>
                {/* Info badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {/* Blessureduur — auto berekend, transparant getoond */}
                    <div className="bg-white/20 rounded-xl px-3 py-1.5">
                        <span className="text-white text-xs font-semibold">
                            📅 {autoWeken === null ? 'Duur onbekend' : autoWeken <= 2 ? `${autoWeken || '<1'} week${autoWeken !== 1 ? 'en' : ''}` : autoWeken <= 5 ? `${autoWeken} weken` : `${autoWeken}+ weken`}
                        </span>
                    </div>
                    {/* Leeftijdsgroep — afgeleid van klas */}
                    <div className="bg-white/20 rounded-xl px-3 py-1.5">
                        <span className="text-white text-xs font-semibold">
                            {gekozenLeeftijd === 'leeftijd_12_14' ? '👦 12-14 jaar' : '🧑 15-18 jaar'}
                        </span>
                    </div>
                    {/* Oefenniveau */}
                    {niveau && (
                        <div className="bg-white/20 rounded-xl px-3 py-1.5">
                            <span className="text-white text-xs font-semibold">📊 {NIVEAU_LABELS[niveau]}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── DISCLAIMER ─────────────────────────────────────────────── */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <p className="text-xs text-amber-800">
                    <strong>Geen medisch advies.</strong> Oefeningen zijn voor zones die je WEL kunt belasten.
                    Oefeningen van je kinesist voeg je in via het groene blok onderaan.
                </p>
            </div>

            {/* ── INSTELLING 1: BLESSURE ─────────────────────────────── */}
            <InstellingBlok nr={1} label="Mijn blessure"
                waarde={blessures.find(b => b.id === gekozenBlessure)?.naam}
                emoji={blessures.find(b => b.id === gekozenBlessure)?.emoji}>
                <div className="grid grid-cols-2 gap-2 p-4">
                    {blessures.map(b => (
                        <button key={b.id} onClick={() => setGekozenBlessure(b.id)}
                            className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 ${
                                gekozenBlessure === b.id
                                    ? 'border-purple-400 bg-purple-50'
                                    : 'border-slate-100 bg-slate-50 hover:border-purple-200'
                            }`}>
                            <div className="text-xl mb-1">{b.emoji}</div>
                            <p className="text-xs font-semibold text-slate-800 leading-snug">{b.naam}</p>
                        </button>
                    ))}
                </div>
            </InstellingBlok>

            {/* ── INSTELLING 2: SPORTUREN ────────────────────────────────── */}
            {gekozenBlessure && (
                <InstellingBlok nr={2} label="Hoeveel sport per week?"
                    waarde={SPORT_UREN.find(s => s.id === gekozenSportUren)?.label}>
                    <div className="p-4 space-y-2">
                        <p className="text-xs text-slate-500 px-1 mb-2">
                            Dit bepaalt hoe intensief de oefeningen zijn voor de zones die jij wél kunt trainen.
                        </p>
                        {SPORT_UREN.map(s => (
                            <button key={s.id} onClick={() => setGekozenSportUren(s.id)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                                    gekozenSportUren === s.id
                                        ? 'border-purple-400 bg-purple-50'
                                        : 'border-slate-100 bg-slate-50 hover:border-purple-200'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{s.emoji}</span>
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{s.label}</p>
                                        <p className="text-xs text-slate-500">{s.detail}</p>
                                    </div>
                                    {gekozenSportUren === s.id && (
                                        <CheckCircleSolid className="w-5 h-5 text-purple-500 ml-auto" />
                                    )}
                                </div>
                            </button>
                        ))}
                        {niveau && (
                            <div className="mt-2 bg-purple-50 border border-purple-200 rounded-xl p-3">
                                <p className="text-xs font-semibold text-purple-800">
                                    📊 Jouw oefenniveau: {NIVEAU_LABELS[niveau]}
                                </p>
                            </div>
                        )}
                    </div>
                </InstellingBlok>
            )}


            {/* ── OEFENINGEN ─────────────────────────────────────────────── */}
            {alleIngesteld && blessureDoc && (
                <div className="space-y-4">

                    {/* Verboden melding */}
                    {blessureDoc.opmerking_verboden && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <p className="text-xs font-bold text-red-800 mb-1">⛔ Vermijd vandaag:</p>
                            <p className="text-xs text-red-700">{blessureDoc.opmerking_verboden}</p>
                        </div>
                    )}

                    {/* Zone tabs */}
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Kies een zone:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {(blessureDoc.toegestane_zones || []).map(zone => {
                                const zoneOef = oefenLib?.[zone]?.[niveau];
                                const zoneList = zoneOef
                                    ? (gekozenLeeftijd === 'leeftijd_12_14' ? zoneOef.leeftijd_12_14 : zoneOef.leeftijd_15_18) || []
                                    : [];
                                const gedaan = zoneList.filter((_, i) => afgevinkt[`${zone}_${i}`]).length;
                                return (
                                    <button key={zone} onClick={() => setActieveZone(zone)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                            actieveZone === zone
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-300'
                                        }`}>
                                        {ZONE_LABELS[zone] || zone}
                                        {gedaan > 0 && (
                                            <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                                                actieveZone === zone ? 'bg-white/20' : 'bg-purple-100 text-purple-700'
                                            }`}>{gedaan}/{zoneList.length}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Oefeningen actieve zone */}
                    {actieveZone && (
                        <div className="space-y-3">
                            {activeOefeningen.length > 0 ? (
                                <>
                                    {oefenLib?.[actieveZone]?.[niveau]?.omschrijving && (
                                        <p className="text-xs text-slate-500 italic px-1">
                                            {oefenLib[actieveZone][niveau].omschrijving}
                                        </p>
                                    )}
                                    {activeOefeningen.map((oef, i) => (
                                        <OefeningKaart key={i} oefening={oef}
                                            afgevinkt={!!afgevinkt[`${actieveZone}_${i}`]}
                                            onToggle={() => toggle(`${actieveZone}_${i}`)} />
                                    ))}
                                </>
                            ) : (
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <p className="text-xs text-slate-400">Geen oefeningen voor deze combinatie.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Blessure info */}
                    {blessureDoc.info && <BlessureInfo info={blessureDoc.info} naam={blessureDoc.naam} />}
                </div>
            )}

            {/* ── KINE OEFENINGEN ────────────────────────────────────────── */}
            <KineOefeningen
                oefeningen={kineOefeningen}
                afgevinkt={afgevinkt}
                onToggle={toggle}
                onVoegToe={() => {
                    if (!nieuweTekst.trim()) return;
                    setKineOefeningen(prev => [...prev, nieuweTekst.trim()]);
                    setNieuweTekst('');
                }}
                onVerwijder={i => {
                    setKineOefeningen(prev => prev.filter((_, idx) => idx !== i));
                    setAfgevinkt(prev => { const n = {...prev}; delete n[`kine_${i}`]; return n; });
                }}
                nieuweTekst={nieuweTekst}
                setNieuweTekst={setNieuweTekst}
            />

        </div>
    );
}

// ─── INSTELLING BLOK (accordion) ─────────────────────────────────────────────
function InstellingBlok({ nr, label, waarde, emoji, children }) {
    const [open, setOpen] = useState(!waarde); // open als nog niet ingesteld

    // Auto-sluiten als waarde wordt ingesteld
    useEffect(() => { if (waarde) setOpen(false); }, [waarde]);

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full px-5 py-4 flex items-center gap-3 text-left">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    waarde ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                    {waarde ? '✓' : nr}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{label}</p>
                    {waarde && (
                        <p className="text-xs text-purple-600 truncate">
                            {emoji && `${emoji} `}{waarde}
                        </p>
                    )}
                </div>
                <span className={`text-slate-400 text-lg transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {open && children}
        </div>
    );
}