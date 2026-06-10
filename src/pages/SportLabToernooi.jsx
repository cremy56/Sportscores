// src/pages/SportLabToernooi.jsx
// Toernooi-gerelateerde componenten voor Sport Lab:
//   - Scorebord (De Arbiter — score bijhouden)
//   - DigitaalKlembord (De Coach — observaties)
//   - ToernooiBuilder (De Toernooileider — teams opbouwen)
//   - ToernooiDashboard (De Toernooileider — wedstrijden beheren)
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ClockIcon } from '@heroicons/react/24/outline';

// ─── API HELPER (lokale kopie — zelfde als SportLab.jsx) ──────────────────────
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

export function Scorebord({ rolData, sessieId }) {
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

// ─── DIGITAAL KLEMBORD (Speciaal voor de Coach) ───────────────────────────────
export function DigitaalKlembord({ rolData, sessie, niveau, content, deelnameId, profile }) {
    const [fase, setFase] = useState('setup'); // setup, observatie, rapport
    const [doelwit, setDoelwit] = useState('');
    const [startTijd, setStartTijd] = useState(null);
    const [duur, setDuur] = useState(0);
    
    // Scores per index: { 0: { plus: 0, min: 0 }, 1: { plus: 0, min: 0 } }
    const [scores, setScores] = useState({}); 
    const [analyses, setAnalyses] = useState([]); // Level 2: opgeslagen fout-redenen
    const [actieveMinIndex, setActieveMinIndex] = useState(null);
    
    const isTeamFocus = niveau === 3;
    const items = isTeamFocus ? (content?.tactiek || []) : (content?.kijkwijzer || []);
    const analyseOpties = content?.analyse_opties || [];

    // Live timer tijdens observatie
    useEffect(() => {
        if (fase !== 'observatie' || !startTijd) return;
        const interval = setInterval(() => {
            setDuur(Math.floor((Date.now() - startTijd) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [fase, startTijd]);

    const handleStart = () => {
        if (!isTeamFocus && !doelwit.trim()) {
            toast.error('Vul in wie je gaat observeren.');
            return;
        }
        setStartTijd(Date.now());
        setDuur(0);
        setScores({});
        setAnalyses([]);
        setFase('observatie');
    };

    const turf = (index, type) => {
        if (type === 'min' && niveau === 2 && analyseOpties.length > 0) {
            setActieveMinIndex(index);
            return;
        }
        voegScoreToe(index, type);
    };

    const voegScoreToe = (index, type) => {
        setScores(prev => ({
            ...prev,
            [index]: {
                plus: (prev[index]?.plus || 0) + (type === 'plus' ? 1 : 0),
                min: (prev[index]?.min || 0) + (type === 'min' ? 1 : 0),
            }
        }));
    };

    const slaAnalyseOp = (reden) => {
        if (actieveMinIndex !== null) {
            voegScoreToe(actieveMinIndex, 'min');
            setAnalyses(prev => [...prev, { item: items[actieveMinIndex], reden }]);
            setActieveMinIndex(null);
        }
    };

    const afronden = () => setFase('rapport');
    

    // ─── DEBUG VERSIE VAN RESET ───
    const reset = async () => {
        // Stuur op de achtergrond een signaal naar de backend
        if (deelnameId && profile?._token && profile?.school_id) {
            try {
                await apiPost('sportlab_observatie_klaar', { 
                    deelnameId: deelnameId,
                    schoolId: profile.school_id 
                }, profile._token);
            } catch(e) { 
                console.error("Kon teller niet updaten", e); 
            }
        }
        
        setFase('setup');
        setDoelwit('');
    };

    const formatTijd = (sec) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

   if (!content) return <div className="p-5 text-sm text-slate-500">Klembord laden...</div>;

    return (
        <div className="relative pt-6 pb-2 mb-6 max-w-sm mx-auto mt-6">
            {/* HET ZILVEREN KLEMMETJE BOVENAAN */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-gradient-to-b from-slate-200 to-slate-400 rounded-t-xl border-t border-x border-slate-400 shadow-md z-20 flex items-center justify-center">
                <div className="w-16 h-1.5 bg-slate-500/50 rounded-full shadow-inner"></div>
            </div>
            
            {/* HET DONKERBLAUWE BORD (bg-blue-900 en border-blue-950) */}
            <div className="bg-blue-900 p-2 rounded-b-xl rounded-t-md shadow-xl relative z-10 border-b-4 border-blue-950">
                
                {/* HET WITTE PAPIER */}
                <div className="bg-white rounded-md min-h-[300px] shadow-inner overflow-hidden relative">
                    
                    {/* Subtiele grijze marge-lijn */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 z-0"></div>

                    <div className="relative z-10">
                        {/* Header van het papier */}
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className={`font-black ${rolData.tekst} text-sm uppercase tracking-wide ml-4`}>
                                Digitaal Klembord
                            </h3>
                            {fase === 'observatie' && (
                                <span className="text-xs font-bold text-slate-600 flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-200">
                                    <ClockIcon className="w-3.5 h-3.5" /> {formatTijd(duur)}
                                </span>
                            )}
                        </div>

                        <div className="p-5 ml-4">
                            {/* ── FASE 1: SETUP ── */}
                            {fase === 'setup' && (
                                <div className="space-y-4">
                                    {!isTeamFocus ? (
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Wie observeer je?</label>
                                            <input 
                                                type="text" 
                                                placeholder="Naam of hesjes-kleur..." 
                                                value={doelwit} 
                                                onChange={e => setDoelwit(e.target.value)}
                                                className="w-full border-b-2 border-dashed border-slate-300 bg-transparent px-2 py-2 text-sm focus:outline-none focus:border-blue-500 font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal"
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800 font-medium">
                                            Je focust je nu op het héle team.
                                        </div>
                                    )}
                                    
                                    <button onClick={handleStart} className={`w-full py-3 rounded-xl text-white font-bold transition-transform active:scale-95 shadow-md bg-gradient-to-r ${rolData.kleur}`}>
                                        Start Observatie
                                    </button>
                                </div>
                            )}

                            {/* ── FASE 2: OBSERVATIE ── */}
                            {fase === 'observatie' && (
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 w-full">
                                            {isTeamFocus ? 'Team Focus' : `Speler: ${doelwit}`}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {items.map((item, i) => (
                                            <div key={i} className="animate-fade-in">
                                                <p className="text-sm font-medium text-slate-800 mb-2 leading-snug">{item}</p>
                                                
                                                {actieveMinIndex === i ? (
                                                    <div className="bg-red-50/80 border border-red-100 rounded-xl p-3 shadow-inner">
                                                        <p className="text-xs font-bold text-red-600 mb-2">Waarom?</p>
                                                        <div className="flex flex-col gap-1.5">
                                                            {analyseOpties.map((optie, oi) => (
                                                                <button key={oi} onClick={() => slaAnalyseOp(optie)} className="text-left text-xs bg-white border border-red-200 hover:border-red-400 text-red-700 px-3 py-2 rounded-lg transition-colors shadow-sm">
                                                                    {optie}
                                                                </button>
                                                            ))}
                                                            <button onClick={() => setActieveMinIndex(null)} className="text-[10px] uppercase font-bold text-slate-400 mt-2">Annuleren</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => turf(i, 'min')} className="flex-1 py-1.5 bg-white border border-red-200 hover:border-red-400 text-red-600 rounded-lg flex justify-center items-center gap-2 transition-all active:scale-95 shadow-sm">
                                                            <span className="text-xl font-black leading-none">-</span>
                                                            <span className="text-sm font-bold bg-red-50 px-2 rounded-md">{scores[i]?.min || 0}</span>
                                                        </button>
                                                        <button onClick={() => turf(i, 'plus')} className="flex-1 py-1.5 bg-white border border-emerald-200 hover:border-emerald-400 text-emerald-600 rounded-lg flex justify-center items-center gap-2 transition-all active:scale-95 shadow-sm">
                                                            <span className="text-xl font-black leading-none">+</span>
                                                            <span className="text-sm font-bold bg-emerald-50 px-2 rounded-md">{scores[i]?.plus || 0}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 mt-2">
                                        {isTeamFocus ? (
                                            <button onClick={afronden} className="w-full py-3.5 bg-orange-500 text-white font-black rounded-xl shadow-md text-lg tracking-wider active:scale-95 transition-transform">
                                                TIME-OUT
                                            </button>
                                        ) : (
                                            <button onClick={afronden} disabled={duur < 60} className={`w-full py-3 rounded-xl font-bold shadow-sm transition-all active:scale-95 ${duur < 60 ? 'bg-slate-100 text-slate-400 opacity-80' : `text-white shadow-md bg-gradient-to-r ${rolData.kleur}`}`}>
                                                {duur < 60 ? 'Observeer nog even...' : 'Maak Rapport Op'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── FASE 3: RAPPORT ── */}
                            {fase === 'rapport' && (() => {
                                // Bepaal het sterkste punt en het werkpunt op basis van de scores
                                let maxPlus = -1, maxMin = -1;
                                let besteItem = "", werkpuntItem = "";

                                Object.entries(scores).forEach(([idx, val]) => {
                                    if (val.plus > maxPlus) { maxPlus = val.plus; besteItem = items[idx]; }
                                    if (val.min > maxMin) { maxMin = val.min; werkpuntItem = items[idx]; }
                                });

                                // Gebruik de specifieke analyse (reden) uit Level 2 als die er is
                                const specifiekeFout = analyses.length > 0 ? analyses[0].reden : null;

                                return (
                                    <div className="space-y-4 animate-fade-in text-center py-2">
                                        <h4 className="font-black text-slate-800 text-xl">Rapport Klaar!</h4>
                                        <p className="text-sm text-slate-600">Stap het veld in en spreek {isTeamFocus ? 'het team' : <strong className={`font-bold ${rolData.tekst}`}>{doelwit}</strong>} aan.</p>

                                        {/* DYNAMISCHE FEEDBACK SUGGESTIES */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left shadow-inner text-sm text-blue-900 mt-2">
                                            <p className="text-[11px] font-black text-blue-800 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                                                <span>💬</span> Wat kan je zeggen?
                                            </p>
                                            <div className="space-y-3">
                                                {besteItem && maxPlus > 0 && (
                                                    <p>
                                                        <span className="font-bold text-emerald-600 block text-xs uppercase mb-0.5">Compliment</span> 
                                                        "Top gedaan met: <span className="lowercase">{besteItem}</span>!"
                                                    </p>
                                                )}
                                                {specifiekeFout ? (
                                                    <p>
                                                        <span className="font-bold text-red-500 block text-xs uppercase mb-0.5">Werkpuntje</span> 
                                                        "Let de volgende keer op: <span className="lowercase">{specifiekeFout}</span>."
                                                    </p>
                                                ) : werkpuntItem && maxMin > 0 ? (
                                                    <p>
                                                        <span className="font-bold text-red-500 block text-xs uppercase mb-0.5">Werkpuntje</span> 
                                                        "Probeer nog te verbeteren op: <span className="lowercase">{werkpuntItem}</span>."
                                                    </p>
                                                ) : (
                                                    <p>
                                                        <span className="font-bold text-purple-600 block text-xs uppercase mb-0.5">Algemeen</span> 
                                                        "Je bent goed bezig, blijf focussen op de kijkwijzer!"
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <button onClick={reset} className="w-full py-3.5 bg-blue-900 text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform mt-4">
                                            Feedback gegeven (Nieuwe start)
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
// ─── DIGITAAL WEDSTRIJDSECRETARIAAT: TEAM BUILDER ───
export function ToernooiBuilder({ sessie, profile, rolData, mode = 'manual', onStart }) {
    const [stap, setStap] = useState('selectie'); 
    const [klasLijst, setKlasLijst] = useState([]);
    const [geselecteerdeIds, setGeselecteerdeIds] = useState([]);
    const [loadingKlas, setLoadingKlas] = useState(mode === 'database');
    const [extraNamen, setExtraNamen] = useState("");
    const [aantalTeams, setAantalTeams] = useState(3);
    const [aantalSpelersFallback, setAantalSpelersFallback] = useState(20); // Enkel nog voor leerling-mode
    const [spelersPerTeam, setSpelersPerTeam] = useState(4); // Leerling-mode: bv. 2 voor padel
    const [teams, setTeams] = useState([]);
    const [toernooiType, setToernooiType] = useState('poule');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [isStarting, setIsStarting] = useState(false);

   // Haal de klaslijst op via de soepele SportLab route
    useEffect(() => {
        if (mode === 'database' && sessie && profile) {
            const fetchKlas = async () => {
                try {
                    const data = await apiPost('get_sportlab_toernooi_spelers', { 
                        klas: sessie.klas, 
                        groepId: sessie.groep_id, 
                        schoolId: profile.school_id 
                    }, profile._token);
                    
                    const leden = data.spelers || [];
                    const actieveLeden = leden.filter(l => !l.vrijgesteld);
                    
                    setKlasLijst(actieveLeden);
                    setGeselecteerdeIds(actieveLeden.map(l => l.id));
                } catch (e) {
                    console.error("Kon klas niet laden", e);
                } finally {
                    setLoadingKlas(false);
                }
            };
            fetchKlas();
        }
    }, [mode, sessie, profile]);

    const genereerTeams = () => {
        let pool = [];
        if (mode === 'database') {
            pool = klasLijst
                .filter(l => geselecteerdeIds.includes(l.id))
                .map(l => ({ id: l.id, naam: l.naam }));
            
            if (extraNamen.trim()) {
                extraNamen.split(',').forEach((n, i) => {
                    if (n.trim()) pool.push({ id: `extra_${i}`, naam: n.trim() });
                });
            }

            if (pool.length === 0) {
                toast.error("Voeg ten minste een paar spelers toe.");
                return;
            }
        } else {
            // Manual mode (Level 2/3 leerling): genereert wel anonieme spelers via slider
            pool = Array.from({ length: aantalSpelersFallback }, (_, i) => ({ id: `pm_${i}_${Math.random().toString(36).slice(2, 8)}`, naam: `Speler ${i+1}` }));
        }

        pool.sort(() => Math.random() - 0.5);

        // Manual-mode leidt het aantal teams af uit spelers/spelersPerTeam (bv. padel = 2).
        // Database-mode gebruikt de teams-slider (aantalTeams).
        const teamCount = mode === 'manual'
            ? Math.max(1, Math.ceil(pool.length / Math.max(1, spelersPerTeam)))
            : aantalTeams;

        const nieuweTeams = Array.from({ length: teamCount }, (_, i) => ({
            id: `t_${i}`, naam: `Team ${String.fromCharCode(65 + i)}`, spelers: []
        }));

        pool.forEach((s, i) => nieuweTeams[i % teamCount].spelers.push(s));
        setTeams(nieuweTeams);
        setStap('builder');
    };

    const handlePlayerTap = (tIdx, sIdx) => {
        if (!selectedPlayer) {
            setSelectedPlayer({ tIdx, sIdx });
            return;
        }
        // Opnieuw op dezelfde speler tikken = selectie annuleren
        if (selectedPlayer.tIdx === tIdx && selectedPlayer.sIdx === sIdx) {
            setSelectedPlayer(null);
            return;
        }
        // Immutable wissel: kopieer teams én de betrokken spelers-arrays
        const nt = teams.map(team => ({ ...team, spelers: [...team.spelers] }));
        const s1 = nt[selectedPlayer.tIdx].spelers[selectedPlayer.sIdx];
        const s2 = nt[tIdx].spelers[sIdx];
        nt[selectedPlayer.tIdx].spelers[selectedPlayer.sIdx] = s2;
        nt[tIdx].spelers[sIdx] = s1;
        setTeams(nt);
        setSelectedPlayer(null);
    };

    const containerClasses = mode === 'database' 
        ? "animate-fade-in text-slate-800" 
        : "bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-fade-in";

    return (
        <div className={containerClasses}>
            
            {mode === 'manual' && (
                <div className={`p-4 font-bold flex justify-between items-center bg-gradient-to-r ${rolData.kleur} text-white`}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🏆</span><span>Toernooi Manager</span>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded border border-white/30 font-bold uppercase tracking-wider bg-white/20">Privacy Mode</span>
                </div>
            )}

            {mode === 'database' && (
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🏆</span><h3 className="text-lg font-bold text-slate-800">Toernooi Indeling</h3>
                </div>
            )}

            {stap === 'selectie' && mode === 'database' && (
                <div className="space-y-5">
                    <div>
                        {sessie.klas || sessie.groep_id ? (
                            <>
                                <p className="text-sm font-medium text-slate-600 mb-3">Aanwezigen uit <strong>{sessie.klas || 'de groep'}</strong>:</p>
                                {loadingKlas ? (
                                    <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-500 animate-pulse border border-slate-100">Klaslijst ophalen...</div>
                                ) : klasLijst.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                                        {klasLijst.map(l => (
                                            <label key={l.id} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${geselecteerdeIds.includes(l.id) ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                                <input type="checkbox" checked={geselecteerdeIds.includes(l.id)} onChange={() => {
                                                    setGeselecteerdeIds(prev => prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id]);
                                                }} className="accent-emerald-600 w-4 h-4 rounded" />
                                                <span className="truncate">{l.naam}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm border border-amber-200">
                                        Geen leerlingen gevonden in deze klas. Vul hun namen hieronder handmatig in.
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                    
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                {sessie.klas ? 'Voeg extra spelers toe' : 'Vul hier de spelers in'}
                            </label>
                            <input type="text" placeholder="Bv. Kobe, Lars, Frits (scheiden met komma)" className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 focus:bg-white transition-colors" value={extraNamen} onChange={e => setExtraNamen(e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <span className="text-sm font-bold text-slate-700">Aantal Teams: <span className="text-xl ml-2 text-emerald-600">{aantalTeams}</span></span>
                        <input type="range" min="2" max="10" value={aantalTeams} onChange={e => setAantalTeams(parseInt(e.target.value))} className="w-1/2 accent-emerald-600" />
                    </div>

                    {/* VERNIEUWDE ZACHTE KNOP */}
                    <button onClick={genereerTeams} className="w-full py-3.5 mt-2 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold rounded-xl transition-colors shadow-sm">
                        Verdeel in teams
                    </button>
                </div>
            )}

            {stap === 'builder' && (
                <div className={`space-y-4 ${mode === 'manual' ? 'p-4 bg-slate-50' : ''}`}>
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-medium">
                        💡 Typ de namen in de vakjes. Om twee spelers te wisselen: tik op de ⇄ van de eerste, daarna op de ⇄ van de tweede.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {teams.map((t, tIdx) => (
                            <div key={t.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                <input className="w-full bg-slate-100 p-2 text-xs font-black uppercase text-center outline-none focus:bg-slate-200 transition-colors text-slate-700" value={t.naam} onChange={e => {
                                    const nt = [...teams]; nt[tIdx].naam = e.target.value; setTeams(nt);
                                }} />
                                <div className="p-2 space-y-1">
                                    {t.spelers.map((s, sIdx) => (
                                        mode === 'database' ? (
                                            <div key={s.id} onClick={() => handlePlayerTap(tIdx, sIdx)} className={`p-2 rounded bg-white text-xs border cursor-pointer transition-colors ${selectedPlayer?.tIdx === tIdx && selectedPlayer?.sIdx === sIdx ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200 font-bold shadow-inner' : 'border-slate-100 hover:border-emerald-300 hover:bg-emerald-50'}`}>
                                                {s.naam}
                                            </div>
                                        ) : (
                                            <div key={s.id} className={`flex items-center gap-1 p-1 rounded bg-white text-xs border transition-colors ${selectedPlayer?.tIdx === tIdx && selectedPlayer?.sIdx === sIdx ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200 shadow-inner' : 'border-slate-100'}`}>
                                                <input
                                                    className="flex-1 min-w-0 outline-none bg-transparent px-1"
                                                    value={s.naam}
                                                    placeholder={`Speler ${sIdx + 1}`}
                                                    onClick={e => e.stopPropagation()}
                                                    onFocus={e => e.stopPropagation()}
                                                    onChange={e => {
                                                        const nt = teams.map(team => ({ ...team, spelers: [...team.spelers] }));
                                                        nt[tIdx].spelers[sIdx] = { ...nt[tIdx].spelers[sIdx], naam: e.target.value };
                                                        setTeams(nt);
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handlePlayerTap(tIdx, sIdx)}
                                                    title={selectedPlayer ? 'Tik om met de gekozen speler te wisselen' : 'Kies deze speler om te wisselen'}
                                                    className={`shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors ${selectedPlayer?.tIdx === tIdx && selectedPlayer?.sIdx === sIdx ? 'bg-amber-400 text-white ring-2 ring-amber-200' : selectedPlayer ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'}`}>
                                                    ⇄
                                                </button>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Kies Toernooivorm</label>
                        <select className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none bg-white" value={toernooiType} onChange={e => setToernooiType(e.target.value)}>
                            <option value="poule">Poule (Iedereen speelt tegen elkaar)</option>
                            <option value="knockout">Knock-out (Met verliezersronde)</option>
                            <option value="king">Koning van het Veld (Doorschuiven)</option>
                        </select>
                        
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setStap('selectie')} className="px-4 py-3 text-sm font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors shadow-sm">Terug</button>
                            {/* VERNIEUWDE START KNOP (Met beveiliging) */}
                            <button 
                                onClick={async () => {
                                    setIsStarting(true);
                                    await onStart({ teams, type: toernooiType });
                                    // We hoeven setIsStarting(false) niet per se te doen, want het component verdwijnt hierna.
                                    // Maar voor de veiligheid bij een error doen we het toch:
                                    setIsStarting(false); 
                                }} 
                                disabled={isStarting}
                                className={`flex-1 py-3 text-white font-black rounded-xl shadow-md transition-transform active:scale-95 ${isStarting ? 'opacity-50 cursor-wait' : ''} ${mode === 'database' ? 'bg-emerald-500 hover:bg-emerald-600' : `bg-gradient-to-r ${rolData.kleur}`}`}
                            >
                                {isStarting ? 'Schema Berekenen...' : 'Start Toernooi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {stap === 'selectie' && mode === 'manual' && (
                <div className="p-6 space-y-6 text-center">
                    <p className="text-sm text-slate-600">Stel je toernooi handmatig in. Je moet straks zelf de voornamen van de spelers intypen.</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Aantal Spelers Totaal</label>
                            <input type="number" min="2" placeholder="Bv. 20" value={aantalSpelersFallback} className="w-full p-3 border border-slate-200 rounded-xl text-center text-lg font-bold outline-none focus:border-emerald-400" onChange={e => {
                                setAantalSpelersFallback(parseInt(e.target.value) || 0);
                            }} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Spelers per Team</label>
                            <input type="number" min="1" placeholder="Bv. 2 (padel)" value={spelersPerTeam} className="w-full p-3 border border-slate-200 rounded-xl text-center text-lg font-bold outline-none focus:border-emerald-400" onChange={e => {
                                setSpelersPerTeam(parseInt(e.target.value) || 1);
                            }} />
                        </div>
                        <p className="text-xs text-slate-500">
                            Dat geeft <strong className="text-emerald-600">{Math.max(1, Math.ceil((aantalSpelersFallback || 0) / Math.max(1, spelersPerTeam)))}</strong> team(s).
                        </p>
                    </div>
                    <button onClick={genereerTeams} className={`w-full py-4 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 bg-gradient-to-r ${rolData.kleur}`}>Start Bouwen</button>
                </div>
            )}
        </div>
    );
}

// ─── KONING VAN HET VELD: CENTRALE WEDSTRIJDKLOK ─────────────────────────────
// Eén lokale aftelklok voor alle velden tegelijk. De persoon die het dashboard
// bedient (leerling bij een leerling-toernooi, leerkracht bij een leerkracht-
// toernooi) stelt de duur één keer in en drukt elke ronde op Start.
// Geluid + rood knipperen als signaal op nul. Duur onthouden per toernooi.
function KingTimer({ toernooiId, kleur }) {
    const opslagKey = `sportlab_king_timer_min_${toernooiId}`;
    const [minuten, setMinuten] = useState(() => {
        const v = parseInt(localStorage.getItem(opslagKey), 10);
        return Number.isFinite(v) && v > 0 ? v : 5;
    });
    const [resterend, setResterend] = useState(minuten * 60); // seconden
    const [loopt, setLoopt] = useState(false);
    const [afgelopen, setAfgelopen] = useState(false);

    // Duur bewaren
    useEffect(() => {
        localStorage.setItem(opslagKey, String(minuten));
    }, [minuten, opslagKey]);

    // Aftellen
    useEffect(() => {
        if (!loopt) return;
        const id = setInterval(() => {
            setResterend(prev => {
                if (prev <= 1) {
                    clearInterval(id);
                    setLoopt(false);
                    setAfgelopen(true);
                    speelSignaal();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [loopt]);

    const speelSignaal = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
            setTimeout(() => ctx.close(), 800);
        } catch { /* geluid niet beschikbaar — visueel signaal volstaat */ }
    };

    const start = () => {
        setAfgelopen(false);
        setResterend(minuten * 60);
        setLoopt(true);
    };
    const pauze = () => setLoopt(false);
    const reset = () => {
        setLoopt(false);
        setAfgelopen(false);
        setResterend(minuten * 60);
    };
    const wijzigMinuten = (m) => {
        const veilig = Math.max(1, m);
        setMinuten(veilig);
        if (!loopt) { setResterend(veilig * 60); setAfgelopen(false); }
    };

    const mm = Math.floor(resterend / 60);
    const ss = (resterend % 60).toString().padStart(2, '0');

    return (
        <div className={`rounded-2xl overflow-hidden shadow-sm border-2 ${afgelopen ? 'border-red-400 animate-pulse bg-red-50' : 'border-slate-200 bg-white'}`}>
            <div className={`p-3 font-bold flex items-center gap-2 text-white bg-gradient-to-r ${kleur}`}>
                <ClockIcon className="w-4 h-4" />
                <span className="text-sm">Wedstrijdklok — alle velden</span>
            </div>
            <div className="p-4 space-y-4">
                <div className={`text-center font-black tabular-nums tracking-widest ${afgelopen ? 'text-red-600' : 'text-slate-800'}`} style={{ fontSize: '3rem', lineHeight: 1 }}>
                    {mm}:{ss}
                </div>

                {afgelopen && (
                    <p className="text-center text-sm font-bold text-red-600">⏱ Tijd! Scores invoeren en doorschuiven.</p>
                )}

                {/* Duur instellen */}
                <div className="flex items-center justify-center gap-2">
                    {[3, 5, 7, 10].map(m => (
                        <button key={m} onClick={() => wijzigMinuten(m)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${minuten === m ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                            {m}m
                        </button>
                    ))}
                    <div className="flex items-center gap-1 pl-1">
                        <input type="number" min="1" value={minuten}
                            onChange={e => wijzigMinuten(parseInt(e.target.value) || 1)}
                            className="w-14 p-1.5 border border-slate-200 rounded-lg text-center text-sm font-bold outline-none focus:border-emerald-400" />
                        <span className="text-xs text-slate-400 font-bold">min</span>
                    </div>
                </div>

                {/* Bediening */}
                <div className="flex gap-2">
                    {!loopt ? (
                        <button onClick={start}
                            className={`flex-1 py-3 text-white font-black rounded-xl shadow-md active:scale-95 transition-transform bg-gradient-to-r ${kleur}`}>
                            ▶ Start ronde
                        </button>
                    ) : (
                        <button onClick={pauze}
                            className="flex-1 py-3 text-slate-700 font-black rounded-xl shadow-sm active:scale-95 transition-transform bg-slate-100 hover:bg-slate-200">
                            ⏸ Pauze
                        </button>
                    )}
                    <button onClick={reset}
                        className="px-4 py-3 text-slate-500 font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 transition-transform shadow-sm">
                        ↻
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── DIGITAAL WEDSTRIJDSECRETARIAAT: HET DASHBOARD (Fase 3 & 4) ───────────────
export function ToernooiDashboard({ toernooi, rolData, isLeerkracht, profile, onRefresh }) {
    if (!toernooi || !toernooi.wedstrijden) return null;

    const [loadingMatch, setLoadingMatch] = useState(null);
    const [inputScores, setInputScores] = useState({});
    
    const [toonStopBevestiging, setToonStopBevestiging] = useState(false);
    const [isStopping, setIsStopping] = useState(false);

    // 1. Klassement Berekenen
    const klassement = toernooi.teams
        .map(t => ({ id: t.id, naam: t.naam, p: 0, w: 0, g: 0, v: 0, dv: 0, dt: 0 }))
        .filter(t => t.id !== 'bye');
    
    toernooi.wedstrijden.forEach(m => {
        if (!m.gespeeld) return;
        const t1 = klassement.find(t => t.id === m.team1.id);
        const t2 = klassement.find(t => t.id === m.team2.id);
        if (!t1 || !t2) return;

        const s1 = m.score1 || 0;
        const s2 = m.score2 || 0;
        t1.dv += s1; t1.dt += s2;
        t2.dv += s2; t2.dt += s1;

        if (m.winst_voor === 'team1') { t1.p += 3; t1.w += 1; t2.v += 1; }
        else if (m.winst_voor === 'team2') { t2.p += 3; t2.w += 1; t1.v += 1; }
        else if (m.winst_voor === 'gelijk') { t1.p += 1; t2.p += 1; t1.g += 1; t2.g += 1; }
    });

    klassement.sort((a, b) => b.p - a.p || (b.dv - b.dt) - (a.dv - a.dt) || b.dv - a.dv); 

    // ── KONING VAN HET VELD: kroonteller + huidige veldindeling ──────────────
    // Geen puntentabel: de veldpositie ís de stand. We tellen enkel hoe vaak
    // een team op veld 1 (Koningsveld) won = "kronen".
    const isKing = toernooi.type === 'king';
    let kroonMap = {};
    let veldLadder = [];
    if (isKing) {
        // Kronen: elke gespeelde wedstrijd op veld 1 met een winnaar telt één kroon.
        toernooi.wedstrijden.forEach(m => {
            if (m.veld !== 1 || !m.gespeeld || !m.winst_voor) return;
            const winnaar = m.winst_voor === 'team1' ? m.team1 : m.team2;
            if (winnaar?.id && winnaar.id !== 'bye') {
                kroonMap[winnaar.id] = (kroonMap[winnaar.id] || 0) + 1;
            }
        });
        // Huidige veldindeling = de actieve (hoogste) ronde, per veld oplopend.
        const maxR = Math.max(...toernooi.wedstrijden.map(m => m.ronde));
        veldLadder = toernooi.wedstrijden
            .filter(m => m.ronde === maxR)
            .sort((a, b) => a.veld - b.veld);
    }

    const handleScoreOpslaan = async (matchId) => {
        const s1 = inputScores[`${matchId}_1`];
        const s2 = inputScores[`${matchId}_2`];

        // undefined = nog niet aangeraakt = 0 (score 0 is geldig)
        const score1 = s1 !== undefined && s1 !== '' ? parseInt(s1) : 0;
        const score2 = s2 !== undefined && s2 !== '' ? parseInt(s2) : 0;
        if (isNaN(score1) || isNaN(score2)) {
            toast.error('Ongeldige score ingegeven.');
            return;
        }

        setLoadingMatch(matchId);
        try {
            await apiPost('update_match_score', {
                schoolId: profile.school_id,
                toernooiId: toernooi.id,
                matchId,
                score1: score1,
                score2: score2,
            }, profile._token);
            if(onRefresh) onRefresh();
        } catch(e) {
            toast.error(e.message);
        } finally {
            setLoadingMatch(null);
        }
    };

    // KONING VAN HET VELD: geen scores, enkel winnaar aanduiden.
    // We sturen 1-0/0-1 zodat de backend winst_voor correct afleidt (geen backend-wijziging nodig).
    const handleWinnaarKiezen = async (matchId, winnaar) => {
        setLoadingMatch(matchId);
        try {
            await apiPost('update_match_score', {
                schoolId: profile.school_id,
                toernooiId: toernooi.id,
                matchId,
                score1: winnaar === 'team1' ? 1 : 0,
                score2: winnaar === 'team2' ? 1 : 0,
            }, profile._token);
            if (onRefresh) onRefresh();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoadingMatch(null);
        }
    };

    const handleResetMatch = async (matchId) => {
        setLoadingMatch(matchId);
        try {
            await apiPost('update_match_score', {
                schoolId: profile.school_id,
                toernooiId: toernooi.id,
                matchId, score1: null, score2: null
            }, profile._token);
            
            const newInputs = {...inputScores};
            delete newInputs[`${matchId}_1`];
            delete newInputs[`${matchId}_2`];
            setInputScores(newInputs);
            
            if(onRefresh) onRefresh();
        } catch(e) {
            toast.error(e.message);
        } finally {
            setLoadingMatch(null);
        }
    };

    const bevestigStop = async () => {
        setIsStopping(true);
        try {
            await apiPost('stop_toernooi', { schoolId: profile.school_id, toernooiId: toernooi.id }, profile._token);
            toast.success('Toernooi gereset!');
            setToonStopBevestiging(false);
            setInputScores({}); // Reset alle ingevoerde scores
            if(onRefresh) onRefresh();
        } catch(e) {
            toast.error(e.message);
        } finally {
            setIsStopping(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            
            {/* CENTRALE WEDSTRIJDKLOK — enkel bij Koning van het Veld */}
            {toernooi.type === 'king' && (
                <KingTimer toernooiId={toernooi.id} kleur={rolData?.kleur || 'from-emerald-500 to-emerald-600'} />
            )}

            {/* KONING VAN HET VELD: VELDLADDER + KROONTELLER (geen puntentabel) */}
            {isKing ? (
                <div className="space-y-4">
                    {/* Veldladder */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className={`p-3 font-bold flex justify-between items-center text-white ${isLeerkracht ? 'bg-slate-800' : `bg-gradient-to-r ${rolData?.kleur}`}`}>
                            <span className="flex items-center gap-2"><span>👑</span> Veldindeling</span>
                            <span className="text-xs bg-white/20 px-2 py-1 rounded border border-white/30">Koning v/h Veld</span>
                        </div>
                        <div className="p-3 space-y-2">
                            {veldLadder.map(m => {
                                const koningsveld = m.veld === 1;
                                const winT1 = m.gespeeld && m.winst_voor === 'team1';
                                const winT2 = m.gespeeld && m.winst_voor === 'team2';
                                return (
                                    <div key={m.id} className={`rounded-xl border p-3 ${koningsveld ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm">{koningsveld ? '👑' : '🏟️'}</span>
                                            <span className={`text-[11px] font-black uppercase tracking-wider ${koningsveld ? 'text-amber-700' : 'text-slate-500'}`}>
                                                {koningsveld ? 'Koningsveld' : `Veld ${m.veld}`}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`flex-1 text-sm font-bold truncate ${winT1 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                {winT1 && '✓ '}{m.team1?.naam}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-300 px-2">VS</span>
                                            <span className={`flex-1 text-right text-sm font-bold truncate ${winT2 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                {m.team2?.naam}{winT2 && ' ✓'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-slate-400 text-center pb-2 px-2">
                            Winnaar schuift omhoog · verliezer zakt · veld 1 = de koning
                        </p>
                    </div>

                    {/* Kroonteller */}
                    {Object.keys(kroonMap).length > 0 && (
                        <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-3 font-bold flex items-center gap-2 text-white bg-slate-800">
                                <span>🏅</span> Kronen <span className="text-xs font-normal text-white/60">(keer koning geweest)</span>
                            </div>
                            <div className="p-3 space-y-1">
                                {klassement
                                    .map(t => ({ ...t, kronen: kroonMap[t.id] || 0 }))
                                    .sort((a, b) => b.kronen - a.kronen)
                                    .filter(t => t.kronen > 0)
                                    .map((t, idx) => (
                                        <div key={t.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${idx === 0 ? 'bg-amber-50' : ''}`}>
                                            <span className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                                {idx === 0 && <span>🥇</span>}{t.naam}
                                            </span>
                                            <span className="font-black text-slate-800 flex items-center gap-1">
                                                {t.kronen} <span>👑</span>
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
            /* HET LIVE KLASSEMENT (poule / knock-out) */
            <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className={`p-3 font-bold flex justify-between items-center text-white ${isLeerkracht ? 'bg-slate-800' : `bg-gradient-to-r ${rolData?.kleur}`}`}>
                    <span className="flex items-center gap-2"><span>🏆</span> Live Klassement</span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded border border-white/30">
                        {toernooi.type === 'knockout' ? 'Knock-out' : 'Poule'}
                    </span>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-2 font-bold">Team</th>
                                <th className="px-2 py-2 text-center font-bold">W</th>
                                <th className="px-2 py-2 text-center font-bold">G</th>
                                <th className="px-2 py-2 text-center font-bold">V</th>
                                <th className="px-2 py-2 text-center font-bold text-blue-500">DS</th>
                                <th className="px-4 py-2 text-right font-black text-slate-800 text-xs">PTN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {klassement.map((team, idx) => {
                                const ds = team.dv - team.dt;
                                return (
                                    <tr key={team.id} className={idx === 0 && team.p > 0 ? "bg-amber-50/50" : ""}>
                                        <td className="px-4 py-3 font-bold text-slate-700 flex items-center gap-2">
                                            {idx === 0 && team.p > 0 && <span>🥇</span>}
                                            {team.naam}
                                        </td>
                                        <td className="px-2 py-3 text-center text-emerald-600 font-medium">{team.w}</td>
                                        <td className="px-2 py-3 text-center text-slate-400 font-medium">{team.g}</td>
                                        <td className="px-2 py-3 text-center text-red-400 font-medium">{team.v}</td>
                                        <td className={`px-2 py-3 text-center font-bold ${ds > 0 ? 'text-blue-600' : ds < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {ds > 0 ? `+${ds}` : ds}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-lg text-slate-800">{team.p}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="text-[10px] text-slate-400 text-right mt-1 px-1">
                    W = Gewonnen · G = Gelijk · V = Verloren · DS = Doelsaldo · PTN = Punten
                </p>
            </div>
            )}

            {/* WEDSTRIJDSCHEMA */}
            <div>
                {(() => {
                    // Poule: alle rondes bestaan al → laagste ONgespeelde ronde is de actieve ronde
                    // King/knockout: rondes worden één voor één gegenereerd → hoogste ronde is actief
                    const maxRonde = Math.max(...toernooi.wedstrijden.map(m => m.ronde));
                    const ongespeeldeRondes = toernooi.wedstrijden
                        .filter(m => !m.gespeeld)
                        .map(m => m.ronde);
                    const huidigeRonde = toernooi.type === 'poule' && ongespeeldeRondes.length > 0
                        ? Math.min(...ongespeeldeRondes)
                        : maxRonde;
                    const matchenHuidigeRonde = toernooi.wedstrijden.filter(m => m.ronde === huidigeRonde);
                    const allesGespeeld = matchenHuidigeRonde.every(m => m.gespeeld);

                    const triggerVolgendeRonde = async () => {
                        setLoadingMatch('next_round');
                        try {
                            await apiPost('volgende_ronde', { schoolId: profile.school_id, toernooiId: toernooi.id }, profile._token);
                            if(onRefresh) onRefresh();
                        } catch(e) { toast.error(e.message); } 
                        finally { setLoadingMatch(null); }
                    };

                    return (
                        <div className="space-y-6">
                            
                            {/* Volgende Ronde knop of Eindstand */}
                            {allesGespeeld && (() => {
                                const isLaatsteRonde = huidigeRonde >= maxRonde;
                                
                                // Poule afgerond: toon eindstand met winnaar
                                if (toernooi.type === 'poule' && isLaatsteRonde) {
                                    // klassement is lokaal berekend uit toernooi.wedstrijden (regel ~620)
                                    const gesorteerd = [...klassement]; // al gesorteerd op punten/doelsaldo
                                    const winnaar = gesorteerd[0];
                                    return (
                                        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 text-center shadow-sm">
                                            <div className="text-4xl mb-2">🏆</div>
                                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Poule afgerond</p>
                                            <p className="text-xl font-black text-amber-900 mb-1">{winnaar?.naam || 'Onbekend'}</p>
                                            <p className="text-sm text-amber-700">{winnaar?.p || 0} punten · {winnaar?.w || 0} gewonnen · {winnaar?.g || 0} gelijk</p>
                                        </div>
                                    );
                                }

                                // King/knockout of poule tussenstop: toon volgende ronde knop
                                const config = {
                                    poule:    { bg: 'bg-emerald-50', border: 'border-emerald-200', tekst: 'text-emerald-900', btn: 'bg-emerald-600 hover:bg-emerald-700' },
                                    king:     { bg: 'bg-blue-50',    border: 'border-blue-200',    tekst: 'text-blue-900',    btn: 'bg-blue-600 hover:bg-blue-700' },
                                    knockout: { bg: 'bg-purple-50',  border: 'border-purple-200',  tekst: 'text-purple-900',  btn: 'bg-purple-600 hover:bg-purple-700' },
                                }[toernooi.type] || { bg: 'bg-emerald-50', border: 'border-emerald-200', tekst: 'text-emerald-900', btn: 'bg-emerald-600 hover:bg-emerald-700' };

                                const emoji = toernooi.type === 'king' ? '👑' : toernooi.type === 'knockout' ? '🥊' : '▶';

                                return (
                                    <div className={`border ${config.border} ${config.bg} rounded-xl p-4 text-center shadow-sm mb-2`}>
                                        <button
                                            onClick={triggerVolgendeRonde}
                                            disabled={loadingMatch === 'next_round'}
                                            className={`w-full py-3.5 font-black text-sm rounded-xl transition-all shadow-md active:scale-95 text-white ${config.btn} disabled:opacity-60`}
                                        >
                                            {loadingMatch === 'next_round'
                                                ? 'Aan het berekenen...'
                                                : `${emoji} Volgende Ronde`}
                                        </button>
                                    </div>
                                );
                            })()}

                            {(() => {
                                // Volgorde: huidig eerst, dan vorige aflopend, dan toekomstige oplopend
                                const gespeeldeRondes = [...Array(huidigeRonde - 1)].map((_, i) => huidigeRonde - 1 - i);
                                const toekomstigeRondes = [...Array(maxRonde - huidigeRonde)].map((_, i) => huidigeRonde + 1 + i);
                                const rondeVolgorde = [huidigeRonde, ...gespeeldeRondes, ...toekomstigeRondes];
                                return rondeVolgorde;
                            })().map((rondeNummer) => {
                                const matchen = toernooi.wedstrijden.filter(m => m.ronde === rondeNummer);
                                
                                return (
                                    <div key={`ronde_${rondeNummer}`}>
                                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Ronde {rondeNummer}</h4>
                                        <div className="space-y-3">
                                            {matchen.map((match) => (
                                                <div key={match.id} className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-colors ${match.gespeeld ? 'border-slate-200 bg-slate-50' : 'border-slate-300'}`}>
                                                    <div className={`p-4 flex items-center justify-between border-b border-slate-100 ${match.gespeeld ? 'opacity-70' : ''}`}>
                                                        <div className={`flex-1 text-right pr-3 font-bold text-sm ${match.winst_voor === 'team1' ? 'text-emerald-600 text-base' : 'text-slate-700'}`}>
                                                            {match.team1.naam}
                                                        </div>
                                                        
                                                        <div className="px-3">
                                                            {match.gespeeld ? (
                                                                isKing ? (
                                                                    <div className="bg-amber-100 text-amber-700 font-black text-base px-3 py-1 rounded-lg shadow-inner">
                                                                        👑
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-slate-800 text-white font-black text-lg px-3 py-1 rounded-lg shadow-inner tabular-nums tracking-widest">
                                                                        {match.score1} - {match.score2}
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <div className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-400 shadow-sm uppercase">
                                                                    {toernooi.type === 'king' ? `Veld ${match.veld}` : `VS`}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className={`flex-1 text-left pl-3 font-bold text-sm ${match.winst_voor === 'team2' ? 'text-emerald-600 text-base' : 'text-slate-700'}`}>
                                                            {match.team2.naam}
                                                        </div>
                                                    </div>

                                                    {/* FIX: Verberg invulvakjes en Oeps-knop als iemand tegen 'Rust' (bye) speelt! */}
                                                    {!isLeerkracht && match.ronde === huidigeRonde && match.team1.id !== 'bye' && match.team2.id !== 'bye' && (
                                                        <div className="p-3 flex justify-center bg-slate-50/50">
                                                            {loadingMatch === match.id ? (
                                                                <div className="py-2 text-xs text-slate-400 animate-pulse font-bold">Opslaan...</div>
                                                            ) : match.gespeeld ? (
                                                                <button onClick={() => handleResetMatch(match.id)} className="py-1 px-4 text-xs font-bold text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg transition-colors shadow-sm">
                                                                    ↻ Oeps, pas uitslag aan
                                                                </button>
                                                            ) : isKing ? (
                                                                <div className="w-full grid grid-cols-2 gap-2">
                                                                    <button onClick={() => handleWinnaarKiezen(match.id, 'team1')} className="py-3 text-sm font-bold text-emerald-700 bg-emerald-50 border-2 border-emerald-300 hover:bg-emerald-100 rounded-xl transition-transform active:scale-95 shadow-sm truncate">
                                                                        🏆 {match.team1.naam}
                                                                    </button>
                                                                    <button onClick={() => handleWinnaarKiezen(match.id, 'team2')} className="py-3 text-sm font-bold text-emerald-700 bg-emerald-50 border-2 border-emerald-300 hover:bg-emerald-100 rounded-xl transition-transform active:scale-95 shadow-sm truncate">
                                                                        🏆 {match.team2.naam}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="w-full space-y-3">
                                                                    {/* Team 1 score */}
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-xs font-bold text-slate-600 w-16 truncate">{match.team1.naam}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <button onClick={() => setInputScores(s => ({...s, [`${match.id}_1`]: Math.max(0, (parseInt(s[`${match.id}_1`]) || 0) - 1)}))} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 font-black text-lg flex items-center justify-center active:scale-90 transition-transform">−</button>
                                                                            <span className="w-10 text-center font-black text-xl tabular-nums">{inputScores[`${match.id}_1`] ?? 0}</span>
                                                                            <button onClick={() => setInputScores(s => ({...s, [`${match.id}_1`]: (parseInt(s[`${match.id}_1`]) || 0) + 1}))} className="w-9 h-9 rounded-full bg-emerald-100 hover:bg-emerald-200 font-black text-lg flex items-center justify-center active:scale-90 transition-transform">+</button>
                                                                        </div>
                                                                    </div>
                                                                    {/* Team 2 score */}
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-xs font-bold text-slate-600 w-16 truncate">{match.team2.naam}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <button onClick={() => setInputScores(s => ({...s, [`${match.id}_2`]: Math.max(0, (parseInt(s[`${match.id}_2`]) || 0) - 1)}))} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 font-black text-lg flex items-center justify-center active:scale-90 transition-transform">−</button>
                                                                            <span className="w-10 text-center font-black text-xl tabular-nums">{inputScores[`${match.id}_2`] ?? 0}</span>
                                                                            <button onClick={() => setInputScores(s => ({...s, [`${match.id}_2`]: (parseInt(s[`${match.id}_2`]) || 0) + 1}))} className="w-9 h-9 rounded-full bg-emerald-100 hover:bg-emerald-200 font-black text-lg flex items-center justify-center active:scale-90 transition-transform">+</button>
                                                                        </div>
                                                                    </div>
                                                                    <button onClick={() => handleScoreOpslaan(match.id)} className="w-full py-2.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-transform active:scale-95 shadow-sm">
                                                                        Opslaan
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>
            
            {isLeerkracht && (
                <button onClick={() => setToonStopBevestiging(true)} className="w-full py-3 mt-4 text-xs font-bold text-red-500 bg-white border-2 border-red-100 hover:bg-red-50 hover:border-red-200 rounded-xl transition-colors shadow-sm">
                    Foutje? Wis Toernooi en start opnieuw
                </button>
            )}

            {/* ── ECHTE POP-UP MODAL VOOR TOERNOOI WISSEN ── */}
            {toonStopBevestiging && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-auto transform scale-100">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto border-4 border-white shadow-sm">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Toernooi wissen?</h3>
                        <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                            Weet je zeker dat je dit schema wilt wissen? Alle ingevulde wedstrijden van dit toernooi gaan definitief verloren.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setToonStopBevestiging(false)} 
                                disabled={isStopping}
                                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Annuleren
                            </button>
                            <button 
                                onClick={bevestigStop} 
                                disabled={isStopping} 
                                className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-sm transition-colors flex justify-center items-center"
                            >
                                {isStopping ? (
                                    <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                                ) : 'Ja, wissen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}