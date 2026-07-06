// src/components/sportbuddy/tools/EnergieLab.jsx
// Interactieve tool voor de module Energiesystemen (WD2_13.01.04 fysiologie 2de gr. · WD3_13.01.06 energiemetabolisme 3de gr. + trainingsleer
// Sportwetenschappen). Datavrij: alles gaat over de fysiologie en gesimuleerde
// voorbeelden, nooit over de leerling zelf.
//
// De drie energiesystemen die de leerlingen moeten kennen:
//   1. ATP-PCr  (alactisch, anaeroob) — direct, explosief, ~10 s
//   2. Glycolyse (lactisch, anaeroob) — snel, met lactaat, ~10 s–2 min
//   3. Aeroob   (oxidatief)          — traag, onuitputtelijk, duurinspanning
//
// Vier delen:
//   1. Tijdlijn-kruispunt: sleep over de tijd → zie welk systeem overheerst.
//   2. Sport-voorbeelden: kies een inspanning → tijdlijn springt ernaartoe.
//   3. Lactaat-meter: toont hoe lactaat oploopt in de lactische zone.
//   4. Sorteeroefening: sleep/plaats situaties bij het juiste systeem.

import { useState, useMemo } from 'react';

const SYSTEMEN = [
  { id: 'atp', naam: 'ATP-PCr', bijnaam: 'alactisch', kleur: '#ef4444',
    kort: 'Direct & explosief', bron: 'Creatinefosfaat in de spier',
    uitleg: 'Levert onmiddellijk energie voor maximale krachtstoten, maar de voorraad is na ±10 seconden op. Geen zuurstof, geen lactaat.' },
  { id: 'glyco', naam: 'Glycolyse', bijnaam: 'lactisch', kleur: '#f59e0b',
    kort: 'Snel, met lactaat', bron: 'Koolhydraten (glucose)',
    uitleg: 'Springt bij na enkele seconden en levert veel energie voor korte, intense inspanningen. Zonder zuurstof ontstaat hierbij lactaat (melkzuur).' },
  { id: 'aeroob', naam: 'Aeroob', bijnaam: 'oxidatief', kleur: '#22c55e',
    kort: 'Traag & onuitputtelijk', bron: 'Vetten + koolhydraten mét zuurstof',
    uitleg: 'Neemt na 1–2 minuten de bovenhand en levert bijna eindeloos energie voor duurinspanning. Traag op gang, maar zuinig en zonder lactaatophoping.' },
];

// Relatieve bijdrage (0..1) van elk systeem op tijdstip t (seconden, log-schaal).
// Vereenvoudigd model op basis van de klassieke energiesysteem-curves.
function bijdragen(t) {
  // ATP-PCr: hoog bij start, valt weg na ~10 s
  const atp = Math.exp(-t / 7);
  // Glycolyse: piekt rond 10–40 s, zakt daarna
  const glyco = Math.exp(-Math.pow(Math.log(Math.max(t, 1)) - Math.log(25), 2) / 1.1);
  // Aeroob: klimt traag, domineert na 1–2 min
  const aeroob = 1 / (1 + Math.exp(-(t - 75) / 28));
  const som = atp + glyco + aeroob;
  return { atp: atp / som, glyco: glyco / som, aeroob: aeroob / som };
}

// Tijd-as: 0..600 s op een pseudo-log schaal voor mooie spreiding
const TIJDPUNTEN = [1, 2, 3, 5, 8, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300, 600];
function tijdLabel(s) {
  if (s < 60) return `${s} s`;
  const m = s / 60;
  return Number.isInteger(m) ? `${m} min` : `${m.toFixed(1)} min`;
}

const VOORBEELDEN = [
  { label: '💥 Kogelstoten', t: 2 },
  { label: '⚡ 100m sprint', t: 10 },
  { label: '🏃 400m loop', t: 48 },
  { label: '🥊 Boksronde', t: 180 },
  { label: '⚽ Voetbalmatch', t: 90 },
  { label: '🚴 Duurrit', t: 600 },
];

// ─── 1+2. Tijdlijn-kruispunt met sport-sprongen ───────────────────────────────
function Kruispunt() {
  const [idx, setIdx] = useState(9); // start ~45 s
  const t = TIJDPUNTEN[idx];
  const b = useMemo(() => bijdragen(t), [t]);
  const dominant = b.atp >= b.glyco && b.atp >= b.aeroob ? SYSTEMEN[0]
    : b.glyco >= b.aeroob ? SYSTEMEN[1] : SYSTEMEN[2];

  // Curvegrafiek over alle tijdpunten
  const W = 620, H = 220, PADL = 8, PADR = 8, PADB = 26, PADT = 8;
  const xVan = (i) => PADL + (i / (TIJDPUNTEN.length - 1)) * (W - PADL - PADR);
  const yVan = (v) => PADT + (1 - v) * (H - PADT - PADB);
  const curve = (key) => TIJDPUNTEN.map((tp, i) => `${xVan(i).toFixed(1)},${yVan(bijdragen(tp)[key]).toFixed(1)}`).join(' ');

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Het kruispunt van de energiesystemen</h3>
      <p className="text-xs text-gray-500 mb-4">Sleep over de tijdlijn of kies een inspanning. Zie welk systeem de energie levert naarmate de inspanning langer duurt.</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Vlakken onder de curves */}
        {SYSTEMEN.map((s) => (
          <polyline key={s.id} points={curve(s.id === 'atp' ? 'atp' : s.id === 'glyco' ? 'glyco' : 'aeroob')}
            fill="none" stroke={s.kleur} strokeWidth="3" strokeLinejoin="round" opacity="0.9" />
        ))}
        {/* Verticale tijdmarker */}
        <line x1={xVan(idx)} y1={PADT} x2={xVan(idx)} y2={H - PADB} stroke="#374151" strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx={xVan(idx)} cy={yVan(b.atp)} r="4" fill={SYSTEMEN[0].kleur} stroke="#fff" strokeWidth="1.5" />
        <circle cx={xVan(idx)} cy={yVan(b.glyco)} r="4" fill={SYSTEMEN[1].kleur} stroke="#fff" strokeWidth="1.5" />
        <circle cx={xVan(idx)} cy={yVan(b.aeroob)} r="4" fill={SYSTEMEN[2].kleur} stroke="#fff" strokeWidth="1.5" />
        {/* Tijdlabels */}
        {TIJDPUNTEN.map((tp, i) => (i % 2 === 0) && (
          <text key={tp} x={xVan(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">{tijdLabel(tp)}</text>
        ))}
      </svg>

      {/* Tijdlijn-slider */}
      <input
        type="range" min="0" max={TIJDPUNTEN.length - 1} value={idx}
        onChange={(e) => setIdx(+e.target.value)}
        className="w-full accent-purple-600 mt-1"
      />
      <div className="text-center text-sm font-semibold text-gray-700 mb-4">
        Inspanningsduur: <span className="text-purple-700">{tijdLabel(t)}</span>
      </div>

      {/* Bijdrage-balken */}
      <div className="space-y-2 mb-4">
        {SYSTEMEN.map((s) => {
          const pct = Math.round(b[s.id] * 100);
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-700 w-24 shrink-0">{s.naam}</span>
              <div className="flex-grow bg-gray-100 rounded-full h-3">
                <div className="h-3 rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: s.kleur }} />
              </div>
              <span className="text-xs font-bold text-gray-600 w-9 text-right tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-3 text-sm mb-4" style={{ backgroundColor: `${dominant.kleur}15`, color: dominant.kleur }}>
        Bij <strong>{tijdLabel(t)}</strong> levert het <strong>{dominant.naam}-systeem</strong> ({dominant.bijnaam}) de meeste energie.
      </div>

      {/* Sport-voorbeelden */}
      <p className="text-xs font-semibold text-gray-500 mb-2">Spring naar een inspanning:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {VOORBEELDEN.map((v) => {
          // Dichtstbijzijnde tijdpunt zoeken
          const dichtst = TIJDPUNTEN.reduce((best, tp, i) => Math.abs(tp - v.t) < Math.abs(TIJDPUNTEN[best] - v.t) ? i : best, 0);
          return (
            <button key={v.label} type="button" onClick={() => setIdx(dichtst)}
              className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${idx === dichtst ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. Lactaat-meter ─────────────────────────────────────────────────────────
function LactaatMeter() {
  const [intensiteit, setIntensiteit] = useState(50); // % van max
  // Lactaat (mmol/L): laag en stabiel tot de "drempel" (~70%), dan steile stijging
  const lactaat = useMemo(() => {
    const basis = 1.0;
    if (intensiteit < 60) return basis + intensiteit * 0.02;
    const boven = intensiteit - 60;
    return +(basis + 1.2 + Math.pow(boven / 10, 2.1)).toFixed(1);
  }, [intensiteit]);

  const zone = lactaat < 2 ? { label: 'Rustig aeroob', kleur: '#22c55e', uitleg: 'Je lichaam ruimt het lactaat moeiteloos op. Dit hou je uren vol.' }
    : lactaat < 4 ? { label: 'Rond de drempel', kleur: '#f59e0b', uitleg: 'De lactaatdrempel: aanmaak en afbraak zijn in evenwicht. Dit is je duurgrens.' }
    : { label: 'Boven de drempel', kleur: '#ef4444', uitleg: 'Lactaat stapelt sneller op dan je het kunt afbreken. De spieren verzuren — dit hou je maar kort vol.' };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">De lactaatmeter</h3>
      <p className="text-xs text-gray-500 mb-4">Verhoog de intensiteit en zie hoe het lactaat (melkzuur) in het bloed oploopt — traag, tot je de drempel voorbijgaat.</p>

      <div className="flex items-end justify-center gap-6 mb-4">
        <div className="text-center">
          <div className="text-4xl font-bold tabular-nums" style={{ color: zone.kleur }}>{lactaat.toFixed(1)}</div>
          <div className="text-xs text-gray-400">mmol/L lactaat</div>
        </div>
        <div className="w-8 h-32 bg-gray-100 rounded-full relative overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300"
            style={{ height: `${Math.min(100, (lactaat / 12) * 100)}%`, backgroundColor: zone.kleur }} />
        </div>
      </div>

      <div className="flex justify-between text-sm font-semibold text-gray-600 mb-1">
        <span>Intensiteit</span><span>{intensiteit}% van max</span>
      </div>
      <input type="range" min="20" max="100" value={intensiteit} onChange={(e) => setIntensiteit(+e.target.value)} className="w-full accent-purple-600 mb-4" />

      <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: `${zone.kleur}15`, color: zone.kleur }}>
        <strong>{zone.label}.</strong> {zone.uitleg}
      </div>
    </div>
  );
}

// ─── 4. Sorteeroefening ───────────────────────────────────────────────────────
const SORTEER = [
  { situatie: 'Eén maximale gewichtheffersstoot', juist: 'atp' },
  { situatie: 'Een 400m all-out gelopen', juist: 'glyco' },
  { situatie: 'Rustig 10 km joggen', juist: 'aeroob' },
  { situatie: 'Een verspringsprong', juist: 'atp' },
  { situatie: 'Een uur fietsen aan een vast tempo', juist: 'aeroob' },
  { situatie: 'Een intense sprint van 30 seconden op de fiets', juist: 'glyco' },
];

function Sorteeroefening() {
  const [index, setIndex] = useState(0);
  const [gekozen, setGekozen] = useState(null);
  const [score, setScore] = useState(0);
  const [klaar, setKlaar] = useState(false);
  const opgave = SORTEER[index];

  const kies = (id) => {
    if (gekozen) return;
    setGekozen(id);
    if (id === opgave.juist) setScore((s) => s + 1);
  };
  const volgende = () => {
    if (index < SORTEER.length - 1) { setIndex(index + 1); setGekozen(null); }
    else setKlaar(true);
  };
  const opnieuw = () => { setIndex(0); setGekozen(null); setScore(0); setKlaar(false); };

  if (klaar) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <div className="text-5xl mb-3">{score >= 5 ? '🎉' : '💪'}</div>
        <p className="text-lg font-bold text-gray-800 mb-1">{score} / {SORTEER.length} juist</p>
        <p className="text-sm text-gray-500 mb-5">Herken je welk systeem de hoofdrol speelt? Dat is precies wat een trainer inschat bij het opstellen van een training.</p>
        <button type="button" onClick={opnieuw} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Opnieuw oefenen</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Welk systeem overheerst?</h3>
        <span className="text-xs text-gray-400">{index + 1} / {SORTEER.length}</span>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-700">{opgave.situatie}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SYSTEMEN.map((s) => {
          const isJuist = s.id === opgave.juist;
          const isGekozen = gekozen === s.id;
          let stijl = 'border-gray-200 text-gray-700 hover:border-purple-300';
          if (gekozen) {
            if (isJuist) stijl = 'border-green-500 bg-green-50 text-green-800';
            else if (isGekozen) stijl = 'border-red-500 bg-red-50 text-red-800';
            else stijl = 'border-gray-200 text-gray-400';
          }
          return (
            <button key={s.id} type="button" disabled={!!gekozen} onClick={() => kies(s.id)}
              className={`px-2 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${stijl}`}>
              {s.naam}
              <span className="block text-[10px] font-normal mt-0.5">{s.bijnaam}</span>
            </button>
          );
        })}
      </div>

      {gekozen && (
        <div className="mt-4">
          <div className={`rounded-xl p-3 text-sm ${gekozen === opgave.juist ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {gekozen === opgave.juist ? '✅ Juist! ' : `❌ Het was het ${SYSTEMEN.find((s) => s.id === opgave.juist).naam}-systeem. `}
            {SYSTEMEN.find((s) => s.id === opgave.juist).uitleg}
          </div>
          <div className="flex justify-end mt-3">
            <button type="button" onClick={volgende} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">
              {index < SORTEER.length - 1 ? 'Volgende' : 'Bekijk resultaat'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Infokaders ───────────────────────────────────────────────────────────────
function InfoKader({ titel, children }) {
  return (
    <aside className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 h-full">
      <p className="text-xs font-bold text-indigo-700 mb-2">ℹ️ {titel}</p>
      <div className="text-xs text-indigo-900 space-y-2 leading-relaxed">{children}</div>
    </aside>
  );
}

function Sectie({ tool, info }) {
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-stretch">
      {tool}
      {info}
    </div>
  );
}

export default function EnergieLab() {
  return (
    <div className="space-y-6">
      <Sectie
        tool={<Kruispunt />}
        info={(
          <div className="flex flex-col gap-4 h-full">
            <InfoKader titel="De drie energiesystemen">
              {SYSTEMEN.map((s) => (
                <p key={s.id}>
                  <span className="font-bold" style={{ color: s.kleur }}>● {s.naam}</span> ({s.bijnaam}) — {s.kort}. Brandstof: {s.bron}.
                </p>
              ))}
              <p className="pt-1 border-t border-indigo-100">Ze werken <strong>altijd samen</strong>; de verhouding verschuift met de duur en intensiteit van de inspanning. Het is nooit "aan/uit".</p>
            </InfoKader>
            <InfoKader titel="Waarom dit ertoe doet">
              <p>Een sprinter traint zijn ATP-PCr- en glycolytisch systeem; een marathonloper vooral zijn aerobe systeem. <strong>Wéten welk systeem je sport aanspreekt, bepaalt hoe je traint.</strong></p>
              <p>Voetbal is een mengeling: rustig traven (aeroob) met explosieve sprints en duels (ATP-PCr + glycolyse) ertussen — daarom is intervaltraining zo geschikt.</p>
            </InfoKader>
          </div>
        )}
      />
      <Sectie
        tool={<LactaatMeter />}
        info={(
          <InfoKader titel="Wat is lactaat?">
            <p><strong>Lactaat</strong> (melkzuur) ontstaat wanneer het glycolytische systeem zonder voldoende zuurstof energie levert. Lang gold het als "de boosdoener" van vermoeidheid.</p>
            <p>Nieuw inzicht: lactaat is óók een <strong>brandstof</strong> — je hart en spieren verbranden het opnieuw. Het is dus geen afval, maar een tussenproduct.</p>
            <p>De <strong>lactaatdrempel</strong> is het punt waarop de aanmaak sneller gaat dan de afbraak. Erboven verzuren je spieren en moet je vertragen. Getrainde sporters verleggen die drempel — ze kunnen harder gaan vóór ze verzuren.</p>
            <p>Het brandende gevoel in je benen bij een all-out sprint? Dat is je glycolytische systeem op volle toeren.</p>
          </InfoKader>
        )}
      />
      <Sectie
        tool={<Sorteeroefening />}
        info={(
          <InfoKader titel="Vuistregels voor de tijd">
            <p><strong>0–10 s, maximaal:</strong> vooral ATP-PCr. Denk aan een sprong, worp of korte sprint.</p>
            <p><strong>10 s – 2 min, zeer intens:</strong> vooral glycolyse — hier stapelt lactaat op. Denk aan de 400m of 800m.</p>
            <p><strong>Langer dan 2 min:</strong> het aerobe systeem neemt over. Hoe langer, hoe aeroob-er.</p>
            <p className="pt-1 border-t border-indigo-100">Deze grenzen zijn richtlijnen, geen scherpe muren — de systemen lopen altijd in elkaar over.</p>
          </InfoKader>
        )}
      />
    </div>
  );
}
