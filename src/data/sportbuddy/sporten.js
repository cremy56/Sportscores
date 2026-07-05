// src/data/sportbuddy/sporten.js
// Sportprofielen volgens GDD_VIRTUELE_ATLEET_v1.1 §2.
// Stats = KLUSCE (eindterm I.8): Kracht, Lenigheid, Uithouding, Snelheid, Coördinatie, Evenwicht.
// MVP (fase 1): alleen voetbal beschikbaar; de rest volgt in fase 2.

export const STATS = [
  { key: 'K', label: 'Kracht' },
  { key: 'L', label: 'Lenigheid' },
  { key: 'U', label: 'Uithouding' },
  { key: 'S', label: 'Snelheid' },
  { key: 'C', label: 'Coördinatie' },
  { key: 'E', label: 'Evenwicht' },
];

export const SPORTEN = [
  {
    id: 'voetbal',
    naam: 'Voetbal',
    emoji: '⚽',
    beschikbaar: true,
    kernstats: ['U', 'S', 'C'],
    energiesysteem: 'gemengd aeroob/anaeroob',
    tagline: 'Intervalduur, teamritme en hersteldagen tussen matchen.',
  },
  {
    id: 'basketbal',
    naam: 'Basketbal',
    emoji: '🏀',
    beschikbaar: false,
    kernstats: ['S', 'K', 'C', 'E'],
    energiesysteem: 'anaeroob-alactisch + aeroob',
    tagline: 'Sprongkracht, korte explosies en blessurepreventie.',
  },
  {
    id: 'gymnastiek',
    naam: 'Gymnastiek',
    emoji: '🤸',
    beschikbaar: false,
    kernstats: ['K', 'L', 'C', 'E'],
    energiesysteem: 'anaeroob-alactisch',
    tagline: 'Relatieve kracht, mobiliteit en energiebeschikbaarheid.',
  },
  {
    id: 'wielrennen',
    naam: 'Wielrennen',
    emoji: '🚴',
    beschikbaar: false,
    kernstats: ['U', 'K'],
    energiesysteem: 'aeroob (drempel, VO2)',
    tagline: 'Duurtraining, koolhydraatstrategie en oververmoeidheid.',
  },
  {
    id: 'gevecht',
    naam: 'Gevechtssport',
    emoji: '🥊',
    beschikbaar: false,
    kernstats: ['K', 'S', 'U', 'C'],
    energiesysteem: 'gemengd',
    tagline: 'Gewichtsklassen, weerbaarheid en fair play.',
  },
  {
    id: 'dans',
    naam: 'Dans',
    emoji: '💃',
    beschikbaar: false,
    kernstats: ['L', 'C', 'E', 'U'],
    energiesysteem: 'aeroob + techniek',
    tagline: 'Belastbaarheid, mentale routines en esthetische sportdruk.',
  },
];

export function getSport(id) {
  return SPORTEN.find((s) => s.id === id) || null;
}
