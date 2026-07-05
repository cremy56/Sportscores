// lib/sportbuddy/seed.js
// Deterministische pseudo-random helpers: dezelfde invoer geeft ALTIJD dezelfde
// uitkomst. Zo levert F5'en of opnieuw inloggen exact dezelfde dag op —
// er valt niets te "rerollen" — en hoeft er niets opgeslagen te worden.

export function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

// mulberry32 — kleine, degelijke PRNG op basis van een 32-bit seed
export function maakRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function kiesUit(lijst, rng) {
  return lijst[Math.floor(rng() * lijst.length)];
}
