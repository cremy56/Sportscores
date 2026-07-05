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
import { haalDagcontext, weerVlaggen } from '../sportbuddy/dagcontext.js';
import { kiesStatusbericht } from '../sportbuddy/statusberichten.js';
import { eventVanVandaag, eventVoorClient, EVENTS } from '../sportbuddy/events.js';

const XP_EVENT = 10;

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

// Vlaggen voor engine + statusberichten uit de dagcontext
function contextVlaggen(context) {
    return {
        ...weerVlaggen(context.weer),
        weer: context.weer,
        matchdag: !!context.kalender?.matchdag,
        dagenTotMatch: context.kalender?.dagenTotMatch ?? 7,
        weekdag: context.kalender?.weekdag ?? 1,
    };
}

// Blessure genezen? (tot-datum verstreken) → opruimen
function verwerkBlessureVerloop(buddy, vandaag) {
    const blessure = buddy.gezondheid?.blessure;
    if (blessure?.tot && blessure.tot < vandaag) {
        return {
            buddy: { ...buddy, gezondheid: { ...buddy.gezondheid, blessure: null } },
            melding: 'Goed nieuws: de blessure van je buddy is genezen. Rustig weer opbouwen!',
        };
    }
    return { buddy, melding: null };
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
        const vandaag = vandaagBrussel();
        const meldingen = [];

        const { buddy: naVerval, meldingen: vervalMeldingen, toegepast } = pasDetrainingToe(buddy);
        meldingen.push(...vervalMeldingen);
        const blessureCheck = verwerkBlessureVerloop(naVerval, vandaag);
        if (blessureCheck.melding) meldingen.push(blessureCheck.melding);

        if (toegepast || blessureCheck.melding) {
            const { id, ...velden } = blessureCheck.buddy;
            if (toegepast) {
                // laatste_verzorging opschuiven tot gisteren: het verval is verrekend,
                // vandaag verzorgen blijft mogelijk en telt niet dubbel.
                const gisteren = new Date(Date.now() - 86400000)
                    .toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
                velden.laatste_verzorging = gisteren;
            }
            await buddyRef.set(velden);
            buddy = { id, ...velden };
        } else {
            buddy = blessureCheck.buddy;
        }

        const weergave = await bepaalWeergave(profiel);
        const context = await haalDagcontext(buddy.school_id || profiel.school_id);
        const vlaggen = contextVlaggen(context);

        // Statusbericht (individueel, geseed op uid+datum)
        const statusbericht = kiesStatusbericht(buddy, vlaggen, decodedToken.uid, vandaag);

        // Event van vandaag (regels: 2/week, geseed, blackout do+vr) —
        // alleen tonen zolang het vandaag nog niet beantwoord is
        let event = null;
        if (!buddy.seizoen?.rustperiode) {
            const kandidaat = eventVanVandaag(decodedToken.uid, vandaag, vlaggen.weekdag);
            const alGedaan = (buddy.events_log || []).some((e) => e.datum === vandaag);
            if (kandidaat && !alGedaan) event = eventVoorClient(kandidaat);
        }

        return res.status(200).json({
            success: true,
            buddy: metDagstaat(buddy, weergave),
            meldingen,
            vandaag_verzorgd: buddy.laatste_verzorging === vandaag,
            context: { weer: context.weer, kalender: context.kalender },
            statusbericht,
            event,
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
        const context = await haalDagcontext(buddy.school_id || profiel.school_id);
        const vlaggen = contextVlaggen(context);
        const verval = pasDetrainingToe(buddy);
        const { state, meldingen, dagstaat } = verwerkDag(verval.buddy, keuzes, {
            graad: weergave.graad,
            heet: vlaggen.heet,
            koud: vlaggen.koud,
            matchdag: vlaggen.matchdag,
            blessure: !!verval.buddy.gezondheid?.blessure,
        });

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

// ─── RESOLVE EVENT ────────────────────────────────────────────────────────────
// De leerling beantwoordt het event van vandaag. De server hercomputet
// deterministisch wélk event dat hoort te zijn (geen client-vertrouwen),
// past het gevolg toe, logt keuze-ID's (geen vrije tekst) en kent 10 XP toe
// (1× per event-dag).
export async function handleResolveEvent(req, res, decodedToken) {
    const { event_id, keuze_id } = req.body;
    try {
        const profiel = await getProfiel(decodedToken.uid);
        if (!TOEGESTANE_ROLLEN.includes(profiel.rol)) {
            return res.status(403).json({ error: 'Verboden' });
        }

        const buddyRef = db.collection('virtuele_atleten').doc(decodedToken.uid);
        const buddyDoc = await buddyRef.get();
        if (!buddyDoc.exists) {
            return res.status(404).json({ error: 'Geen Sportbuddy gevonden' });
        }
        let buddy = { id: buddyDoc.id, ...buddyDoc.data() };
        if (buddy.seizoen?.rustperiode) {
            return res.status(400).json({ error: 'Je buddy is op rustperiode' });
        }

        const vandaag = vandaagBrussel();
        const context = await haalDagcontext(buddy.school_id || profiel.school_id);
        const vlaggen = contextVlaggen(context);

        const verwacht = eventVanVandaag(decodedToken.uid, vandaag, vlaggen.weekdag);
        if (!verwacht || verwacht.id !== event_id) {
            return res.status(400).json({ error: 'Dit event is vandaag niet aan de orde' });
        }
        if ((buddy.events_log || []).some((e) => e.datum === vandaag)) {
            return res.status(409).json({ error: 'Je hebt het event van vandaag al beantwoord' });
        }
        const keuze = verwacht.keuzes.find((k) => k.id === keuze_id);
        if (!keuze) {
            return res.status(400).json({ error: 'Ongeldige keuze' });
        }

        // ── Gevolg toepassen (geklemd) ────────────────────────────────────────
        const klem = (x, min, max) => Math.min(max, Math.max(min, x));
        const gevolg = keuze.gevolg || {};
        buddy.vermoeidheid = klem((buddy.vermoeidheid || 0) + (gevolg.vermoeidheid || 0), 0, 100);
        buddy.stress = klem((buddy.stress || 0) + (gevolg.stress || 0), 0, 100);
        buddy.fitheid = klem((buddy.fitheid || 0) + (gevolg.fitheid || 0), 0, 100);
        if (gevolg.stats) {
            buddy.stats = { ...buddy.stats };
            for (const [k, delta] of Object.entries(gevolg.stats)) {
                buddy.stats[k] = klem((buddy.stats[k] || 0) + delta, 0, 100);
            }
        }
        if (gevolg.blessure) {
            const tot = new Date(Date.now() + gevolg.blessure.dagen * 86400000)
                .toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
            buddy.gezondheid = { ...buddy.gezondheid, blessure: { type: gevolg.blessure.type, tot } };
        }

        buddy.events_log = [...(buddy.events_log || []), {
            event_id, keuze_id, datum: vandaag, dag: buddy.seizoen?.dag || 1,
        }];

        const { id, ...velden } = buddy;
        await buddyRef.set(velden);

        // ── 10 XP (zelfde transactiepatroon; cap = 1 event per dag hierboven) ─
        const userRef = db.collection('users').doc(decodedToken.uid);
        await userRef.update({
            xp: FieldValue.increment(XP_EVENT),
            xp_current_period: FieldValue.increment(XP_EVENT),
            xp_current_school_year: FieldValue.increment(XP_EVENT),
        });
        await userRef.collection('xp_transactions').add({
            amount: XP_EVENT,
            reason: 'sportbuddy_event',
            source_id: event_id,
            balance_after: null,
            metadata: { keuze_id },
            created_at: FieldValue.serverTimestamp(),
        });

        const weergave = await bepaalWeergave(profiel);
        return res.status(200).json({
            success: true,
            buddy: metDagstaat({ id, ...velden }, weergave),
            gevolgTekst: keuze.gevolgTekst,
            wetenschap: verwacht.wetenschap,
            eindtermen: verwacht.eindtermen,
            hulpwijzer: !!keuze.hulpwijzer,
            beloning: { xp: XP_EVENT },
        });
    } catch (err) {
        console.error('❌ handleResolveEvent:', err);
        return res.status(500).json({ error: 'Event verwerken mislukt' });
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
