// api/handlers/sportlab.js
import { db } from '../../lib/firebaseAdmin.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getSchoolId, decryptName } from '../../lib/apiHelpers.js';
import { writeAuditLog } from '../../lib/auditLogger.js';
import { getMasterKey } from '../../lib/keyManager.js';

// ─── XP BEDRAGEN ──────────────────────────────────────────────────────────────
const XP = {
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
    const tweeUur = 2 * 60 * 60 * 1000;
return Date.now() - start.getTime() < tweeUur;
}

// ─── HELPER: school uren check ─────────────────────────────────────────────────
// Extra laag bovenop teacher session — blokkeert XP buiten schooluren
// Pas de helper functie aan (rond regel 33):
function isBinnenSchoolUren(userRol) {
    // Superadmins mogen altijd doortesten
    if (userRol === 'super-administrator') return true;

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
        const { schoolId, sport, doelType, doelId } = req.body; 
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        const callerRol = callerSnap.data()?.rol;
        if (!['leerkracht', 'administrator', 'super-administrator'].includes(callerRol)) {
            return res.status(403).json({ error: 'Alleen leerkrachten kunnen een sessie starten.' });
        }

        if (!sport?.trim()) return res.status(400).json({ error: 'Sport is verplicht.' });

        // Sluit eventuele nog open sessies van deze leerkracht (zet ze klaar voor docent evaluatie)
        const openSessies = await db.collection('sport_lab_sessions')
            .where('leerkracht_id', '==', decodedToken.uid)
            .where('status', 'in', ['actief', 'evaluatie'])
            .get();

        const batch = db.batch();
        openSessies.docs.forEach(d => {
            batch.update(d.ref, { status: 'docent_evaluatie' });
        });
        await batch.commit();

        // Nieuwe sessie aanmaken
        const sessieRef = await db.collection('sport_lab_sessions').add({
            school_id: verifiedSchoolId,
            leerkracht_id: decodedToken.uid,
            sport: sport.trim(),
            klas: doelType === 'klas' ? doelId : null,
            groep_id: doelType === 'groep' ? doelId : null,
            status: 'actief',
            start_tijd: Timestamp.now(),
            vervalt_op: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
            gesloten_op: null,
            is_test_sessie: callerRol === 'super-administrator', // Bypass voor schooluren
        });

        // Audit log schrijven
        await writeAuditLog({
            action: 'sportlab_sessie_gestart',
            actor_uid: decodedToken.uid,
            school_id: verifiedSchoolId,
            metadata: { 
                sessie_id: sessieRef.id, 
                sport, 
                doelType: doelType || 'iedereen', 
                doelId: doelId || null 
            }
        });

        return res.status(200).json({ success: true, sessie_id: sessieRef.id });

    } catch (error) {
        console.error('❌ handleStartSportLabSessie:', error);
        return res.status(500).json({ error: 'Fout bij starten sessie' });
    }
}

// ─── 2. SLUIT SESSIE (leerkracht) ─────────────────────────────────────────────
export async function handleSluitSportLabSessie(req, res, decodedToken) {
    try {
        const { schoolId, sessieId, definitief, naarDocentEvaluatie } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const sessieRef = db.collection('sport_lab_sessions').doc(sessieId);
        const sessieSnap = await sessieRef.get();
        if (!sessieSnap.exists) return res.status(404).json({ error: 'Sessie niet gevonden.' });

        const sessieData = sessieSnap.data();
        if (sessieData.leerkracht_id !== decodedToken.uid) {
            return res.status(403).json({ error: 'Alleen de sessie-eigenaar kan sluiten.' });
        }

        // Bepaal de nieuwe status
        let nieuweStatus = 'evaluatie';
        if (definitief) nieuweStatus = 'gesloten';
        else if (naarDocentEvaluatie) nieuweStatus = 'docent_evaluatie';

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

        if (snap.empty) return res.status(200).json({ success: true, sessie: null });

        // Check in welke groepen de leerling zit
        const groepenSnap = await db.collection('groepen').where('leerling_ids', 'array-contains', decodedToken.uid).get();
        const studentGroepIds = groepenSnap.docs.map(d => d.id);
        const leerlingKlas = userData?.klas || null;

        const matchendDoc = snap.docs.find(d => {
            const data = d.data();
            if (!data.klas && !data.groep_id) return true; // Voor iedereen
            if (data.klas && data.klas === leerlingKlas) return true; // Match klas
            if (data.groep_id && studentGroepIds.includes(data.groep_id)) return true; // Match groep
            return false;
        });

        if (!matchendDoc) return res.status(200).json({ success: true, sessie: null });

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

        // --- NIEUW: Zoek of er een actief toernooi is voor deze sessie ---
        const toernooiSnap = await db.collection('sport_lab_toernooien')
            .where('sessie_id', '==', sessieData.id)
            .where('status', '==', 'actief')
            .limit(1)
            .get();

        const actiefToernooi = toernooiSnap.empty ? null : {
            id: toernooiSnap.docs[0].id,
            ...toernooiSnap.docs[0].data()
        };
        // ----------------------------------------------------------------

        return res.status(200).json({
            success: true,
            sessie: {
                id: sessieData.id,
                sport: sessieData.sport,
                klas: sessieData.klas,
                status: sessieData.status,
                start_tijd: sessieData.start_tijd?.toDate?.()?.toISOString() || null,
                evaluatie_start: sessieData.evaluatie_start?.toDate?.()?.toISOString() || null,
                toernooi: actiefToernooi // <--- Geef het toernooi mee aan de app
            },
            eigen_deelname: eigenDeelname,
        });

    } catch (error) {
        console.error('❌ handleGetActieveSportLabSessie:', error);
        return res.status(500).json({ error: 'Fout bij ophalen sessie' });
    }
}

// ─── 4. LEERKRACHT: OVERZICHT EIGEN SESSIES + LIVE DEELNAMES ─────────────────
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
            .where('status', 'in', ['actief', 'evaluatie', 'docent_evaluatie'])
            .get();

        const ROL_UI = {
            arbiter: 'De Arbiter',
            coach: 'De Coach',
            toernooileider: 'De Toernooileider',
            alternatief: 'Body Fixer',
        };

        const masterKey = await getMasterKey(); // Haal de encryptie-sleutel op

        const sessies = await Promise.all(snap.docs.map(async (d) => {
            const sessieData = { id: d.id, ...d.data() };

            const deelnamesSnap = await db.collection('sport_lab_deelnames')
                .where('sessie_id', '==', d.id)
                .get();

            const deelnames = await Promise.all(deelnamesSnap.docs.map(async (dd) => {
                const data = dd.data();
                const userSnap = await db.collection('users').doc(data.leerling_firebase_uid).get();
                const nickname = userSnap.exists ? (userSnap.data().nickname || 'Leerling') : 'Leerling';
                
                // NIEUW: Echte naam ontsleutelen
                let echteNaam = 'Onbekend';
                if (data.leerling_hash) {
                    const tgSnap = await db.collection('toegestane_gebruikers').doc(data.leerling_hash).get();
                    if (tgSnap.exists && tgSnap.data().encrypted_name) {
                        echteNaam = decryptName(tgSnap.data().encrypted_name, masterKey);
                    }
                }

                // Check of er al een score op 10 is gegeven
                const scoreSnap = await db.collection('sport_lab_scores')
                    .where('sessie_id', '==', d.id)
                    .where('leerling_id', '==', data.leerling_firebase_uid)
                    .limit(1).get();

                return {
                    id: dd.id,
                    leerling_uid: data.leerling_firebase_uid,
                    niveau: data.niveau || 1,
                    nickname,
                    echte_naam: echteNaam,
                    rol: data.rol,
                    rol_naam: ROL_UI[data.rol] || data.rol,
                    voltooid: data.voltooid || false,
                    is_vrijgesteld: data.rol === 'alternatief',
                    beoordeeld: !scoreSnap.empty,
                    beoordeling: !scoreSnap.empty ? scoreSnap.docs[0].data() : null,
                    observaties_aantal: data.observaties_aantal || 0
                };
            }));

            let vrijgesteldeLeerlingen = [];
            if (sessieData.klas && ['actief', 'evaluatie', 'docent_evaluatie'].includes(sessieData.status)) {
                const nu = new Date();
                const vrijgesteldenSnap = await db.collection('users')
                    .where('school_id', '==', verifiedSchoolId)
                    .where('klas', '==', sessieData.klas)
                    .where('vrijgesteld_van_testen', '==', true)
                    .get();

                vrijgesteldeLeerlingen = vrijgesteldenSnap.docs
                    .filter(ud => {
                        const eind = ud.data().vrijstelling_einddatum?.toDate?.();
                        return eind && eind > nu;
                    })
                    .map(ud => ({
                        uid: ud.id,
                        nickname: ud.data().nickname || 'Leerling',
                        heeft_rol: deelnames.some(dl => dl.is_vrijgesteld),
                    }));
            }

            // --- NIEUW: Zoek ook voor de leerkracht of er een actief toernooi is ---
            const toernooiSnap = await db.collection('sport_lab_toernooien')
                .where('sessie_id', '==', d.id)
                .where('status', '==', 'actief')
                .limit(1)
                .get();

            const actiefToernooi = toernooiSnap.empty ? null : {
                id: toernooiSnap.docs[0].id,
                ...toernooiSnap.docs[0].data()
            };
            // ----------------------------------------------------------------------

            return {
                id: sessieData.id,
                sport: sessieData.sport,
                klas: sessieData.klas || null,
                groep_id: sessieData.groep_id || null,
                status: sessieData.status,
                start_tijd: sessieData.start_tijd?.toDate?.()?.toISOString() || null,
                gesloten_op: sessieData.gesloten_op?.toDate?.()?.toISOString() || null,
                deelnames,
                vrijgestelde_leerlingen: vrijgesteldeLeerlingen,
                toernooi: actiefToernooi // <--- FIX: Geef toernooi mee aan de leerkracht!
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

        const userSnap = await db.collection('users').doc(decodedToken.uid).get();
        const userData = userSnap.data();

        // 1. HAAL EERST DE SESSIE OP VOORDAT WE DE TIJD CHECKEN
        const sessieSnap = await db.collection('sport_lab_sessions').doc(sessieId).get();
        if (!sessieSnap.exists) return res.status(404).json({ error: 'Sessie niet gevonden.' });
        const sessieData = sessieSnap.data();

        // 2. SCHOOLUREN CHECK (Met de nieuwe test-bypass)
        // Als het een test-sessie is (aangemaakt door superadmin), mag de leerling er altijd in.
        const isTestSessie = sessieData.is_test_sessie === true;
        const isSuperAdmin = userData?.rol === 'super-administrator';
        
        if (!isSuperAdmin && !isTestSessie && !isBinnenSchoolUren()) {
            return res.status(403).json({ error: 'SportLab is enkel beschikbaar tijdens schooluren.' });
        }

        // 3. SESSIE STATUS VALIDATIE
        if (!isSessieActief({ id: sessieId, ...sessieData })) {
            return res.status(400).json({ error: 'Sessie is niet meer actief.' });
        }
        if (sessieData.status !== 'actief') {
            return res.status(400).json({ error: 'Sessie is al in evaluatiefase.' });
        }

        // Check vrijstelling voor alternatieve rol
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
                vervalt_op: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), 
                zelfreflectie: null,
                xp_earned: 0,
                voltooid: false,
                deelname_op: Timestamp.now(),
            });
            deelnameId = deelnameRef.id;

            // Geen XP bij enkel joinen — XP wordt pas verdiend bij zelfreflectie
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
                hoofdtip_gegeven: zelfreflectie.hoofdtip_gegeven || null,
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
            last_activity_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date()),
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
// ─── 8. GET SPORTLAB CONTENT ─────────────────────────────────────────────────
// Haalt content op uit sport_lab_content/{sport}
// Bevat taken, spelregels en beslissingen per rol en niveau
export async function handleGetSportLabContent(req, res, decodedToken) {
    try {
        const { sport } = req.body;
        if (!sport) return res.status(400).json({ error: 'sport is verplicht.' });

        const sportNorm = sport.toLowerCase().trim();
        const contentRef = db.collection('sport_lab_content').doc(sportNorm);
        const contentSnap = await contentRef.get();

        // Fallback naar 'andere' als sport niet gevonden
        if (!contentSnap.exists) {
            const andereSnap = await db.collection('sport_lab_content').doc('andere').get();
            return res.status(200).json({
                success: true,
                content: andereSnap.exists ? andereSnap.data() : null,
                fallback: true,
            });
        }

        return res.status(200).json({
            success: true,
            content: contentSnap.data(),
            fallback: false,
        });

    } catch (error) {
        console.error('❌ handleGetSportLabContent:', error);
        return res.status(500).json({ error: 'Fout bij ophalen content' });
    }
}
// ─── 9. SAVE SPORT LAB SCORE (Docent) ─────────────────────────────────────────
export async function handleSaveSportLabScore(req, res, decodedToken) {
    try {
        const { schoolId, sessieId, leerlingUid, rol, score, maxScore, groepId, levelUp } = req.body;
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!['leerkracht', 'administrator', 'super-administrator'].includes(callerSnap.data()?.rol)) {
            return res.status(403).json({ error: 'Enkel leerkrachten kunnen scoren.' });
        }

        const existingSnap = await db.collection('sport_lab_scores')
            .where('sessie_id', '==', sessieId)
            .where('leerling_id', '==', leerlingUid)
            .limit(1).get();

        if (!existingSnap.empty) {
            // Update bestaande score
            await existingSnap.docs[0].ref.update({
                score: Number(score),
                max_score: Number(maxScore),
                level_up_toegekend: levelUp || false,
                vervalt_op: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
                bijgewerkt_op: Timestamp.now()
            });
        } else {
            // Nieuwe score in aparte, permanente collectie
            await db.collection('sport_lab_scores').add({
                school_id: verifiedSchoolId,
                sessie_id: sessieId,
                leerkracht_id: decodedToken.uid,
                leerling_id: leerlingUid,
                groep_id: groepId || null,
                rol: rol,
                score: Number(score),
                max_score: Number(maxScore),
                level_up_toegekend: levelUp || false,
                vervalt_op: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
                datum: Timestamp.now()
            });
        }

        // Als Level-up aangevinkt is, geef de leerling de +100 XP
        if (levelUp) {
            const leerlingRef = db.collection('users').doc(leerlingUid);
            const lSnap = await leerlingRef.get();
            const huidigNiveau = lSnap.data()?.sportlab_niveaus?.[rol] || 1;
            
            if (huidigNiveau < 3) {
                await leerlingRef.update({
                    [`sportlab_niveaus.${rol}`]: huidigNiveau + 1,
                    xp: FieldValue.increment(XP.LEVEL_UP),
                    xp_current_period: FieldValue.increment(XP.LEVEL_UP),
                    xp_current_school_year: FieldValue.increment(XP.LEVEL_UP),
                });
            }
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ handleSaveSportLabScore:', error);
        return res.status(500).json({ error: 'Fout bij opslaan score' });
    }
}
// ─── 10. ANONIEME TELLER VOOR COACH ──────────────────────────────────────────
export async function handleSportlabObservatieKlaar(req, res, decodedToken) {
    try {
        const { schoolId, deelnameId } = req.body;
        
        // Beveiliging: check of het request van de juiste school komt
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        if (!deelnameId) return res.status(400).json({ error: 'Deelname ID ontbreekt.' });

        const deelnameRef = db.collection('sport_lab_deelnames').doc(deelnameId);
        
        // Gebruik FieldValue.increment om de teller veilig met +1 te verhogen
        await deelnameRef.update({
            observaties_aantal: FieldValue.increment(1)
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ handleSportlabObservatieKlaar:', error);
        return res.status(500).json({ error: 'Fout bij updaten observatie teller' });
    }
}

// ─── 11. HAAL ALLE SPELERS OP VOOR TOERNOOI (Inclusief test-leerlingen) ──────
export async function handleGetSportLabToernooiSpelers(req, res, decodedToken) {
    try {
        const { schoolId, klas, groepId } = req.body;
        
        // VEILIGHEIDS-CHECK: Controleer eigen school zonder externe getSchoolId helper
        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        const verifiedSchoolId = callerSnap.data()?.school_id;
        
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        let usersSnap;
        if (klas) {
            usersSnap = await db.collection('users')
                .where('school_id', '==', verifiedSchoolId)
                .where('klas', '==', klas)
                .where('rol', '==', 'leerling')
                .get();
        } else if (groepId) {
            const groepSnap = await db.collection('groepen').doc(groepId).get();
            if (!groepSnap.exists) return res.status(200).json({ spelers: [] });
            const leerlingIds = groepSnap.data().leerling_ids || [];
            
            if (leerlingIds.length === 0) return res.status(200).json({ spelers: [] });
            const docRefs = leerlingIds.map(id => db.collection('users').doc(id));
            usersSnap = { docs: await db.getAll(...docRefs) };
        } else {
            return res.status(200).json({ spelers: [] });
        }

        // Probeer masterKey te pakken (maar faal niet als de helper ontbreekt)
        let masterKey = null;
        try {
            if (typeof getMasterKey === 'function') masterKey = await getMasterKey();
        } catch(e) {}

        const nu = new Date();

        const spelers = await Promise.all(usersSnap.docs.map(async (doc) => {
            if (!doc.exists) return null;
            const d = doc.data();
            if (d.rol !== 'leerling') return null;

            let echteNaam = d.naam || d.nickname || 'Onbekend';
            
            // Decryptie (werkt voor echte accounts, slaat test-accounts over)
            if (d.toegestane_gebruikers_id && masterKey && typeof decryptName === 'function') {
                const tgSnap = await db.collection('toegestane_gebruikers').doc(d.toegestane_gebruikers_id).get();
                if (tgSnap.exists && tgSnap.data().encrypted_name) {
                    echteNaam = decryptName(tgSnap.data().encrypted_name, masterKey);
                }
            }

            const eind = d.vrijstelling_einddatum?.toDate?.();
            const isVrijgesteld = d.vrijgesteld_van_testen === true && eind && eind > nu;

            return { id: doc.id, naam: echteNaam, vrijgesteld: isVrijgesteld };
        }));

        const geldigeSpelers = spelers.filter(Boolean).sort((a, b) => a.naam.localeCompare(b.naam));
        return res.status(200).json({ success: true, spelers: geldigeSpelers });

    } catch (error) {
        console.error('❌ handleGetSportLabToernooiSpelers:', error);
        return res.status(500).json({ error: 'Fout bij ophalen spelers' });
    }
}
// ─── 12. TOERNOOI STARTEN & SCHEMA BEREKENEN ─────────────────────────────────
export async function handleStartToernooi(req, res, decodedToken) {
    try {
        const { schoolId, sessieId, teams, type } = req.body;
        
        // Beveiliging
        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        const verifiedSchoolId = callerSnap.data()?.school_id;
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        // ─── ALGORITME 1: DE POULE (Round-Robin) ───
        let wedstrijden = [];
        if (type === 'poule') {
            // Kopieer teams zodat we ermee kunnen schuiven
            let t = [...teams];
            
            // Als er een oneven aantal teams is, voegen we een "Rust" (Bye) team toe
            if (t.length % 2 !== 0) {
                t.push({ id: 'bye', naam: 'Rust', spelers: [] });
            }

            const rondes = t.length - 1;
            const matchenPerRonde = t.length / 2;
            let matchId = 1;

            // Wiskundig 'Polygon' algoritme voor perfecte rotatie
            for (let ronde = 0; ronde < rondes; ronde++) {
                for (let i = 0; i < matchenPerRonde; i++) {
                    const team1 = t[i];
                    const team2 = t[t.length - 1 - i];
                    
                    // Alleen echte wedstrijden opslaan (geen wedstrijden tegen 'Rust')
                    if (team1.id !== 'bye' && team2.id !== 'bye') {
                        wedstrijden.push({
                            id: `match_${matchId++}`,
                            ronde: ronde + 1,
                            team1: { id: team1.id, naam: team1.naam },
                            team2: { id: team2.id, naam: team2.naam },
                            score1: null,
                            score2: null,
                            winst_voor: null, // 'team1', 'team2', of 'gelijk'
                            gespeeld: false
                        });
                    }
                }
                // Roteer de teams (team 0 blijft staan, de rest schuift 1 plekje door)
                t.splice(1, 0, t.pop());
            }
        } 
        else if (type === 'king' || type === 'knockout') {
            // ─── ALGORITME 2 & 3: KONING VAN HET VELD / KNOCK-OUT (Ronde 1) ───
            // We berekenen enkel Ronde 1. De volgende rondes worden later dynamisch gegenereerd.
            
            let t = [...teams].sort(() => Math.random() - 0.5); // Willekeurige start-loting
            
            // Bij een oneven aantal teams krijgt 1 team 'Rust'
            if (t.length % 2 !== 0) {
                t.push({ id: 'bye', naam: 'Rust', spelers: [] });
            }

            let matchId = 1;
            for (let i = 0; i < t.length; i += 2) {
                const veldNummer = (i / 2) + 1; // Veld 1 is het 'Koning' veld
                
                // Als iemand tegen 'Rust' loot, hebben ze automatisch gewonnen
                const isBye = t[i].id === 'bye' || t[i+1].id === 'bye';
                let automatischeWinst = null;
                if (isBye) {
                    automatischeWinst = t[i].id === 'bye' ? 'team2' : 'team1';
                }

                wedstrijden.push({
                    id: `match_r1_v${veldNummer}`,
                    ronde: 1,
                    veld: veldNummer,
                    team1: { id: t[i].id, naam: t[i].naam },
                    team2: { id: t[i+1].id, naam: t[i+1].naam },
                    score1: isBye ? 0 : null,
                    score2: isBye ? 0 : null,
                    winst_voor: automatischeWinst,
                    gespeeld: isBye
                });
            }
        }

        // Sla het toernooi op in een gloednieuwe collectie
        const toernooiRef = await db.collection('sport_lab_toernooien').add({
            school_id: verifiedSchoolId,
            sessie_id: sessieId,
            aangemaakt_door: decodedToken.uid,
            type: type,
            status: 'actief',
            teams: teams,
            wedstrijden: wedstrijden,
            vervalt_op: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), // <--- TOEVOEGEN
            aangemaakt_op: new Date()
        });

        return res.status(200).json({ success: true, toernooi_id: toernooiRef.id, wedstrijden });

    } catch (error) {
        console.error('❌ handleStartToernooi:', error);
        return res.status(500).json({ error: 'Fout bij berekenen toernooischema' });
    }
}
// ─── 13. TOERNOOI SCORES UPDATEN ─────────────────────────────────────────────
export async function handleUpdateMatchScore(req, res, decodedToken) {
    try {
        const { schoolId, toernooiId, matchId, score1, score2 } = req.body;
        
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const toernooiRef = db.collection('sport_lab_toernooien').doc(toernooiId);
        const toernooiSnap = await toernooiRef.get();
        if (!toernooiSnap.exists) return res.status(404).json({ error: 'Toernooi niet gevonden.' });

        // Als er geen score is doorgegeven (reset), maken we alles leeg
        let winstVoor = null;
        let s1 = null;
        let s2 = null;

        if (score1 !== null && score2 !== null) {
            s1 = Number(score1);
            s2 = Number(score2);
            if (s1 > s2) winstVoor = 'team1';
            else if (s1 < s2) winstVoor = 'team2';
            else winstVoor = 'gelijk';
        }

        const toernooi = toernooiSnap.data();
        const nieuweWedstrijden = toernooi.wedstrijden.map(m => {
            if (m.id === matchId) {
                return { 
                    ...m, 
                    score1: s1, 
                    score2: s2, 
                    winst_voor: winstVoor, 
                    gespeeld: winstVoor !== null 
                };
            }
            return m;
        });

        await toernooiRef.update({ wedstrijden: nieuweWedstrijden });
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ handleUpdateMatchScore:', error);
        return res.status(500).json({ error: 'Fout bij opslaan score' });
    }
}

// ─── 14. TOERNOOI BEËINDIGEN / RESETTEN (Leerkracht) ─────────────────────────
export async function handleStopToernooi(req, res, decodedToken) {
    try {
        const { schoolId, toernooiId } = req.body;
        
        const verifiedSchoolId = await getSchoolId(decodedToken.uid);
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!['leerkracht', 'administrator', 'super-administrator'].includes(callerSnap.data()?.rol)) {
            return res.status(403).json({ error: 'Enkel leerkrachten kunnen een toernooi wissen.' });
        }

        await db.collection('sport_lab_toernooien').doc(toernooiId).update({ status: 'gestopt' });
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ handleStopToernooi:', error);
        return res.status(500).json({ error: 'Fout bij stoppen toernooi' });
    }
}
// ─── 16. VOLGENDE RONDE BEREKENEN (Koning van het veld) ──────────────────────
export async function handleVolgendeRonde(req, res, decodedToken) {
    try {
        const { schoolId, toernooiId } = req.body;
        
        const callerSnap = await db.collection('users').doc(decodedToken.uid).get();
        const verifiedSchoolId = callerSnap.data()?.school_id;
        if (schoolId !== verifiedSchoolId) return res.status(403).json({ error: 'Geen toegang.' });

        const toernooiRef = db.collection('sport_lab_toernooien').doc(toernooiId);
        const snap = await toernooiRef.get();
        if (!snap.exists) return res.status(404).json({ error: 'Toernooi niet gevonden.' });

        const toernooi = snap.data();
        
        // Zoek de huidige (hoogste) ronde
        const huidigeRondeNummer = Math.max(...toernooi.wedstrijden.map(m => m.ronde));
        const huidigeMatchen = toernooi.wedstrijden.filter(m => m.ronde === huidigeRondeNummer);

        // Check of de Toernooileider alles heeft ingevuld
        if (huidigeMatchen.some(m => !m.gespeeld)) {
            return res.status(400).json({ error: 'Nog niet alle wedstrijden van deze ronde zijn ingevuld!' });
        }

        let nieuweWedstrijden = [];

        if (toernooi.type === 'king') {
            let velden = {}; 
            let maxVeld = 1;
            
            // 1. Bepaal winnaar en verliezer per veld
            huidigeMatchen.forEach(m => {
                const v = m.veld;
                if (v > maxVeld) maxVeld = v;
                
                let winnaar = m.winst_voor === 'team1' ? m.team1 : m.team2;
                let verliezer = m.winst_voor === 'team1' ? m.team2 : m.team1;
                
                // Bij gelijkspel: Team 1 (de uitdager) wint het voordeel van de twijfel
                if (m.winst_voor === 'gelijk') { winnaar = m.team1; verliezer = m.team2; }
                
                velden[v] = { winnaar, verliezer };
            });

            // 2. Bepaal de nieuwe posities (Doorschuiven!)
            let nieuwePosities = {}; 
            for (let i = 1; i <= maxVeld; i++) nieuwePosities[i] = [];

            for (let v = 1; v <= maxVeld; v++) {
                const win = velden[v].winnaar;
                const ver = velden[v].verliezer;

                if (v === 1) {
                    // Koningsveld: Winnaar blijft, verliezer zakt
                    nieuwePosities[1].push(win);
                    if (maxVeld > 1) nieuwePosities[2].push(ver);
                    else nieuwePosities[1].push(ver); 
                } else if (v === maxVeld) {
                    // Degradatieveld: Winnaar stijgt, verliezer blijft
                    nieuwePosities[v - 1].push(win);
                    nieuwePosities[v].push(ver);
                } else {
                    // Middenveld: Winnaar stijgt, verliezer zakt
                    nieuwePosities[v - 1].push(win);
                    nieuwePosities[v + 1].push(ver);
                }
            }

            // 3. Maak de nieuwe wedstrijden aan
            for (let v = 1; v <= maxVeld; v++) {
                const teamsOpVeld = nieuwePosities[v];
                if (teamsOpVeld.length === 2) {
                    const isBye = teamsOpVeld[0].id === 'bye' || teamsOpVeld[1].id === 'bye';
                    let autoWinst = null;
                    if (isBye) autoWinst = teamsOpVeld[0].id === 'bye' ? 'team2' : 'team1';

                    nieuweWedstrijden.push({
                        id: `match_r${huidigeRondeNummer + 1}_v${v}`,
                        ronde: huidigeRondeNummer + 1,
                        veld: v,
                        team1: teamsOpVeld[0],
                        team2: teamsOpVeld[1],
                        score1: isBye ? 0 : null,
                        score2: isBye ? 0 : null,
                        winst_voor: autoWinst,
                        gespeeld: isBye
                    });
                }
            }
        } else if (toernooi.type === 'knockout') {
            return res.status(400).json({ error: 'Knock-out schema bouwen we later!' });
        }

        // Sla de nieuwe ronde op in de database
        const geupdateWedstrijden = [...toernooi.wedstrijden, ...nieuweWedstrijden];
        await toernooiRef.update({ wedstrijden: geupdateWedstrijden, bijgewerkt_op: new Date() });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ handleVolgendeRonde:', error);
        return res.status(500).json({ error: 'Fout bij doorschuiven' });
    }
}