// src/components/sportbuddy/tools/EnergiebalansSim.jsx
// Energiebalans-simulatie voor de Voeding-module (I.3 — energiebalans, RED-S).
// De leerling sleept voeding naar de FICTIEVE atleet en kiest hoe intensief die
// sport. De tool toont of de energiebalans positief/negatief is en wat dat over
// tijd doet met het (fictieve) lichaamsgewicht én — belangrijker — met de
// prestatie en gezondheid van het personage.
//
// Leerplan-conform kader (bewuste beslissing 5 jul 2026): gewicht bestaat hier
// als GETAL van het fictieve personage, gekoppeld aan prestatie/gezondheid,
// nooit als uiterlijk (de avatar wordt niet dikker/dunner). De tool toont dat
// zowel een te groot tekort (→ RED-S: vermoeidheid, blessures, vormverlies) als
// een te groot overschot nadelig is. Datavrij: niets over de leerling zelf.

import { useState, useMemo } from 'react';

// Voedingskaarten (kcal indicatief, afgerond — het gaat om de balans, niet om
// exacte telling, precies om obsessief tellen te vermijden).
const VOEDING = [
  { id: 'ontbijt', label: 'Havermout + fruit', emoji: '🥣', kcal: 350 },
  { id: 'boterham', label: 'Volkoren boterham', emoji: '🥪', kcal: 250 },
  { id: 'pasta', label: 'Bord pasta', emoji: '🍝', kcal: 600 },
  { id: 'kip', label: 'Kip + rijst', emoji: '🍗', kcal: 550 },
  { id: 'salade', label: 'Groentesalade', emoji: '🥗', kcal: 200 },
  { id: 'yoghurt', label: 'Yoghurt + noten', emoji: '🥛', kcal: 300 },
  { id: 'banaan', label: 'Banaan', emoji: '🍌', kcal: 100 },
  { id: 'water', label: 'Water', emoji: '💧', kcal: 0 },
  { id: 'friet', label: 'Portie friet', emoji: '🍟', kcal: 500 },
  { id: 'frisdrank', label: 'Blikje frisdrank', emoji: '🥤', kcal: 150 },
];

// Sportintensiteit → dagverbruik bovenop de basisstofwisseling
const BASIS_KCAL = 1800; // fictieve rustbehoefte van het personage
const INTENSITEIT = [
  { id: 'rust', label: '😌 Rustdag', extra: 200 },
  { id: 'licht', label: '🚶 Licht actief', extra: 500 },
  { id: 'matig', label: '🏃 Stevige training', extra: 900 },
  { id: 'zwaar', label: '🔥 Zware dubbeldag', extra: 1400 },
];

export default function EnergiebalansSim() {
  const [bord, setBord] = useState([]); // lijst van voeding-id's (met dubbels)
  const [intensiteit, setIntensiteit] = useState('matig');
  const [sleepId, setSleepId] = useState(null);

  const inname = useMemo(() => bord.reduce((s, id) => s + (VOEDING.find((v) => v.id === id)?.kcal || 0), 0), [bord]);
  const verbruik = BASIS_KCAL + (INTENSITEIT.find((i) => i.id === intensiteit)?.extra || 0);
  const balans = inname - verbruik;

  // Fictief gewichtseffect over een week (7 dagen dezelfde balans).
  // ~7700 kcal ≈ 1 kg. Puur illustratief voor het personage.
  const gewichtsverschilWeek = +((balans * 7) / 7700).toFixed(2);

  // Beoordeling: zowel groot tekort als groot overschot is nadelig
  const oordeel = useMemo(() => {
    if (balans < -600) return {
      kleur: '#ef4444', titel: 'Te groot tekort',
      tekst: 'Je atleet eet veel te weinig voor deze inspanning. Dit heet lage energiebeschikbaarheid (RED-S): het lichaam bespaart op herstel, botten en hormonen. Gevolg: vermoeidheid, blessures en vormverlies — geen gewichtswinst maar gezondheidsschade.',
      prestatie: -3,
    };
    if (balans < -150) return {
      kleur: '#f59e0b', titel: 'Licht tekort',
      tekst: 'Een klein tekort kan bewust zijn (bv. een vechter die naar een gewichtsklasse toewerkt), maar op zware dagen ondermijnt het je herstel. Vul zeker rond training goed aan.',
      prestatie: -1,
    };
    if (balans <= 250) return {
      kleur: '#22c55e', titel: 'Mooi in balans',
      tekst: 'Inname en verbruik zijn in evenwicht. Je atleet heeft brandstof om te presteren én te herstellen. Dit is de basis van gezond sporten.',
      prestatie: 2,
    };
    if (balans <= 700) return {
      kleur: '#f59e0b', titel: 'Licht overschot',
      tekst: 'Wat meer eten dan je verbruikt kan zinvol zijn in een opbouwperiode (kracht bijbouwen). Structureel te veel maakt je atleet echter trager en zwaarder om mee te dragen.',
      prestatie: 0,
    };
    return {
      kleur: '#ef4444', titel: 'Te groot overschot',
      tekst: 'Veel meer eten dan verbruiken belast het lichaam: trager, zwaarder, en de extra energie gaat niet naar prestatie. Balans is ook hier de sleutel.',
      prestatie: -2,
    };
  }, [balans]);

  const drop = () => {
    if (sleepId) { setBord((b) => [...b, sleepId]); setSleepId(null); }
  };
  const verwijderLaatste = (id) => {
    const i = bord.lastIndexOf(id);
    if (i >= 0) setBord((b) => b.filter((_, idx) => idx !== i));
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">De energiebalans</h3>
      <p className="text-xs text-gray-500 mb-4">Sleep voeding naar je atleet en kies hoe intensief hij sport. Zie of de balans klopt — en wat dat doet met zijn prestatie en (fictieve) gewicht.</p>

      {/* Voedingsvoorraad */}
      <p className="text-xs font-semibold text-gray-500 mb-2">Sleep eten naar het bord:</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-4">
        {VOEDING.map((v) => (
          <button
            key={v.id}
            type="button"
            draggable
            onDragStart={() => setSleepId(v.id)}
            onDragEnd={() => setSleepId(null)}
            onClick={() => setBord((b) => [...b, v.id])}
            className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-gray-200 p-2 hover:border-green-400 cursor-grab active:cursor-grabbing"
            title={`${v.kcal} kcal — sleep of tik`}
          >
            <span className="text-2xl">{v.emoji}</span>
            <span className="text-[10px] text-gray-500 leading-tight text-center">{v.label}</span>
          </button>
        ))}
      </div>

      {/* Het bord (drop-zone) */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={drop}
        className={`min-h-20 rounded-2xl border-2 border-dashed p-3 mb-4 transition-colors ${sleepId ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
      >
        {bord.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-4">Sleep hier voeding naartoe (of tik op een item)</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {bord.map((id, i) => {
              const v = VOEDING.find((x) => x.id === id);
              return (
                <button key={`${id}-${i}`} type="button" onClick={() => verwijderLaatste(id)}
                  className="flex items-center gap-1 bg-white border border-gray-200 rounded-full pl-2 pr-2.5 py-1 text-xs hover:border-red-300"
                  title="Tik om te verwijderen">
                  <span>{v.emoji}</span><span className="text-gray-600">{v.kcal}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Intensiteit */}
      <p className="text-xs font-semibold text-gray-500 mb-2">Hoe intensief sport je atleet vandaag?</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-5">
        {INTENSITEIT.map((i) => (
          <button key={i.id} type="button" onClick={() => setIntensiteit(i.id)}
            className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${intensiteit === i.id ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
            {i.label}
          </button>
        ))}
      </div>

      {/* De weegschaal */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="bg-green-50 rounded-xl py-2">
          <div className="text-lg font-bold text-green-700 tabular-nums">{inname}</div>
          <div className="text-[10px] text-gray-400">kcal inname</div>
        </div>
        <div className="rounded-xl py-2" style={{ backgroundColor: `${oordeel.kleur}15` }}>
          <div className="text-lg font-bold tabular-nums" style={{ color: oordeel.kleur }}>{balans > 0 ? `+${balans}` : balans}</div>
          <div className="text-[10px] text-gray-400">balans</div>
        </div>
        <div className="bg-orange-50 rounded-xl py-2">
          <div className="text-lg font-bold text-orange-700 tabular-nums">{verbruik}</div>
          <div className="text-[10px] text-gray-400">kcal verbruik</div>
        </div>
      </div>

      {/* Balansbalk */}
      <div className="relative h-3 bg-gray-100 rounded-full mb-1 overflow-hidden">
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-400" />
        <div
          className="absolute top-0 bottom-0 transition-all duration-300"
          style={{
            backgroundColor: oordeel.kleur,
            left: balans < 0 ? `${50 + Math.max(-50, balans / 30)}%` : '50%',
            right: balans > 0 ? `${50 - Math.min(50, balans / 30)}%` : '50%',
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mb-4">
        <span>tekort</span><span>evenwicht</span><span>overschot</span>
      </div>

      {/* Oordeel + fictief gewichtseffect */}
      <div className="rounded-xl p-3 text-sm mb-3" style={{ backgroundColor: `${oordeel.kleur}15`, color: oordeel.kleur }}>
        <strong>{oordeel.titel}.</strong> {oordeel.tekst}
      </div>
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2 text-sm">
        <span className="text-gray-500">Bij deze balans, één week volgehouden:</span>
        <span className="font-bold text-gray-700 tabular-nums">
          {gewichtsverschilWeek > 0 ? '+' : ''}{gewichtsverschilWeek} kg <span className="text-xs font-normal text-gray-400">(fictief)</span>
        </span>
      </div>
    </div>
  );
}
