// api/handlers/sportlab.js
import { db } from '../../lib/firebaseAdmin.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getSchoolId } from '../../lib/apiHelpers.js';
import { writeAuditLog } from '../../lib/auditLogger.js';

// ─── XP BEDRAGEN ──────────────────────────────────────────────────────────────
const XP = {
    DEELNAME:        10,   // rol kiezen + sessie joinen
    ZELFREFLECTIE:   20,   // reflectie volledig invullen
    LEVEL_UP:       100,   // teacher-gevalideerde level-up
    ALTERNATIEF:     25,   // blessurebewuste sporter oefeningen afgevinkt
};

// ─── ROL NAMEN (UI → DB mapping) ──────────────────────────────────────────────
// Neutrale naam in DB — geen inferentie mogelijk over blessure-status (GDPR)
const ROL_DB = {
    arbiter:      'arbiter',
    coach:        'coach',
    toernooileider: 'toernooileider',
    alternatief:  'alternatief',   // UI toont "Blessurebewuste Sporter"
};

// ─── HELPER: is sessie actief? ─────────────────────────────────────────────────
function isSessieActief(sessieData) {
    if (!sessieData) return false;
    if (sessieData.status === 'gesloten') return false;
    // Automatisch verlopen na 3 uur
    const start = sessieData.start_tijd?.toDate?.();
    if (!start) return false;
    const drieUur = 3 * 60 * 60 * 1000;
    return Date.now() - start.getTime() < drieUur;
}

// ─── HELPER: school uren check ─────────────────────────────────────────────────
// Extra laag bovenop teacher session — blokkeert XP buiten schooluren
function isBinnenSchoolUren() {
    const nu = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Brussels' }));
    const dag = nu.getDay(); // 0=zondag, 6=zaterdag
    const uur = nu.getHours();
    const minuut = nu.getMinutes();
    const tijdInMinuten = uur * 60 + minuut;

    if (dag === 0 || dag === 6) return false;          // Weekend
    if (dag === 3 && tijdInMinuten >= 12 * 60) return false; // Woensdagnamiddag
    if (tijdInMinuten < 7 * 60) return false;          // Voor 07:00
    if (tijdInMinuten >= 17 * 60) return false;        // Na 17:00

    return true;
}

// ─── 1. START SESSIE (leerkracht) ─────────────────────────────────────────────
export async function handleStartSportLabSessie(req, res, decodedToken) {
    try {
        const { schoolId, sport, klas } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        const callerRol = callerSnap.data()?.rol;
        if (!['leerkracht', 'administrator', 'super-administrator'].includes(callerRol)) {
            return res.status(403).json({ error: 'Alleen leerkrachten kunnen een sessie starten.' });
        }

        if (!sport?.trim()) return res.status(400).json({ error: 'Sport is verplicht.' });

        // Sluit eventuele nog open sessies van deze leerkracht
        const openSessies = await db.collection('sport_lab_sessions')
            .where('leerkracht_id', '==', decodedToken.uid)
            .where('status', 'in', ['actief', 'evaluatie'])
            .get();

        const batch = db.batch();
        openSessies.docs.forEach(d => {
            batch.update(d.ref, { status: 'gesloten', gesloten_op: Timestamp.now() });
        });
        await batch.commit();

        // Nieuwe sessie aanmaken
        const sessieRef = await db.collection('sport_lab_sessions').add({
            school_id: verifiedSchoolId,
            leerkracht_id: decodedToken.uid,
            sport: sport.trim(),
            klas: klas || null,
            status: 'actief',
            start_tijd: Timestamp.now(),
            gesloten_op: null,
        });

        await writeAuditLog({
            action: 'sportlab_sessie_gestart',
            actor_uid: decodedToken.uid,
            school_id: verifiedSchoolId,
            metadata: { sessie_id: sessieRef.id, sport, klas }
        });

        return res.status(200).json({ success: true, sessie_id: sessieRef.id });

    } catch (error) {
        console.error('❌ handleStartSportLabSessie:', error);
        return res.status(500).json({ error: 'Fout bij starten sessie' });
    }
}

// ─── 2. SLUIT SESSIE (leerkracht) ─────────────────────────────────────────────
// status: 'evaluatie' → leerlingen krijgen 5 minuten om te reflecteren
//         'gesloten'  → definitief gesloten
export async function handleSluitSportLabSessie(req, res, decodedToken) {
    try {
        const { schoolId, sessieId, definitief } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const sessieRef = db.collection('sport_lab_sessions').doc(sessieId);
        const sessieSnap = await sessieRef.get();
        if (!sessieSnap.exists) return res.status(404).json({ error: 'Sessie niet gevonden.' });

        const sessieData = sessieSnap.data();
        if (sessieData.leerkracht_id !== decodedToken.uid) {
            return res.status(403).json({ error: 'Alleen de sessie-eigenaar kan sluiten.' });
        }

        const nieuweStatus = definitief ? 'gesloten' : 'evaluatie';
        await sessieRef.update({
            status: nieuweStatus,
            ...(nieuweStatus === 'evaluatie' && { evaluatie_start: Timestamp.now() }),
            ...(nieuweStatus === 'gesloten' && { gesloten_op: Timestamp.now() }),
        });

        return res.status(200).json({ success: true, status: nieuweStatus });

    } catch (error) {
        console.error('❌ handleSluitSportLabSessie:', error);
        return res.status(500).json({ error: 'Fout bij sluiten sessie' });
    }
}

// ─── 3. GET ACTIEVE SESSIE ────────────────────────────────────────────────────
// Leerling gebruikt dit om te zien of er een sessie is voor zijn/haar klas
export async function handleGetActieveSportLabSessie(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const userSnap = await db.collection('users').doc(decodedToken.uid).get();
        const userData = userSnap.data();

        // Zoek actieve sessies voor de school.
        // Klas-filtering in code: sessie zonder klas = voor iedereen,
        // sessie met klas = enkel voor die klas.
        const snap = await db.collection('sport_lab_sessions')
            .where('school_id', '==', verifiedSchoolId)
            .where('status', 'in', ['actief', 'evaluatie'])
            .orderBy('start_tijd', 'desc')
            .limit(10)
            .get();

        if (snap.empty) {
            return res.status(200).json({ success: true, sessie: null });
        }

        // Filter op klas in code
        const leerlingKlas = userData?.klas || null;
        const matchendDoc = snap.docs.find(d => {
            const sessieKlas = d.data().klas;
            return !sessieKlas || sessieKlas === leerlingKlas;
        });

        if (!matchendDoc) {
            return res.status(200).json({ success: true, sessie: null });
        }

        const sessieData = { id: matchendDoc.id, ...matchendDoc.data() };

        // Check of sessie niet verlopen is
        if (!isSessieActief(sessieData)) {
            return res.status(200).json({ success: true, sessie: null });
        }

        // Haal eigen deelname op als die bestaat
        const deelnameSnap = await db.collection('sport_lab_deelnames')
            .where('sessie_id', '==', sessieData.id)
            .where('leerling_firebase_uid', '==', decodedToken.uid)
            .limit(1)
            .get();

        const eigenDeelname = deelnameSnap.empty ? null : {
            id: deelnameSnap.docs[0].id,
            ...deelnameSnap.docs[0].data()
        };

        return res.status(200).json({
            success: true,
            sessie: {
                id: sessieData.id,
                sport: sessieData.sport,
                klas: sessieData.klas,
                status: sessieData.status,
                start_tijd: sessieData.start_tijd?.toDate?.()?.toISOString() || null,
                evaluatie_start: sessieData.evaluatie_start?.toDate?.()?.toISOString() || null,
            },
            eigen_deelname: eigenDeelname,
        });

    } catch (error) {
        console.error('❌ handleGetActieveSportLabSessie:', error);
        return res.status(500).json({ error: 'Fout bij ophalen sessie' });
    }
}

// ─── 4. LEERKRACHT: OVERZICHT EIGEN SESSIES ───────────────────────────────────
export async function handleGetSportLabSessies(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        const callerRol = callerSnap.data()?.rol;
        if (!['leerkracht', 'administrator', 'super-administrator'].includes(callerRol)) {
            return res.status(403).json({ error: 'Geen toegang.' });
        }

        const snap = await db.collection('sport_lab_sessions')
            .where('leerkracht_id', '==', decodedToken.uid)
            .orderBy('start_tijd', 'desc')
            .limit(10)
            .get();

        const sessies = await Promise.all(snap.docs.map(async (d) => {
            const sessieData = { id: d.id, ...d.data() };

            // Aantal deelnames ophalen
            const deelnamesSnap = await db.collection('sport_lab_deelnames')
                .where('sessie_id', '==', d.id)
                .get();

            return {
                ...sessieData,
                start_tijd: sessieData.start_tijd?.toDate?.()?.toISOString() || null,
                gesloten_op: sessieData.gesloten_op?.toDate?.()?.toISOString() || null,
                aantal_deelnames: deelnamesSnap.size,
            };
        }));

        return res.status(200).json({ success: true, sessies });

    } catch (error) {
        console.error('❌ handleGetSportLabSessies:', error);
        return res.status(500).json({ error: 'Fout bij ophalen sessies' });
    }
}

// ─── 5. JOIN SESSIE + ROL KIEZEN (leerling) ───────────────────────────────────
export async function handleJoinSportLabSessie(req, res, decodedToken) {
    try {
        const { schoolId, sessieId, rol } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        if (!ROL_DB[rol]) return res.status(400).json({ error: 'Ongeldige rol.' });

        // School uren check
       // FIX: tijdelijk uitschakelen tijdens ontwikkeling
// if (!isBinnenSchoolUren()) {
//     return res.status(403).json({ error: 'Sport Lab is enkel beschikbaar tijdens schooluren.' });
// }

        // Sessie valideren
        const sessieSnap = await db.collection('sport_lab_sessions').doc(sessieId).get();
        if (!sessieSnap.exists) return res.status(404).json({ error: 'Sessie niet gevonden.' });
        const sessieData = sessieSnap.data();
        if (!isSessieActief({ id: sessieId, ...sessieData })) {
            return res.status(400).json({ error: 'Sessie is niet meer actief.' });
        }
        if (sessieData.status !== 'actief') {
            return res.status(400).json({ error: 'Sessie is al in evaluatiefase.' });
        }

        // Check vrijstelling voor alternatieve rol
        const userSnap = await db.collection('users').doc(decodedToken.uid).get();
        const userData = userSnap.data();
        if (rol === 'alternatief') {
            const einddatum = userData?.vrijstelling_einddatum?.toDate?.();
            const isVrijgesteld = userData?.vrijgesteld_van_testen === true
                && einddatum && einddatum > new Date();
            if (!isVrijgesteld) {
                return res.status(403).json({ error: 'Blessurebewuste Sporter is enkel voor vrijgestelde leerlingen.' });
            }
        }

        // Bestaande deelname updaten of nieuwe aanmaken
        const bestaandeSnap = await db.collection('sport_lab_deelnames')
            .where('sessie_id', '==', sessieId)
            .where('leerling_firebase_uid', '==', decodedToken.uid)
            .limit(1)
            .get();

        let deelnameId;
        if (!bestaandeSnap.empty) {
            // Rol aanpassen als deelname al bestaat maar nog geen XP verdiend
            const bestaande = bestaandeSnap.docs[0];
            if (bestaande.data().xp_earned > 0) {
                return res.status(400).json({ error: 'Rol kan niet meer gewijzigd worden na XP-toekenning.' });
            }
            await bestaande.ref.update({ rol: ROL_DB[rol] });
            deelnameId = bestaande.id;
        } else {
            // Nieuwe deelname + deelname XP toekennen
            const deelnameRef = await db.collection('sport_lab_deelnames').add({
                sessie_id: sessieId,
                school_id: verifiedSchoolId,
                leerling_firebase_uid: decodedToken.uid,
                leerling_hash: userData?.toegestane_gebruikers_id || null,
                rol: ROL_DB[rol],
                niveau: userData?.sportlab_niveaus?.[ROL_DB[rol]] || 1,
                zelfreflectie: null,
                xp_earned: 0,
                voltooid: false,
                deelname_op: Timestamp.now(),
            });
            deelnameId = deelnameRef.id;

            // Deelname XP toekennen
            await db.collection('users').doc(decodedToken.uid).update({
                xp: FieldValue.increment(XP.DEELNAME),
                xp_current_period: FieldValue.increment(XP.DEELNAME),
                xp_current_school_year: FieldValue.increment(XP.DEELNAME),
            });

            await db.collection('users').doc(decodedToken.uid)
                .collection('xp_transactions').add({
                    amount: XP.DEELNAME,
                    reason: 'sportlab_deelname',
                    source_id: sessieId,
                    created_at: Timestamp.now(),
                });
        }

        return res.status(200).json({ success: true, deelname_id: deelnameId });

    } catch (error) {
        console.error('❌ handleJoinSportLabSessie:', error);
        return res.status(500).json({ error: 'Fout bij joinen sessie' });
    }
}

// ─── 6. ZELFREFLECTIE INDIENEN + XP CLAIMEN ───────────────────────────────────
// Geen open tekstvelden — enkel gestructureerde input (GDPR Art. 9 preventie)
export async function handleSubmitZelfreflectie(req, res, decodedToken) {
    try {
        const { schoolId, deelnameId, zelfreflectie } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // Valideer zelfreflectie structuur — enkel gestructureerde velden
        const vereistSleutels = ['inzet', 'samenwerking', 'leerwaarde'];
        for (const sleutel of vereistSleutels) {
            const waarde = zelfreflectie?.[sleutel];
            if (!waarde || !Number.isInteger(waarde) || waarde < 1 || waarde > 5) {
                return res.status(400).json({ error: `Veld '${sleutel}' moet een getal zijn tussen 1 en 5.` });
            }
        }
        // Geen vrije tekstvelden toegestaan
        if (zelfreflectie.tekst || zelfreflectie.opmerking || zelfreflectie.commentaar) {
            return res.status(400).json({ error: 'Vrije tekstvelden zijn niet toegestaan.' });
        }

        // Deelname ophalen
        const deelnameRef = db.collection('sport_lab_deelnames').doc(deelnameId);
        const deelnameSnap = await deelnameRef.get();
        if (!deelnameSnap.exists) return res.status(404).json({ error: 'Deelname niet gevonden.' });

        const deelnameData = deelnameSnap.data();
        if (deelnameData.leerling_firebase_uid !== decodedToken.uid) {
            return res.status(403).json({ error: 'Geen toegang tot deze deelname.' });
        }
        if (deelnameData.voltooid) {
            return res.status(400).json({ error: 'Reflectie al ingediend.' });
        }

        // Sessie valideren — evaluatiefase of actief
        const sessieSnap = await db.collection('sport_lab_sessions').doc(deelnameData.sessie_id).get();
        const sessieData = sessieSnap.data();
        if (!['actief', 'evaluatie'].includes(sessieData?.status)) {
            return res.status(400).json({ error: 'Sessie is gesloten.' });
        }

        // Evaluatievenster check — max 10 minuten na evaluatie_start
        if (sessieData.status === 'evaluatie' && sessieData.evaluatie_start) {
            const evaluatieStart = sessieData.evaluatie_start.toDate();
            const tienMinuten = 10 * 60 * 1000;
            if (Date.now() - evaluatieStart.getTime() > tienMinuten) {
                return res.status(400).json({ error: 'Evaluatievenster is gesloten.' });
            }
        }

        // XP berekenen
        let xpVerdient = XP.ZELFREFLECTIE;
        if (deelnameData.rol === 'alternatief' && zelfreflectie.oefeningen_afgevinkt) {
            xpVerdient += XP.ALTERNATIEF;
        }

        // Deelname updaten
        await deelnameRef.update({
            zelfreflectie: {
                inzet: zelfreflectie.inzet,
                samenwerking: zelfreflectie.samenwerking,
                leerwaarde: zelfreflectie.leerwaarde,
                oefeningen_afgevinkt: zelfreflectie.oefeningen_afgevinkt || false,
            },
            xp_earned: FieldValue.increment(xpVerdient),
            voltooid: true,
            voltooid_op: Timestamp.now(),
        });

        // XP toekennen aan leerling
        await db.collection('users').doc(decodedToken.uid).update({
            xp: FieldValue.increment(xpVerdient),
            xp_current_period: FieldValue.increment(xpVerdient),
            xp_current_school_year: FieldValue.increment(xpVerdient),
            last_activity_date: new Date().toISOString().split('T')[0], // two-pillar streak
            last_activity: Timestamp.now(),
        });

        await db.collection('users').doc(decodedToken.uid)
            .collection('xp_transactions').add({
                amount: xpVerdient,
                reason: 'sportlab_zelfreflectie',
                source_id: deelnameId,
                metadata: { rol: deelnameData.rol, sessie_id: deelnameData.sessie_id },
                created_at: Timestamp.now(),
            });

        return res.status(200).json({ success: true, xp_earned: xpVerdient });

    } catch (error) {
        console.error('❌ handleSubmitZelfreflectie:', error);
        return res.status(500).json({ error: 'Fout bij indienen zelfreflectie' });
    }
}

// ─── 7. TEACHER: LEVEL-UP VALIDEREN ──────────────────────────────────────────
export async function handleValideerLevelUp(req, res, decodedToken) {
    try {
        const { schoolId, leerlingUid, rol } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!['leerkracht', 'administrator', 'super-administrator'].includes(callerSnap.data()?.rol)) {
            return res.status(403).json({ error: 'Alleen leerkrachten kunnen level-ups valideren.' });
        }

        if (!ROL_DB[rol]) return res.status(400).json({ error: 'Ongeldige rol.' });

        const leerlingRef = db.collection('users').doc(leerlingUid);
        const leerlingSnap = await leerlingRef.get();
        if (!leerlingSnap.exists) return res.status(404).json({ error: 'Leerling niet gevonden.' });

        const huidigNiveau = leerlingSnap.data()?.sportlab_niveaus?.[ROL_DB[rol]] || 1;
        if (huidigNiveau >= 3) {
            return res.status(400).json({ error: 'Maximaal niveau bereikt.' });
        }

        const nieuwNiveau = huidigNiveau + 1;
        await leerlingRef.update({
            [`sportlab_niveaus.${ROL_DB[rol]}`]: nieuwNiveau,
            xp: FieldValue.increment(XP.LEVEL_UP),
            xp_current_period: FieldValue.increment(XP.LEVEL_UP),
            xp_current_school_year: FieldValue.increment(XP.LEVEL_UP),
        });

        await db.collection('users').doc(leerlingUid)
            .collection('xp_transactions').add({
                amount: XP.LEVEL_UP,
                reason: 'sportlab_level_up',
                metadata: { rol: ROL_DB[rol], nieuw_niveau: nieuwNiveau, gevalideerd_door: decodedToken.uid },
                created_at: Timestamp.now(),
            });

        await writeAuditLog({
            action: 'sportlab_level_up',
            actor_uid: decodedToken.uid,
            target_uid: leerlingUid,
            school_id: verifiedSchoolId,
            metadata: { rol: ROL_DB[rol], nieuw_niveau: nieuwNiveau }
        });

        return res.status(200).json({ success: true, nieuw_niveau: nieuwNiveau });

    } catch (error) {
        console.error('❌ handleValideerLevelUp:', error);
        return res.status(500).json({ error: 'Fout bij valideren level-up' });
    }
}