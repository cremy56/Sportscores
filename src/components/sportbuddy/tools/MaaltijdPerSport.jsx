// src/components/sportbuddy/tools/MaaltijdPerSport.jsx
// Tool voor de Voeding-module (I.3/I.4): hoe verandert de ideale samenstelling
// van een maaltijd naargelang de sport? De leerling kiest eerst een categorie
// en daarbinnen een concrete sport; de macroverdeling (koolhydraten/eiwit/vet)
// en de uitleg passen zich aan. Datavrij: over het sporttype van de fictieve
// atleet, niet over de leerling.
//
// Percentages afgeleid uit sportvoedingsconsensus (ACSM/AND, ISSN; algemene
// AMDR 45-65% KH / 10-35% eiwit / 20-35% vet). Duursport leunt naar meer
// koolhydraten, kracht/power naar meer eiwit; teamsport zit ertussen. De
// waarden zijn didactische richtwaarden binnen de wetenschappelijke ranges,
// geen exacte voorschriften.

import { useState } from 'react';

const CATEGORIEEN = [
  {
    id: 'duur', label: 'Duursport', emoji: '🚴',
    sporten: [
      { id: 'wielrennen', label: 'Wielrennen', macro: { kh: 62, eiwit: 16, vet: 22 },
        uitleg: 'Lange ritten verbranden enorme hoeveelheden koolhydraten. Wielrenners eten koolhydraatrijk, ook tíjdens de inspanning (gels, repen), om de glycogeenvoorraden gevuld te houden.' },
      { id: 'lopen', label: 'Lange afstand lopen', macro: { kh: 60, eiwit: 18, vet: 22 },
        uitleg: 'Marathon- en duurlopers steunen vooral op koolhydraten. Iets meer eiwit dan wielrenners omdat het lopen meer spierschade (impact) geeft die hersteld moet worden.' },
      { id: 'zwemmen', label: 'Zwemmen (lange afstand)', macro: { kh: 58, eiwit: 20, vet: 22 },
        uitleg: 'Zwemmen combineert duurvermogen met veel spierarbeid in armen en romp. Daardoor ligt het eiwitaandeel iets hoger dan bij puur lopen of fietsen.' },
    ],
  },
  {
    id: 'kracht', label: 'Krachtsport', emoji: '🏋️',
    sporten: [
      { id: 'gewichtheffen', label: 'Gewichtheffen', macro: { kh: 42, eiwit: 33, vet: 25 },
        uitleg: 'Explosieve krachtsport met korte, maximale inspanningen. Veel eiwit voor spierherstel en -opbouw; koolhydraten blijven nodig om de zware trainingen vol te houden.' },
      { id: 'turnen', label: 'Turnen', macro: { kh: 48, eiwit: 30, vet: 22 },
        uitleg: 'Turnen vraagt een hoge kracht-tot-gewichtverhouding: sterke, compacte spieren. Genoeg eiwit voor kracht, maar zeker niet te weinig eten — het RED-S-risico is reëel in deze sport.' },
      { id: 'sprint', label: 'Sprint (100m)', macro: { kh: 50, eiwit: 28, vet: 22 },
        uitleg: 'Sprinten is pure explosiviteit. Eiwit voor de krachtige spieren, en koolhydraten als snelle brandstof voor de explosieve inspanningen en de intensieve training.' },
    ],
  },
  {
    id: 'team', label: 'Teamsport', emoji: '⚽',
    sporten: [
      { id: 'voetbal', label: 'Voetbal', macro: { kh: 55, eiwit: 22, vet: 23 },
        uitleg: 'Voetbal mengt lopen (duur) met sprints en duels (explosief). Veel koolhydraten voor de 90 minuten, voldoende eiwit voor herstel van de intensieve acties.' },
      { id: 'basketbal', label: 'Basketbal', macro: { kh: 52, eiwit: 25, vet: 23 },
        uitleg: 'Basketbal is explosiever dan voetbal (sprongen, sprints). Iets meer nadruk op eiwit voor de krachtige, herhaalde explosies, met koolhydraten als brandstof.' },
      { id: 'volleybal', label: 'Volleybal', macro: { kh: 50, eiwit: 26, vet: 24 },
        uitleg: 'Volleybal draait om korte, explosieve sprongen en slagen. Het eiwitaandeel ligt daardoor wat hoger, dichter bij een krachtsport dan bij een duursport.' },
    ],
  },
  {
    id: 'esthetisch', label: 'Esthetische sport', emoji: '💃',
    sporten: [
      { id: 'dans', label: 'Dans', macro: { kh: 52, eiwit: 26, vet: 22 },
        uitleg: 'Dans combineert uithouding, kracht en lenigheid. Genoeg koolhydraten voor de lange repetities en eiwit voor sterke spieren — en altijd voldoende eten (esthetische druk maakt RED-S een aandachtspunt).' },
      { id: 'kunstschaatsen', label: 'Kunstschaatsen', macro: { kh: 50, eiwit: 28, vet: 22 },
        uitleg: 'Kunstschaatsen vraagt explosieve sprongen én uithouding voor een volledige kür. Eiwit voor de sprongkracht, koolhydraten voor het volhouden — nooit te weinig energie.' },
    ],
  },
];

const MACRO_INFO = {
  kh: { naam: 'Koolhydraten', kleur: '#f59e0b', bron: 'pasta, rijst, brood, fruit' },
  eiwit: { naam: 'Eiwitten', kleur: '#ef4444', bron: 'vlees, vis, ei, bonen' },
  vet: { naam: 'Gezonde vetten', kleur: '#a855f7', bron: 'noten, olijfolie, vis' },
};

export default function MaaltijdPerSport() {
  const [catId, setCatId] = useState('team');
  const categorie = CATEGORIEEN.find((c) => c.id === catId);
  const [sportId, setSportId] = useState('voetbal');
  const sport = categorie.sporten.find((s) => s.id === sportId) || categorie.sporten[0];

  const kiesCategorie = (id) => {
    setCatId(id);
    setSportId(CATEGORIEEN.find((c) => c.id === id).sporten[0].id);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Maaltijd per sport</h3>
      <p className="text-xs text-gray-500 mb-4">Elke sport vraagt een andere brandstofmix. Kies een categorie én een sport, en zie hoe het ideale bord verschuift.</p>

      {/* Categoriekeuze */}
      <p className="text-xs font-semibold text-gray-500 mb-2">1. Categorie</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
        {CATEGORIEEN.map((c) => (
          <button key={c.id} type="button" onClick={() => kiesCategorie(c.id)}
            className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${catId === c.id ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
            <span className="block text-xl">{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Sportkeuze binnen de categorie */}
      <p className="text-xs font-semibold text-gray-500 mb-2">2. Sport</p>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {categorie.sporten.map((s) => (
          <button key={s.id} type="button" onClick={() => setSportId(s.id)}
            className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all ${sportId === s.id ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Het bord als stapelbalk */}
      <div className="flex h-10 rounded-full overflow-hidden mb-2 border border-gray-200">
        {['kh', 'eiwit', 'vet'].map((m) => (
          <div key={m} className="flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
            style={{ width: `${sport.macro[m]}%`, backgroundColor: MACRO_INFO[m].kleur }}>
            {sport.macro[m]}%
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mb-4">
        {['kh', 'eiwit', 'vet'].map((m) => (
          <div key={m} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MACRO_INFO[m].kleur }} />
            {MACRO_INFO[m].naam}
          </div>
        ))}
      </div>

      {/* Uitleg */}
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-3">
        <p className="text-sm text-purple-900"><strong>{categorie.emoji} {sport.label}</strong></p>
        <p className="text-sm text-gray-700 mt-1">{sport.uitleg}</p>
      </div>

      {/* Bronnen per macro */}
      <div className="grid grid-cols-3 gap-2">
        {['kh', 'eiwit', 'vet'].map((m) => (
          <div key={m} className="bg-gray-50 rounded-xl p-2 text-center">
            <div className="text-xs font-bold" style={{ color: MACRO_INFO[m].kleur }}>{MACRO_INFO[m].naam}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{MACRO_INFO[m].bron}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
