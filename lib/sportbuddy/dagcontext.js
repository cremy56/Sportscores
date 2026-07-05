// lib/sportbuddy/dagcontext.js
// De WERELDCONTEXT van Sportbuddy: écht weer + wedstrijdkalender.
// Voor iedereen van dezelfde school identiek (klasgesprek + eerlijk speelveld):
// bij het eerste verzoek van de dag wordt het weer opgehaald bij Open-Meteo
// (gratis, geen API-key) en BEVROREN in sportbuddy_dagcontext/{schoolId}_{datum}.
// Eén API-call per school per dag; daarna leest iedereen hetzelfde doc.
// Het doc bevat uitsluitend weer + kalender — nul persoonsgegevens.
// Valt de API uit → deterministische seizoensfallback: het spel breekt nooit.

import { db } from '../firebaseAdmin.js';
import { hashString, maakRng } from './seed.js';

// Vaste locatie (MVP-beslissing): Beveren
const LATITUDE = 51.212;
const LONGITUDE = 4.256;

// WMO-weathercode → label/emoji
function weerLabel(code) {
  if (code === 0) return { label: 'zonnig', emoji: '☀️' };
  if (code <= 3) return { label: 'bewolkt', emoji: '⛅' };
  if (code <= 48) return { label: 'mistig', emoji: '🌫️' };
  if (code <= 67) return { label: 'regen', emoji: '🌧️' };
  if (code <= 77) return { label: 'sneeuw', emoji: '❄️' };
  if (code <= 82) return { label: 'buien', emoji: '🌦️' };
  return { label: 'onweer', emoji: '⛈️' };
}

function vandaagBrussel() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
}

// ma=1 … zo=7 (Brussels)
function weekdagBrussel(datumStr) {
  const d = new Date(`${datumStr}T12:00:00Z`);
  const dag = d.getUTCDay(); // zo=0
  return dag === 0 ? 7 : dag;
}

// Wedstrijdkalender: elke ZATERDAG is matchdag (jeugdvoetbal-ritme).
// Blackout voor zware events: donderdag + vrijdag (48 u vóór de match).
function bouwKalender(datumStr) {
  const wd = weekdagBrussel(datumStr);
  const dagenTotMatch = wd === 6 ? 0 : (6 - wd + 7) % 7;
  return {
    weekdag: wd,
    matchdag: wd === 6,
    dagenTotMatch,
    blackout: wd === 4 || wd === 5,
  };
}

// Seizoensgebonden fallback als Open-Meteo onbereikbaar is (deterministisch)
function fallbackWeer(datumStr) {
  const maand = parseInt(datumStr.slice(5, 7), 10);
  const basis = [4, 5, 8, 12, 16, 19, 21, 21, 17, 13, 8, 5][maand - 1];
  const rng = maakRng(hashString(`weer_${datumStr}`));
  const tempMax = Math.round(basis + (rng() - 0.5) * 8);
  const codes = [0, 2, 3, 61, 80];
  const code = codes[Math.floor(rng() * codes.length)];
  return { tempMax, code, ...weerLabel(code), bron: 'fallback' };
}

async function haalEchtWeer(datumStr) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}`
    + `&daily=temperature_2m_max,weathercode&timezone=Europe%2FBrussels&forecast_days=1`;
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  const data = await response.json();
  const tempMax = Math.round(data?.daily?.temperature_2m_max?.[0]);
  const code = data?.daily?.weathercode?.[0];
  if (!Number.isFinite(tempMax) || !Number.isInteger(code)) throw new Error('Onbruikbaar weer-antwoord');
  return { tempMax, code, ...weerLabel(code), bron: 'open-meteo' };
}

// Engine-relevante vlaggen uit het weer
export function weerVlaggen(weer) {
  return {
    heet: (weer?.tempMax ?? 15) >= 25,
    koud: (weer?.tempMax ?? 15) <= 5,
  };
}

export async function haalDagcontext(schoolId) {
  const datum = vandaagBrussel();
  const docId = `${schoolId}_${datum}`;
  const ref = db.collection('sportbuddy_dagcontext').doc(docId);

  const bestaand = await ref.get();
  if (bestaand.exists) return bestaand.data();

  let weer;
  try {
    weer = await haalEchtWeer(datum);
  } catch (err) {
    console.warn('⚠️ Open-Meteo onbereikbaar, seizoensfallback:', err.message);
    weer = fallbackWeer(datum);
  }

  const context = { datum, weer, kalender: bouwKalender(datum) };
  // create() ipv set(): bij een race wint de eerste schrijver — het weer
  // blijft gegarandeerd identiek voor iedereen.
  try {
    await ref.create(context);
  } catch {
    const her = await ref.get();
    if (her.exists) return her.data();
  }
  return context;
}
