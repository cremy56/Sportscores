// lib/rateLimiter.js
// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting via Upstash Redis (sliding window, EU-regio).
//
// DOEL (Art. 32 AVG — passende technische maatregelen):
//   1. Online brute-force op auth/whitelist afremmen
//   2. Misbruik door eigen gebruikers (scripts via browserconsole) begrenzen
//   3. Kostenbescherming (Firestore reads / Vercel invocations)
//   4. Beschikbaarheid: één gebruiker kan de API niet verzadigen
//
// WERKING:
//   - Categorieën met eigen limiet (per 60 sec): auth 15, admin 10,
//     schrijf 60, lees 120, vangnet 300.
//   - Sleutel = firebaseUid indien bekend, anders HMAC-gehasht IP
//     (nooit ruwe IP's in Redis — privacy). Keys verlopen automatisch.
//   - LOG-ONLY default: zonder RATE_LIMIT_ENFORCE=true wordt een
//     overschrijding enkel gelogd, niet geblokkeerd. Eerst een week
//     meten, dan pas handhaven.
//   - FAIL-OPEN: als Upstash of Secret Manager onbereikbaar is, laten
//     we het verzoek door (met log). Beschikbaarheid tijdens een
//     testafname weegt zwaarder dan het restrisico.
//   - Cron/systeem-bypass via header x-cron-secret === CRON_SECRET.
//   - Zonder UPSTASH_REDIS_REST_URL/-TOKEN env vars is de limiter
//     volledig uitgeschakeld (veilig te deployen vóór Upstash-setup).
//
// VEREISTEN:
//   npm install @upstash/ratelimit @upstash/redis
//   Vercel env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
//   (beide Sensitive, Production + Preview), optioneel RATE_LIMIT_ENFORCE.
// ─────────────────────────────────────────────────────────────────────────────

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import CryptoJS from 'crypto-js';
import { getHashPepper } from './keyManager.js';

const ENABLED = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const ENFORCE = process.env.RATE_LIMIT_ENFORCE === 'true'; // anders: log-only

// Limieten per categorie: [aantal verzoeken, venster]
const LIMIETEN = {
    auth:    [15,  '60 s'],  // login/profielcheck, nickname
    admin:   [10,  '60 s'],  // gebruikersbeheer, archivering, rotaties
    schrijf: [60,  '60 s'],  // scores, taken, welzijn, inzendingen
    lees:    [120, '60 s'],  // dashboards, rankings, get_*
    vangnet: [300, '60 s'],  // totaal per IP (optioneel, vóór token-verificatie)
};

// ─── Action → categorie mapping ───────────────────────────────────────────────
// Expliciete admin-lijst; onbekende actions vallen bewust in 'schrijf'
// (strenger default). get_/haal_/zoek_-prefix → 'lees'.
// ⚠️ Uitbreiden wanneer er nieuwe admin-actions bijkomen.
const ADMIN_ACTIONS = new Set([
    'create_user', 'update_user', 'delete_user', 'bulk_create',
    'update_teacher_klassen', 'archiveer_rankings',
]);

export function categorieVoorAction(action = '') {
    if (ADMIN_ACTIONS.has(action)) return 'admin';
    if (/^(get_|haal_|zoek_)/.test(action)) return 'lees';
    return 'schrijf';
}

// ─── Intern ───────────────────────────────────────────────────────────────────
let redis = null;
const limiters = {};

function getLimiter(categorie) {
    if (!redis) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    if (!limiters[categorie]) {
        const [aantal, venster] = LIMIETEN[categorie] || LIMIETEN.schrijf;
        limiters[categorie] = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(aantal, venster),
            prefix: `rl:${categorie}`,
            analytics: false, // scheelt Redis-commands
            // ephemeralCache staat default aan: geblokkeerde keys worden
            // in-memory afgevangen zonder extra Redis-call.
        });
    }
    return limiters[categorie];
}

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'onbekend';
}

// IP's zijn persoonsgegevens — nooit ruw als Redis-key opslaan.
async function hashIp(ip) {
    try {
        const pepper = await getHashPepper();
        return CryptoJS.HmacSHA256(ip, pepper).toString().substring(0, 32);
    } catch {
        // Pepper onbereikbaar → kale hash als fallback (nog steeds geen ruw IP)
        return CryptoJS.SHA256(ip).toString().substring(0, 32);
    }
}

// ─── Publieke API ─────────────────────────────────────────────────────────────

/**
 * Controleert de rate limit voor dit verzoek.
 * @param {object} req - de request (voor IP en cron-header)
 * @param {object} opties - { categorie, uid }
 *   categorie: 'auth' | 'admin' | 'schrijf' | 'lees' | 'vangnet'
 *   uid: firebaseUid indien bekend (na verifyToken) — anders wordt het IP gebruikt
 * @returns {Promise<{toegestaan: boolean, retryAfter?: number}>}
 */
export async function checkRateLimit(req, { categorie = 'schrijf', uid = null } = {}) {
    if (!ENABLED) return { toegestaan: true };

    // Cron/systeem-bypass (Cloud Functions, Vercel crons)
    if (process.env.CRON_SECRET && req.headers['x-cron-secret'] === process.env.CRON_SECRET) {
        return { toegestaan: true };
    }

    try {
        const key = uid
            ? `u:${uid}`
            : `ip:${await hashIp(getClientIp(req))}`;

        const { success, reset } = await getLimiter(categorie).limit(key);
        if (success) return { toegestaan: true };

        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

        if (!ENFORCE) {
            // Meetfase: enkel loggen (key ingekort — geen volledige uid/hash in logs)
            console.warn(`[rate-limit] LOG-ONLY overschrijding — categorie=${categorie}, key=${key.substring(0, 10)}..., retryAfter=${retryAfter}s`);
            return { toegestaan: true };
        }

        console.warn(`[rate-limit] GEBLOKKEERD — categorie=${categorie}, key=${key.substring(0, 10)}..., retryAfter=${retryAfter}s`);
        return { toegestaan: false, retryAfter };
    } catch (err) {
        // FAIL-OPEN: limiter mag de app nooit platleggen
        console.error('[rate-limit] check mislukt — fail-open:', err.message);
        return { toegestaan: true };
    }
}

/** Stuurt de standaard 429-response met Retry-After header. */
export function stuurRateLimitResponse(res, retryAfter = 60) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
        error: 'Te veel verzoeken. Probeer het over een minuutje opnieuw.',
        retryAfter,
    });
}