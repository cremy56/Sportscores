// src/pages/SportLabBodyFixer.jsx
// Body Fixer rol — voor vrijgestelde leerlingen in Sport Lab
// Leerling kiest blessurezone → app toont toegestane oefeningen + blessure-info
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
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

// ─── ZONE LABELS ──────────────────────────────────────────────────────────────
const ZONE_LABELS = {
    bovenlichaam: 'Bovenlichaam 💪',
    bovenlichaam_licht: 'Bovenlichaam (licht) 💪',
    core: 'Core / Buikspieren 🔥',
    onderlichaam: 'Onderlichaam 🦵',
    mobiliteit: 'Mobiliteit & Stretching 🧘',
    armen: 'Armen 🤲',
};

// ─── BLESSURE KEUZE ───────────────────────────────────────────────────────────
function BlessureKeuze({ profile, onBlessureGekozen }) {
    const [blessures, setBlessures] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlessures = async () => {
            try {
                const data = await apiPost('get_blessure_content', {}, profile._token);
                setBlessures(data.blessures || []);
            } catch (e) {
                console.error('Blessures laden mislukt:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchBlessures();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            Oefeningen laden...
        </div>
    );

    return (
        <div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6">
                <p className="text-sm font-semibold text-purple-800 mb-1">🩺 Body Fixer</p>
                <p className="text-sm text-purple-700">
                    Selecteer waar je blessure zit. De app toont welke oefeningen je veilig
                    kunt uitvoeren en geeft informatie over jouw blessure.
                </p>
                <p className="text-xs text-purple-500 mt-2">
                    ⚠️ Deze oefeningen vervangen geen medisch advies. Raadpleeg altijd je arts of kinesist.
                </p>
            </div>

            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
                Waar zit jouw blessure?
            </h3>

            <div className="grid grid-cols-2 gap-3">
                {blessures.map(b => (
                    <button
                        key={b.id}
                        onClick={() => onBlessureGekozen(b.id)}
                        className="bg-white border-2 border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded-2xl p-4 text-left transition-all active:scale-95"
                    >
                        <div className="text-2xl mb-1">{b.emoji}</div>
                        <p className="text-xs font-semibold text-slate-800 leading-snug">{b.naam}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── OEFENING KAART ───────────────────────────────────────────────────────────
function OefeningKaart({ oefening, index, afgevinkt, onToggle }) {
    return (
        <button
            onClick={() => onToggle(index)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                afgevinkt
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-white border-slate-100 hover:border-purple-200'
            }`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    afgevinkt ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                }`}>
                    {afgevinkt && <CheckCircleSolid className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                    <p className={`font-semibold text-sm ${afgevinkt ? 'text-purple-800 line-through opacity-60' : 'text-slate-800'}`}>
                        {oefening.naam}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{oefening.duur}</p>
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

// ─── BLESSURE INFO SECTIE ─────────────────────────────────────────────────────
function BlessureInfo({ info, naam }) {
    const [open, setOpen] = useState(false);

    const items = [
        { label: 'Wat is het?', inhoud: info.wat_is_het, icon: '📖' },
        { label: 'Hoe herken je het?', inhoud: info.herkennen, icon: '🔍' },
        { label: 'Wat moet je vermijden?', inhoud: info.vermijden, icon: '⛔' },
        { label: 'Herstel', inhoud: info.herstel, icon: '⏱️' },
        { label: 'Wanneer naar de dokter?', inhoud: info.wanneer_arts, icon: '🏥' },
    ];

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full px-5 py-4 flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span className="font-semibold text-slate-800 text-sm">Info: {naam}</span>
                </div>
                <span className={`text-slate-400 transition-transform text-lg ${open ? 'rotate-180' : ''}`}>
                    ▾
                </span>
            </button>

            {open && (
                <div className="px-5 pb-5 space-y-4">
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        ⚠️ Deze informatie is educatief. Raadpleeg altijd een arts of kinesist voor jouw persoonlijke situatie.
                    </p>
                    {items.map(item => (
                        <div key={item.label}>
                            <p className="text-xs font-bold text-slate-700 mb-1">
                                {item.icon} {item.label}
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed">{item.inhoud}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── HOOFD COMPONENT ──────────────────────────────────────────────────────────
export function BodyFixerView({ sessie, deelname, profile, onGereflecteerd }) {
    const [gekozenBlessure, setGekozenBlessure] = useState(null);
    const [blessureData, setBlessureData] = useState(null);
    const [loadingBlessure, setLoadingBlessure] = useState(false);
    const [afgevinkt, setAfgevinkt] = useState({});
    const [actieveZone, setActieveZone] = useState(null);
    const [faseReflectie, setFaseReflectie] = useState(
        sessie.status === 'evaluatie' || deelname?.voltooid === true
    );

    // Auto-switch naar reflectie
    useEffect(() => {
        if (sessie.status === 'evaluatie' && !faseReflectie) {
            setFaseReflectie(true);
            toast('Evaluatievenster geopend — vul je reflectie in!', { icon: '⏱️' });
        }
    }, [sessie.status]);

    const handleBlessureGekozen = async (key) => {
        setGekozenBlessure(key);
        setLoadingBlessure(true);
        try {
            const data = await apiPost('get_blessure_content', { blessureKey: key }, profile._token);
            setBlessureData(data.blessure);
            // Zet eerste toegestane zone als actief
            const zones = data.blessure.toegestane_zones || [];
            if (zones.length > 0) setActieveZone(zones[0]);
        } catch (e) {
            toast.error('Content laden mislukt.');
        } finally {
            setLoadingBlessure(false);
        }
    };

    const toggleOefening = (zoneKey, index) => {
        const sleutel = `${zoneKey}_${index}`;
        setAfgevinkt(prev => ({ ...prev, [sleutel]: !prev[sleutel] }));
    };

    const aantalAfgevinkt = Object.values(afgevinkt).filter(Boolean).length;

    // Deelname ingediend
    if (deelname?.voltooid) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <CheckCircleSolid className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-green-800 text-lg">Goed gedaan, Body Fixer!</p>
                <p className="text-sm text-green-600 mt-1">Je reflectie is ingediend.</p>
            </div>
        );
    }

    // Reflectiefase
    if (faseReflectie && deelname?.id) {
        return <BodyFixerReflectie
            deelname={deelname}
            aantalAfgevinkt={aantalAfgevinkt}
            profile={profile}
            sessie={sessie}
            onIngediend={onGereflecteerd}
        />;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-400 to-violet-500 rounded-2xl p-5 text-white">
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
                    {sessie.sport} — Body Fixer
                </p>
                <h2 className="text-xl font-bold">Aangepaste Training</h2>
                <p className="text-white/80 text-sm mt-1">
                    Train de zones die jij WEL kunt belasten.
                </p>
                {aantalAfgevinkt > 0 && (
                    <div className="mt-3 bg-white/20 rounded-xl px-3 py-1.5 inline-block">
                        <span className="text-white text-xs font-semibold">
                            ✓ {aantalAfgevinkt} oefening{aantalAfgevinkt !== 1 ? 'en' : ''} gedaan
                        </span>
                    </div>
                )}
            </div>

            {/* Stap 1: Blessure kiezen */}
            {!gekozenBlessure && (
                <BlessureKeuze
                    profile={profile}
                    onBlessureGekozen={handleBlessureGekozen}
                />
            )}

            {/* Stap 2: Oefeningen + Info */}
            {gekozenBlessure && loadingBlessure && (
                <div className="text-center py-8 text-slate-400 text-sm">Oefeningen laden...</div>
            )}

            {gekozenBlessure && blessureData && !loadingBlessure && (
                <>
                    {/* Terug naar blessure selectie */}
                    <button
                        onClick={() => { setGekozenBlessure(null); setBlessureData(null); setAfgevinkt({}); }}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                        ← Andere blessure kiezen
                    </button>

                    {/* Verboden melding */}
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-xs font-semibold text-red-800 mb-1">⛔ Vermijd vandaag:</p>
                        <p className="text-xs text-red-700">
                            {(blessureData.verboden_oefeningen || []).join(' · ')}
                        </p>
                    </div>

                    {/* Zone tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {(blessureData.toegestane_zones || []).map(zone => (
                            <button
                                key={zone}
                                onClick={() => setActieveZone(zone)}
                                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                    actieveZone === zone
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-300'
                                }`}
                            >
                                {ZONE_LABELS[zone] || zone}
                            </button>
                        ))}
                    </div>

                    {/* Oefeningen voor actieve zone */}
                    {actieveZone && blessureData.oefeningen?.[actieveZone] && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-slate-700">
                                {ZONE_LABELS[actieveZone]} — Jouw oefeningen
                            </h3>
                            {blessureData.oefeningen[actieveZone].map((oef, i) => (
                                <OefeningKaart
                                    key={i}
                                    oefening={oef}
                                    index={i}
                                    afgevinkt={!!afgevinkt[`${actieveZone}_${i}`]}
                                    onToggle={() => toggleOefening(actieveZone, i)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Blessure info */}
                    {blessureData.info && (
                        <BlessureInfo
                            info={blessureData.info}
                            naam={blessureData.naam}
                        />
                    )}
                </>
            )}
        </div>
    );
}

// ─── BODY FIXER REFLECTIE ─────────────────────────────────────────────────────
function BodyFixerReflectie({ deelname, aantalAfgevinkt, profile, sessie, onIngediend }) {
    const [inzet, setInzet] = useState(0);
    const [leerwaarde, setLeerwaarde] = useState(0);
    const [oefeningenAfgevinkt] = useState(aantalAfgevinkt > 0);
    const [loading, setLoading] = useState(false);

    const isVolledig = inzet > 0 && leerwaarde > 0;

    const handleIndienen = async () => {
        if (!isVolledig) { toast.error('Vul alle sterren in.'); return; }
        setLoading(true);
        try {
            const data = await apiPost('submit_zelfreflectie', {
                schoolId: profile.school_id,
                deelnameId: deelname.id,
                zelfreflectie: {
                    inzet,
                    samenwerking: inzet, // Body Fixer werkt solo — zelfde waarde
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
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
            <h3 className="font-bold text-purple-800 mb-4">Zelfreflectie — Body Fixer</h3>

            {oefeningenAfgevinkt && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                    <CheckCircleSolid className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm text-emerald-700 font-medium">
                        Oefeningen gedaan — +25 XP bonus!
                    </p>
                </div>
            )}

            <div className="space-y-5">
                <SterrenRating label="Mijn inzet tijdens de aangepaste training" waarde={inzet} onChange={setInzet} />
                <SterrenRating label="Wat ik heb bijgeleerd over mijn blessure/lichaam" waarde={leerwaarde} onChange={setLeerwaarde} />
            </div>

            <button
                onClick={handleIndienen}
                disabled={!isVolledig || loading}
                className="mt-5 w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
            >
                {loading ? 'Indienen...' : `Indienen (+20${oefeningenAfgevinkt ? '+25' : ''} XP)`}
            </button>
        </div>
    );
}

// ─── STERREN RATING (hergebruikt) ─────────────────────────────────────────────
function SterrenRating({ label, waarde, onChange }) {
    return (
        <div>
            <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(ster => (
                    <button
                        key={ster}
                        onClick={() => onChange(ster)}
                        className="transition-transform hover:scale-110"
                    >
                        <span className={`text-3xl ${ster <= waarde ? '⭐' : '☆'}`} />
                    </button>
                ))}
            </div>
        </div>
    );
}