// src/data/sportbuddy/namen.js
// Naamgenerator voor de Sportbuddy — vaste woordenlijsten, GEEN vrije tekst.
// De client stuurt alleen indices (a, n) naar de API; de server reconstrueert
// en valideert de naam tegen dezelfde lijsten. Zo kan er nooit een persoonlijke
// onthulling in de databank belanden (GDD §8).

export const NAAM_ADJECTIEVEN = [
  'Snelle', 'Taaie', 'Slimme', 'Vlugge', 'Sterke', 'Wendbare',
  'Onvermoeibare', 'Vinnige', 'Stille', 'Vurige', 'Koele', 'Dappere',
  'Lenige', 'Vaste', 'Wakkere', 'Gouden', 'IJzeren', 'Bliksemse',
  'Rusteloze', 'Geduldige', 'Sluwe', 'Trotse', 'Nuchtere', 'Speelse',
];

export const NAAM_SUBSTANTIEVEN = [
  'Ekster', 'Panter', 'Havik', 'Otter', 'Gazelle', 'Wolf',
  'Valk', 'Lynx', 'Hinde', 'Zwaluw', 'Bever', 'Vos',
  'Spits', 'Sprinter', 'Klimmer', 'Kapitein', 'Pionier', 'Renner',
  'Duiker', 'Springer', 'Verkenner', 'Stormer', 'Wervelwind', 'Komeet',
];

export function genereerNaamIndices() {
  return {
    a: Math.floor(Math.random() * NAAM_ADJECTIEVEN.length),
    n: Math.floor(Math.random() * NAAM_SUBSTANTIEVEN.length),
  };
}

export function naamVanIndices(indices) {
  const adj = NAAM_ADJECTIEVEN[indices?.a] || NAAM_ADJECTIEVEN[0];
  const sub = NAAM_SUBSTANTIEVEN[indices?.n] || NAAM_SUBSTANTIEVEN[0];
  return `${adj} ${sub}`;
}
