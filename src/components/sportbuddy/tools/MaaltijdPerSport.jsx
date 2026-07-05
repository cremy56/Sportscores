// src/components/sportbuddy/tools/MaaltijdPerSport.jsx
// Tool voor de Voeding-module (I.3/I.4): hoe verandert de ideale samenstelling
// van een maaltijd naargelang de sport die je beoefent? De leerling kiest een
// sporttype en ziet de aanbevolen macroverdeling (koolhydraten / eiwit / vet)
// verschuiven, met uitleg waarom. Datavrij: over het sporttype van de fictieve
// atleet, niet over de leerling.

import { useState } from 'react';

// Richtverdeling macronutriënten (% van energie) per sporttype — indicatief,
// gebaseerd op algemene sportvoedingsprincipes.
const SPORTTYPES = [
  {
    id: 'duur', label: 'Duursport', emoji: '🚴', voorbeeld: 'wielrennen, lopen',
    macro: { kh: 60, eiwit: 20, vet: 20 },
    uitleg: 'Duursporters verbranden veel koolhydraten als brandstof. Hun maaltijden leunen sterk op granen, pasta en rijst om de glycogeenvoorraden gevuld te houden.',
  },
  {
    id: 'kracht', label: 'Krachtsport', emoji: '🏋️', voorbeeld: 'gewichtheffen, turnen',
    macro: { kh: 45, eiwit: 35, vet: 20 },
    uitleg: 'Bij krachtsport ligt de nadruk op eiwitten voor spierherstel en -opbouw. Nog steeds genoeg koolhydraten voor energie, maar het eiwitaandeel is duidelijk hoger.',
  },
  {
    id: 'team', label: 'Teamsport', emoji: '⚽', voorbeeld: 'voetbal, basket',
    macro: { kh: 55, eiwit: 25, vet: 20 },
    uitleg: 'Teamsporten mengen duurvermogen en explosiviteit. De verdeling ligt tussen duur- en krachtsport in: veel koolhydraten voor het lopen, voldoende eiwit voor de sprints en duels.',
  },
  {
    id: 'esthetisch', label: 'Esthetische sport', emoji: '💃', voorbeeld: 'dans, gymnastiek',
    macro: { kh: 50, eiwit: 30, vet: 20 },
    uitleg: 'Hier telt de verhouding kracht-tot-gewicht. Voldoende eiwit voor sterke, slanke spieren en genoeg koolhydraten om de intensieve trainingen vol te houden — nooit te weinig eten (RED-S-risico).',
  },
];

const MACRO_INFO = {
  kh: { naam: 'Koolhydraten', kleur: '#f59e0b', bron: 'pasta, rijst, brood, fruit' },
  eiwit: { naam: 'Eiwitten', kleur: '#ef4444', bron: 'vlees, vis, ei, bonen' },
  vet: { naam: 'Gezonde vetten', kleur: '#a855f7', bron: 'noten, olijfolie, vis' },
};

export default function MaaltijdPerSport() {
  const [sportId, setSportId] = useState('team');
  const sport = SPORTTYPES.find((s) => s.id === sportId);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">Maaltijd per sport</h3>
      <p className="text-xs text-gray-500 mb-4">Elke sport vraagt een andere brandstofmix. Kies een sporttype en zie hoe het ideale bord verschuift.</p>

      {/* Sportkeuze */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-5">
        {SPORTTYPES.map((s) => (
          <button key={s.id} type="button" onClick={() => setSportId(s.id)}
            className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${sportId === s.id ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
            <span className="block text-xl">{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Het bord als cirkel-verdeling (stapelbalk) */}
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
        <p className="text-sm text-purple-900">
          <strong>{sport.emoji} {sport.label}</strong> <span className="text-purple-400">({sport.voorbeeld})</span>
        </p>
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
