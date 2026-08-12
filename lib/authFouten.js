// lib/authFouten.js
// ─────────────────────────────────────────────────────────────────────────────
// Onderscheidt een ECHTE tokenverificatiefout van een infrastructuurfout.
//
// Waarom dit bestaat: voorheen stond in elke API-route
//   if (error.message?.includes('token')) return 401
// Dat labelde ELKE fout met het woord "token" erin als "niet ingelogd" — ook
// een ingetrokken service-key ("Failed to fetch access token"). Gevolg: een
// infrastructuurstoring zag eruit als een uitgelogde gebruiker, werd niet
// gelogd, en bleef daardoor 15 minuten onopgemerkt (key-rotatie-uitval juli).
//
// Nu classificeren we op error.code:
//   - verifyToken() in lib/firebaseAdmin.js zet 'auth/geen-token' bij een
//     ontbrekende of misvormde Authorization-header
//   - de Firebase Admin SDK zet 'auth/...' bij verlopen/ongeldige tokens
//   - alles zónder auth-code is infrastructuur → 503 + luide log
//
// Deze functie stond eerder letterlijk gekopieerd in tests.js, auth.js en
// content.js. Die kopieën liepen uit de pas (archive.js, sportbuddy.js en
// users.js hadden de oude check nog). Eén gedeelde bron voorkomt dat.
// ─────────────────────────────────────────────────────────────────────────────

export function isEchteTokenfout(error) {
    if (typeof error?.code === 'string' && error.code.startsWith('auth/')) {
        // Uitzondering: dit is een configuratie-/infrastructuurprobleem aan
        // ONZE kant, geen ongeldig token van de gebruiker.
        if (error.code === 'auth/internal-error') return false;
        return true;
    }
    return false;
}

// Standaardafhandeling van een mislukte verifyToken(). Geeft true terug als er
// al een response verstuurd is, zodat de aanroeper meteen kan stoppen.
export function stuurAuthfoutResponse(res, error, route) {
    if (isEchteTokenfout(error)) {
        console.warn(`[auth] tokenverificatie geweigerd in ${route}:`, error.code || error.message);
        res.status(401).json({ error: 'Niet geauthenticeerd' });
        return true;
    }
    console.error(`❌ [auth] INFRASTRUCTUURFOUT bij tokenverificatie in ${route}:`, error);
    res.status(503).json({ error: 'Authenticatiedienst tijdelijk niet beschikbaar' });
    return true;
}
