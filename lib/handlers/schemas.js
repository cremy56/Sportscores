// api/handlers/schemas.js
import { db } from '../firebaseAdmin.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getSchoolId } from '../apiHelpers.js';

// ─── GET GROEIPLAN DATA ───────────────────────────────────────────────────────
export async function handleGetGroeiplanData(req, res, decodedToken) {
    try {
        const { leerlingId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const schemasSnap = await db.collection('leerling_schemas')
            .where('leerling_id', '==', leerlingId).get();
        const actieveSchemaMap = new Map();
        schemasSnap.docs.forEach(d => {
            const data = d.data();
            actieveSchemaMap.set(data.schema_id, data.type || 'verplicht');
        });

        const optioneleSchemaIds = [...actieveSchemaMap.entries()]
            .filter(([_, type]) => type === 'optioneel')
            .map(([id]) => id);

        let optioneleSchemas = [];
        if (optioneleSchemaIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < optioneleSchemaIds.length; i += 30) chunks.push(optioneleSchemaIds.slice(i, i + 30));
            for (const chunk of chunks) {
                const snap = await db.collection('trainingsschemas').where('__name__', 'in', chunk).get();
                optioneleSchemas.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        }

        return res.status(200).json({
            success: true,
            actieveSchemaMap: Object.fromEntries(actieveSchemaMap),
            optioneleSchemas
        });
    } catch (error) {
        console.error('❌ handleGetGroeiplanData:', error);
        return res.status(500).json({ error: 'Fout bij ophalen groeiplan data' });
    }
}

// ─── GET TRAININGSSCHEMAS ─────────────────────────────────────────────────────
export async function handleGetTrainingsschemas(req, res, decodedToken) {
    try {
        await getSchoolId(decodedToken.uid); // ✅ verificeer token
        const snap = await db.collection('trainingsschemas').get();
        return res.status(200).json({ success: true, schemas: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (error) {
        console.error('❌ handleGetTrainingsschemas:', error);
        return res.status(500).json({ error: 'Fout bij ophalen trainingsschemas' });
    }
}

// ─── GET TRAININGSSCHEMA FOR TEST ─────────────────────────────────────────────
export async function handleGetTrainingsschemaForTest(req, res, decodedToken) {
    try {
        const { testId } = req.body;
        await getSchoolId(decodedToken.uid);
        const snap = await db.collection('trainingsschemas')
            .where('gekoppelde_test_id', '==', testId).limit(1).get();
        if (snap.empty) return res.status(200).json({ success: true, schema: null });
        return res.status(200).json({ success: true, schema: { id: snap.docs[0].id, ...snap.docs[0].data() } });
    } catch (error) {
        console.error('❌ handleGetTrainingsschemaForTest:', error);
        return res.status(500).json({ error: 'Fout bij ophalen trainingsschema' });
    }
}

// ─── ADD OPTIONEEL SCHEMA ─────────────────────────────────────────────────────
export async function handleAddOptioneelSchema(req, res, decodedToken) {
    try {
        const { leerlingId, schemaId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const docId = `${leerlingId}_${schemaId}`;
        await db.collection('leerling_schemas').doc(docId).set({
            leerling_id: leerlingId, schema_id: schemaId,
            start_datum: Timestamp.now(), huidige_week: 1,
            voltooide_taken: {}, type: 'optioneel'
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleAddOptioneelSchema:', error);
        return res.status(500).json({ error: 'Fout bij toevoegen schema' });
    }
}

// ─── REMOVE OPTIONEEL SCHEMA ──────────────────────────────────────────────────
export async function handleRemoveOptioneelSchema(req, res, decodedToken) {
    try {
        const { leerlingId, schemaId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const docId = `${leerlingId}_${schemaId}`;
        await db.collection('leerling_schemas').doc(docId).delete().catch(() => {});
        await db.collection('leerling_optionele_schemas').doc(docId).delete().catch(() => {});
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleRemoveOptioneelSchema:', error);
        return res.status(500).json({ error: 'Fout bij verwijderen schema' });
    }
}

// ─── CHECK SCHEMA EXISTS ──────────────────────────────────────────────────────
export async function handleCheckSchemaExists(req, res, decodedToken) {
    try {
        const { leerlingId, schemaId, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const snap = await db.collection('leerling_schemas').doc(`${leerlingId}_${schemaId}`).get();
        return res.status(200).json({ success: true, exists: snap.exists });
    } catch (error) {
        console.error('❌ handleCheckSchemaExists:', error);
        return res.status(500).json({ error: 'Fout bij controleren schema' });
    }
}

// ─── START SCHEMA ─────────────────────────────────────────────────────────────
export async function handleStartSchema(req, res, decodedToken) {
    try {
        const { leerlingId, schemaId, type, schoolId } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const docId = `${leerlingId}_${schemaId}`;
        const snap = await db.collection('leerling_schemas').doc(docId).get();
        if (!snap.exists) {
            await db.collection('leerling_schemas').doc(docId).set({
                leerling_id: leerlingId, schema_id: schemaId,
                start_datum: Timestamp.now(), huidige_week: 1,
                voltooide_taken: {}, type: type || 'optioneel'
            });
        }
        return res.status(200).json({ success: true, exists: snap.exists });
    } catch (error) {
        console.error('❌ handleStartSchema:', error);
        return res.status(500).json({ error: 'Fout bij starten schema' });
    }
}

// ─── DELETE LEERLING SCHEMA ───────────────────────────────────────────────────
export async function handleDeleteLeerlingSchema(req, res, decodedToken) {
    const { schoolId: sId, leerlingId, schemaTemplateId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        await db.collection('leerling_schemas').doc(`${leerlingId}_${schemaTemplateId}`).delete();
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── SAVE SCHEMA ──────────────────────────────────────────────────────────────
export async function handleSaveSchema(req, res, decodedToken) {
    const { schoolId: sId, schemaId, schema } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const schemaObject = {
            ...schema,
            school_id: verifiedSchoolId,
            last_updated_at: FieldValue.serverTimestamp()   // ✅ was: admin.firestore.FieldValue
        };
        if (schemaId) {
            await db.collection('trainingsschemas').doc(schemaId).set(schemaObject, { merge: true });
        } else {
            schemaObject.created_at = FieldValue.serverTimestamp();
            await db.collection('trainingsschemas').add(schemaObject);
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('❌ handleSaveSchema:', err);
        return res.status(500).json({ error: err.message });
    }
}

// ─── SAVE OEFENING ────────────────────────────────────────────────────────────
export async function handleSaveOefening(req, res, decodedToken) {
    const { schoolId: sId, oefeningId, oefening } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const oefeningObject = {
            ...oefening,
            school_id: verifiedSchoolId,
            last_updated_at: FieldValue.serverTimestamp()   // ✅ was: admin.firestore.FieldValue
        };
        if (oefeningId) {
            await db.collection('oefeningen').doc(oefeningId).set(oefeningObject, { merge: true });
        } else {
            oefeningObject.created_at = FieldValue.serverTimestamp();
            await db.collection('oefeningen').add(oefeningObject);
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── GET OEFENING DETAIL ──────────────────────────────────────────────────────
export async function handleGetOefeningDetail(req, res, decodedToken) {
    const { schoolId: sId, oefeningId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const snap = await db.collection('oefeningen').doc(oefeningId).get();
        return res.status(200).json({ oefening: snap.exists ? { id: snap.id, ...snap.data() } : null });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── GET OEFENINGEN ───────────────────────────────────────────────────────────
export async function handleGetOefeningen(req, res, decodedToken) {
    const { schoolId: sId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const snap = await db.collection('oefeningen').where('school_id', '==', verifiedSchoolId).get();
        return res.status(200).json({ oefeningen: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── GET SCHEMA DETAIL ────────────────────────────────────────────────────────
export async function handleGetSchemaDetail(req, res, decodedToken) {
    const { schoolId: sId, leerlingId, schemaTemplateId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const { getMasterKey } = await import('../keyManager.js');
        const masterKey = await getMasterKey();
        const { decryptName: decrypt } = await import('../apiHelpers.js');

        let leerlingProfiel = null;
        const usersSnap = await db.collection('users')
            .where('toegestane_gebruikers_id', '==', leerlingId).limit(1).get();
        if (!usersSnap.empty) {
            const ud = usersSnap.docs[0];
            leerlingProfiel = { id: ud.id, ...ud.data() };
        } else {
            const tgDoc = await db.collection('toegestane_gebruikers').doc(leerlingId).get();
            if (tgDoc.exists) {
                const tgData = tgDoc.data();
                leerlingProfiel = {
                    id: tgDoc.id,
                    naam: decrypt(tgData.encrypted_name, masterKey),
                    klas: tgData.klas,
                    toegestane_gebruikers_id: tgDoc.id,
                };
            }
        }

        const schemaId = `${leerlingId}_${schemaTemplateId}`;
        const [schemaSnap, actiefSnap] = await Promise.all([
            db.collection('trainingsschemas').doc(schemaTemplateId).get(),
            db.collection('leerling_schemas').doc(schemaId).get(),
        ]);

        return res.status(200).json({
            leerlingProfiel,
            schemaDetails: schemaSnap.exists ? schemaSnap.data() : null,
            actiefSchema: actiefSnap.exists ? { id: actiefSnap.id, ...actiefSnap.data() } : null,
        });
    } catch (err) {
        console.error('❌ handleGetSchemaDetail:', err);
        return res.status(500).json({ error: err.message });
    }
}

// ─── GET SCHEMA ACTIEF ────────────────────────────────────────────────────────
export async function handleGetSchemaActief(req, res, decodedToken) {
    const { schoolId: sId, leerlingId, schemaTemplateId } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        const snap = await db.collection('leerling_schemas').doc(`${leerlingId}_${schemaTemplateId}`).get();
        return res.status(200).json({ actiefSchema: snap.exists ? { id: snap.id, ...snap.data() } : null });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// ─── VOLTOOIEN TAAK ───────────────────────────────────────────────────────────
export async function handleVoltooienTaak(req, res, decodedToken) {
    const { schoolId: sId, leerlingId, schemaTemplateId, voltooide_taken } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });
    try {
        await db.collection('leerling_schemas').doc(`${leerlingId}_${schemaTemplateId}`).update({ voltooide_taken });
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('❌ handleVoltooienTaak:', err);
        return res.status(500).json({ error: err.message });
    }
}

// ─── VALIDEER WEEK ────────────────────────────────────────────────────────────
export async function handleValideerWeek(req, res, decodedToken) {
    const { schoolId: sId, leerlingId, schemaTemplateId, voltooide_taken, gevalideerde_weken, huidige_week } = req.body;
    const verifiedSchoolId = await getSchoolId(decodedToken.uid);
    if (sId !== verifiedSchoolId) return res.status(403).json({ error: 'Verboden' });

    const rolDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!['leerkracht', 'administrator', 'super-administrator'].includes(rolDoc.data()?.rol)) {
        return res.status(403).json({ error: 'Enkel leerkrachten kunnen weken valideren' });
    }
    try {
        await db.collection('leerling_schemas').doc(`${leerlingId}_${schemaTemplateId}`).update({
            voltooide_taken, gevalideerde_weken, huidige_week
        });
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('❌ handleValideerWeek:', err);
        return res.status(500).json({ error: err.message });
    }
}
