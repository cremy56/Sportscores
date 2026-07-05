// src/components/sportbuddy/tools/EnergiebalansSim.jsx
// Energiebalans-simulatie voor de Voeding-module (I.3 — energiebalans, RED-S).
// De leerling stelt via maaltijd-tabs (ontbijt/lunch/avondeten/snacks) het
// dagmenu van de FICTIEVE atleet samen en kiest hoe intensief die traint.
// De tool toont de energiebalans en het effect op prestatie, gezondheid en het
// (fictieve) lichaamsgewicht van het personage.
//
// Leerplan-conform kader (beslissing 5 jul 2026): gewicht = getal van het
// fictieve personage, gekoppeld aan prestatie/gezondheid, nooit avatar-esthetiek.
// Zowel te veel als te weinig is nadelig; een te groot tekort → RED-S-uitleg.
// Datavrij: niets over de leerling zelf.

import { useState, useMemo } from 'react';

// Voeding per maaltijdmoment (kcal indicatief, afgerond — het gaat om de balans,
// niet om exacte telling, bewust om obsessief tellen te vermijden).
const MENUKAART = {
  ontbijt: [
    { id: 'havermout', label: 'Havermout + fruit', emoji: '🥣', kcal: 350 },
    { id: 'boterham_kaas', label: 'Boterham met kaas', emoji: '🧀', kcal: 250 },
    { id: 'boterham_choco', label: 'Boterham met choco', emoji: '🍫', kcal: 300 },
    { id: 'yoghurt_granola', label: 'Yoghurt + granola', emoji: '🥛', kcal: 300 },
    { id: 'eieren', label: 'Roerei (2 eieren)', emoji: '🍳', kcal: 220 },
    { id: 'smoothie', label: 'Fruitsmoothie', emoji: '🥤', kcal: 200 },
    { id: 'croissant', label: 'Croissant', emoji: '🥐', kcal: 270 },
    { id: 'pannenkoeken', label: 'Pannenkoeken', emoji: '🥞', kcal: 400 },
  ],
  lunch: [
    { id: 'broodjes', label: 'Twee belegde broodjes', emoji: '🥪', kcal: 450 },
    { id: 'pasta_lunch', label: 'Pastasalade', emoji: '🍝', kcal: 500 },
    { id: 'soep_brood', label: 'Soep + brood', emoji: '🍲', kcal: 350 },
    { id: 'wrap', label: 'Kipwrap', emoji: '🌯', kcal: 420 },
    { id: 'salade_lunch', label: 'Maaltijdsalade', emoji: '🥗', kcal: 350 },
    { id: 'rijst_kip', label: 'Rijst met kip', emoji: '🍚', kcal: 550 },
    { id: 'pizza_punt', label: 'Twee punten pizza', emoji: '🍕', kcal: 600 },
  ],
  avondeten: [
    { id: 'pasta_bolo', label: 'Spaghetti bolognaise', emoji: '🍝', kcal: 650 },
    { id: 'aardappel_vis', label: 'Aardappel + vis + groenten', emoji: '🐟', kcal: 550 },
    { id: 'rijst_curry', label: 'Rijst + kipcurry', emoji: '🍛', kcal: 600 },
    { id: 'stoofpot', label: 'Stoofpot + brood', emoji: '🍲', kcal: 650 },
    { id: 'burger_menu', label: 'Hamburger + friet', emoji: '🍔', kcal: 900 },
    { id: 'wok', label: 'Groentewok + noedels', emoji: '🍜', kcal: 500 },
    { id: 'omelet_avond', label: 'Omelet + salade', emoji: '🍳', kcal: 400 },
  ],
  snacks: [
    { id: 'banaan', label: 'Banaan', emoji: '🍌', kcal: 100 },
    { id: 'appel', label: 'Appel', emoji: '🍎', kcal: 80 },
    { id: 'noten', label: 'Handje noten', emoji: '🥜', kcal: 200 },
    { id: 'reep', label: 'Mueslireep', emoji: '🍫', kcal: 150 },
    { id: 'koek', label: 'Koek', emoji: '🍪', kcal: 180 },
    { id: 'chips', label: 'Zakje chips', emoji: '🥔', kcal: 250 },
    { id: 'frisdrank', label: 'Blikje frisdrank', emoji: '🥤', kcal: 150 },
    { id: 'water', label: 'Water', emoji: '💧', kcal: 0 },
    { id: 'sportdrank', label: 'Sportdrank', emoji: '🧃', kcal: 120 },
    { id: 'proteinshake', label: 'Proteïneshake', emoji: '🥛', kcal: 200 },
  ],
};

const TABS = [
  { id: 'ontbijt', label: '🌅 Ontbijt' },
  { id: 'lunch', label: '🥪 Lunch' },
  { id: 'avondeten', label: '🍽️ Avondeten' },
  { id: 'snacks', label: '🍎 Snacks & drank' },
];

// Sportintensiteit → dagverbruik bovenop de basisstofwisseling.
// Duidelijke, herkenbare labels (geen jargon zoals "dubbeldag").
const BASIS_KCAL = 1800; // fictieve rustbehoefte van het personage
const INTENSITEIT = [
  { id: 'rust', label: '😌 Geen sport', sub: 'rustdag', extra: 200 },
  { id: 'licht', label: '🚶 Lichte training', sub: '± 30-45 min rustig', extra: 500 },
  { id: 'matig', label: '🏃 Stevige training', sub: '± 1 u intensief', extra: 900 },
  { id: 'zwaar', label: '🔥 Zware trainingsdag', sub: 'lange of dubbele sessie', extra: 1400 },
];

// Alle voeding platgeslagen voor kcal-opzoeking
const ALLE = Object.values(MENUKAART).flat();
const kcalVan = (id) => ALLE.find((v) => v.id === id)?.kcal || 0;
const itemVan = (id) => ALLE.find((v) => v.id === id);

export default function EnergiebalansSim() {
  const [tab, setTab] = useState('ontbijt');
  const [gekozen, setGekozen] = useState([]); // lijst van voeding-id's (met dubbels)
  const [intensiteit, setIntensiteit] = useState('matig');

  const inname = useMemo(() => gekozen.reduce((s, id) => s + kcalVan(id), 0), [gekozen]);
  const verbruik = BASIS_KCAL + (INTENSITEIT.find((i) => i.id === intensiteit)?.extra || 0);
  const balans = inname - verbruik;
  const gewichtsverschilWeek = +((balans * 7) / 7700).toFixed(2);

  const oordeel = useMemo(() => {
    if (balans < -600) return {
      kleur: '#ef4444', titel: 'Te groot tekort',
      tekst: 'Je atleet eet veel te weinig voor deze inspanning. Dit heet lage energiebeschikbaarheid (RED-S): het lichaam bespaart op herstel, botten en hormonen. Gevolg: vermoeidheid, blessures en vormverlies — geen gewichtswinst maar gezondheidsschade.',
    };
    if (balans < -150) return {
      kleur: '#f59e0b', titel: 'Licht tekort',
      tekst: 'Een klein tekort kan bewust zijn (bv. een vechter die naar een gewichtsklasse toewerkt), maar op zware dagen ondermijnt het je herstel. Vul zeker rond training goed aan.',
    };
    if (balans <= 250) return {
      kleur: '#22c55e', titel: 'Mooi in balans',
      tekst: 'Inname en verbruik zijn in evenwicht. Je atleet heeft brandstof om te presteren én te herstellen. Dit is de basis van gezond sporten.',
    };
    if (balans <= 700) return {
      kleur: '#f59e0b', titel: 'Licht overschot',
      tekst: 'Wat meer eten dan je verbruikt kan zinvol zijn in een opbouwperiode (kracht bijbouwen). Structureel te veel maakt je atleet echter trager en zwaarder om mee te dragen.',
    };
    return {
      kleur: '#ef4444', titel: 'Te groot overschot',
      tekst: 'Veel meer eten dan verbruiken belast het lichaam: trager, zwaarder, en de extra energie gaat niet naar prestatie. Balans is ook hier de sleutel.',
    };
  }, [balans]);

  const voegToe = (id) => setGekozen((g) => [...g, id]);
  const verwijder = (index) => setGekozen((g) => g.filter((_, i) => i !== index));

  // Per-maaltijd subtotaal voor de tab-badges
  const subtotaal = (tabId) => gekozen.filter((id) => MENUKAART[tabId].some((v) => v.id === id)).reduce((s, id) => s + kcalVan(id), 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">De energiebalans</h3>
      <p className="text-xs text-gray-500 mb-4">Stel het dagmenu van je atleet samen en kies hoe intensief hij traint. Zie of de balans klopt — en wat dat doet met zijn prestatie en (fictieve) gewicht.</p>

      {/* Maaltijd-tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TABS.map((t) => {
          const sub = subtotaal(t.id);
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all ${tab === t.id ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
              {t.label}{sub > 0 && <span className="ml-1 text-green-500">· {sub}</span>}
            </button>
          );
        })}
      </div>

      {/* Voeding van de actieve tab */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
        {MENUKAART[tab].map((v) => (
          <button key={v.id} type="button" onClick={() => voegToe(v.id)}
            className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-gray-200 p-2 hover:border-green-400 active:bg-green-50"
            title={`${v.kcal} kcal — tik om toe te voegen`}>
            <span className="text-2xl">{v.emoji}</span>
            <span className="text-[10px] text-gray-600 leading-tight text-center">{v.label}</span>
            <span className="text-[10px] text-gray-400">{v.kcal} kcal</span>
          </button>
        ))}
      </div>

      {/* Het gekozen dagmenu */}
      <p className="text-xs font-semibold text-gray-500 mb-1">Dagmenu van je atleet {gekozen.length > 0 && `(${gekozen.length})`}</p>
      <div className="min-h-16 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-3 mb-4">
        {gekozen.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-3">Tik hierboven op voeding om het menu te vullen</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {gekozen.map((id, i) => {
              const v = itemVan(id);
              return (
                <button key={`${id}-${i}`} type="button" onClick={() => verwijder(i)}
                  className="flex items-center gap-1 bg-white border border-gray-200 rounded-full pl-2 pr-2.5 py-1 text-xs hover:border-red-300"
                  title="Tik om te verwijderen">
                  <span>{v.emoji}</span><span className="text-gray-500">{v.kcal}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Intensiteit */}
      <p className="text-xs font-semibold text-gray-500 mb-2">Hoe intensief traint je atleet vandaag?</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-5">
        {INTENSITEIT.map((i) => (
          <button key={i.id} type="button" onClick={() => setIntensiteit(i.id)}
            className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${intensiteit === i.id ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
            <span className="block">{i.label}</span>
            <span className="block text-[10px] font-normal text-gray-400 mt-0.5">{i.sub}</span>
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
        <div className="absolute top-0 bottom-0 transition-all duration-300"
          style={{
            backgroundColor: oordeel.kleur,
            left: balans < 0 ? `${50 + Math.max(-50, balans / 30)}%` : '50%',
            right: balans > 0 ? `${50 - Math.min(50, balans / 30)}%` : '50%',
          }} />
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
