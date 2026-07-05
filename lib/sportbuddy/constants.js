// lib/sportbuddy/constants.js
// Server-side constanten voor Sportbuddy.
// De buddy draagt de nickname van de leerling (leeft in het users-profiel);
// het buddy-document bevat daarom GEEN naamveld en geen enkel vrij tekstveld.

// MVP: alleen voetbal aanmaakbaar. Fase 2: lijst uitbreiden.
export const BESCHIKBARE_SPORTEN = ['voetbal'];
export const ALLE_SPORTEN = ['voetbal', 'basketbal', 'gymnastiek', 'wielrennen', 'gevecht', 'dans'];

// Avatar-indexgrenzen — moeten overeenkomen met BuddyAvatar.jsx
export const AVATAR_GRENZEN = {
  gezicht: 4,   // GEZICHTEN.length
  huid: 4,      // HUID_TINTEN.length
  haar: 5,      // HAAR_STIJLEN.length
  haarkleur: 5, // HAAR_KLEUREN.length
};

export function valideerAvatar(avatar) {
  if (!avatar || typeof avatar !== 'object') return null;
  const schoon = {};
  for (const [veld, max] of Object.entries(AVATAR_GRENZEN)) {
    const waarde = avatar[veld];
    if (!Number.isInteger(waarde) || waarde < 0 || waarde >= max) return null;
    schoon[veld] = waarde;
  }
  return schoon;
}

// Schooljaar-notatie zoals in het XP-patroon: '2025-2026' (wissel op 1 september)
export function huidigSchooljaar(datum = new Date()) {
  const jaar = datum.getFullYear();
  const maand = datum.getMonth(); // 0-11
  return maand >= 8 ? `${jaar}-${jaar + 1}` : `${jaar - 1}-${jaar}`;
}
