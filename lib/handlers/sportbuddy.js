// lib/handlers/sportbuddy.js
// Sportbuddy (Gezondheid 2.0 — datavrij by design, zie MVP_PLAN_SPORTBUDDY.md).
// Het document virtuele_atleten/{uid} bevat UITSLUITEND spelvoortgang van een
// fictief personage: geen naamveld (de buddy draagt de nickname uit het
// users-profiel), geen vrije tekst, geen gezondheidsdata van de leerling.
// Alle toegang loopt via deze API (Admin SDK) — de Firestore catch-all blijft dicht.
import { db } from '../firebaseAdmin.js';
import { getSchoolId } from '../apiHelpers.js';
import {
    BESCHIKBARE_SPORTEN, valideerAvatar, huidigSchooljaar,
} from '../sportbuddy/constants.js';

const TOEGESTANE_ROLLEN = ['leerling', 'administrator', 'super-administrator'];

async function getProfiel(uid) {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) throw new Error('Gebruikersprofiel niet gevonden.');
    return snap.data();
}

// ─── GET BUDDY ────────────────────────────────────────────────────────────────
export async function handleGetBuddy(req, res, decodedToken) {
    try {
        const profiel = await getProfiel(decodedToken.uid);
        if (!TOEGESTANE_ROLLEN.includes(profiel.rol)) {
            return res.status(403).json({ error: 'Verboden' });
        }

        const buddyDoc = await db.collection('virtuele_atleten').doc(decodedToken.uid).get();
        if (!buddyDoc.exists) {
            return res.status(200).json({ success: true, buddy: null });
        }

        // Sessie 2: hier komt de lazy detraining (verstreken gamedagen sinds
        // laatste_verzorging in één Banister-stap verrekenen vóór teruggave).
        return res.status(200).json({ success: true, buddy: { id: buddyDoc.id, ...buddyDoc.data() } });
    } catch (err) {
        console.error('❌ handleGetBuddy:', err);
        return res.status(500).json({ error: 'Kon je Sportbuddy niet ophalen' });
    }
}

// ─── CREATE BUDDY ─────────────────────────────────────────────────────────────
export async function handleCreateBuddy(req, res, decodedToken) {
    const { avatar } = req.body;
    // Fase 1: de sport ligt vast — sportkeuze komt als latere uitbreiding.
    const sport = BESCHIKBARE_SPORTEN[0];

    try {
        const profiel = await getProfiel(decodedToken.uid);
        if (!TOEGESTANE_ROLLEN.includes(profiel.rol)) {
            return res.status(403).json({ error: 'Verboden' });
        }
        const schoolId = await getSchoolId(decodedToken.uid);

        // ── Validatie: uitsluitend gesloten keuzes ───────────────────────────
        const schoonAvatar = valideerAvatar(avatar);
        if (!schoonAvatar) {
            return res.status(400).json({ error: 'Ongeldige avatar-keuze' });
        }

        const buddyRef = db.collection('virtuele_atleten').doc(decodedToken.uid);
        const bestaand = await buddyRef.get();
        if (bestaand.exists) {
            return res.status(409).json({ error: 'Je hebt al een Sportbuddy dit schooljaar' });
        }

        const nu = new Date();
        const nieuweBuddy = {
            school_id: schoolId,
            schooljaar: huidigSchooljaar(nu),
            sport,
            avatar: schoonAvatar,
            // Geen naamveld: de buddy draagt de nickname uit het users-profiel.
            // Identiek startpunt voor iedereen (GDD §3): de buddy is een
            // personage, geen spiegel van het eigen lichaam.
            stats: { K: 10, L: 10, U: 10, S: 10, C: 10, E: 10 },
            fitheid: 0,
            vermoeidheid: 0,
            stress: 10,
            gezondheid: { blessure: null, ziekte: null, energiebeschikbaarheid: 'ok' },
            seizoen: { dag: 1, fase: 'voorbereiding', mijlpalen: [], rustperiode: false },
            events_log: [],
            kennis: {},
            coins: 0,
            laatste_verzorging: null,
            created_at: nu,
        };

        await buddyRef.set(nieuweBuddy);
        return res.status(200).json({ success: true, buddy: { id: decodedToken.uid, ...nieuweBuddy } });
    } catch (err) {
        console.error('❌ handleCreateBuddy:', err);
        return res.status(500).json({ error: 'Buddy aanmaken mislukt' });
    }
}
