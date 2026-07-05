// lib/handlers/sportbuddy.js
// Sportbuddy (Gezondheid 2.0 — datavrij by design, zie MVP_PLAN_SPORTBUDDY.md).
// Het document virtuele_atleten/{uid} bevat UITSLUITEND spelvoortgang van een
// fictief personage: geen naamveld (de buddy draagt de nickname uit het
// users-profiel), geen vrije tekst, geen gezondheidsdata van de leerling.
// Alle toegang loopt via deze API (Admin SDK) — de Firestore catch-all blijft dicht.
//
// XP-principe (GDD §7): 5 XP + 1 coin per dagelijkse verzorging (cap: 1×/dag,
// afgedwongen via laatste_verzorging). XP beloont de leerhandeling rond het
// fictieve personage — nooit gezondheidsgedrag van de leerling zelf.
import { db } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getSchoolId } from '../apiHelpers.js';
import {
    BESCHIKBARE_SPORTEN, valideerAvatar, huidigSchooljaar,
    graadVanKlas, weergaveGeslacht,
} from '../sportbuddy/constants.js';
import { valideerKeuzes } from '../sportbuddy/keuzes.js';
import { verwerkDag, vervalOverDagen, afgeleiden } from '../sportbuddy/engine.js';

const TOEGESTANE_ROLLEN = ['leerling', 'administrator', 'super-administrator'];
const XP_VERZORGING = 5;
const COINS_VERZORGING = 1;

async function getProfiel(uid) {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) throw new Error('Gebruikersprofiel niet gevonden.');
    return snap.data();
}

// Weergavehints voor de avatar — AFGELEID uit bestaande profieldata, nooit
// opgeslagen in het buddy-document (zelfde patroon als de nickname).
// Geslacht: eerst users-profiel, anders toegestane_gebruikers; 'X'/onbekend
// → null (dan geldt de cosmetische lichaamskeuze uit de wizard).
async function bepaalWeergave(profiel) {
    const graad = graadVanKlas(profiel.klas);
    let geslacht = weergaveGeslacht(profiel.geslacht);
    if (!geslacht && profiel.toegestane_gebruikers_id) {
        try {
            const tgDoc = await db.collection('toegestane_gebruikers')
                .doc(profiel.toegestane_gebruikers_id).get();
            if (tgDoc.exists) geslacht = weergaveGeslacht(tgDoc.data().geslacht);
        } catch { /* weergave-fallback volstaat */ }
    }
    return { graad, geslacht };
}

function metDagstaat(buddy, weergave) {
    const lichaam = weergave?.geslacht || buddy.avatar?.lichaam || 'neutraal';
    return {
        ...buddy,
        dagstaat: afgeleiden(buddy),
        weergave: { graad: weergave?.graad || 2, lichaam },
    };
}

// Kalenderdag in Belgische tijd (Vercel draait op UTC) → 'YYYY-MM-DD'
function vandaagBrussel() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
}

function dagenTussen(datumStrA, datumStrB) {
    const a = new Date(`${datumStrA}T12:00:00Z`);
    const b = new Date(`${datumStrB}T12:00:00Z`);
    return Math.round((b - a) / 86400000);
}

// Lazy detraining: gemiste dagen sinds de laatste verzorging in één keer
// verrekenen (geen cron nodig). Rustperiode pauzeert de klok volledig.
function pasDetrainingToe(buddy) {
    if (buddy.seizoen?.rustperiode) return { buddy, meldingen: [], toegepast: false };
    if (!buddy.laatste_verzorging) return { buddy, meldingen: [], toegepast: false };
    const gemist = dagenTussen(buddy.laatste_verzorging, vandaagBrussel()) - 1;
    if (gemist <= 0) return { buddy, meldingen: [], toegepast: false };
    const { state, meldingen } = vervalOverDagen(buddy, gemist);
    return { buddy: state, meldingen, toegepast: true };
}

// ─── GET BUDDY ────────────────────────────────────────────────────────────────
export async function handleGetBuddy(req, res, decodedToken) {
    try {
        const profiel = await getProfiel(decodedToken.uid);
        if (!TOEGESTANE_ROLLEN.includes(profiel.rol)) {
            return res.status(403).json({ error: 'Verboden' });
        }

        const buddyRef = db.collection('virtuele_atleten').doc(decodedToken.uid);
        const buddyDoc = await buddyRef.get();
        if (!buddyDoc.exists) {
            return res.status(200).json({ success: true, buddy: null });
        }

        let buddy = { id: buddyDoc.id, ...buddyDoc.data() };
        const { buddy: naVerval, meldingen, toegepast } = pasDetrainingToe(buddy);
        if (toegepast) {
            const { id, ...velden } = naVerval;
            // laatste_verzorging opschuiven tot gisteren: het verval is verrekend,
            // vandaag verzorgen blijft mogelijk en telt niet dubbel.
            const gisteren = new Date(Date.now() - 86400000)
                .toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
            velden.laatste_verzorging = gisteren;
            await buddyRef.set(velden);
            buddy = { id, ...velden };
        }

        const weergave = await bepaalWeergave(profiel);
        return res.status(200).json({
            success: true,
            buddy: metDagstaat(buddy, weergave),
            meldingen,
            vandaag_verzorgd: buddy.laatste_verzorging === vandaagBrussel(),
        });
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
        // Lichaamskeuze alléén bewaren als het profiel-geslacht 'X'/onbekend is;
        // bij m/v volgt de avatar automatisch het profiel (niets dupliceren).
        const weergave = await bepaalWeergave(profiel);
        if (weergave.geslacht) delete schoonAvatar.lichaam;

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
            laatste_keuzes: null,
            created_at: nu,
        };

        await buddyRef.set(nieuweBuddy);
        return res.status(200).json({ success: true, buddy: metDagstaat({ id: decodedToken.uid, ...nieuweBuddy }, weergave) });
    } catch (err) {
        console.error('❌ handleCreateBuddy:', err);
        return res.status(500).json({ error: 'Buddy aanmaken mislukt' });
    }
}

// ─── VERZORG DAG ──────────────────────────────────────────────────────────────
export async function handleVerzorgDag(req, res, decodedToken) {
    try {
        const profiel = await getProfiel(decodedToken.uid);
        if (!TOEGESTANE_ROLLEN.includes(profiel.rol)) {
            return res.status(403).json({ error: 'Verboden' });
        }

        const keuzes = valideerKeuzes(req.body.keuzes);
        if (!keuzes) {
            return res.status(400).json({ error: 'Ongeldige verzorgingskeuzes' });
        }

        const buddyRef = db.collection('virtuele_atleten').doc(decodedToken.uid);
        const buddyDoc = await buddyRef.get();
        if (!buddyDoc.exists) {
            return res.status(404).json({ error: 'Geen Sportbuddy gevonden' });
        }

        let buddy = { id: buddyDoc.id, ...buddyDoc.data() };
        if (buddy.seizoen?.rustperiode) {
            return res.status(400).json({ error: 'Je buddy is op rustperiode — beëindig die eerst' });
        }
        const vandaag = vandaagBrussel();
        if (buddy.laatste_verzorging === vandaag) {
            return res.status(409).json({ error: 'Je hebt je buddy vandaag al verzorgd' });
        }

        // Eerst eventuele gemiste dagen verrekenen, dan de verzorgde dag zelf.
        const weergave = await bepaalWeergave(profiel);
        const verval = pasDetrainingToe(buddy);
        const { state, meldingen, dagstaat } = verwerkDag(verval.buddy, keuzes, { graad: weergave.graad });

        const { id, ...velden } = state;
        velden.laatste_verzorging = vandaag;
        velden.laatste_keuzes = keuzes; // gesloten IDs — geen vrije tekst
        await buddyRef.set(velden);

        // ── XP + coin (cap 1×/dag zit in de datum-check hierboven) ───────────
        // Zelfde patroon als de bestaande XP-toekenning (functions/src/utils.js).
        const userRef = db.collection('users').doc(decodedToken.uid);
        await userRef.update({
            xp: FieldValue.increment(XP_VERZORGING),
            xp_current_period: FieldValue.increment(XP_VERZORGING),
            xp_current_school_year: FieldValue.increment(XP_VERZORGING),
        });
        await userRef.collection('xp_transactions').add({
            amount: XP_VERZORGING,
            reason: 'sportbuddy_verzorging',
            source_id: null,
            balance_after: null,
            metadata: { coins: COINS_VERZORGING, dag: velden.seizoen?.dag || null },
            created_at: FieldValue.serverTimestamp(),
        });
        await buddyRef.update({ coins: FieldValue.increment(COINS_VERZORGING) });
        velden.coins = (velden.coins || 0) + COINS_VERZORGING;

        return res.status(200).json({
            success: true,
            buddy: metDagstaat({ id, ...velden }, weergave),
            meldingen: [...verval.meldingen, ...meldingen],
            dagstaat,
            beloning: { xp: XP_VERZORGING, coins: COINS_VERZORGING },
        });
    } catch (err) {
        console.error('❌ handleVerzorgDag:', err);
        return res.status(500).json({ error: 'Verzorging verwerken mislukt' });
    }
}

// ─── RUSTPERIODE AAN/UIT ──────────────────────────────────────────────────────
// Vakantie/stage-knop (GDD): pauzeert de klok — geen detraining, geen straf.
export async function handleZetRustperiode(req, res, decodedToken) {
    const { actief } = req.body;
    if (typeof actief !== 'boolean') {
        return res.status(400).json({ error: 'actief (true/false) vereist' });
    }
    try {
        const profiel = await getProfiel(decodedToken.uid);
        if (!TOEGESTANE_ROLLEN.includes(profiel.rol)) {
            return res.status(403).json({ error: 'Verboden' });
        }
        const weergave = await bepaalWeergave(profiel);

        const buddyRef = db.collection('virtuele_atleten').doc(decodedToken.uid);
        const buddyDoc = await buddyRef.get();
        if (!buddyDoc.exists) {
            return res.status(404).json({ error: 'Geen Sportbuddy gevonden' });
        }

        let buddy = { id: buddyDoc.id, ...buddyDoc.data() };
        const meldingen = [];

        if (actief && !buddy.seizoen?.rustperiode) {
            // Openstaand verval eerst verrekenen, daarna de klok bevriezen.
            const verval = pasDetrainingToe(buddy);
            buddy = verval.buddy;
            meldingen.push(...verval.meldingen);
        }
        if (!actief && buddy.seizoen?.rustperiode) {
            // Herstart: gisteren als ijkpunt zodat vandaag verzorgen kan,
            // zonder dat de rustdagen als gemiste dagen tellen.
            const gisteren = new Date(Date.now() - 86400000)
                .toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
            buddy.laatste_verzorging = gisteren;
            meldingen.push('Rustperiode afgelopen — je buddy staat weer klaar.');
        }

        buddy.seizoen = { ...buddy.seizoen, rustperiode: actief };
        const { id, ...velden } = buddy;
        await buddyRef.set(velden);

        return res.status(200).json({ success: true, buddy: metDagstaat({ id, ...velden }, weergave), meldingen });
    } catch (err) {
        console.error('❌ handleZetRustperiode:', err);
        return res.status(500).json({ error: 'Rustperiode wijzigen mislukt' });
    }
}
