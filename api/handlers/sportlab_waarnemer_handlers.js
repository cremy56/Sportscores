// ─── WAARNEMER HANDLERS ───────────────────────────────────────────────────────
// Toevoegen aan api/handlers/sportlab.js
//
// 3 handlers:
//   handleSubmitWaarnemerMetingen   → leerling-Waarnemer dient metingen in
//   handleGetWaarnemerMetingen      → leerkracht haalt ALLE ongekoppelde metingen op
//   handleMarkeerWaarnemerGekoppeld → markeert als verwerkt + kent XP toe
//
// Fixes t.o.v. v1:
//   #1 Meerdere waarnemers: GET geeft array van inzendingen, niet één
//   #2 TTL verhoogd naar 14 dagen (was 24u) — Vrijdagmiddag-scenario opgelost
//   #3 XP wordt toegekend in handleMarkeerWaarnemerGekoppeld via ingediend_door UID
//
// Firestore collectie: sport_lab_waarnemer_metingen
//   Velden: sessie_id, school_id, ingediend_door, ingediend_op, vervalt_op (TTL 14d),
//           sport_type, modus, eenheid, configuratie, metingen[], status
//
// Firestore TTL:  sport_lab_waarnemer_metingen → vervalt_op (14 dagen)
// Firestore INDEX:
//   - sessie_id ASC + status ASC + ingediend_op ASC
//   - leerkracht_id ASC + school_id ASC + status ASC + ingediend_op ASC
// ─────────────────────────────────────────────────────────────────────────────

// ─── 1. SUBMIT (leerling-Waarnemer) ──────────────────────────────────────────
export async function handleSubmitWaarnemerMetingen(req, res, decodedToken) {
    try {
        const { schoolId, sessieId, sportType, modus, eenheid, configuratie, metingen } = req.body;

        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        if (!sessieId || !sportType || !Array.isArray(metingen) || metingen.length === 0) {
            return res.status(400).json({ error: 'Verplichte velden ontbreken.' });
        }
        if (metingen.length > 50) {
            return res.status(400).json({ error: 'Maximaal 50 leerlingen per meting.' });
        }

        const sessieSnap = await db.collection('sport_lab_sessions').doc(sessieId).get();
        if (!sessieSnap.exists) return res.status(404).json({ error: 'Sessie niet gevonden.' });
        const sessieData = sessieSnap.data();
        if (sessieData.school_id !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // Controleer of deze leerling al een meting heeft ingediend voor deze sessie
        const bestaand = await db.collection('sport_lab_waarnemer_metingen')
            .where('sessie_id', '==', sessieId)
            .where('ingediend_door', '==', decodedToken.uid)
            .where('status', '==', 'ingediend')
            .limit(1)
            .get();

        if (!bestaand.empty) {
            return res.status(409).json({ error: 'Je hebt al een meting ingediend voor deze sessie.' });
        }

        const opgeschoond = metingen.map(m => ({
            naam:        String(m.naam || '').substring(0, 50),
            rondetijden: Array.isArray(m.rondetijden) ? m.rondetijden.map(Number) : [],
            eindtijd:    typeof m.eindtijd === 'number' ? m.eindtijd : null,
            pogingen:    Array.isArray(m.pogingen)
                ? m.pogingen.map(p => (p !== null ? Number(p) : null))
                : null,
            beste:       typeof m.beste === 'number' ? m.beste : null,
            waarde:      typeof m.waarde === 'number' ? m.waarde : null,
            gefinisht:   typeof m.gefinisht === 'boolean' ? m.gefinisht : false,
        }));

        // FIX #2: TTL 14 dagen — gelijk aan sport_lab_sessions
        // Voorkomt verlies bij weekend/vakantie (Vrijdagmiddag-scenario)
        const TTL_14D = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        const docRef = await db.collection('sport_lab_waarnemer_metingen').add({
            sessie_id:      sessieId,
            school_id:      verifiedSchoolId,
            leerkracht_id:  sessieData.leerkracht_id,
            ingediend_door: decodedToken.uid,   // bewaard voor XP-toekenning bij koppeling
            ingediend_op:   Timestamp.now(),
            vervalt_op:     Timestamp.fromDate(TTL_14D),
            sport_type:     sportType,
            modus:          modus || null,
            eenheid:        eenheid || null,
            configuratie:   configuratie || {},
            metingen:       opgeschoond,
            status:         'ingediend',
        });

        return res.status(200).json({ success: true, meting_id: docRef.id });

    } catch (error) {
        console.error('❌ handleSubmitWaarnemerMetingen:', error);
        return res.status(500).json({ error: 'Fout bij indienen metingen' });
    }
}

// ─── 2. GET METINGEN (leerkracht) ────────────────────────────────────────────
// FIX #1: Geeft ALLE ongekoppelde inzendingen terug als array, niet enkel de laatste.
// Meerdere waarnemers (Thomas + Sarah) zijn elk zichtbaar als aparte inzending.
// Frontend toont een selector zodat de leerkracht per inzending kan koppelen.
export async function handleGetWaarnemerMetingen(req, res, decodedToken) {
    try {
        const { schoolId, sessieId } = req.body;

        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!['leerkracht', 'administrator', 'super-administrator'].includes(callerSnap.data()?.rol)) {
            return res.status(403).json({ error: 'Geen toegang.' });
        }

        // sessieId meegeven = filter op specifieke sessie (aanbevolen vanuit WaarnemerPanel)
        // Zonder sessieId = alle openstaande metingen voor deze leerkracht
        let query;
        if (sessieId) {
            query = db.collection('sport_lab_waarnemer_metingen')
                .where('sessie_id', '==', sessieId)
                .where('status', '==', 'ingediend')
                .orderBy('ingediend_op', 'asc');
        } else {
            query = db.collection('sport_lab_waarnemer_metingen')
                .where('leerkracht_id', '==', decodedToken.uid)
                .where('school_id', '==', verifiedSchoolId)
                .where('status', '==', 'ingediend')
                .orderBy('ingediend_op', 'asc');
        }

        const snap = await query.get();

        if (snap.empty) {
            return res.status(200).json({ success: true, inzendingen: [] });
        }

        // Haal nickname op per waarnemer voor weergave in de selector
        const waarnemerUids = [...new Set(snap.docs.map(d => d.data().ingediend_door))];
        const userSnaps     = await db.getAll(...waarnemerUids.map(uid => db.collection('users').doc(uid)));
        const nicknameMap   = Object.fromEntries(
            userSnaps.map(s => [s.id, s.data()?.nickname || 'Waarnemer'])
        );

        const inzendingen = snap.docs.map(doc => {
            const data = doc.data();
            return {
                id:           doc.id,
                waarnemer:    nicknameMap[data.ingediend_door] || 'Waarnemer',
                sport_type:   data.sport_type,
                modus:        data.modus,
                eenheid:      data.eenheid,
                configuratie: data.configuratie,
                metingen:     data.metingen,
                ingediend_op: data.ingediend_op?.toDate?.()?.toISOString() || null,
            };
        });

        return res.status(200).json({ success: true, inzendingen });

    } catch (error) {
        console.error('❌ handleGetWaarnemerMetingen:', error);
        return res.status(500).json({ error: 'Fout bij ophalen metingen' });
    }
}

// ─── 3. MARKEER GEKOPPELD + XP (leerkracht) ──────────────────────────────────
// FIX #3: Kent 20 XP toe aan de leerling-Waarnemer via ingediend_door UID.
// XP wordt pas definitief bij validatie door leerkracht, niet bij indienen.
// Idempotent: dubbele verwerking van hetzelfde document wordt geblokkeerd.
export async function handleMarkeerWaarnemerGekoppeld(req, res, decodedToken) {
    try {
        const { schoolId, metingId } = req.body;

        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const ref  = db.collection('sport_lab_waarnemer_metingen').doc(metingId);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ error: 'Meting niet gevonden.' });

        const docData = snap.data();

        if (docData.leerkracht_id !== decodedToken.uid) {
            return res.status(403).json({ error: 'Geen toegang.' });
        }

        // Idempotentie: voorkom dubbele XP bij herhaald aanroepen
        if (docData.status === 'gekoppeld') {
            return res.status(200).json({ success: true, already_processed: true });
        }

        const batch = db.batch();

        // Status updaten
        batch.update(ref, {
            status:       'gekoppeld',
            gekoppeld_op: Timestamp.now(),
        });

        // FIX #3: XP toekennen aan de waarnemer-leerling
        // Gebruikt XP.ZELFREFLECTIE (20 XP) — consistent met andere SportLab-acties
        const waarnemerUid = docData.ingediend_door;
        if (waarnemerUid) {
            const userRef = db.collection('users').doc(waarnemerUid);
            batch.update(userRef, {
                xp: FieldValue.increment(XP.ZELFREFLECTIE),
            });
        }

        await batch.commit();

        return res.status(200).json({ success: true, xp_toegekend: XP.ZELFREFLECTIE });

    } catch (error) {
        console.error('❌ handleMarkeerWaarnemerGekoppeld:', error);
        return res.status(500).json({ error: 'Fout bij markeren' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING: voeg toe aan api/tests.js (of je bestaande router):
//
//   case 'submit_waarnemer_metingen':
//       return handleSubmitWaarnemerMetingen(req, res, decodedToken);
//   case 'get_waarnemer_metingen':
//       return handleGetWaarnemerMetingen(req, res, decodedToken);
//   case 'markeer_waarnemer_gekoppeld':
//       return handleMarkeerWaarnemerGekoppeld(req, res, decodedToken);
//
// EXPORTS: voeg de 3 functies toe aan de bestaande export-lijst in sportlab.js
// ─────────────────────────────────────────────────────────────────────────────
