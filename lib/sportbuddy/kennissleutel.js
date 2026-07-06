// lib/sportbuddy/kennissleutel.js
// Server-side waarheid voor de kennisquizzen: per module het aantal vragen en
// de juiste antwoordindexen. De client (src/data/sportbuddy/kennis.js) toont de
// vragen; de server hercontroleert hier — zo kan een leerling geen XP forceren.
// Bij elke inhoudswijziging: deze sleutel meebijwerken (zelfde module-IDs).

export const QUIZ_SLEUTEL = {
  hart:    { juist: [1, 0, 1, 1] },
  slaap:   { juist: [1, 1, 0, 1] },
  energie: { juist: [2, 0, 1, 1] },
  voeding: { juist: [1, 0, 0, 1] },
  mentaal: { juist: [0, 1, 1, 1] },
  fysiek:  { juist: [0, 0, 1, 0] },
};

export const BESCHIKBARE_MODULES = Object.keys(QUIZ_SLEUTEL);

// Verbeter een inzending → { correct, totaal, geslaagd }.
// Geslaagd = minstens de helft juist (drempel voor XP).
export function verbeterQuiz(moduleId, antwoorden) {
  const sleutel = QUIZ_SLEUTEL[moduleId];
  if (!sleutel) return null;
  if (!Array.isArray(antwoorden) || antwoorden.length !== sleutel.juist.length) return null;
  let correct = 0;
  for (let i = 0; i < sleutel.juist.length; i++) {
    if (antwoorden[i] === sleutel.juist[i]) correct++;
  }
  const totaal = sleutel.juist.length;
  return { correct, totaal, geslaagd: correct >= Math.ceil(totaal / 2), juist: sleutel.juist };
}
