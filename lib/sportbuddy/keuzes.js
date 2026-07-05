// lib/sportbuddy/keuzes.js
// Gesloten keuzesets voor de dagelijkse verzorging + hun engine-effecten.
// Server-side waarheid; de frontend heeft een LABEL-kopie in
// src/data/sportbuddy/verzorging.js (zelfde IDs — synchroon houden!).
// Effecten leven UITSLUITEND hier: de client kan er niet mee sjoemelen.

// Trainingsvormen (MVP: voetbal). focus = welke KLUSCE-stats groeien (gewicht).
export const TRAININGEN = {
  rust:     { belasting: 0,  focus: {} },
  herstel:  { belasting: 15, focus: { U: 0.5 } },
  techniek: { belasting: 35, focus: { C: 1.0, E: 0.4 } },
  kracht:   { belasting: 45, focus: { K: 1.0, S: 0.3 } },
  interval: { belasting: 55, focus: { U: 0.8, S: 0.8 } },
  match:    { belasting: 70, focus: { U: 0.6, S: 0.5, C: 0.5 } },
};

export const VOEDING = {
  licht:          { type: 'licht' },
  gewoon:         { type: 'gewoon' },
  koolhydraatrijk:{ type: 'koolhydraatrijk' },
  fastfood:       { type: 'fastfood' },
};

export const SLAAP = {
  kort:    { type: 'kort',    herstel: 0.7 },   // ±6 u
  normaal: { type: 'normaal', herstel: 1.0 },   // ±8 u
  lang:    { type: 'lang',    herstel: 1.15 },  // 9-10 u (tienernorm!)
};

export const WATER = {
  weinig:    { type: 'weinig' },
  voldoende: { type: 'voldoende' },
  veel:      { type: 'veel' },
};

export const MENTAAL = {
  geen: { stressverlaging: 0, melding: null },
  ademhaling: {
    stressverlaging: 8,
    melding: 'Ademhalingsoefening gedaan: het parasympathische zenuwstelsel neemt over — stress en hartslag zakken.',
  },
  visualisatie: {
    stressverlaging: 5,
    melding: 'Visualisatie: je buddy speelt de wedstrijd al in zijn hoofd — een routine uit de sportpsychologie.',
  },
};

export function valideerKeuzes(keuzes) {
  if (!keuzes || typeof keuzes !== 'object') return null;
  const { training, voeding, water, slaap, mentaal } = keuzes;
  if (!(training in TRAININGEN)) return null;
  if (!(voeding in VOEDING)) return null;
  if (!(water in WATER)) return null;
  if (!(slaap in SLAAP)) return null;
  if (!(mentaal in MENTAAL)) return null;
  return { training, voeding, water, slaap, mentaal };
}
