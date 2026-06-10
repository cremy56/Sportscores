// api/handlers/groepen.js
import { db } from '../firebaseAdmin.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMasterKey } from '../keyManager.js';
import { getSchoolId, decryptName } from '../apiHelpers.js';
import { writeAuditLog } from '../auditLogger.js';

// ─── HELPER: Vrijstelling data ophalen per leerling ──────────────────────────
// Queryt users collectie op toegestane_gebruikers_id (= smartschool_id_hash)
// Geen reden opgeslagen — enkel boolean + einddatum + wie registreerde
async function fetchVrijstellingen(leerlingIds, verifiedSchoolId) {
    const map = new Map(); // hash → { vrijgesteld: bool, vrijstelling_einddatum: ISO|null }
    if (!leerlingIds.length) return map;

    const now = new Date();
    const chunks = [];
    for (let i = 0; i < leerlingIds.length; i += 30) {
        chunks.push(leerlingIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
        const snap = await db.collection('users')
            .where('toegestane_gebruikers_id', 'in', chunk)
            .get();

        snap.docs
            .filter(d => d.data().school_id === verifiedSchoolId)
            .forEach(d => {
                const data = d.data();
                const hash = data.toegestane_gebruikers_id;
                const einddatum = data.vrijstelling_einddatum?.toDate?.() || null;
                const isExpired = einddatum && einddatum < now;

                map.set(hash, {
                    vrijgesteld: data.vrijgesteld_van_testen === true && !isExpired,
                    vrijstelling_einddatum: einddatum && !isExpired
                        ? einddatum.toISOString()
                        : null
                });
            });
    }

    return map;
}

// ─── GET GROEPEN ──────────────────────────────────────────────────────────────
export async function handleGetGroepen(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const snap = await db.collection('groepen')
            .where('school_id', '==', verifiedSchoolId)
            .where('leerkracht_id', '==', decodedToken.uid)
            .get();

        return res.status(200).json({ success: true, groepen: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (error) {
        console.error('❌ handleGetGroepen:', error);
        return res.status(500).json({ error: 'Fout bij ophalen groepen' });
    }
}

// ─── GET MIJN KLASSEN ─────────────────────────────────────────────────────────
export async function handleGetMijnKlassen(req, res, decodedToken) {
    try {
        const { schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const userSnap = await db.collection('users').doc(decodedToken.uid).get();
        const leerkrachtHash = userSnap.data()?.smartschool_id_hash;

        if (leerkrachtHash) {
            const toegestaneSnap = await db.collection('toegestane_gebruikers').doc(leerkrachtHash).get();
            if (toegestaneSnap.exists) {
                const klassen = toegestaneSnap.data()?.klassen || [];
                if (klassen.length > 0) return res.status(200).json({ success: true, klassen });
            }
        }

        // Fallback: alle klassen van de school
        const leerlingenSnap = await db.collection('toegestane_gebruikers')
            .where('school_id', '==', verifiedSchoolId)
            .where('rol', '==', 'leerling')
            .where('is_active', '==', true)
            .get();

        const alleKlassen = [...new Set(
            leerlingenSnap.docs.map(d => d.data().klas).filter(Boolean).sort()
        )];

        return res.status(200).json({ success: true, klassen: alleKlassen, isFallback: true });
    } catch (error) {
        console.error('❌ handleGetMijnKlassen:', error);
        return res.status(500).json({ error: 'Fout bij ophalen klassen' });
    }
}

// ─── CREATE GROEP ─────────────────────────────────────────────────────────────
export async function handleCreateGroep(req, res, decodedToken) {
    try {
        const { naam, leerling_ids, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });
        if (!naam?.trim()) return res.status(400).json({ error: 'Groepsnaam is verplicht.' });
        if (!Array.isArray(leerling_ids) || leerling_ids.length === 0) {
            return res.status(400).json({ error: 'Selecteer minstens 1 leerling.' });
        }

        const docRef = await db.collection('groepen').add({
            naam: naam.trim(),
            type: 'manueel',
            leerkracht_id: decodedToken.uid,
            school_id: verifiedSchoolId,
            leerling_ids,
            auto_sync: false,
            created_at: Timestamp.now()
        });

        return res.status(200).json({ success: true, id: docRef.id });
    } catch (error) {
        console.error('❌ handleCreateGroep:', error);
        return res.status(500).json({ error: 'Fout bij aanmaken groep' });
    }
}

// ─── UPDATE GROEP ─────────────────────────────────────────────────────────────
export async function handleUpdateGroep(req, res, decodedToken) {
    try {
        const { groepId, naam, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.update({ naam: naam.trim() });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleUpdateGroep:', error);
        return res.status(500).json({ error: 'Fout bij wijzigen groep' });
    }
}

// ─── DELETE GROEP ─────────────────────────────────────────────────────────────
export async function handleDeleteGroep(req, res, decodedToken) {
    try {
        const { groepId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.delete();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleDeleteGroep:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen groep' });
    }
}

// ─── GET GROEP DETAIL ─────────────────────────────────────────────────────────
export async function handleGetGroepDetail(req, res, decodedToken) {
    try {
        const { groepId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const masterKey = await getMasterKey();
        const groepSnap = await db.collection('groepen').doc(groepId).get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        const groepData = { id: groepSnap.id, ...groepSnap.data() };
        if (groepData.school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const leerlingIds = groepData.leerling_ids || [];

        let members = [];
        if (leerlingIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));
            const toegestaneData = new Map();
            for (const chunk of chunks) {
                const snap = await db.collection('toegestane_gebruikers').where('__name__', 'in', chunk).get();
                snap.docs.forEach(d => toegestaneData.set(d.id, d.data()));
            }

            // Vrijstelling data ophalen — geen reden, enkel boolean + einddatum
            const vrijstellingen = await fetchVrijstellingen(leerlingIds, verifiedSchoolId);

            members = leerlingIds
                .filter(id => toegestaneData.has(id))
                .map(id => ({
                    id,
                    naam: decryptName(toegestaneData.get(id).encrypted_name, masterKey),
                    klas: toegestaneData.get(id).klas || '',
                    ...(vrijstellingen.get(id) || { vrijgesteld: false, vrijstelling_einddatum: null })
                }))
                .sort((a, b) => a.naam.localeCompare(b.naam));
        }

        // Scores voor dit schooljaar
        const nu = new Date();
        const startJaar = nu.getMonth() >= 8 ? nu.getFullYear() : nu.getFullYear() - 1;
        const schoolYearStart = Timestamp.fromDate(new Date(startJaar, 8, 1));
        const schoolYearEnd = Timestamp.fromDate(new Date(startJaar + 1, 7, 31, 23, 59, 59));

        let scoresByLeerling = {};
        let testenVoorSorteren = [];

        if (leerlingIds.length > 0) {
            const allScores = [];
            const chunks = [];
            for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));
            for (const chunk of chunks) {
                const scoresSnap = await db.collection('scores')
                    .where('leerling_id', 'in', chunk)
                    .where('datum', '>=', schoolYearStart)
                    .where('datum', '<=', schoolYearEnd)
                    .get();
                allScores.push(...scoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }

            const testIds = [...new Set(allScores.map(s => s.test_id))];
            const testNamen = new Map();
            if (testIds.length > 0) {
                const testChunks = [];
                for (let i = 0; i < testIds.length; i += 30) testChunks.push(testIds.slice(i, i + 30));
                for (const chunk of testChunks) {
                    const testenSnap = await db.collection('testen').where('__name__', 'in', chunk).get();
                    testenSnap.docs.forEach(d => {
                        testNamen.set(d.id, d.data().naam);
                        testenVoorSorteren.push({ id: d.id, naam: d.data().naam });
                    });
                }
            }

            allScores.forEach(score => {
                if (!scoresByLeerling[score.leerling_id]) scoresByLeerling[score.leerling_id] = [];
                scoresByLeerling[score.leerling_id].push({
                    ...score,
                    datum: score.datum?.toDate ? score.datum.toDate().toISOString() : null,
                    test_naam: testNamen.get(score.test_id) || 'Onbekende Test'
                });
            });
        }

        return res.status(200).json({
            success: true, groep: groepData, members, scoresByLeerling,
            availableTests: testenVoorSorteren.sort((a, b) => a.naam.localeCompare(b.naam))
        });
    } catch (error) {
        console.error('❌ handleGetGroepDetail:', error);
        return res.status(500).json({ error: 'Fout bij ophalen groepdetail' });
    }
}

// ─── ADD LEERLING ─────────────────────────────────────────────────────────────
export async function handleAddLeerling(req, res, decodedToken) {
    try {
        const { groepId, leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.update({ leerling_ids: FieldValue.arrayUnion(leerlingId) });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleAddLeerling:', error);
        return res.status(500).json({ error: 'Fout bij toevoegen leerling' });
    }
}

// ─── REMOVE LEERLING ──────────────────────────────────────────────────────────
export async function handleRemoveLeerling(req, res, decodedToken) {
    try {
        const { groepId, leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const groepRef = db.collection('groepen').doc(groepId);
        const groepSnap = await groepRef.get();
        if (!groepSnap.exists) return res.status(404).json({ error: 'Groep niet gevonden.' });
        if (groepSnap.data().leerkracht_id !== decodedToken.uid) return res.status(403).json({ error: 'Geen toegang.' });

        await groepRef.update({ leerling_ids: FieldValue.arrayRemove(leerlingId) });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleRemoveLeerling:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen leerling' });
    }
}

// ─── GET KLAS DETAIL ──────────────────────────────────────────────────────────
export async function handleGetKlasDetail(req, res, decodedToken) {
    try {
        const { klasNaam, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const masterKey = await getMasterKey();

        const leerlingenSnap = await db.collection('toegestane_gebruikers')
            .where('school_id', '==', verifiedSchoolId)
            .where('klas', '==', klasNaam)
            .where('rol', '==', 'leerling')
            .where('is_active', '==', true)
            .get();

        const leerlingIds = leerlingenSnap.docs.map(d => d.id);

        // Vrijstelling data ophalen
        const vrijstellingen = await fetchVrijstellingen(leerlingIds, verifiedSchoolId);

        const members = leerlingenSnap.docs
            .map(d => ({
                id: d.id,
                naam: decryptName(d.data().encrypted_name, masterKey),
                klas: d.data().klas || '',
                ...(vrijstellingen.get(d.id) || { vrijgesteld: false, vrijstelling_einddatum: null })
            }))
            .sort((a, b) => a.naam.localeCompare(b.naam));

        const nu = new Date();
        const startJaar = nu.getMonth() >= 8 ? nu.getFullYear() : nu.getFullYear() - 1;
        const schoolYearStart = Timestamp.fromDate(new Date(startJaar, 8, 1));
        const schoolYearEnd = Timestamp.fromDate(new Date(startJaar + 1, 7, 31, 23, 59, 59));

        let scoresByLeerling = {};
        let testenVoorSorteren = [];

        if (leerlingIds.length > 0) {
            const allScores = [];
            const chunks = [];
            for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));
            for (const chunk of chunks) {
                const scoresSnap = await db.collection('scores')
                    .where('leerling_id', 'in', chunk)
                    .where('datum', '>=', schoolYearStart)
                    .where('datum', '<=', schoolYearEnd)
                    .get();
                allScores.push(...scoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }

            const testIds = [...new Set(allScores.map(s => s.test_id))];
            const testNamen = new Map();
            if (testIds.length > 0) {
                const testChunks = [];
                for (let i = 0; i < testIds.length; i += 30) testChunks.push(testIds.slice(i, i + 30));
                for (const chunk of testChunks) {
                    const testenSnap = await db.collection('testen').where('__name__', 'in', chunk).get();
                    testenSnap.docs.forEach(d => {
                        testNamen.set(d.id, d.data().naam);
                        testenVoorSorteren.push({ id: d.id, naam: d.data().naam });
                    });
                }
            }

            allScores.forEach(score => {
                if (!scoresByLeerling[score.leerling_id]) scoresByLeerling[score.leerling_id] = [];
                scoresByLeerling[score.leerling_id].push({
                    ...score,
                    datum: score.datum?.toDate ? score.datum.toDate().toISOString() : null,
                    test_naam: testNamen.get(score.test_id) || 'Onbekende Test'
                });
            });
        }

        return res.status(200).json({
            success: true,
            groep: { id: klasNaam, naam: klasNaam, isKlas: true },
            members, scoresByLeerling,
            availableTests: testenVoorSorteren.sort((a, b) => a.naam.localeCompare(b.naam))
        });
    } catch (error) {
        console.error('❌ handleGetKlasDetail:', error);
        return res.status(500).json({ error: 'Fout bij ophalen klasdetail' });
    }
}

// ─── SET VRIJSTELLING ─────────────────────────────────────────────────────────
// Stelt een leerling vrij van fysieke testen (SportLab gatekeeper).
// Slaat GEEN reden op — enkel boolean + einddatum + wie registreerde.
// leerlingId = smartschool_id_hash (toegestane_gebruikers_id op users doc)
export async function handleSetVrijstelling(req, res, decodedToken) {
    try {
        const { leerlingId, schoolId, vrijgesteld, einddatum } = req.body;

        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // Alleen leerkrachten en admins mogen vrijstelling instellen
        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        const callerRol = callerSnap.data()?.rol;
        if (!['leerkracht', 'administrator', 'super-administrator'].includes(callerRol)) {
            return res.status(403).json({ error: 'Geen toegang — alleen leerkrachten.' });
        }

        if (!leerlingId) return res.status(400).json({ error: 'leerlingId verplicht.' });

        // Leerling opzoeken via toegestane_gebruikers_id (= smartschool hash)
        const userQuery = await db.collection('users')
            .where('toegestane_gebruikers_id', '==', leerlingId)
            .where('school_id', '==', verifiedSchoolId)
            .limit(1)
            .get();

        if (userQuery.empty) return res.status(404).json({ error: 'Leerling niet gevonden.' });
        const userRef = userQuery.docs[0].ref;

        if (vrijgesteld) {
            // Vrijstellen — einddatum verplicht
            if (!einddatum) return res.status(400).json({ error: 'Einddatum is verplicht bij vrijstelling.' });

            const eindDate = new Date(einddatum);
            if (isNaN(eindDate.getTime())) {
                return res.status(400).json({ error: 'Ongeldige einddatum.' });
            }
            if (eindDate <= new Date()) {
                return res.status(400).json({ error: 'Einddatum moet in de toekomst liggen.' });
            }

            await userRef.update({
                vrijgesteld_van_testen: true,
                vrijstelling_einddatum: Timestamp.fromDate(eindDate),
                vrijstelling_geregistreerd_door: decodedToken.uid,
                vrijstelling_geregistreerd_op: Timestamp.now()
            });

            await writeAuditLog({
                action: 'vrijstelling_instellen',
                actor_uid: decodedToken.uid,
                target_uid: userQuery.docs[0].id,
                school_id: verifiedSchoolId,
                metadata: { einddatum: eindDate.toISOString() }
            });

        } else {
            // Vrijstelling opheffen
            await userRef.update({
                vrijgesteld_van_testen: false,
                vrijstelling_einddatum: null,
                vrijstelling_geregistreerd_door: decodedToken.uid,
                vrijstelling_geregistreerd_op: Timestamp.now()
            });

            await writeAuditLog({
                action: 'vrijstelling_opheffen',
                actor_uid: decodedToken.uid,
                target_uid: userQuery.docs[0].id,
                school_id: verifiedSchoolId,
                metadata: {}
            });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ handleSetVrijstelling:', error);
        return res.status(500).json({ error: 'Fout bij instellen vrijstelling' });
    }
}