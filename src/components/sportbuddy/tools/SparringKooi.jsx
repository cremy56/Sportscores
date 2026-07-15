import React, { useState, useRef, useEffect } from "react";

/*
  SPARRING KOOI — fase A prototype v2 (SportScores · Sportbuddy) — werktitel
  Gecontroleerde 1v1-sparring, nachtkooi. Geen bloed, zichtbare bescherming, GEEN KO.
  Winnen = de conditiebalk (health) van de tegenstander leeg tikken over 2 rondes;
  bij lege conditie STAAKT de scheidsrechter de partij (geen knock-out-beeld).

  NIEUW v2:
  - Aparte acties: SLAG · SCHOP · AFWEER (+ ontwijk-dash).
  - Hoogte HOOG/MID/LAAG via omhoog/omlaag (of stick-y). Afweer volgt je hoogte.
  - Telegraph: de aanval licht zijn doelzone op tijdens de windup -> afweren is
    lezen, geen gok. Fout blokken = SCHAMP (halve schade, geen punt), niet vol.
  - Meters legen trager en geleidelijker.
  - Kracht daalt bij vermoeidheid/lage conditie -> zwakkere slagen, minder schade.
  - Conditie-meter zakt geleidelijk bij incasseren, herstelt traag + bij eten.
  - 2 rondes van 2 min met 10 s eet/drink-pauze (voeding -> herstel).

  ART-HOOK: vul ACHTERGROND met /public-pad van anime_sportkooi2.png.
*/
const ACHTERGROND = "";

/* ===== SPRITE-LAAG (route naar echte gamekwaliteit) =====
   Zet SPRITE_BASE op bv. "/sparring/" en drop per team sprite-sheets in
   /public/sparring/blauw/ en /public/sparring/rood/ (zie ASSET_PIPELINE_SPARRING.md).
   Elke sheet = horizontale strip: frames naast elkaar, voeten onderaan, avatar gecentreerd.
   Ontbreekt een sheet, dan valt die animatie automatisch terug op de vector-tekening. */
const SPRITE_BASE = "/sparring/"; // sprite-sheets in /public/sparring/blauw|rood/
const SPRITE_DEFS = {
  idle:        { file: "idle.png",        frames: 11, fps: 12, loop: true },
  walk:        { file: "walk.png",        frames: 11, fps: 14, loop: true },
  slag:        { file: "jab.png",         frames: 9,  fps: 18, loop: false },
  slag_hoog:   { file: "jab_hoog.png",    frames: 8,  fps: 20, loop: false },
  slag_mid:    { file: "jab_mid.png",     frames: 8,  fps: 20, loop: false },
  slag_laag:   { file: "jab_laag.png",    frames: 8,  fps: 20, loop: false },
  schop:       { file: "kick_mid.png",    frames: 12, fps: 18, loop: false },
  schop_hoog:  { file: "kick_hoog.png",   frames: 10, fps: 20, loop: false },
  schop_mid:   { file: "kick_mid.png",    frames: 12, fps: 18, loop: false },
  schop_laag:  { file: "kick_laag.png",   frames: 10, fps: 20, loop: false },
  uppercut:    { file: "uppercut.png",    frames: 12, fps: 20, loop: false },
  hoofdstoot:  { file: "hoofdstoot.png",  frames: 15, fps: 22, loop: false },
  blok:        { file: "blok.png",        frames: 4,  fps: 12, loop: false },
  blok_hoog:   { file: "blok_hoog.png",   frames: 4,  fps: 12, loop: false },
  blok_mid:    { file: "blok_mid.png",    frames: 4,  fps: 12, loop: false },
  blok_laag:   { file: "blok_laag.png",   frames: 4,  fps: 12, loop: false },
  stagger:     { file: "stagger.png",     frames: 6,  fps: 12, loop: false },
  dash:        { file: "dash.png",        frames: 6,  fps: 18, loop: false },
  sprong:      { file: "sprong.png",      frames: 13, fps: 14, loop: false },
};
const SPRITE_HOOGTE = 118;                       // doelhoogte van de avatar in wereld-pixels
const _spriteCache = {};                         // "team/naam" -> Image | "laden" | "mist"
function spriteVan(team, naam) {
  if (!SPRITE_BASE || !SPRITE_DEFS[naam]) return null;
  const key = team + "/" + naam;
  const c = _spriteCache[key];
  if (c instanceof Image) return c;
  if (c === undefined) {
    _spriteCache[key] = "laden";
    const im = new Image();
    im.onload = () => { _spriteCache[key] = im; };
    im.onerror = () => { _spriteCache[key] = "mist"; };
    im.src = SPRITE_BASE + team + "/" + SPRITE_DEFS[naam].file;
  }
  return null;
}
/* welke animatie hoort bij de huidige toestand */
function animNaam(f) {
  const hNaam = (h) => (h === HOOG ? "hoog" : h === LAAG ? "laag" : "mid");
  if (f.state === "attacking") {
    if (f.atkKind === "schop") return "schop_" + hNaam(f.atkH);
    if (f.atkKind === "slag") return "slag_" + hNaam(f.atkH);
    return f.atkKind;                             // uppercut / hoofdstoot (vaste hoogte)
  }
  if (f.state === "blocking") return "blok_" + hNaam(f.guardH);
  if (f.state === "stagger") return "stagger";
  if (f.state === "dashing") return "dash";
  if (!f.onGround) return "sprong";
  return Math.abs(f.vx) > 24 ? "walk" : "idle";
}

/* ---------- kooi ---------- */
const W = 1000, H = 520, GROUND = H - 58, WALL_L = 66, WALL_R = W - 66, BODY = 30;
const ROUND_TIME = 120, RONDES = 2, RUST = 10;

/* hoogtes */
const HOOG = 1, MID = 0, LAAG = -1;
const zoneY = { 1: GROUND - 104, 0: GROUND - 70, "-1": GROUND - 40 };

/* ---------- combat-tuning (basis; ×tuning) — bewust mild, gradueel & leesbaar ---------- */
const SLAG = { glyc: 11, windup: 0.34, active: 0.10, recover: 0.28, reik: 30, schade: 9, kind: "slag" };
const SCHOP = { glyc: 18, windup: 0.46, active: 0.11, recover: 0.36, reik: 52, schade: 14, kind: "schop" };
const DASH_PCR = 13, DASH_DUR = 0.22, DASH_IFRAME = 0.16, DASH_CD = 0.5, DASH_DIST = 165;
const BLOCK_BALANS = 18, SCHAMP_BALANS = 8;
const STAGGER_HIT = 0.42, STAGGER_GUARD = 0.8, STAGGER_SCHAMP = 0.2;
const HIT_ATP = 8, LACTAAT_SLAG = 4, LACTAAT_SCHOP = 7, LACTAAT_DECAY = 4;
const KNOCKBACK = 60;                         // ruimte na een treffer (tegen hoek-vastzitten)
/* sprong (z-as): boog met horizontale snelheid -> je vliegt echt over de tegenstander */
const JUMP_PCR = 20, JUMP_GLYC = 10, JUMP_VZ = 520, GRAV = 1150, OVER_Z = 52, JUMP_HOR = 340;
/* vrije combo: tijdens de recovery opnieuw slaan/schoppen rijgt de volgende hit eraan */
const COMBO_MAX = 3, COMBO_WINDOW = 0.28;

/* SIGNATURE-COMBO: vóór de match stel je 3 bewegingen samen (special-knop, opgeladen, herlaadt).
   Elke slot mag elke beweging zijn; uppercut & hoofdstoot zijn krachtige extra's. */
const COMBO_MOVES = {
  slag_hoog:  { label: "Slag hoofd",  kind: "slag",       h: HOOG, reik: 30, schade: 9,  glyc: 8,  windup: 0.26, active: 0.09, recover: 0.15 },
  slag_mid:   { label: "Slag romp",   kind: "slag",       h: MID,  reik: 30, schade: 9,  glyc: 8,  windup: 0.26, active: 0.09, recover: 0.15 },
  slag_laag:  { label: "Slag laag",   kind: "slag",       h: LAAG, reik: 30, schade: 8,  glyc: 8,  windup: 0.26, active: 0.09, recover: 0.15 },
  trap_hoog:  { label: "Trap hoofd",  kind: "schop",      h: HOOG, reik: 52, schade: 14, glyc: 12, windup: 0.32, active: 0.10, recover: 0.18 },
  trap_mid:   { label: "Trap romp",   kind: "schop",      h: MID,  reik: 52, schade: 13, glyc: 12, windup: 0.32, active: 0.10, recover: 0.18 },
  trap_laag:  { label: "Trap laag",   kind: "schop",      h: LAAG, reik: 48, schade: 12, glyc: 12, windup: 0.32, active: 0.10, recover: 0.18 },
  uppercut:   { label: "Uppercut",    kind: "uppercut",   h: HOOG, reik: 28, schade: 16, glyc: 14, windup: 0.28, active: 0.10, recover: 0.20, antiAir: true },
  hoofdstoot: { label: "Hoofdstoot",  kind: "hoofdstoot", h: MID,  reik: 22, schade: 15, glyc: 12, windup: 0.26, active: 0.09, recover: 0.20 },
};
const COMBO_OPTIES = Object.keys(COMBO_MOVES);
const DEFAULT_COMBO = ["trap_hoog", "slag_mid", "uppercut"];
const COMBO_RECHARGE = 20;                    // seconden om de special weer op te laden

/* buddy (KLUSCE 0-100) + verzorging -> matchparameters */
function buddyNaarParams(stats, verzorging) {
  const n = (v) => Math.max(0, Math.min(1, v / 100));
  const K = n(stats.K), L = n(stats.L), U = n(stats.U), S = n(stats.S), C = n(stats.C), E = n(stats.E);
  const vz = 0.87 + (Math.max(0, Math.min(100, verzorging)) / 100) * 0.26;
  return {
    plafond: 100 * vz, herstelMult: vz * (0.8 + 0.4 * U),
    reik: 58 + 40 * L, kracht: 0.6 + 0.5 * K, parry: 0.1 + 0.07 * C,
    stabiliteit: 0.3 + 0.5 * E, tempo: 0.85 + 0.3 * S, moveSpd: 140 + 90 * S,
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255); return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0"); }

/* LOOK: uiterlijk van de avatar. Kledij/kleuren komen uit de shop (hier mock; fase B: Firebase).
   BOUW volgt de KLUSCE-stats en graad van de BUDDY — bewust nooit "dik/dun":
   kracht -> bredere schouders & ledematen, uithouding -> pezig, verwaarlozing -> vermoeide HOUDING.
   Cosmetica geeft nooit gevechtsvoordeel. */
function buildLook(stats, verzorging, graad, outfit) {
  const n = (v) => clamp(v / 100, 0, 1);
  const K = n(stats.K), U = n(stats.U);
  return {
    outfit: outfit.gi, huid: outfit.huid, haar: outfit.haar,
    schaal: graad === 1 ? 0.88 : graad === 2 ? 0.95 : 1,   // leeftijd -> lichaamslengte
    spier: 0.85 + K * 0.4,                                  // kracht -> dikte ledematen
    schBr: 10 + K * 4.5,                                    // kracht -> schouderbreedte
    pezig: 1.05 - U * 0.18,                                 // uithouding -> slankere onderarmen/kuiten
    moe: 1 - clamp(verzorging / 100, 0, 1),                 // verwaarloosd -> vermoeide houding (nooit lichaamsvorm)
  };
}

/* effectieve kracht: daalt bij lage conditie, lege energie (PCr+glycolyse) en verzuring */
function krachtFactor(f) {
  const cond = 0.55 + 0.45 * (f.conditie / 100);
  const en = (f.pcr + f.glyc) / (2 * f.params.plafond);
  const brand = 0.45 + 0.55 * en;
  const zuur = 1 - (f.lactaat / 100) * 0.25;
  return cond * brand * zuur;
}

function nieuweVechter(team, x, params, isHuman, look) {
  return {
    team, x, params, isHuman, isAI: !isHuman, look, vx: 0, facing: team === "blauw" ? 1 : -1,
    z: 0, vz: 0, onGround: true,
    pcr: params.plafond, glyc: params.plafond, aer: 100, lactaat: 0, balans: 100, conditie: 100, ghost: 100,
    state: "idle", phase: "", phaseT: 0, blockEl: 0, windupEl: 0, dashCd: 0, iframe: 0, dashDir: 1, openT: 0,
    atkKind: "slag", atkH: 0, guardH: 0, hitDone: false, combo: 0, comboT: 0,
    comboCharge: 1, specialQueue: null, isSpecial: false, animNaam: "idle", animT: 0,
  };
}
function verseState(humanTeam, hp, dp, graad, boss, tuning, hLook, dLook) {
  const blue = nieuweVechter("blauw", W * 0.35, humanTeam === "blauw" ? hp : dp, humanTeam === "blauw", humanTeam === "blauw" ? hLook : dLook);
  const red = nieuweVechter("rood", W * 0.65, humanTeam === "rood" ? hp : dp, humanTeam === "rood", humanTeam === "rood" ? hLook : dLook);
  const human = humanTeam === "blauw" ? blue : red, ai = humanTeam === "blauw" ? red : blue;
  return {
    mode: "countdown", ronde: 1, timer: ROUND_TIME, pauseTimer: 3, rustTimer: RUST,
    fighters: [blue, red], human, ai, graad, boss, tuning,
    aiT: 0, aiGuardT: 0, aiSprongCd: 0, cine: null, cam: { x: W / 2, y: GROUND - 100, s: 1 }, toast: { txt: "", t: 0, kleur: "#fff" }, particles: [], shake: 0,
    rec: { glycEmpty: 0, maxGlyc: 0, condLaag: 0, treffers: 0, parries: 0, geschampt: 0 },
  };
}
/* Boss-roster: elke baas heeft een leesbare zwakte (zie BOSS_ROSTER_SPARRING.md).
   hoogte = gewichten [hoog, mid, laag]; verdediging = turtel-kans; plafondMod = ATP-plafond. */
const BOSSES = {
  stormram:    { naam: "De Stormram", zwakte: "Loopt snel leeg — blok zijn stormloop, laat hem uitputten en counter als zijn glycolyse op is.", stats: { K: 82, L: 50, U: 35, S: 66, C: 45, E: 52 }, verzorging: 66, plafondMod: 0.7, herstelMod: 0.8, react: 0.34, aggr: 0.92, leesGoed: 0.3, verdediging: 0.05, hoogte: [1, 2, 1], spring: 0.16, kleur: "#a34040" },
  hoogvlieger: { naam: "De Hoogvlieger", zwakte: "Mikt bijna altijd hoog — weer hóóg af en counter. Let op de zeldzame lage mixup.", stats: { K: 60, L: 78, U: 60, S: 80, C: 66, E: 55 }, verzorging: 70, plafondMod: 1, herstelMod: 1, react: 0.24, aggr: 0.72, leesGoed: 0.5, verdediging: 0.12, hoogte: [7, 2, 1], spring: 0.42, kleur: "#b8763c" },
  grondstamper:{ naam: "De Grondstamper", zwakte: "Leeft van lage schoppen — weer láág af of dash weg; straf zijn trage recovery.", stats: { K: 80, L: 45, U: 62, S: 58, C: 55, E: 60 }, verzorging: 70, plafondMod: 1, herstelMod: 1, react: 0.26, aggr: 0.72, leesGoed: 0.5, verdediging: 0.15, hoogte: [1, 2, 7], schopVoorkeur: 0.7, spring: 0.1, kleur: "#7c5a3a" },
  muur:        { naam: "De Muur", zwakte: "Turtelt achter zijn guard — ram niet blind; zet gedoseerde druk en breek zijn balans.", stats: { K: 64, L: 55, U: 70, S: 40, C: 60, E: 78 }, verzorging: 74, plafondMod: 1, herstelMod: 1, react: 0.20, aggr: 0.34, leesGoed: 0.55, verdediging: 0.45, hoogte: [2, 3, 2], spring: 0.06, kleur: "#5a6b7c" },
  danser:      { naam: "De Danser", zwakte: "Snelle combo's maar weinig kracht — zen-parry een tik en counter zwaar.", stats: { K: 45, L: 70, U: 66, S: 82, C: 82, E: 60 }, verzorging: 74, plafondMod: 1, herstelMod: 1, react: 0.16, aggr: 0.8, leesGoed: 0.6, verdediging: 0.2, hoogte: [3, 4, 3], spring: 0.5, kleur: "#8a4f9e" },
  sensei:      { naam: "De Sensei (eindbaas)", zwakte: "Nauwelijks een zwakte — win met béter energiebeheer dan hij; counter zijn zeldzame overcommits.", stats: { K: 75, L: 72, U: 78, S: 76, C: 80, E: 78 }, verzorging: 88, plafondMod: 1, herstelMod: 1.05, react: 0.12, aggr: 0.72, leesGoed: 0.7, verdediging: 0.4, hoogte: [3, 3, 3], spring: 0.3, kleur: "#3c3f4a" },
};
const BOSS_VOLGORDE = ["stormram", "hoogvlieger", "grondstamper", "muur", "danser", "sensei"];
const kiesHoogte = (g) => { const t = g[0] + g[1] + g[2], r = Math.random() * t; return r < g[0] ? HOOG : r < g[0] + g[1] ? MID : LAAG; };
const ETEN = [
  { id: "water", txt: "💧 Water", uitleg: "herstel + minder verzuring", eff: { aer: 25, conditie: 8, lactaat: -25 } },
  { id: "banaan", txt: "🍌 Banaan", uitleg: "koolhydraten → glycolyse", eff: { glyc: 32, conditie: 10 } },
  { id: "sport", txt: "🥤 Sportdrank", uitleg: "snelle suikers + PCr", eff: { glyc: 40, pcr: 18 } },
  { id: "adem", txt: "😮‍💨 Ademhaling", uitleg: "ATP-PCr + rust", eff: { pcr: 34, lactaat: -40, aer: 15 } },
];

export default function SparringKooi() {
  const [screen, setScreen] = useState("menu");
  const [graad, setGraad] = useState(2);
  const [boss, setBoss] = useState("stormram");
  const [verzorging, setVerzorging] = useState(70);
  const [toonStats, setToonStats] = useState(false);
  const [toonTuning, setToonTuning] = useState(false);
  const [stats, setStats] = useState({ K: 60, L: 60, U: 60, S: 60, C: 60, E: 60 });
  const [tuning, setTuning] = useState({ tempoKost: 1, staggerDuur: 1, aiScherpte: 40 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [colorblind, setColorblind] = useState(false);
  const [result, setResult] = useState(null);
  const [isTouch, setIsTouch] = useState(false);
  const [pauze, setPauze] = useState(false);
  const [gegeten, setGegeten] = useState({});
  const [comboReeks, setComboReeks] = useState([...DEFAULT_COMBO]);
  const [outfit, setOutfit] = useState({ gi: "#2e6cb5", huid: "#f2d3b0", haar: "#2b2119" });

  const canvasRef = useRef(null), gsRef = useRef(null), rafRef = useRef(0);
  const keysRef = useRef({}), actRef = useRef({ slag: false, schop: false, dash: false, sprong: false, special: false });
  const blockRef = useRef(false), moveRef = useRef({ x: 0, y: 0, active: false });
  const imgRef = useRef(null), optRef = useRef({ reducedMotion, colorblind });
  const comboRef = useRef(comboReeks);
  useEffect(() => { comboRef.current = comboReeks; }, [comboReeks]);
  const setPauzeRef = useRef(setPauze);
  useEffect(() => { setPauzeRef.current = setPauze; });

  useEffect(() => { optRef.current = { reducedMotion, colorblind }; }, [reducedMotion, colorblind]);
  useEffect(() => { setIsTouch(typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)); }, []);
  useEffect(() => { if (!ACHTERGROND) return; const im = new Image(); im.onload = () => { imgRef.current = im; }; im.src = ACHTERGROND; }, []);

  const startMatch = () => {
    const b = BOSSES[boss];
    const dp = buddyNaarParams(b.stats, b.verzorging);
    dp.plafond *= b.plafondMod; dp.herstelMult *= b.herstelMod;   // zwakte inbakken (bv. Stormram loopt leeg)
    const humanTeam = Math.random() < 0.5 ? "blauw" : "rood";
    const hLook = buildLook(stats, verzorging, graad, outfit);
    const dLook = buildLook(b.stats, b.verzorging, graad, { gi: b.kleur || "#b04848", huid: "#e0b98f", haar: "#171c26" });
    gsRef.current = verseState(humanTeam, buddyNaarParams(stats, verzorging), dp, graad, b, { ...tuning }, hLook, dLook);
    setResult(null); setPauze(false); setScreen("playing");
  };

  /* ---------- helpers ---------- */
  /* energie-cascade: kosten komen eerst uit ATP-PCr; is die leeg, dan neemt glycolyse over (iets duurder + verzuring). Aanvallen kan dus ALTIJD — maar leeg = slap. */
  const consume = (f, pcr, glyc) => {
    let kost = (pcr + glyc) * gsRef.current.tuning.tempoKost;
    const uitP = Math.min(f.pcr, kost); f.pcr -= uitP; kost -= uitP;
    if (kost > 0) { f.glyc = Math.max(0, f.glyc - kost * 1.15); f.lactaat = clamp(f.lactaat + kost * 0.3, 0, 100); }
  };
  const toast = (gs, txt, kleur) => { gs.toast = { txt, t: 0.9, kleur: kleur || "#fff" }; };
  const flits = (gs, x, y, kleur, n) => { if (optRef.current.reducedMotion) return; gs.particles.push({ type: "ring", x, y, vx: 0, vy: 0, life: 0.38, maxLife: 0.38, kleur }); for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 40 + Math.random() * 140; gs.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, kleur }); } };

  const startAanval = (gs, f, def, hoogte, combo) => {
    const mag = f.state === "idle" || (combo && f.state === "attacking" && f.phase === "recovery" && f.combo < COMBO_MAX && f.comboT > 0);
    if (!mag) return false;
    f.combo = combo ? f.combo + 1 : 1;
    f.state = "attacking"; f.phase = "windup"; f.atkKind = def.kind;
    f.atkH = !f.onGround ? HOOG : hoogte;                    // luchtaanval = van boven (hoog)
    f.atkDef = def;
    const sneller = 1 - (f.combo - 1) * 0.12;                // vervolghits iets sneller
    const en = (f.pcr + f.glyc) / (2 * f.params.plafond);
    f.phaseT = def.windup * (1 + (f.lactaat / 100) * 0.5) * (1 + (1 - en) * 0.3) / f.params.tempo * sneller; f.hitDone = false;
    consume(f, 0, def.glyc * (combo ? 0.7 : 1));
    f.lactaat = clamp(f.lactaat + (def.kind === "schop" ? LACTAAT_SCHOP : LACTAAT_SLAG), 0, 100);
    return true;
  };
  const startSprong = (gs, f, dir) => {
    if (!f.onGround || !["idle", "blocking"].includes(f.state) || f.pcr + f.glyc < 12) return false;
    f.vz = JUMP_VZ; f.vx = dir * JUMP_HOR; f.onGround = false; f.state = "idle"; consume(f, JUMP_PCR, JUMP_GLYC);
    f.lactaat = clamp(f.lactaat + 4, 0, 100); return true;
  };
  const startSpecialMove = (gs, f, m) => {
    f.state = "attacking"; f.phase = "windup"; f.atkKind = m.kind; f.atkH = !f.onGround ? HOOG : m.h; f.atkDef = m;
    f.phaseT = m.windup * (1 + (f.lactaat / 100) * 0.4) / f.params.tempo; f.hitDone = false;
    consume(f, 0, m.glyc); f.lactaat = clamp(f.lactaat + 3, 0, 100);
  };
  const startSpecial = (gs, f) => {
    const reeks = (f.isHuman ? comboRef.current : DEFAULT_COMBO).map((k) => COMBO_MOVES[k]);
    if (f.state !== "idle" || f.comboCharge < 1) return false;
    f.comboCharge = 0; f.isSpecial = true; f.specialQueue = reeks.slice(1);
    startSpecialMove(gs, f, reeks[0]);
    if (f.isHuman) {
      // meetvenster: 0,2 s na de klik mag de tegenstander reageren; het plan ligt dan vast
      const sf = gs.tuning.aiScherpte / 100, b = gs.boss;
      const blokt = Math.random() < 0.3 + 0.45 * sf;
      const hoogte = Math.random() < b.leesGoed * (0.55 + 0.5 * sf) ? reeks[0].h : [HOOG, MID, LAAG][Math.floor(Math.random() * 3)];
      gs.special = { el: 0, plan: { blokt, hoogte, na: 0.04 + Math.random() * 0.15, done: false } };
      f.phaseT += 0.2;                                          // aanzet verlengd = het meetvenster (telegraph zichtbaar)
    }
    toast(gs, "COMBO!", "#ffd54a"); return true;
  };
  const startDash = (gs, f, dir) => {
    if (!(f.state === "idle" || f.state === "blocking") || f.dashCd > 0 || f.pcr + f.glyc < 10) return false;
    f.state = "dashing"; f.phaseT = DASH_DUR; f.iframe = DASH_IFRAME; f.dashCd = DASH_CD; f.dashDir = dir;
    f.vx = dir * (DASH_DIST / DASH_DUR); consume(f, DASH_PCR, 0); return true;
  };
  const zetStagger = (gs, f, kind) => {
    const base = kind === "guardbreak" ? STAGGER_GUARD : kind === "schamp" ? STAGGER_SCHAMP : STAGGER_HIT;
    f.state = "stagger"; f.phaseT = base * gs.tuning.staggerDuur * (1 - f.params.stabiliteit * 0.4); f.vx = 0; f.combo = 0; f.isSpecial = false; f.specialQueue = null;
  };
  const knockback = (gs, att, def) => {                      // ruimte maken tegen hoek-vastzitten
    const dir = Math.sign(def.x - att.x) || 1;
    def.x = clamp(def.x + dir * KNOCKBACK, WALL_L, WALL_R);
    att.x = clamp(att.x - dir * KNOCKBACK * 0.5, WALL_L, WALL_R);
  };

  const resolveHit = (gs, att) => {
    const def = gs.fighters.find((x) => x !== att);
    const reik = att.params.reik + att.atkDef.reik + BODY;
    if (Math.abs(att.x - def.x) > reik) return;
    if (def.state === "stagger") { toast(gs, "—", "#64748b"); return; }        // onkwetsbaar tijdens stagger (geen hoek-stapeling)
    if (def.state === "dashing" && def.iframe > 0) { att.openT = 0.5; toast(gs, "ONTWEKEN → COUNTER!", "#8fd0ff"); return; }
    if (Math.abs(att.z - def.z) > 55 && !att.atkDef.antiAir) { return; }      // te groot hoogteverschil -> mist (behalve uppercut/anti-air)
    const schade = att.atkDef.schade * att.params.kracht * krachtFactor(att) * (def.openT > 0 ? 1.6 : 1);
    const hx = (att.x + def.x) / 2, hy = zoneY[att.atkH];
    if (def.state === "blocking") {
      const juist = def.guardH === att.atkH;
      if (juist && def.blockEl <= def.params.parry) {                       // ZEN-PARRY
        if (def.isHuman) gs.rec.parries++;
        def.pcr = clamp(def.pcr + 10, 0, def.params.plafond);
        zetStagger(gs, att, "hit"); att.phaseT = 0.6;
        toast(gs, "ZEN-PARRY!", "#c8a2ff"); flits(gs, hx, hy, "#c8a2ff", 12); return;
      }
      if (juist) {                                                          // volledig geblokt
        def.balans -= BLOCK_BALANS * att.params.kracht;
        if (def.balans <= 0) { def.balans = 0; def.conditie = clamp(def.conditie - schade * 0.8, 0, 100); zetStagger(gs, def, "guardbreak"); checkStaking(gs, def); toast(gs, "GUARD-BREAK!", "#ffd166"); flits(gs, hx, hy, "#ffd166", 14); }
        else { toast(gs, "GEBLOKT", "#9fb3c8"); flits(gs, hx, hy, "#9fb3c8", 5); }
        return;
      }
      // VERKEERDE HOOGTE = SCHAMP: halve schade, geen punt, mini-stagger (geen vol treffer)
      def.conditie = clamp(def.conditie - schade * 0.4, 0, 100);
      def.balans -= SCHAMP_BALANS; zetStagger(gs, def, "schamp"); checkStaking(gs, def);
      if (def.isHuman) gs.rec.geschampt++;
      toast(gs, "GESCHAMPT", "#c9a15a"); flits(gs, hx, hy, "#c9a15a", 7); return;
    }
    // TREFFER (geen KO): punt + stagger + conditie-daling + energie-hap + knockback (ruimte)
    def.conditie = clamp(def.conditie - schade, 0, 100);
    def.pcr = clamp(def.pcr - HIT_ATP, 0, def.params.plafond);
    zetStagger(gs, def, "hit"); knockback(gs, att, def); checkStaking(gs, def);
    if (att.isHuman) gs.rec.treffers++;
    toast(gs, "TREFFER!", att.team === "blauw" ? "#4aa3ff" : "#ff6b6b");
    flits(gs, hx, hy, att.team === "blauw" ? "#4aa3ff" : "#ff6b6b", 16);
    gs.shake = optRef.current.reducedMotion ? 0 : 7;
  };
  const checkStaking = (gs, def) => { if (def.conditie <= 0 && gs.mode === "play") { def.conditie = 0; toast(gs, "PARTIJ GESTAAKT", "#ffd166"); eindig(gs, "staking"); } };

  const eindig = (gs, reden) => {
    if (gs.mode === "ended") return; gs.mode = "ended";
    const hg = Math.round(gs.human.conditie), ag = Math.round(gs.ai.conditie);
    const gewonnen = hg > ag, gelijk = hg === ag;
    const coins = (gewonnen ? 5 : 3) + (hg > 60 ? 2 : hg > 30 ? 1 : 0);
    setResult({ gewonnen, gelijk, reden: reden || "tijd", humanTeam: gs.human.team, coins, ranking: gewonnen ? 5 : 0, graad: gs.graad, rec: { ...gs.rec }, hg, ag, bossNaam: gs.boss.naam });
    setScreen("end");
  };

  const startRust = (gs) => { gs.mode = "rust"; gs.rustTimer = RUST; herstelAI(gs); setGegeten({}); setPauzeRef.current(true); };
  const herstelAI = (gs) => { const a = gs.ai; a.glyc = clamp(a.glyc + 34, 0, a.params.plafond); a.pcr = clamp(a.pcr + 26, 0, a.params.plafond); a.conditie = clamp(a.conditie + 14, 0, 100); a.lactaat = clamp(a.lactaat - 30, 0, 100); a.aer = clamp(a.aer + 20, 0, 100); };
  const startRonde2 = (gs) => {
    gs.ronde = 2; gs.timer = ROUND_TIME; gs.mode = "countdown"; gs.pauseTimer = 3;
    gs.fighters.forEach((f, i) => { f.x = i === 0 ? W * 0.35 : W * 0.65; f.vx = 0; f.state = "idle"; f.balans = 100; f.lactaat = clamp(f.lactaat - 20, 0, 100); });
    setPauzeRef.current(false);
  };

  /* ---------- simulatie ---------- */
  const step = (dt) => {
    const gs = gsRef.current; if (!gs) return;
    if (gs.mode === "countdown") { gs.pauseTimer -= dt; if (gs.pauseTimer <= 0) gs.mode = "play"; updP(gs, dt); if (gs.toast.t > 0) gs.toast.t -= dt; return; }
    if (gs.mode === "rust") { gs.rustTimer -= dt; if (gs.rustTimer <= 0) startRonde2(gs); updP(gs, dt); return; }
    if (gs.mode !== "play") return;
    gs.timer = Math.max(0, gs.timer - dt);

    const [A, B] = gs.fighters;
    A.facing = A.x <= B.x ? 1 : -1; B.facing = B.x < A.x ? 1 : -1;

    // input human: beweeg (x) + hoogte-aim (y) + acties
    const hu = gs.human;
    let mx = 0, aim = MID;
    if (moveRef.current.active) { mx = Math.abs(moveRef.current.x) > 0.12 ? moveRef.current.x : 0; aim = moveRef.current.y < -0.35 ? HOOG : moveRef.current.y > 0.35 ? LAAG : MID; }
    else { const k = keysRef.current; mx = (k["d"] || k["arrowright"] ? 1 : 0) - (k["a"] || k["arrowleft"] ? 1 : 0); aim = (k["w"] || k["arrowup"]) ? HOOG : (k["s"] || k["arrowdown"]) ? LAAG : MID; }
    const wilBlok = blockRef.current || keysRef.current["l"];
    hu.guardH = aim;
    stuur(gs, hu, mx, aim, wilBlok, actRef.current);
    actRef.current.slag = false; actRef.current.schop = false; actRef.current.dash = false; actRef.current.sprong = false; actRef.current.special = false;

    // signature-combo cinematic: na het 0,2s-venster start de slow-mo; het AI-plan wordt uitgevoerd
    if (gs.special) {
      const sp = gs.special, huS = gs.human;
      sp.el += dt;
      if (!huS.isSpecial && huS.state !== "attacking") gs.special = null;
      else {
        if (sp.el >= 0.2) gs.cine = { t: Math.max(gs.cine ? gs.cine.t : 0, 0.4) };   // top-up: hele combo vertraagd + korte staart
        if (sp.plan.blokt && !sp.plan.done && sp.el >= sp.plan.na) {
          const p = gs.ai;
          if (!["stagger", "dashing", "attacking"].includes(p.state)) { p.state = "blocking"; p.blockEl = 0.5; p.guardH = sp.plan.hoogte; sp.plan.done = true; }
        }
      }
    }
    aiStap(gs, dt);

    gs.fighters.forEach((f) => {
      f.dashCd = Math.max(0, f.dashCd - dt); f.iframe = Math.max(0, f.iframe - dt); f.openT = Math.max(0, f.openT - dt);
      const an = animNaam(f); if (an !== f.animNaam) { f.animNaam = an; f.animT = 0; } else f.animT += dt;
      if (f.comboT > 0) f.comboT -= dt;
      f.comboCharge = clamp(f.comboCharge + dt / COMBO_RECHARGE, 0, 1);   // signature-combo laadt op
      // sprong / z-as
      if (!f.onGround || f.vz !== 0) { f.vz -= GRAV * dt; f.z += f.vz * dt; if (f.z <= 0) { f.z = 0; f.vz = 0; f.onGround = true; } }
      f.x += f.vx * dt; if (f.onGround && f.state !== "dashing") f.vx *= Math.pow(0.02, dt); f.x = clamp(f.x, WALL_L, WALL_R);  // geen demping in de lucht -> echte sprong-boog
      if (f.state === "attacking") {
        if (f.phase === "windup") f.windupEl += dt;
        f.phaseT -= dt;
        if (f.phaseT <= 0) {
          if (f.phase === "windup") { f.phase = "active"; f.phaseT = f.atkDef.active; if (!f.hitDone) { f.hitDone = true; resolveHit(gs, f); } }
          else if (f.phase === "active") { f.phase = "recovery"; f.phaseT = f.atkDef.recover / f.params.tempo; f.comboT = COMBO_WINDOW; }
          else if (f.isSpecial && f.specialQueue && f.specialQueue.length) { startSpecialMove(gs, f, f.specialQueue.shift()); }  // volgende special-hit
          else { f.state = "idle"; f.phase = ""; f.combo = 0; f.isSpecial = false; f.specialQueue = null; }
        }
      } else if (f.state === "dashing") { f.phaseT -= dt; if (f.phaseT <= 0) { f.state = "idle"; f.vx = 0; } f.windupEl = 0; }
      else if (f.state === "stagger") { f.phaseT -= dt; if (f.phaseT <= 0) f.state = "idle"; f.windupEl = 0; }
      else if (f.state === "blocking") { f.blockEl += dt; f.windupEl = 0; if (f.blockEl > 0.35) { f.balans = clamp(f.balans - 16 * dt, 0, 100); if (f.balans <= 0) { zetStagger(gs, f, "guardbreak"); toast(gs, "GUARD MOE!", "#ffd166"); } } }  // turtelen vreet balans
      else f.windupEl = 0;
      // ATP-huishouding — traag & geleidelijk
      const aerF = 0.45 + 0.55 * (f.aer / 100);
      if (f.state !== "dashing") f.pcr = clamp(f.pcr + (f.params.plafond / 7) * f.params.herstelMult * aerF * dt, 0, f.params.plafond);
      f.glyc = clamp(f.glyc + (f.params.plafond / 26) * f.params.herstelMult * aerF * dt, 0, f.params.plafond);
      const bewegend = Math.abs(f.vx) > 40 || f.state === "dashing";
      f.aer = clamp(f.aer + (bewegend ? -7 : 13) * dt, 0, 100);
      f.lactaat = clamp(f.lactaat - LACTAAT_DECAY * dt, 0, 100);
      if (f.state !== "blocking") f.balans = clamp(f.balans + 20 * (0.6 + 0.6 * f.params.stabiliteit) * dt, 0, 100);
      f.ghost = f.ghost > f.conditie ? Math.max(f.conditie, f.ghost - 26 * dt) : f.conditie;
    });

    const d = B.x - A.x;
    const opGrond = A.onGround && B.onGround;                        // in de lucht ga je over elkaar heen (hoek-ontsnapping)
    if (opGrond && Math.abs(d) < BODY * 2) { const push = (BODY * 2 - Math.abs(d)) / 2 * Math.sign(d || 1); A.x -= push; B.x += push; A.x = clamp(A.x, WALL_L, WALL_R); B.x = clamp(B.x, WALL_L, WALL_R); }

    updRec(gs, dt); updP(gs, dt); if (gs.toast.t > 0) gs.toast.t -= dt; if (gs.shake > 0) gs.shake = Math.max(0, gs.shake - dt * 30);

    if (gs.mode === "ended") return;
    if (gs.timer <= 0) {
      if (gs.ronde < RONDES) startRust(gs);
      else eindig(gs, "tijd");
    }
  };

  const stuur = (gs, f, mx, aim, wilBlok, act) => {
    // combo: tijdens de recovery opnieuw slaan/schoppen rijgt de volgende hit eraan
    if (f.state === "attacking" && f.phase === "recovery" && !f.isSpecial) {
      if (act.slag && startAanval(gs, f, SLAG, aim, true)) return;
      if (act.schop && startAanval(gs, f, SCHOP, aim, true)) return;
    }
    if (["stagger", "dashing", "attacking"].includes(f.state)) return;
    if (f.state === "blocking" && !wilBlok) f.state = "idle";
    if (act.special) { if (startSpecial(gs, f)) return; }               // signature-combo (opgeladen)
    if (act.sprong) startSprong(gs, f, mx !== 0 ? Math.sign(mx) : 0);   // richting bepaalt de boog (over de tegenstander)
    if (act.dash) { const dir = mx !== 0 ? Math.sign(mx) : -f.facing; if (startDash(gs, f, dir)) return; }
    if (act.slag) { if (startAanval(gs, f, SLAG, aim)) return; }
    if (act.schop) { if (startAanval(gs, f, SCHOP, aim)) return; }
    if (wilBlok && f.onGround) { if (f.state !== "blocking") { f.state = "blocking"; f.blockEl = 0; } f.vx = 0; return; }
    if (!f.onGround) { if (mx !== 0) f.vx = mx * f.params.moveSpd * 0.95; return; }  // luchtbijsturing, anders behoudt de sprong-boog
    if (f.state !== "idle") return;
    f.vx = mx * f.params.moveSpd * (1 - (f.lactaat / 100) * 0.4);
  };

  /* ---------- AI: elke baas volgt zijn eigen zwakte/gedrag, kan ook uitputten ---------- */
  const aiStap = (gs, dt) => {
    const p = gs.ai, hu = gs.human, b = gs.boss, sf = gs.tuning.aiScherpte / 100;
    if (["stagger", "dashing", "attacking"].includes(p.state)) return;
    if (gs.special) { if (p.state === "blocking") p.vx = 0; return; }   // cinematic: AI volgt enkel zijn vastgelegde reactie
    if (!p.onGround) return;                                  // in de lucht: committeert aan de sprong, fysica landt hem
    gs.aiT -= dt; gs.aiGuardT -= dt; gs.aiSprongCd -= dt;
    const dist = Math.abs(p.x - hu.x);
    // hoek-ontsnapping: vastgeklemd tegen de rand -> spring over de speler naar het midden (altijd, geen cooldown)
    const bijMuur = p.x < WALL_L + 95 || p.x > WALL_R - 95;
    if (bijMuur && dist < 135 && p.pcr >= JUMP_PCR && p.glyc >= JUMP_GLYC) {
      if (startSprong(gs, p, p.x < W / 2 ? 1 : -1)) { gs.aiSprongCd = 1.4; return; }
    }
    const dreigt = hu.state === "attacking" && hu.phase === "windup";
    if (dreigt && dist < p.params.reik + SCHOP.reik + BODY + 20) {
      if (gs.aiGuardT <= 0) {
        gs.aiGuardT = b.react * (1.4 - 0.3 * sf);                        // trager reageren (geen frame-perfect blok)
        if (hu.windupEl > b.react * 0.6 && Math.random() < 0.42 + 0.32 * sf) {  // pas ná genoeg leestijd, en niet altijd
          if (p.pcr >= DASH_PCR && Math.random() < 0.12) { startDash(gs, p, -p.facing); return; }
          p.state = "blocking"; p.blockEl = 0;
          p.guardH = Math.random() < b.leesGoed * (0.55 + 0.5 * sf) ? hu.atkH : [HOOG, MID, LAAG][Math.floor(Math.random() * 3)];  // slider dempt het hoogte-lezen
        }
      }
      return;
    }
    if (p.state === "blocking" && !dreigt) p.state = "idle";
    if (gs.aiT > 0) { aiBeweeg(gs, p, hu, dist); return; }
    gs.aiT = 0.1;
    const en = (p.pcr + p.glyc) / (2 * p.params.plafond);
    const laag = en < 0.16;                                 // uitgeput -> spaarzamer en meer afstand (maar slaan kan altijd)
    // verrassingssprong over de speler (baas-afhankelijk, met cooldown)
    if (gs.aiSprongCd <= 0 && !laag && b.spring && Math.random() < b.spring && dist > 45 && dist < 300) {
      if (startSprong(gs, p, Math.sign(hu.x - p.x) || 1)) { gs.aiSprongCd = 1.3 + Math.random() * 1.4; return; }
    }
    const inRange = dist <= p.params.reik + SLAG.reik + BODY;
    if (inRange && !laag && Math.random() < b.verdediging) { p.state = "blocking"; p.blockEl = 0; p.guardH = MID; return; } // turtel-neiging (Muur)
    if (inRange && Math.random() < b.aggr * (laag ? 0.3 : 0.85)) {
      const wilSchop = b.schopVoorkeur ? Math.random() < b.schopVoorkeur : dist > p.params.reik + SLAG.reik + BODY - 12;
      startAanval(gs, p, wilSchop ? SCHOP : SLAG, kiesHoogte(b.hoogte)); return;   // hoogte volgens zwakte
    }
    if (laag && dist < 220) { p.vx = -p.facing * p.params.moveSpd * 0.8; return; }
    aiBeweeg(gs, p, hu, dist);
  };
  const aiBeweeg = (gs, p, hu, dist) => {
    if (p.state === "blocking") { p.vx = 0; return; }
    const doel = p.params.reik + SLAG.reik + BODY - 12;
    if (dist > doel + 8) p.vx = Math.sign(hu.x - p.x) * p.params.moveSpd * 0.9;
    else if (dist < doel - 10) p.vx = Math.sign(p.x - hu.x) * p.params.moveSpd * 0.7;
    else p.vx *= 0.5;
  };

  const kiesEten = (item) => {
    const gs = gsRef.current; if (!gs || gs.mode !== "rust" || gegeten[item.id]) return;
    const f = gs.human, e = item.eff;
    if (e.glyc) f.glyc = clamp(f.glyc + e.glyc, 0, f.params.plafond);
    if (e.pcr) f.pcr = clamp(f.pcr + e.pcr, 0, f.params.plafond);
    if (e.aer) f.aer = clamp(f.aer + e.aer, 0, 100);
    if (e.conditie) f.conditie = clamp(f.conditie + e.conditie, 0, 100);
    if (e.lactaat) f.lactaat = clamp(f.lactaat + e.lactaat, 0, 100);
    setGegeten((g) => ({ ...g, [item.id]: true }));
  };
  const startNu = () => { const gs = gsRef.current; if (gs && gs.mode === "rust") gs.rustTimer = 0.01; };

  const updP = (gs, dt) => { for (let i = gs.particles.length - 1; i >= 0; i--) { const q = gs.particles[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; q.vy *= 0.94; if (q.life <= 0) gs.particles.splice(i, 1); } };
  const updRec = (gs, dt) => { const p = gs.human, r = gs.rec; if (p.glyc < 5) { r.glycEmpty += dt; r.maxGlyc = Math.max(r.maxGlyc, r.glycEmpty); } else r.glycEmpty = 0; if (p.conditie < 35) r.condLaag += dt; };

  /* ---------- teken ---------- */
  const draw = () => {
    const cv = canvasRef.current, gs = gsRef.current; if (!cv || !gs) return;
    const ctx = cv.getContext("2d"), opt = optRef.current;
    // camera: zoomt in op de vechters en volgt het midden van de actie
    const [A, B] = gs.fighters, dist = Math.abs(A.x - B.x);
    const cine = gs.cine ? clamp(gs.cine.t * 2, 0, 1) : 0;
    const doelS = (gs.mode === "rust" ? 1.15 : clamp(2.0 - dist / 520, 1.38, 1.8)) + cine * 0.45;
    const k = opt.reducedMotion ? 1 : 0.08;
    gs.cam.s += (doelS - gs.cam.s) * k;
    const s = gs.cam.s;
    const doelX = clamp((A.x + B.x) / 2, W / (2 * s), W - W / (2 * s));
    const doelY = clamp(GROUND - 96 - Math.max(A.z, B.z) * 0.4, H / (2 * s), H - H / (2 * s));
    gs.cam.x += (doelX - gs.cam.x) * k; gs.cam.y += (doelY - gs.cam.y) * k;
    const cx = clamp(gs.cam.x, W / (2 * s), W - W / (2 * s)), cy = clamp(gs.cam.y, H / (2 * s), H - H / (2 * s));
    const shx = gs.shake > 0 && !opt.reducedMotion ? (Math.random() - 0.5) * gs.shake : 0;
    const shy = gs.shake > 0 && !opt.reducedMotion ? (Math.random() - 0.5) * gs.shake : 0;
    ctx.save();
    ctx.setTransform(s, 0, 0, s, W / 2 - cx * s + shx, H / 2 - cy * s + shy);
    tekenKooi(ctx, imgRef.current, opt);
    gs.fighters.forEach((f) => schaduw(ctx, f.x, f.z));
    gs.fighters.slice().sort((a, b) => a.x - b.x).forEach((f) => tekenVechter(ctx, f, opt));
    gs.particles.forEach((q) => {
      ctx.globalAlpha = clamp(q.life * 2.4, 0, 1);
      if (q.type === "ring") { const pr = 8 + (1 - q.life / q.maxLife) * 42; ctx.strokeStyle = q.kleur; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, pr, 0, 7); ctx.stroke(); }
      else { ctx.fillStyle = q.kleur; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, 7); ctx.fill(); }
    });
    ctx.globalAlpha = 1; ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    tekenScorebord(ctx, gs); tekenHUD(ctx, gs); tekenOverlay(ctx, gs);
    if (gs.cine && !opt.reducedMotion) {                                          // cinematic letterbox
      const e = clamp(gs.cine.t * 2.2, 0, 1), lb = 34 * e;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, H - lb, W, lb);
      ctx.globalAlpha = 0.2 * e; ctx.strokeStyle = "#ffd54a"; ctx.lineWidth = 4; ctx.strokeRect(2, lb + 2, W - 4, H - 2 * lb - 4); ctx.globalAlpha = 1;
    }
  };

  useEffect(() => {
    if (screen !== "playing") return;
    let last = performance.now(), acc = 0; const DT = 1 / 60;
    const frame = (now) => {
      let ms = now - last; last = now;
      const gs = gsRef.current;
      const scale = gs && gs.cine && gs.cine.t > 0 && !optRef.current.reducedMotion ? 0.42 : 1;   // slow-motion tijdens de special
      acc += (ms / 1000) * scale; if (acc > 0.25) acc = 0.25;
      while (acc >= DT) { step(DT); acc -= DT; }
      if (gs && gs.cine) { gs.cine.t -= ms / 1000; if (gs.cine.t <= 0) gs.cine = null; }  // realtime aftellen (niet vertraagd)
      draw();
      if (gsRef.current && gsRef.current.mode !== "ended") rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen]);

  useEffect(() => {
    if (screen !== "playing") return;
    const down = (e) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (["a", "d", "w", "s", "arrowleft", "arrowright", "arrowup", "arrowdown", "shift", "l"].includes(k)) keysRef.current[k] = true;
      if (!e.repeat) { if (k === "j") actRef.current.slag = true; if (k === "k") actRef.current.schop = true; if (k === " ") actRef.current.sprong = true; if (k === "shift") actRef.current.dash = true; if (k === "i") actRef.current.special = true; }
    };
    const up = (e) => { const k = e.key.toLowerCase(); if (["a", "d", "w", "s", "arrowleft", "arrowright", "arrowup", "arrowdown", "shift", "l"].includes(k)) keysRef.current[k] = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); keysRef.current = {}; };
  }, [screen]);

  const btn = (a) => (e) => { e.preventDefault(); actRef.current[a] = true; };
  const joyBox = useRef(null), nubRef = useRef(null);
  const onJoy = (e) => {
    const box = joyBox.current; if (!box) return;
    const r = box.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e;
    const nx = clamp((t.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
    const ny = clamp((t.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
    moveRef.current = { x: nx, y: ny, active: true };
    if (nubRef.current) nubRef.current.style.transform = "translate(" + nx * 28 + "px, " + ny * 28 + "px)";
  };
  const joyEnd = () => { moveRef.current = { x: 0, y: 0, active: false }; if (nubRef.current) nubRef.current.style.transform = "translate(0px, 0px)"; };
  const quit = () => { cancelAnimationFrame(rafRef.current); setPauze(false); setScreen("menu"); };

  const pMock = buddyNaarParams(stats, verzorging);
  const spanPct = Math.round((buddyNaarParams(stats, 100).plafond / buddyNaarParams(stats, 0).plafond - 1) * 100);
  const setT = (k, v) => setTuning((t) => ({ ...t, [k]: v }));
  const zetSlot = (i, v) => setComboReeks((r) => { const n = [...r]; n[i] = v; return n; });
  const comboEditor = (
    <div className="grid grid-cols-3 gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="text-[10px] text-slate-500 mb-1">beweging {i + 1}</div>
          <select value={comboReeks[i]} onChange={(e) => zetSlot(i, e.target.value)} className="w-full bg-slate-800 text-slate-100 text-xs rounded p-1.5 border border-slate-700">
            {COMBO_OPTIES.map((k) => (<option key={k} value={k}>{COMBO_MOVES[k].label}</option>))}
          </select>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-3" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black tracking-tight">SPARRING <span style={{ color: "#4aa3ff" }}>KOOI</span></h1>
          <span className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-400">fase A · v2</span>
        </div>

        {screen === "menu" && (
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-4">
            <p className="text-sm text-slate-300">Gecontroleerde 1v1-sparring, <b>2 rondes van 2 min</b> met een eet-/drinkpauze ertussen. Elke rake treffer tikt de <b>conditiebalk</b> van je tegenstander omlaag; is die leeg, dan <b>staakt de scheids de partij</b> (niemand gaat knock-out). Raakt je ATP-PCr op, dan sla je door op <b>glycolyse</b> — je kúnt altijd slaan, maar leeg = slap. Mik hoog/midden/laag en lees de aanzet om juist af te weren.</p>

            <div><label className="text-xs font-semibold text-slate-400">GRAAD</label>
              <div className="flex gap-2 mt-1">{[1, 2, 3].map((g) => (<button key={g} onClick={() => setGraad(g)} className={"flex-1 py-2 rounded text-sm font-semibold " + (graad === g ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300")}>{g}e graad</button>))}</div>
              <p className="text-[11px] text-slate-500 mt-1">{graad === 1 && "1 energiebalk + conditie + balans."}{graad === 2 && "3 ATP-balken + lactaat + balans + conditie."}{graad === 3 && "alles + numeriek herstel + nabespreking."}</p></div>

            <div><label className="text-xs font-semibold text-slate-400">TEGENSTANDER (baas van de ladder)</label>
              <div className="grid grid-cols-2 gap-2 mt-1">{BOSS_VOLGORDE.map((k, i) => (<button key={k} onClick={() => setBoss(k)} className={"py-2 px-2 rounded text-xs font-semibold text-left " + (boss === k ? "bg-rose-500 text-slate-950" : "bg-slate-800 text-slate-300")}>{i + 1}. {BOSSES[k].naam}</button>))}</div>
              <div className="mt-2 text-[11px] text-amber-300 bg-slate-950/60 rounded p-2"><b>Zwakte:</b> {BOSSES[boss].zwakte}</div>
            </div>

            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
              <label className="text-xs font-semibold text-slate-400">AVATAR & OUTFIT (mock — fase B: uit je shop-inventaris)</label>
              <div className="grid grid-cols-3 gap-3 mt-2 text-[11px] text-slate-400">
                <div>Outfit
                  <div className="flex gap-1.5 mt-1 flex-wrap">{["#2e6cb5", "#b04848", "#3f8a4f", "#8a4f9e", "#c2903c", "#3c3f4a"].map((c) => (
                    <button key={c} onClick={() => setOutfit((o) => ({ ...o, gi: c }))} className={"w-7 h-7 rounded-full border-2 " + (outfit.gi === c ? "border-white" : "border-slate-700")} style={{ background: c }} />))}
                  </div>
                </div>
                <div>Huid
                  <div className="flex gap-1.5 mt-1 flex-wrap">{["#f2d3b0", "#e0b98f", "#b98253", "#7c4f2e"].map((c) => (
                    <button key={c} onClick={() => setOutfit((o) => ({ ...o, huid: c }))} className={"w-7 h-7 rounded-full border-2 " + (outfit.huid === c ? "border-white" : "border-slate-700")} style={{ background: c }} />))}
                  </div>
                </div>
                <div>Haar
                  <div className="flex gap-1.5 mt-1 flex-wrap">{["#2b2119", "#171c26", "#6b4a2b", "#a8742f", "#8a8f99"].map((c) => (
                    <button key={c} onClick={() => setOutfit((o) => ({ ...o, haar: c }))} className={"w-7 h-7 rounded-full border-2 " + (outfit.haar === c ? "border-white" : "border-slate-700")} style={{ background: c }} />))}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Je <b>bouw</b> volgt automatisch je buddy: kracht → bredere schouders & ledematen, uithouding → pezig, graad → lengte, verwaarlozing → vermoeide houding. Kledij is <b>puur cosmetisch</b> — nooit gevechtsvoordeel. Je riem en handschoenrand houden je teamkleur.</p>
            </div>

            <div className="rounded-lg bg-slate-950/60 border border-yellow-700/40 p-3">
              <label className="text-xs font-semibold text-yellow-400">✦ SIGNATURE-COMBO (special-knop — stel 3 bewegingen samen)</label>
              <div className="mt-2">{comboEditor}</div>
              <p className="text-[11px] text-slate-500 mt-2">Je special voert deze 3 op een rij uit. De knop start <b>opgeladen</b>; na gebruik herlaadt hij ~{COMBO_RECHARGE}s. Wissel hem ook tijdens de rust. Pc: <b>I</b> · mobiel: de gouden knop.</p>
            </div>

            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
              <div className="flex items-center justify-between"><label className="text-xs font-semibold text-slate-400">BUDDY-VERZORGING (mock)</label><span className="text-[11px] text-slate-500">top vs. verwaarloosd ≈ {spanPct}%</span></div>
              <input type="range" min="0" max="100" value={verzorging} onChange={(e) => setVerzorging(+e.target.value)} className="w-full mt-2" />
              <div className="flex justify-between text-[11px] text-slate-500"><span>verwaarloosd</span><span>top</span></div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                <div className="bg-slate-800/60 rounded p-2">ATP-plafond<br /><b className="text-slate-200">{Math.round(pMock.plafond)}</b></div>
                <div className="bg-slate-800/60 rounded p-2">Reik<br /><b className="text-slate-200">{Math.round(pMock.reik)}px</b></div>
                <div className="bg-slate-800/60 rounded p-2">Kracht<br /><b className="text-slate-200">×{pMock.kracht.toFixed(2)}</b></div>
              </div>
              <button onClick={() => setToonStats((v) => !v)} className="text-[11px] text-sky-400 mt-2">{toonStats ? "▲ verberg" : "▼ toon"} KLUSCE-stats</button>
              {toonStats && (<div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">{[["K", "Kracht"], ["L", "Lenigheid"], ["U", "Uithouding"], ["S", "Snelheid"], ["C", "Coördinatie"], ["E", "Evenwicht"]].map(([k, lbl]) => (<label key={k} className="text-[11px] text-slate-400">{lbl}: <b className="text-slate-200">{stats[k]}</b><input type="range" min="0" max="100" value={stats[k]} onChange={(e) => setStats((s) => ({ ...s, [k]: +e.target.value }))} className="w-full" /></label>))}</div>)}
            </div>

            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
              <button onClick={() => setToonTuning((v) => !v)} className="text-xs font-semibold text-amber-400">{toonTuning ? "▲ verberg" : "⚙ toon"} FINETUNEN</button>
              {toonTuning && (<div className="space-y-2 mt-2 text-[11px] text-slate-400">
                <label className="block">ATP-kosten (hoger = sneller leeg): <b className="text-slate-200">×{tuning.tempoKost.toFixed(2)}</b><input type="range" min="0.6" max="1.6" step="0.05" value={tuning.tempoKost} onChange={(e) => setT("tempoKost", +e.target.value)} className="w-full" /></label>
                <label className="block">Stagger-duur: <b className="text-slate-200">×{tuning.staggerDuur.toFixed(2)}</b><input type="range" min="0.6" max="1.6" step="0.05" value={tuning.staggerDuur} onChange={(e) => setT("staggerDuur", +e.target.value)} className="w-full" /></label>
                <label className="block">AI-scherpte: <b className="text-slate-200">{tuning.aiScherpte}</b><input type="range" min="0" max="100" value={tuning.aiScherpte} onChange={(e) => setT("aiScherpte", +e.target.value)} className="w-full" /></label>
              </div>)}
            </div>

            <div className="flex gap-4 text-xs text-slate-400">
              <label className="flex items-center gap-1"><input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} /> reduced motion</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={colorblind} onChange={(e) => setColorblind(e.target.checked)} /> kleurenblind-vriendelijk</label>
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed"><b className="text-slate-400">Pc:</b> A/D of ←/→ = bewegen · ↑/W = hoog mikken, ↓/S = laag, niets = midden · <b className="text-rose-300">J = slag</b> · <b className="text-orange-300">K = schop</b> · L (hold) = afweer · Shift = ontwijk-dash (ontwijk een aanval → je counter doet 1.6× schade) · <b className="text-emerald-300">Spatie = springen</b> (met richting = over de tegenstander) · <b className="text-yellow-300">I = signature-combo in slow-motion</b>.<br /><b className="text-slate-400">Vrije combo:</b> blijf J/K drukken tijdens je aanval om hits aaneen te rijgen (max {COMBO_MAX}).<br /><b className="text-slate-400">Blok op de juiste hoogte + net op tijd = ZEN-PARRY.</b> Fout blokken = schampt.<br /><b className="text-slate-400">Mobiel:</b> stick = bewegen + hoogte mikken · knoppen slag/schop/afweer(hold)/dash/sprong/✦.</div>
            <button onClick={startMatch} className="w-full py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-lg">ZOEK SPARRING ▶</button>
          </div>
        )}

        {screen === "playing" && (
          <>
          <div className="relative select-none" style={{ touchAction: "none" }}>
            <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-xl border border-slate-800 bg-black" style={{ aspectRatio: W + " / " + H }} />
            <button onClick={quit} className="absolute right-2 top-2 text-xs px-2 py-1 rounded bg-slate-900/80 border border-slate-700 text-slate-300">✕</button>
            {pauze && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-xl p-4 overflow-y-auto">
                <div className="w-full max-w-md text-center space-y-3">
                  <h3 className="text-xl font-black text-emerald-400">RUST — eten & drinken</h3>
                  <p className="text-xs text-slate-400">Kies wat je binnenkrijgt om aan te sterken voor ronde 2. Koolhydraten laden je glycolyse, water/rust herstelt en ontzuurt.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ETEN.map((it) => (<button key={it.id} disabled={!!gegeten[it.id]} onClick={() => kiesEten(it)} className={"p-3 rounded-lg text-left text-sm " + (gegeten[it.id] ? "bg-slate-800 text-slate-500" : "bg-slate-700 hover:bg-slate-600 text-slate-100")}><div className="font-bold">{it.txt}</div><div className="text-[11px] text-slate-400">{gegeten[it.id] ? "✓ genomen" : it.uitleg}</div></button>))}
                  </div>
                  <div className="text-left"><div className="text-[11px] font-semibold text-yellow-400 mb-1">✦ Wissel je signature-combo</div>{comboEditor}</div>
                  <button onClick={startNu} className="w-full py-2 rounded-lg bg-sky-500 text-slate-950 font-black">RONDE 2 ▶</button>
                </div>
              </div>
            )}
          </div>
          {isTouch && !pauze && (
            <div className="flex items-center justify-between gap-3 mt-2 select-none" style={{ touchAction: "none" }}>
              <div ref={joyBox}
                onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onJoy(e); }}
                onPointerMove={(e) => { if (moveRef.current.active) onJoy(e); }}
                onPointerUp={joyEnd} onPointerCancel={joyEnd}
                className="relative rounded-full border-2 border-slate-500/80 bg-slate-800/80 shrink-0" style={{ width: 96, height: 96, touchAction: "none" }}>
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-[9px] pointer-events-none leading-tight text-center">hoog<br />◄ ►<br />laag</div>
                <div ref={nubRef} className="absolute rounded-full bg-slate-300/90 border border-slate-100/40 pointer-events-none" style={{ width: 36, height: 36, left: 28, top: 28, transition: "transform 40ms linear" }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5 flex-1 max-w-[260px]">
                <button onPointerDown={btn("dash")} className="h-12 rounded-lg bg-sky-500/90 text-slate-950 font-black text-[10px]">DASH</button>
                <button onPointerDown={btn("slag")} className="h-12 rounded-lg bg-rose-500/90 text-slate-950 font-black text-[10px]">SLAG</button>
                <button onPointerDown={btn("schop")} className="h-12 rounded-lg bg-orange-500/90 text-slate-950 font-black text-[10px]">SCHOP</button>
                <button onPointerDown={btn("sprong")} className="h-12 rounded-lg bg-violet-500/90 text-slate-950 font-black text-[10px]">SPRONG</button>
                <button onPointerDown={btn("special")} className="h-12 rounded-lg bg-yellow-400/95 text-slate-950 font-black text-base">✦</button>
                <button onPointerDown={(e) => { e.preventDefault(); blockRef.current = true; }} onPointerUp={() => { blockRef.current = false; }} onPointerLeave={() => { blockRef.current = false; }} className="h-12 rounded-lg bg-emerald-500/90 text-slate-950 font-black text-[9px] leading-tight">AFWEER<br />(hou vast)</button>
              </div>
            </div>
          )}
          </>
        )}

        {screen === "end" && result && (
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 space-y-3 text-center">
            <h2 className="text-3xl font-black" style={{ color: result.gewonnen ? "#4ade80" : result.gelijk ? "#e8c14a" : "#f87171" }}>{result.gewonnen ? "GEWONNEN" : result.gelijk ? "GELIJKSPEL" : "VERLOREN"}</h2>
            <p className="text-lg">Conditie: <span style={{ color: "#4ade80" }}>jij {result.hg}%</span><span className="text-slate-500"> — </span><span style={{ color: "#ff6b6b" }}>{result.ag}% {result.bossNaam}</span></p>
            <p className="text-sm text-slate-400">{result.reden === "staking" ? "De scheidsrechter staakte de partij wegens uitputting — niemand gaat hier knock-out." : "Tijd om: de jury besliste op de resterende conditie."}</p>
            <div className="text-sm text-slate-300 bg-slate-950/50 rounded p-3 inline-block">Coins (fase A – niet opgeslagen): <b className="text-yellow-400">+{result.coins}</b> · Ranking: <b className="text-yellow-400">+{result.ranking}</b></div>
            {result.graad >= 2 && (<div className="text-left text-sm text-slate-300 bg-slate-950/50 rounded p-3"><div className="font-bold text-slate-200 mb-1">⚡ Energie-nabespreking</div>{nabespreking(result).map((r, i) => <div key={i} className="text-slate-400 mb-1">• {r}</div>)}{result.graad >= 3 && (<div className="text-[11px] text-slate-500 mt-1">Rake treffers: {result.rec.treffers} · zen-parries: {result.rec.parries} · geschampt: {result.rec.geschampt} · langst zonder glycolyse: {fmt(result.rec.maxGlyc)} · tijd met lage conditie: {fmt(result.rec.condLaag)}</div>)}</div>)}
            <div className="flex gap-2"><button onClick={startMatch} className="flex-1 py-3 rounded-lg bg-sky-500 text-slate-950 font-black">OPNIEUW ▶</button><button onClick={() => setScreen("menu")} className="flex-1 py-3 rounded-lg bg-slate-800 text-slate-200 font-semibold">MENU</button></div>
          </div>
        )}

        <p className="text-[11px] text-slate-600 mt-3 text-center">Geen bloed · zichtbare bescherming · geen knock-outs: de scheids staakt bij uitputting. Kracht daalt bij vermoeidheid. Coins cosmetisch, beheer beïnvloedt (±{spanPct}%), skill beslist mee. Geen gezondheidsdata.</p>
      </div>
    </div>
  );
}

/* ================= teken-helpers ================= */
/* ================= render: nachtkooi met sfeer ================= */
let _st = null, _sky = null;
function rndGen(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
function sterren() { if (_st) return _st; const rnd = rndGen(12345); _st = Array.from({ length: 60 }, () => ({ x: rnd() * W, y: rnd() * 150, r: rnd() * 1.3 + 0.3, tw: rnd() * 6.28 })); return _st; }
function skyline() {
  if (_sky) return _sky;
  const rnd = rndGen(777); const lagen = [[], []];
  for (let laag = 0; laag < 2; laag++) {
    let x = -20;
    while (x < W + 40) {
      const bw = 46 + rnd() * 70, bh = (laag === 0 ? 66 : 128) + rnd() * (laag === 0 ? 58 : 108);
      const ramen = [];
      for (let wy = 14; wy < bh - 10; wy += 16) for (let wx = 7; wx < bw - 11; wx += 13) if (rnd() < 0.27) ramen.push([wx, wy]);
      lagen[laag].push({ x, w: bw, h: bh, ramen });
      x += bw + 4 + rnd() * 26;
    }
  }
  _sky = lagen; return _sky;
}
function gloed(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(" + rgb + "," + a + ")"); g.addColorStop(1, "rgba(" + rgb + ",0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}

function tekenKooi(ctx, img, opt) {
  const T = opt.reducedMotion ? 0 : performance.now() / 1000;
  if (img) { ctx.drawImage(img, 0, 0, W, GROUND + 20); }
  else {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, "#070d1c"); sky.addColorStop(0.55, "#0d1a30"); sky.addColorStop(1, "#1a2c44");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
    ctx.fillStyle = "#dfe9ff";
    sterren().forEach((st) => { ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(T * 0.7 + st.tw)); ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    gloed(ctx, W - 130, 64, 74, "215,228,255", 0.4);
    ctx.fillStyle = "#eef2ff"; ctx.beginPath(); ctx.arc(W - 130, 64, 21, 0, 7); ctx.fill();
    ctx.fillStyle = "#0d1a30"; ctx.beginPath(); ctx.arc(W - 121, 57, 18, 0, 7); ctx.fill();
    const sk = skyline();
    ctx.fillStyle = "#0c1526"; sk[1].forEach((b) => ctx.fillRect(b.x, GROUND - 40 - b.h, b.w, b.h + 40));
    ctx.fillStyle = "#e8c98a"; ctx.globalAlpha = 0.45; sk[1].forEach((b) => b.ramen.forEach((r2) => ctx.fillRect(b.x + r2[0], GROUND - 40 - b.h + r2[1], 5, 7)));
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#111d33"; sk[0].forEach((b) => ctx.fillRect(b.x, GROUND - 20 - b.h, b.w, b.h + 20));
    ctx.fillStyle = "#ffe0a1"; ctx.globalAlpha = 0.7; sk[0].forEach((b) => b.ramen.forEach((r2) => ctx.fillRect(b.x + r2[0], GROUND - 20 - b.h + r2[1], 6, 8)));
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0a1712"; ctx.beginPath(); ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 34) ctx.lineTo(x, GROUND - 62 - Math.sin(x * 0.06) * 18 - ((x % 68 === 0) ? 22 : 0));
    ctx.lineTo(W, GROUND); ctx.fill();
  }
  // kunstgras met maaibanen + lijnen
  const fl = ctx.createLinearGradient(0, GROUND, 0, H); fl.addColorStop(0, "#41724a"); fl.addColorStop(1, "#22392a");
  ctx.fillStyle = fl; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.globalAlpha = 0.09; ctx.fillStyle = "#000";
  for (let i = 0; i < 10; i++) if (i % 2) ctx.fillRect(i * (W / 10), GROUND, W / 10, H - GROUND);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(235,245,255,0.5)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W / 2, GROUND); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 34, 92, 15, 0, 0, 7); ctx.stroke();
  // chain-link hek
  ctx.save(); const top = GROUND - 170;
  ctx.strokeStyle = "rgba(140,170,205,0.18)"; ctx.lineWidth = 1.5;
  for (let x = -170; x < W + 170; x += 17) {
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 170, GROUND); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 170, top); ctx.lineTo(x, GROUND); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(160,190,225,0.5)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.stroke();
  ctx.strokeStyle = "rgba(150,180,215,0.42)"; ctx.lineWidth = 4;
  [90, W / 2 - 6, W - 90].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, GROUND); ctx.stroke(); });
  ctx.restore();
  // lantaarns met lichtkegel
  [150, W - 150].forEach((lx) => {
    const arm = lx < W / 2 ? 28 : -28, kx = lx + arm;
    ctx.strokeStyle = "#161f2e"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(lx, GROUND); ctx.lineTo(lx, GROUND - 190); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx, GROUND - 190); ctx.lineTo(kx, GROUND - 197); ctx.stroke();
    gloed(ctx, kx, GROUND - 195, 26, "255,220,150", 0.85);
    const keg = ctx.createLinearGradient(0, GROUND - 195, 0, GROUND);
    keg.addColorStop(0, "rgba(255,220,150,0.15)"); keg.addColorStop(1, "rgba(255,220,150,0)");
    ctx.fillStyle = keg; ctx.beginPath(); ctx.moveTo(kx - 8, GROUND - 195); ctx.lineTo(kx + 8, GROUND - 195); ctx.lineTo(kx + 86, GROUND); ctx.lineTo(kx - 86, GROUND); ctx.closePath(); ctx.fill();
  });
  // warme lichtplassen op de vloer + lage grondmist
  [150 + 28, W - 150 - 28].forEach((kx) => { ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = "#ffd9a0"; ctx.beginPath(); ctx.ellipse(kx, GROUND + 16, 96, 15, 0, 0, 7); ctx.fill(); ctx.restore(); });
  const mist = ctx.createLinearGradient(0, GROUND - 46, 0, GROUND + 4);
  mist.addColorStop(0, "rgba(140,165,200,0)"); mist.addColorStop(1, "rgba(140,165,200,0.10)");
  ctx.fillStyle = mist; ctx.fillRect(0, GROUND - 46, W, 50);
  // vignet
  const vg = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.35, W / 2, H * 0.5, H * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
function schaduw(ctx, x, z) { const s = clamp(1 - (z || 0) / 300, 0.4, 1); ctx.save(); ctx.globalAlpha = 0.34 * s; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(x, GROUND + 2, 27 * s, 8 * s, 0, 0, 7); ctx.fill(); ctx.restore(); }

/* ===== two-bone IK: echte gewrichten (elleboog/knie) ===== */
function ik(ax, ay, ex, ey, l1, l2, dir) {
  let dx = ex - ax, dy = ey - ay, d = Math.hypot(dx, dy) || 0.001;
  const lmax = l1 + l2 - 0.6;
  if (d > lmax) { ex = ax + (dx / d) * lmax; ey = ay + (dy / d) * lmax; dx = ex - ax; dy = ey - ay; d = lmax; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d;
  return { jx: ax + ux * a - uy * h * dir, jy: ay + uy * a + ux * h * dir, ex, ey };
}
/* teken 2-segment ledemaat met gewricht; geeft posities terug */
function bot2(ctx, ax, ay, ex, ey, l1, l2, dir, kleur, d1, d2) {
  const p = ik(ax, ay, ex, ey, l1, l2, dir);
  ctx.lineCap = "round";
  // cel-shading: donkere outline-onderlaag, dan de vulling, dan een lichte highlight
  ctx.strokeStyle = "rgba(8,12,20,0.55)";
  ctx.lineWidth = d1 + 2.6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(p.jx, p.jy); ctx.stroke();
  ctx.lineWidth = d2 + 2.6; ctx.beginPath(); ctx.moveTo(p.jx, p.jy); ctx.lineTo(p.ex, p.ey); ctx.stroke();
  ctx.strokeStyle = kleur;
  ctx.lineWidth = d1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(p.jx, p.jy); ctx.stroke();
  ctx.lineWidth = d2; ctx.beginPath(); ctx.moveTo(p.jx, p.jy); ctx.lineTo(p.ex, p.ey); ctx.stroke();
  ctx.strokeStyle = "rgba(255,240,210,0.16)";
  ctx.lineWidth = Math.max(1.6, d1 * 0.3); ctx.beginPath(); ctx.moveTo(ax, ay - d1 * 0.26); ctx.lineTo(p.jx, p.jy - d1 * 0.26); ctx.stroke();
  ctx.fillStyle = kleur; ctx.beginPath(); ctx.arc(p.jx, p.jy, (d1 + d2) / 4.4, 0, 7); ctx.fill();
  ctx.strokeStyle = "rgba(8,12,20,0.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.jx, p.jy, (d1 + d2) / 4.4, 0, 7); ctx.stroke();
  return p;
}
const ARM1 = 17, ARM2 = 16, BEEN1 = 24, BEEN2 = 22;

function tekenVechterSprite(ctx, f) {
  let naam = f.animNaam, d = SPRITE_DEFS[naam], img = spriteVan(f.team, naam);
  if (!img && naam.includes("_")) {                       // fallback: hoogte-variant ontbreekt -> generieke sheet
    const basis = naam.split("_")[0];
    if (SPRITE_DEFS[basis]) { naam = basis; d = SPRITE_DEFS[basis]; img = spriteVan(f.team, basis); }
  }
  if (!img) return false;
  const fw = img.width / d.frames, fh = img.height;
  const idx = d.loop ? Math.floor(f.animT * d.fps) % d.frames : Math.min(Math.floor(f.animT * d.fps), d.frames - 1);
  const sc = SPRITE_HOOGTE / fh, dw = fw * sc, dh = SPRITE_HOOGTE;
  ctx.save(); ctx.translate(f.x, GROUND - f.z); ctx.scale(f.facing, 1);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, idx * fw, 0, fw, fh, -dw / 2, -dh, dw, dh);
  ctx.restore();
  return true;
}

function tekenVechter(ctx, f, opt) {
  if (tekenVechterSprite(ctx, f)) {                      // echte sprites zodra ze bestaan; anders vector-fallback
    if (f.state === "attacking" && f.phase === "windup") {
      ctx.globalAlpha = opt.reducedMotion ? 0.55 : 0.5;
      ctx.fillStyle = f.atkKind === "schop" ? "#ff9a3c" : "#ffe08a";
      ctx.beginPath(); ctx.arc(f.x + f.facing * 30, zoneY[f.atkH] - f.z, 16, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    return;
  }
  const blauw = f.team === "blauw";
  const lk = f.look;
  const gi = lk.outfit, giD = shade(gi, -45), giL = shade(gi, 35);
  const accent = blauw ? "#4aa3ff" : "#ff6b6b";                 // teamkleur blijft op riem/handschoenrand (leesbaarheid)
  const besch = shade(gi, 96);
  const huid = lk.huid, huidD = shade(lk.huid, -32), haar = lk.haar;
  const fc = f.facing, x = f.x;
  const T = opt.reducedMotion ? 0 : performance.now() / 1000;
  const rustig = f.onGround && (f.state === "idle" || f.state === "blocking") && Math.abs(f.vx) < 24;
  const bob = rustig ? Math.sin(T * 2.6 + (blauw ? 0 : 1.9)) * 1.6 * (1 - lk.moe * 0.5) : 0;
  const loopt = f.onGround && Math.abs(f.vx) > 24 && f.state !== "dashing";
  const gait = Math.sin(T * 9), zw = loopt ? gait * 9 : 0;
  const wind = f.state === "attacking" && f.phase === "windup";
  const actief = f.state === "attacking" && f.phase === "active";
  const herstel = f.state === "attacking" && f.phase === "recovery";
  const ext = actief ? 1 : herstel ? 0.55 : 0;
  // uppercut: knie-dip in de windup, explosief strekken bij active
  const dip = f.atkKind === "uppercut" && wind ? 5 : 0;
  /* romp-rotatie: de romp is een AS die vanuit de heup kantelt (positief = voorover t.o.v. kijkrichting).
     Hoeken gemodelleerd naar de referentiefoto's: hoge trap ~-38° achterover, mid licht achterover, laag rechtop. */
  let th = 0.04 + lk.moe * 0.05, rot = 0;                        // verwaarloosde buddy hangt licht (houding, geen lichaamsvorm)
  if (f.state === "attacking") {
    if (f.atkKind === "schop") {
      const doelTh = f.atkH === HOOG ? -0.66 : f.atkH === LAAG ? 0.10 : -0.14;   // ref-foto 1 / 3 / 2
      th = wind ? doelTh * 0.3 : herstel ? doelTh * 0.55 : doelTh;
    } else if (f.atkKind === "uppercut") th = wind ? 0.16 : actief ? -0.08 : 0.02;
    else if (f.atkKind === "hoofdstoot") th = wind ? -0.2 : actief ? 0.32 : 0.14;
    else th = wind ? -0.12 : actief ? 0.24 : 0.1;                                 // slag: laden -> voorover-drive
  }
  else if (f.state === "dashing") th = 0.22 * f.dashDir * fc;
  else if (f.state === "stagger") { th = -0.3; rot = opt.reducedMotion ? 0 : Math.sin(T * 26) * 0.05; }
  else if (!f.onGround) th = 0.12;

  const voetY = GROUND - 3, heupY = GROUND - 46 + bob + dip;
  const ROMP = 40, KOP = 59;
  const sx = x + fc * Math.sin(th) * ROMP;
  const schY = heupY - Math.cos(th) * ROMP;
  const kinIn = (actief && (f.atkKind === "slag" || f.atkKind === "hoofdstoot")) || (wind && f.atkKind === "hoofdstoot") ? 2 : 0;
  let hx0 = x + fc * Math.sin(th * 1.18) * KOP;                                   // hoofd kantelt iets verder mee dan de romp
  let hy0 = heupY - Math.cos(th * 1.18) * KOP + kinIn;
  if (f.atkKind === "hoofdstoot" && f.state === "attacking") hx0 += wind ? -fc * 6 : actief ? fc * 12 : fc * 5;

  ctx.save(); ctx.translate(x, -f.z); ctx.rotate(rot); ctx.translate(-x, 0); ctx.lineCap = "round";
  ctx.translate(x, GROUND); ctx.scale(lk.schaal, lk.schaal); ctx.translate(-x, -GROUND);   // lengte per graad

  // telegraph tijdens windup
  if (wind) {
    ctx.globalAlpha = opt.reducedMotion ? 0.55 : 0.45 + 0.3 * Math.sin(T * 14);
    ctx.fillStyle = f.atkKind === "schop" ? "#ff9a3c" : "#ffe08a";
    ctx.beginPath(); ctx.arc(x + fc * 30, zoneY[f.atkH], 16, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (f.state === "dashing" && !opt.reducedMotion) {
    ctx.strokeStyle = "rgba(200,225,255,0.4)"; ctx.lineWidth = 2;
    [schY, heupY, GROUND - 20].forEach((ly, i) => { ctx.beginPath(); ctx.moveTo(x - f.dashDir * (24 + i * 8), ly); ctx.lineTo(x - f.dashDir * (46 + i * 10), ly); ctx.stroke(); });
  }

  /* ---- pose-doelen (anatomisch per techniek) ---- */
  const schop = f.atkKind === "schop" && f.state === "attacking";
  const tx = x + fc * (14 + ext * (f.params.reik + (f.atkDef ? f.atkDef.reik : 20))), ty = zoneY[f.atkH];
  // enkels
  let vEnk = { x: x + 8 + zw, y: voetY - (loopt ? Math.max(0, gait) * 5 : 0) };
  let aEnk = { x: x - 8 - zw, y: voetY - (loopt ? Math.max(0, -gait) * 5 : 0) };
  if (!f.onGround) { vEnk = { x: x + fc * 6, y: heupY + 8 }; aEnk = { x: x - fc * 4, y: heupY + 11 }; }               // tuck
  else if (f.state === "dashing") { vEnk = { x: x + f.dashDir * 15, y: voetY }; aEnk = { x: x - f.dashDir * 13, y: voetY }; }
  else if (f.state === "stagger") { vEnk = { x: x + fc * 5, y: voetY }; aEnk = { x: x - fc * 17, y: voetY }; }
  else if (schop) {
    const chY = f.atkH === HOOG ? -9 : f.atkH === LAAG ? 11 : -2;                                                       // chamber-hoogte volgt het doel
    if (wind) vEnk = { x: x + fc * (f.atkH === HOOG ? 8 : 10), y: heupY + chY };                                         // chamber: knie hoog (ref-foto 2), laag doel = lage chamber (ref-foto 3)
    else if (actief) vEnk = { x: tx, y: ty };                                                                            // extension: heup roteert door
    else vEnk = { x: x + fc * 9, y: heupY + (f.atkH === LAAG ? 13 : 6) };                                                // rechamber
    aEnk = { x: x - fc * (f.atkH === HOOG && actief ? 2 : 6), y: voetY };                                                // standbeen: bij hoge trap bijna gestrekt onder de heup (ref-foto 1)
  } else if (f.state === "attacking" && actief && f.atkKind === "slag") {
    aEnk = { x: x - 8, y: voetY - 6 };                                                                                   // achterhiel lift (drive)
  }
  // polsen — default: klassieke guard (voorhand ver, achterhand bij de kaak)
  let vPols = { x: x + fc * 13, y: schY - 2 }, aPols = { x: sx + fc * 2, y: schY - 4 };
  if (f.state === "blocking") { const gy = zoneY[f.guardH]; vPols = { x: x + fc * 11, y: gy - 1 }; aPols = { x: x + fc * 5, y: gy + 6 }; }
  else if (f.state === "stagger") { const zwab = opt.reducedMotion ? 0 : Math.sin(T * 22) * 3; vPols = { x: x + fc * 7, y: heupY + 5 + zwab }; aPols = { x: x - fc * 9, y: heupY + 8 - zwab }; }
  else if (f.state === "dashing") { vPols = { x: x + fc * 9, y: schY + 2 }; aPols = { x: x + fc * 1, y: schY }; }
  else if (f.state === "attacking") {
    if (f.atkKind === "slag") { vPols = wind ? { x: sx - fc * 2, y: schY + 1 } : { x: tx, y: ty }; }
    else if (f.atkKind === "uppercut") { vPols = wind ? { x: x + fc * 3, y: heupY - 1 } : { x: tx, y: ty }; }
    else if (f.atkKind === "hoofdstoot") { vPols = { x: x + fc * 13, y: schY - 6 }; aPols = { x: x + fc * 6, y: schY - 5 }; }        // frame hoog
    else if (schop) {
      if (f.atkH === HOOG && !wind) { vPols = { x: x - fc * 5, y: schY - 2 }; aPols = { x: x + fc * 3, y: schY - 9 }; }   // hoge trap: vuist voor de borst + vuist bij het hoofd (ref-foto 1)
      else { vPols = { x: x + fc * 11, y: schY - 3 }; aPols = { x: x + fc * 4, y: schY - 4 }; }                            // guard hoog bij het gezicht (ref-foto 2/3)
    }
  } else if (loopt) { vPols.y += gait * 1.5; aPols.y -= gait * 1.5; }

  const voetTeken = (vx2, vy2, dir2) => {
    ctx.fillStyle = "#23252e"; ctx.beginPath(); ctx.ellipse(vx2 + dir2 * 4, vy2 + 1, 7.5, 3.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#3a3d49"; ctx.beginPath(); ctx.ellipse(vx2 + dir2 * 4, vy2 - 1.4, 6.5, 2.6, 0, 0, 7); ctx.fill();
  };
  const handTeken = (p, r) => {
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(p.ex, p.ey, r, 0, 7); ctx.fill();
    ctx.strokeStyle = besch; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.ex, p.ey, r, 0, 7); ctx.stroke();
    const bx = p.ex + (p.jx - p.ex) * 0.28, by = p.ey + (p.jy - p.ey) * 0.28;                       // polsband
    ctx.strokeStyle = besch; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx - 2, by - 2); ctx.lineTo(bx + 2, by + 2); ctx.stroke();
  };
  const scheenTeken = (p) => {
    const ax2 = p.jx + (p.ex - p.jx) * 0.3, ay2 = p.jy + (p.ey - p.jy) * 0.3;
    const bx2 = p.jx + (p.ex - p.jx) * 0.9, by2 = p.jy + (p.ey - p.jy) * 0.9;
    ctx.strokeStyle = besch; ctx.lineWidth = 8.5; ctx.beginPath(); ctx.moveTo(ax2, ay2); ctx.lineTo(bx2, by2); ctx.stroke();
  };

  /* ---- teken-volgorde: achter -> voor ---- */
  // achterarm
  const pa = bot2(ctx, sx - fc * 5, schY + 1, aPols.x, aPols.y, ARM1, ARM2, 1, giD, 7 * lk.spier, 5.5 * lk.spier * lk.pezig);
  handTeken(pa, 6);
  // achterbeen
  const pb = bot2(ctx, x - 4, heupY, aEnk.x, aEnk.y, BEEN1, BEEN2, -fc, giD, 9.5 * lk.spier, 7.5 * lk.spier * lk.pezig);
  scheenTeken(pb); voetTeken(pb.ex, pb.ey, f.state === "attacking" && actief && (f.atkKind === "slag" || f.atkKind === "schop") ? -fc : fc);
  // torso: gi met overslag, schaduwkant, rim-light
  const torsoGrad = ctx.createLinearGradient(x, schY - 10, x, heupY + 6);
  torsoGrad.addColorStop(0, giL); torsoGrad.addColorStop(0.45, gi); torsoGrad.addColorStop(1, giD);
  ctx.fillStyle = torsoGrad; ctx.strokeStyle = "rgba(8,12,20,0.6)"; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(sx - lk.schBr, schY - 4);
  ctx.quadraticCurveTo(sx + (sx - x) * 0.15, schY - 10, sx + lk.schBr, schY - 4);
  ctx.quadraticCurveTo(x + 12, (schY + heupY) / 2, x + 9, heupY + 2);
  ctx.quadraticCurveTo(x, heupY + 6, x - 9, heupY + 2);
  ctx.quadraticCurveTo(x - 12, (schY + heupY) / 2, sx - 12, schY - 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(Math.min(sx, x) - 14, schY - 12, 13 + (fc < 0 ? 12 : 0), heupY - schY + 20);   // schaduwzijde
  ctx.strokeStyle = "rgba(255,230,170,0.25)"; ctx.lineWidth = 2.5;                                                                  // rim-light
  ctx.beginPath(); ctx.moveTo(sx - lk.schBr, schY - 4); ctx.quadraticCurveTo(sx + (sx - x) * 0.15, schY - 10, sx + lk.schBr, schY - 4); ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 1.4;                                                                        // plooien
  ctx.beginPath(); ctx.moveTo(x - 5, schY + 12); ctx.lineTo(x - 3, heupY - 6); ctx.moveTo(x + 5, schY + 14); ctx.lineTo(x + 4, heupY - 5); ctx.stroke();
  ctx.restore();
  // gi-overslag (revers) + riem met knoop en uiteinden
  ctx.strokeStyle = besch; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(sx + fc * 7, schY - 5); ctx.lineTo(x + fc * 1, heupY - 3); ctx.stroke();
  ctx.strokeStyle = accent; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(x - 9, heupY - 1); ctx.lineTo(x + 9, heupY - 1); ctx.stroke();
  ctx.fillStyle = giD; ctx.fillRect(x + fc * 2 - 3, heupY - 4, 6, 6);
  const zwaai = clamp(-f.vx * 0.02, -4, 4);
  ctx.strokeStyle = accent; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + fc * 2 - 2, heupY + 2); ctx.lineTo(x + fc * 2 - 4 + zwaai, heupY + 11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + fc * 2 + 2, heupY + 2); ctx.lineTo(x + fc * 2 + 4 + zwaai, heupY + 10); ctx.stroke();
  if (f.isAI) { ctx.fillStyle = "rgba(10,14,20,0.85)"; ctx.font = "bold 8px system-ui"; ctx.textAlign = "center"; ctx.fillText("AI", sx - fc * 4, schY + 9); }

  // nek + hoofd met kaaklijn, oor, neus, wenkbrauw
  ctx.strokeStyle = huid; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx + fc * 1, schY - 3); ctx.lineTo(hx0 - fc * 1, hy0 + 8); ctx.stroke();
  ctx.fillStyle = huid; ctx.beginPath();
  ctx.arc(hx0, hy0 - 1, 10.5, Math.PI * 0.85, Math.PI * 2.3);
  ctx.quadraticCurveTo(hx0 + fc * 10, hy0 + 8, hx0 + fc * 4, hy0 + 9.5);                                                            // kaak naar kin
  ctx.quadraticCurveTo(hx0 - fc * 6, hy0 + 10, hx0 - fc * 9, hy0 + 3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = huidD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx0 + fc * 9, hy0 + 1); ctx.lineTo(hx0 + fc * 10.5, hy0 + 2.5); ctx.stroke(); // neus
  ctx.fillStyle = haar; ctx.beginPath(); ctx.arc(hx0 - fc * 1.5, hy0 - 5, 10, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  ctx.strokeStyle = besch; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.arc(hx0, hy0 - 2, 12, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();               // hoofdband
  ctx.fillStyle = besch; ctx.beginPath(); ctx.arc(hx0 - fc * 5, hy0 + 1, 4.4, 0, 7); ctx.fill();                                                        // oorkap
  ctx.strokeStyle = giD; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx0 - fc * 5, hy0 + 1, 4.4, 0, 7); ctx.stroke();
  ctx.strokeStyle = besch; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(hx0, hy0 + 2, 10.5, Math.PI * 0.3, Math.PI * 0.7); ctx.stroke();               // kinband
  ctx.strokeStyle = haar; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx0 + fc * 3, hy0 - 4.5); ctx.lineTo(hx0 + fc * 7.5, hy0 - 4); ctx.stroke(); // wenkbrauw
  ctx.fillStyle = "#1c2430"; ctx.beginPath(); ctx.arc(hx0 + fc * 5.5, hy0 - 1.5, 1.6, 0, 7); ctx.fill();                                                 // oog
  ctx.strokeStyle = huidD; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx0 + fc * 4, hy0 + 5.5); ctx.lineTo(hx0 + fc * 7.5, hy0 + 5); ctx.stroke(); // mond
  if (f.atkKind === "hoofdstoot" && actief) { ctx.strokeStyle = "#ffd54a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx0 + fc * 7, hy0, 14, (fc > 0 ? -0.45 : 0.55) * Math.PI, (fc > 0 ? 0.45 : 1.45) * Math.PI); ctx.stroke(); }
  if (opt.colorblind) { ctx.fillStyle = accent; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center"; ctx.fillText(blauw ? "B" : "R", x, GROUND + 14); }

  // voorbeen (bij schop: het trappende been, met trail)
  const trail = (fn) => { if (opt.reducedMotion || !actief) { ctx.globalAlpha = 1; fn(0); return; } ctx.globalAlpha = 0.14; fn(-fc * 16); ctx.globalAlpha = 0.32; fn(-fc * 8); ctx.globalAlpha = 1; fn(0); };
  if (schop) {
    let pv = null;
    const hVx = f.atkH === HOOG && (actief || herstel) ? x + fc * 2 : x + 4;
    const hVy = f.atkH === HOOG && (actief || herstel) ? heupY - 4 : heupY;
    trail((off) => { pv = bot2(ctx, hVx, hVy, vEnk.x + off, vEnk.y, BEEN1, BEEN2, -fc, gi, 9.5 * lk.spier, 7.5 * lk.spier * lk.pezig); });
    scheenTeken(pv); voetTeken(pv.ex, pv.ey, fc); if (actief) gloed(ctx, pv.ex, pv.ey, 16, "255,180,90", 0.4);
  } else {
    const pv = bot2(ctx, x + 4, heupY, vEnk.x, vEnk.y, BEEN1, BEEN2, -fc, gi, 9.5 * lk.spier, 7.5 * lk.spier * lk.pezig);
    scheenTeken(pv); voetTeken(pv.ex, pv.ey, f.state === "stagger" ? fc : (f.onGround ? 1 : fc));
  }
  // voorarm (bij slag/uppercut: de slaande arm, met trail)
  if (f.state === "attacking" && (f.atkKind === "slag" || f.atkKind === "uppercut") && (actief || herstel)) {
    let pv2 = null;
    trail((off) => { pv2 = bot2(ctx, sx + fc * 5, schY + 1, vPols.x + off, vPols.y + Math.abs(off) * (f.atkKind === "uppercut" ? 0.7 : 0), ARM1, ARM2, 1, gi, 7.5 * lk.spier, 6 * lk.spier * lk.pezig); });
    if (actief && f.atkKind === "uppercut") gloed(ctx, pv2.ex, pv2.ey, 20, "255,213,74", 0.5);
    handTeken(pv2, 8.5);
  } else {
    const pv2 = bot2(ctx, sx + fc * 5, schY + 1, vPols.x, vPols.y, ARM1, ARM2, 1, gi, 7.5 * lk.spier, 6 * lk.spier * lk.pezig);
    handTeken(pv2, f.state === "blocking" ? 8 : 6.5);
  }
  // hoogte-indicator
  if (f.state === "blocking") { ctx.globalAlpha = 0.85; ctx.fillStyle = besch; ctx.font = "10px system-ui"; ctx.textAlign = "center"; ctx.fillText(f.guardH === 1 ? "▲" : f.guardH === -1 ? "▼" : "●", x, hy0 - 20); ctx.globalAlpha = 1; }
  else if (f.isHuman && f.state !== "attacking") { ctx.globalAlpha = 0.75; ctx.fillStyle = "#cbd5e1"; ctx.font = "9px system-ui"; ctx.textAlign = "center"; ctx.fillText(f.guardH === 1 ? "▲ hoog" : f.guardH === -1 ? "▼ laag" : "● mid", x, hy0 - 20); ctx.globalAlpha = 1; }
  ctx.restore();
}

function balk(ctx, x, y, w, h, val, max, kleur, rechts) {
  const r = Math.min(h / 2, 4);
  ctx.fillStyle = "rgba(4,8,16,0.62)"; roundRect(ctx, x, y, w, h, r); ctx.fill();
  const fw = w * clamp(val / max, 0, 1);
  if (fw > 1) {
    ctx.fillStyle = kleur; roundRect(ctx, rechts ? x + w - fw : x, y, fw, h, r); ctx.fill();
    ctx.globalAlpha = 0.28; ctx.fillStyle = "#fff"; roundRect(ctx, rechts ? x + w - fw : x, y, fw, Math.max(1.5, h * 0.35), r); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1; roundRect(ctx, x, y, w, h, r); ctx.stroke();
}
/* portret: close-up van het hoofd in een cirkel (fighting-game stijl) */
function portret(ctx, cx, cy, r, f2) {
  const blauw = f2.team === "blauw", isAI = f2.isAI, lk = f2.look;
  const accent = blauw ? "#4aa3ff" : "#ff6b6b", besch = shade(lk.outfit, 96);
  const huid = lk.huid, huidD = shade(lk.huid, -32), haar = lk.haar;
  const fc = cx < W / 2 ? 1 : -1;                      // kijkt naar het midden
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  const bg = ctx.createLinearGradient(cx, cy - r, cx, cy + r); bg.addColorStop(0, "#131c2e"); bg.addColorStop(1, "#0a111f");
  ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const sc = r / 15, hx = cx - fc * 1, hy = cy + 2;
  ctx.translate(hx, hy); ctx.scale(sc, sc); ctx.translate(-hx, -hy);
  // schouders
  ctx.fillStyle = lk.outfit; ctx.beginPath(); ctx.ellipse(hx, hy + 16, 16, 8, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = besch; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(hx + fc * 6, hy + 10); ctx.lineTo(hx + fc * 1, hy + 18); ctx.stroke();
  // gezicht + kaak
  ctx.fillStyle = huid; ctx.beginPath();
  ctx.arc(hx, hy - 1, 10.5, Math.PI * 0.85, Math.PI * 2.3);
  ctx.quadraticCurveTo(hx + fc * 10, hy + 8, hx + fc * 4, hy + 9.5);
  ctx.quadraticCurveTo(hx - fc * 6, hy + 10, hx - fc * 9, hy + 3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = huidD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx + fc * 9, hy + 1); ctx.lineTo(hx + fc * 10.5, hy + 2.5); ctx.stroke();
  ctx.fillStyle = haar; ctx.beginPath(); ctx.arc(hx - fc * 1.5, hy - 5, 10, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  ctx.strokeStyle = besch; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(hx, hy - 2, 12, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
  ctx.fillStyle = besch; ctx.beginPath(); ctx.arc(hx - fc * 5, hy + 1, 4.4, 0, 7); ctx.fill();
  ctx.strokeStyle = besch; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(hx, hy + 2, 10.5, Math.PI * 0.3, Math.PI * 0.7); ctx.stroke();
  ctx.strokeStyle = haar; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx + fc * 3, hy - 4.5); ctx.lineTo(hx + fc * 7.5, hy - 4); ctx.stroke();
  ctx.fillStyle = "#1c2430"; ctx.beginPath(); ctx.arc(hx + fc * 5.5, hy - 1.5, 1.7, 0, 7); ctx.fill();
  ctx.strokeStyle = huidD; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx + fc * 4, hy + 5.5); ctx.lineTo(hx + fc * 7.5, hy + 5); ctx.stroke();
  ctx.restore();
  // ring
  ctx.strokeStyle = accent; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, 7); ctx.stroke();
  if (isAI) { ctx.fillStyle = "rgba(8,12,20,0.9)"; ctx.beginPath(); ctx.arc(cx + r * 0.62, cy + r * 0.62, 8, 0, 7); ctx.fill(); ctx.fillStyle = "#ff9a9a"; ctx.font = "bold 8px system-ui"; ctx.textAlign = "center"; ctx.fillText("AI", cx + r * 0.62, cy + r * 0.62 + 3); }
}

/* health-kleur op waarde */
function hpKleur(v) { return v > 50 ? "#4ade80" : v > 25 ? "#e8c14a" : "#f4715f"; }

function tekenScorebord(ctx, gs) {
  ctx.save();
  const links = gs.fighters[0].team === "blauw" ? gs.fighters[0] : gs.fighters[1];   // blauw links, rood rechts
  const rechts = links === gs.fighters[0] ? gs.fighters[1] : gs.fighters[0];
  const pr = 26, py = 32;
  // healthbars (klassiek: van portret richting midden), met ghost-schade
  const bw = W / 2 - 130, bh = 17;
  const hpBar = (f, xL, spiegel) => {
    ctx.fillStyle = "rgba(4,8,16,0.72)"; roundRect(ctx, xL, py - bh / 2, bw, bh, 5); ctx.fill();
    const gw = bw * clamp(f.ghost / 100, 0, 1), fw = bw * clamp(f.conditie / 100, 0, 1);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; roundRect(ctx, spiegel ? xL + bw - gw : xL, py - bh / 2, gw, bh, 5); ctx.fill();
    ctx.fillStyle = hpKleur(f.conditie); roundRect(ctx, spiegel ? xL + bw - fw : xL, py - bh / 2, fw, bh, 5); ctx.fill();
    ctx.globalAlpha = 0.3; ctx.fillStyle = "#fff"; roundRect(ctx, spiegel ? xL + bw - fw : xL, py - bh / 2, fw, bh * 0.4, 5); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 1.5; roundRect(ctx, xL, py - bh / 2, bw, bh, 5); ctx.stroke();
  };
  hpBar(links, 62, true); hpBar(rechts, W - 62 - bw, false);
  // portretten in de hoeken
  portret(ctx, 34, py, pr, links);
  portret(ctx, W - 34, py, pr, rechts);
  // namen
  ctx.font = "bold 11px system-ui"; ctx.fillStyle = "#dbe6f5";
  ctx.textAlign = "left"; ctx.fillText(links.isHuman ? "JIJ" : gs.boss.naam.toUpperCase(), 66, py + 24);
  ctx.textAlign = "right"; ctx.fillText(rechts.isHuman ? "JIJ" : gs.boss.naam.toUpperCase(), W - 66, py + 24);
  // timer + ronde in het midden
  ctx.fillStyle = "rgba(10,14,24,0.88)"; ctx.strokeStyle = "#3a4658"; ctx.lineWidth = 2;
  roundRect(ctx, W / 2 - 44, 8, 88, 46, 9); ctx.fill(); ctx.stroke();
  ctx.textAlign = "center"; ctx.font = "bold 20px system-ui"; ctx.fillStyle = "#e8c14a"; ctx.fillText(fmt(gs.timer), W / 2, 32);
  ctx.font = "10px system-ui"; ctx.fillStyle = "#64748b"; ctx.fillText("ronde " + gs.ronde + "/" + RONDES, W / 2, 47);
  ctx.restore();
}
function meterBlok(ctx, f, x, y, graad, rechts) {
  const w = 178; ctx.textAlign = rechts ? "right" : "left"; ctx.font = "10px system-ui"; const lx = rechts ? x + w : x;
  if (graad === 1) {
    const comp = f.pcr / f.params.plafond * 0.4 + f.glyc / f.params.plafond * 0.35 + f.aer / 100 * 0.25;
    ctx.fillStyle = "#cbd5e1"; ctx.fillText("ENERGIE", lx, y + 8); balk(ctx, x, y + 12, w, 12, comp, 1, comp > 0.5 ? "#4ade80" : comp > 0.25 ? "#e8c14a" : "#f87171", rechts);
    balk(ctx, x, y + 30, w, 7, f.balans, 100, "#9fb3c8", rechts);
  } else {
    [["PCr", f.pcr, f.params.plafond, "#8fd0ff"], ["Glyc", f.glyc, f.params.plafond, "#ff9a3c"], ["Aer", f.aer, 100, "#4ade80"]].forEach((r, i) => { const yy = y + i * 13; ctx.fillStyle = "#94a3b8"; ctx.fillText(r[0], lx, yy + 8); balk(ctx, rechts ? x : x + 34, yy, w - 34, 8, r[1], r[2], r[3], rechts); });
    let yy = y + 41; ctx.fillStyle = "#94a3b8"; ctx.fillText("Bal", lx, yy + 8); balk(ctx, rechts ? x : x + 34, yy, w - 34, 6, f.balans, 100, "#9fb3c8", rechts);
    yy += 10; ctx.fillStyle = "#94a3b8"; ctx.fillText("Lac", lx, yy + 8); balk(ctx, rechts ? x : x + 34, yy, w - 34, 6, f.lactaat, 100, "#e879f9", rechts);
    if (graad === 3 && !rechts) { ctx.fillStyle = "#64748b"; ctx.font = "9px system-ui"; ctx.fillText("effectieve kracht ×" + (f.params.kracht * krachtFactor(f)).toFixed(2), x, yy + 22); }
  }
}
function tekenHUD(ctx, gs) {
  ctx.save(); meterBlok(ctx, gs.human, 14, 66, gs.graad, false); meterBlok(ctx, gs.ai, W - 14 - 178, 66, Math.min(gs.graad, 2), true);
  const cy = gs.graad === 1 ? 120 : 140, vol = gs.human.comboCharge >= 1;
  ctx.textAlign = "left"; ctx.font = "bold 10px system-ui"; ctx.fillStyle = vol ? "#ffd54a" : "#8a7d4a"; ctx.fillText(vol ? "✦ COMBO KLAAR (I)" : "✦ opladen…", 14, cy - 2);
  balk(ctx, 14, cy, 178, 7, gs.human.comboCharge, 1, vol ? "#ffd54a" : "#7a6a30", false);
  ctx.restore();
}
function tekenOverlay(ctx, gs) {
  ctx.save(); ctx.textAlign = "center";
  if (gs.mode === "countdown") { const n = Math.ceil(gs.pauseTimer); ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "bold 68px system-ui"; ctx.fillText(n > 0 ? n : "SPAR!", W / 2, H / 2 - 6); ctx.font = "bold 18px system-ui"; ctx.fillStyle = "#ff9a9a"; ctx.fillText("Ronde " + gs.ronde + " · " + gs.boss.naam, W / 2, H / 2 + 30); ctx.font = "13px system-ui"; ctx.fillStyle = "#ffd98a"; const hint = gs.graad >= 3 ? "Ontdek zelf zijn zwakte — lees de aanzet." : gs.boss.zwakte; wrapText(ctx, hint, W / 2, H / 2 + 54, W - 160, 17); }
  else if (gs.mode === "rust") { ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(0, 0, W, H); }
  if (gs.toast.t > 0 && gs.mode === "play") {
    const p = clamp(gs.toast.t * 1.4, 0, 1), sc = 1 + Math.max(0, gs.toast.t - 0.72) * 2.4;
    ctx.save(); ctx.globalAlpha = p; ctx.translate(W / 2, 118); ctx.scale(sc, sc);
    ctx.font = "bold 30px system-ui"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.strokeText(gs.toast.txt, 0, 0);
    ctx.fillStyle = gs.toast.kleur; ctx.fillText(gs.toast.txt, 0, 0); ctx.restore();
  }
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrapText(ctx, txt, cx, y, maxW, lh) { const words = txt.split(" "); let line = "", yy = y; for (let i = 0; i < words.length; i++) { const test = line + words[i] + " "; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), cx, yy); line = words[i] + " "; yy += lh; } else line = test; } ctx.fillText(line.trim(), cx, yy); }
function fmt(s) { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
function nabespreking(res) {
  const out = [];
  if (res.rec.maxGlyc > 0.7) out.push("Je stond " + fmt(res.rec.maxGlyc) + " zonder glycolyse — je slagen werden slap. Doseer je krachtmoves en eet koolhydraten in de rust.");
  if (res.rec.condLaag > 3) out.push("Je conditie zakte lang onder de helft (" + fmt(res.rec.condLaag) + ") — dan daalt je kracht en sla je minder hard. Weer beter af om minder te incasseren.");
  if (res.rec.parries > 0) out.push("Je landde " + res.rec.parries + " zen-parry('s) — juiste hoogte + timing kost geen ATP en straft de aanvaller.");
  if (res.rec.geschampt > 4) out.push("Je werd vaak geschampt: je las de aanzet niet altijd juist. Kijk naar de oplichtende doelzone en zet je guard op die hoogte.");
  if (out.length === 0) out.push("Sterk energie- en hoogtebeheer: fris gebleven en netjes afgeweerd.");
  out.push(res.gewonnen ? "Winst telt: je las je tegenstander en sloeg toe toen die leeg was." : "Verlies is geen straf — lees de aanzet, weer af op hoogte en counter een lege tegenstander.");
  return out;
}
