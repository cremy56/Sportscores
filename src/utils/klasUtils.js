// src/utils/klasUtils.js

/**
 * Extraheert het leerjaar uit een klasnaam
 * Voorbeelden: "1A" → 1, "6LO" → 6, "2MTW" → 2
 */
export function getLeerjaarFromKlas(klas) {
    if (!klas) return null;
    const match = klas.toString().match(/^(\d+)/);
    return match ? parseInt(match[1]) : null;
}

/**
 * Converteert leerjaar naar normatieve leeftijd
 * Leerjaar 1 = 12 jaar, leerjaar 6 = 17 jaar
 */
export function getLeeftijdFromLeerjaar(leerjaar) {
    if (!leerjaar || leerjaar < 1 || leerjaar > 6) return null;
    return 11 + leerjaar; // 1→12, 2→13, ..., 6→17
}

/**
 * Rechtstreeks van klasnaam naar normatieve leeftijd
 */
export function getLeeftijdFromKlas(klas) {
    const leerjaar = getLeerjaarFromKlas(klas);
    return getLeeftijdFromLeerjaar(leerjaar);
}
