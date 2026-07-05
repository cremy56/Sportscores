// api/sportbuddy.js — dunne router (patroon: api/tests.js)
// Sportbuddy = Gezondheid 2.0, datavrij by design: alle acties gaan over een
// fictief personage in virtuele_atleten/{uid}. Geen Art. 9-data.
import { verifyToken } from '../lib/firebaseAdmin.js';
import { checkRateLimit, stuurRateLimitResponse, categorieVoorAction } from '../lib/rateLimiter.js';

import {
    handleGetBuddy, handleCreateBuddy, handleVerzorgDag, handleZetRustperiode,
    handleResolveEvent, handleCompleteKennis,
} from '../lib/handlers/sportbuddy.js';

// ─── HOOFD HANDLER ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const decodedToken = await verifyToken(req.headers.authorization);
        const { action } = req.body;

        // ── Rate limit (per gebruiker, categorie op basis van action) ────────
        const rl = await checkRateLimit(req, {
            categorie: categorieVoorAction(action),
            uid: decodedToken.uid,
        });
        if (!rl.toegestaan) return stuurRateLimitResponse(res, rl.retryAfter);

        switch (action) {
            case 'get_buddy':        return await handleGetBuddy(req, res, decodedToken);
            case 'create_buddy':     return await handleCreateBuddy(req, res, decodedToken);
            case 'verzorg_dag':      return await handleVerzorgDag(req, res, decodedToken);
            case 'zet_rustperiode':  return await handleZetRustperiode(req, res, decodedToken);
            case 'resolve_event':    return await handleResolveEvent(req, res, decodedToken);
            case 'complete_kennis':  return await handleCompleteKennis(req, res, decodedToken);
            default:
                return res.status(400).json({ error: `Onbekende action: ${action}` });
        }

    } catch (error) {
        if (error.message?.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Hoofd-error in /sportbuddy:', error);
        return res.status(500).json({ error: 'Fout bij verwerken Sportbuddy-data' });
    }
}
