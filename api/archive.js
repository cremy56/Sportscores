// api/archive.js
import { db, verifyToken } from '../lib/firebaseAdmin.js';
import { checkRateLimit, stuurRateLimitResponse } from '../lib/rateLimiter.js';
import { Timestamp } from 'firebase-admin/firestore';
import { writeAuditLog } from '../lib/auditLogger.js';
import { stuurAuthfoutResponse } from '../lib/authFouten.js';

const getLeerjaarFromKlas = (klas) => {
    if (!klas) return null;
    const match = klas.toString().match(/^(\d+)/);
    if (!match) return null;
    const leerjaar = parseInt(match[1]);
    return (leerjaar >= 1 && leerjaar <= 6) ? leerjaar : null;
};

const getVirtueelAfstudeerjaar = (klas, huidigSchooljaar) => {
    const leerjaar = getLeerjaarFromKlas(klas);
    if (!leerjaar) return null;
    return huidigSchooljaar + (6 - leerjaar);
};

const getHuidigSchooljaar = () => {
    const nu = new Date();
    const maand = nu.getMonth() + 1;
    const jaar = nu.getFullYear();
    return maand >= 9 ? jaar : jaar - 1;
};

// ─── BATCH-HELPER ─────────────────────────────────────────────────────────────
// Firestore staat maximaal 500 bewerkingen per batch toe en commit
// alles-of-niets. Bij een school met veel actieve testen (10 writes per test)
// of veel leerlingen die tegelijk van status wisselen, liep één grote batch
// over die limiet — en dan wordt er NIETS weggeschreven. Deze helper knipt de
// bewerkingen in stukken van 450, net als lib/handlers en api/users.js doen.
const MAX_PER_BATCH = 450;

async function commitInChunks(db, bewerkingen) {
    let uitgevoerd = 0;
    for (let i = 0; i < bewerkingen.length; i += MAX_PER_BATCH) {
        const batch = db.batch();
        for (const doeHet of bewerkingen.slice(i, i + MAX_PER_BATCH)) {
            doeHet(batch);
        }
        await batch.commit();
        uitgevoerd += Math.min(MAX_PER_BATCH, bewerkingen.length - i);
    }
    return uitgevoerd;
}

// ─── GEDEELDE KERNLOGICA ──────────────────────────────────────────────────────
// Herbruikbaar door zowel de API handler als de Cloud Function cron
export async function archiveerRankingsVoorSchool(schoolId, actorUid = 'cron') {
    const schooljaar = getHuidigSchooljaar();
    const schooljaarLabel = `${schooljaar}-${schooljaar + 1}`;

    const testenSnap = await db.collection('testen')
        .where('school_id', '==', schoolId)
        .where('is_actief', '==', true)
        .get();

    let gearchiveerdeRankings = 0;
    let geblokkeerdeNicknames = 0;
    // Bewerkingen verzamelen en in stukken committen (zie commitInChunks):
    // per test zijn dit 10 writes, dus ~50 testen zat al aan de 500-limiet.
    const bewerkingen = [];

    for (const testDoc of testenSnap.docs) {
        const testData = testDoc.data();
        const direction = testData.score_richting === 'laag' ? 'asc' : 'desc';

        const scoresSnap = await db.collection('scores')
            .where('test_id', '==', testDoc.id)
            .where('school_id', '==', schoolId)
            .orderBy('score', direction)
            .limit(5)
            .get();

        if (scoresSnap.empty) continue;

        const leerlingIds = scoresSnap.docs.map(d => d.data().leerling_id).filter(Boolean);
        const nicknameMap = new Map();

        if (leerlingIds.length > 0) {
            const usersSnap = await db.collection('users')
                .where('toegestane_gebruikers_id', 'in', leerlingIds)
                .get();
            usersSnap.docs.forEach(d =>
                nicknameMap.set(d.data().toegestane_gebruikers_id, d.data().nickname || 'Sporter')
            );
        }

        scoresSnap.docs.forEach((scoreDoc, index) => {
            const scoreData = scoreDoc.data();
            const nickname = nicknameMap.get(scoreData.leerling_id) || 'Alumni';
            const rank = index + 1;
            const archiveId = `${testDoc.id}_${schooljaarLabel}_rank${rank}`;

            bewerkingen.push(b => b.set(db.collection('ranking_archief').doc(archiveId), {
                test_id: testDoc.id,
                test_naam: testData.naam,
                categorie: testData.categorie || null,
                eenheid: testData.eenheid || null,
                rank,
                score: scoreData.score,
                nickname,
                school_id: schoolId,
                schooljaar: schooljaarLabel,
                gearchiveerd_op: Timestamp.now(),
                // GDPR: geen leerling_id
            }, { merge: true }));

            gearchiveerdeRankings++;

            // Blokkeer nickname voor hergebruik
            bewerkingen.push(b => b.set(db.collection('nickname_archief').doc(nickname), {
                school_id: schoolId,
                geblokkeerd_sinds: Timestamp.now(),
                reden: 'alltime_ranking',
                schooljaar: schooljaarLabel,
            }, { merge: true }));

            geblokkeerdeNicknames++;
        });
    }

    await commitInChunks(db, bewerkingen);

    await writeAuditLog({
        admin_user_id: actorUid,
        action: 'archiveer_rankings',
        school_id: schoolId,
        schooljaar: schooljaarLabel,
        gearchiveerde_rankings: gearchiveerdeRankings,
        timestamp: Timestamp.now(),
    });

    return { gearchiveerdeRankings, geblokkeerdeNicknames, schooljaarLabel };
}

// ─── 1. ARCHIVEER TOP 5 RANKINGS ─────────────────────────────────────────────
async function handleArchiveerRankings(req, res, decodedToken) {
    try {
        const adminSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminSnap.exists) return res.status(403).json({ error: 'Profiel niet gevonden' });
        const adminData = adminSnap.data();
        if (!['administrator', 'super-administrator'].includes(adminData.rol)) {
            return res.status(403).json({ error: 'Alleen admins kunnen archiveren' });
        }

        const result = await archiveerRankingsVoorSchool(adminData.school_id, decodedToken.uid);
        return res.status(200).json({ success: true, ...result });

    } catch (error) {
        console.error('❌ handleArchiveerRankings:', error);
        return res.status(500).json({ error: error.message });
    }
}

// ─── 2. DEACTIVEER ONTBREKENDE LEERLINGEN ────────────────────────────────────
async function handleDeactiveerOntbrekende(req, res, decodedToken) {
    try {
        const adminSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminSnap.exists) return res.status(403).json({ error: 'Profiel niet gevonden' });
        const adminData = adminSnap.data();
        if (!['administrator', 'super-administrator'].includes(adminData.rol)) {
            return res.status(403).json({ error: 'Alleen admins kunnen deactiveren' });
        }

        const { schoolId, actieveHashen } = req.body;
        if (!schoolId || !Array.isArray(actieveHashen)) {
            return res.status(400).json({ error: 'schoolId en actieveHashen zijn verplicht' });
        }
        if (adminData.rol !== 'super-administrator' && adminData.school_id !== schoolId) {
            return res.status(403).json({ error: 'Toegang geweigerd' });
        }

        const schooljaar = getHuidigSchooljaar();
        // Zie commitInChunks: bij het einde van het schooljaar wisselen soms
        // honderden leerlingen tegelijk van status. Eén batch liep dan over de
        // 500-limiet en er werd NIETS weggeschreven.
        const bewerkingen = [];
        let gedeactiveerd = 0;
        let teruggeactiveerd = 0;

        const actieveSnap = await db.collection('toegestane_gebruikers')
            .where('school_id', '==', schoolId)
            .where('rol', '==', 'leerling')
            .where('is_active', '==', true)
            .get();

        for (const doc of actieveSnap.docs) {
            if (!actieveHashen.includes(doc.id)) {
                const data = doc.data();
                bewerkingen.push(b => b.update(doc.ref, {
                    is_active: false,
                    klas_bij_vertrek: data.klas || null,
                    gedeactiveerd_op: Timestamp.now(),
                    virtueel_afstudeerjaar: getVirtueelAfstudeerjaar(data.klas, schooljaar),
                    last_updated: Timestamp.now(),
                }));
                gedeactiveerd++;
            }
        }

        const inactieveSnap = await db.collection('toegestane_gebruikers')
            .where('school_id', '==', schoolId)
            .where('rol', '==', 'leerling')
            .where('is_active', '==', false)
            .get();

        for (const doc of inactieveSnap.docs) {
            if (actieveHashen.includes(doc.id)) {
                bewerkingen.push(b => b.update(doc.ref, {
                    is_active: true,
                    gedeactiveerd_op: null,
                    virtueel_afstudeerjaar: null,
                    klas_bij_vertrek: null,
                    last_updated: Timestamp.now(),
                }));
                teruggeactiveerd++;
            }
        }

        await commitInChunks(db, bewerkingen);

        await writeAuditLog({
            admin_user_id: decodedToken.uid,
            action: 'deactiveer_ontbrekende',
            school_id: schoolId,
            gedeactiveerd,
            teruggeactiveerd,
            timestamp: Timestamp.now(),
        });

        return res.status(200).json({ success: true, gedeactiveerd, teruggeactiveerd });

    } catch (error) {
        console.error('❌ handleDeactiveerOntbrekende:', error);
        return res.status(500).json({ error: error.message });
    }
}

// ─── 3. VERWIJDER VERLOPEN GEGEVENS ──────────────────────────────────────────
async function handleVerwijderVerlopen(req, res, decodedToken) {
    try {
        const adminSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminSnap.exists) return res.status(403).json({ error: 'Profiel niet gevonden' });
        const adminData = adminSnap.data();
        if (!['administrator', 'super-administrator'].includes(adminData.rol)) {
            return res.status(403).json({ error: 'Alleen admins kunnen gegevens verwijderen' });
        }

        const schoolId = adminData.school_id;
        const huidigSchooljaar = getHuidigSchooljaar();
        const eenJaarGeleden = new Date();
        eenJaarGeleden.setFullYear(eenJaarGeleden.getFullYear() - 1);

        const inactieveSnap = await db.collection('toegestane_gebruikers')
            .where('school_id', '==', schoolId)
            .where('rol', '==', 'leerling')
            .where('is_active', '==', false)
            .get();

        let verwijderdeUsers = 0;
        let verwijderdeToegestane = 0;

        for (const doc of inactieveSnap.docs) {
            const data = doc.data();
            if (!data.virtueel_afstudeerjaar || data.virtueel_afstudeerjaar >= huidigSchooljaar) continue;

            const usersSnap = await db.collection('users')
                .where('toegestane_gebruikers_id', '==', doc.id)
                .limit(1)
                .get();
            if (!usersSnap.empty) {
                await usersSnap.docs[0].ref.delete();
                verwijderdeUsers++;
            }

            const gedeactiveerdOp = data.gedeactiveerd_op?.toDate();
            if (gedeactiveerdOp && gedeactiveerdOp < eenJaarGeleden) {
                await doc.ref.delete();
                verwijderdeToegestane++;
            }
        }

        await writeAuditLog({
            admin_user_id: decodedToken.uid,
            action: 'verwijder_verlopen_gegevens',
            school_id: schoolId,
            verwijderde_users: verwijderdeUsers,
            verwijderde_toegestane: verwijderdeToegestane,
            timestamp: Timestamp.now(),
        });

        return res.status(200).json({ success: true, verwijderdeUsers, verwijderdeToegestane });

    } catch (error) {
        console.error('❌ handleVerwijderVerlopen:', error);
        return res.status(500).json({ error: error.message });
    }
}

// ─── 4. MANUEEL HERACTIVEREN ──────────────────────────────────────────────────
async function handleHeractiveer(req, res, decodedToken) {
    try {
        const adminSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminSnap.exists) return res.status(403).json({ error: 'Profiel niet gevonden' });
        const adminData = adminSnap.data();
        if (!['administrator', 'super-administrator'].includes(adminData.rol)) {
            return res.status(403).json({ error: 'Alleen admins kunnen heractiveren' });
        }

        const { leerlingHash, nieuweKlas } = req.body;
        if (!leerlingHash) return res.status(400).json({ error: 'leerlingHash is verplicht' });

        const ref = db.collection('toegestane_gebruikers').doc(leerlingHash);
        const doc = await ref.get();
        if (!doc.exists) return res.status(404).json({ error: 'Leerling niet gevonden' });

        const nieuweKlasActief = nieuweKlas || doc.data().klas_bij_vertrek;

        await ref.update({
            is_active: true,
            klas: nieuweKlasActief,
            gedeactiveerd_op: null,
            virtueel_afstudeerjaar: null,
            klas_bij_vertrek: null,
            last_updated: Timestamp.now(),
        });

        await writeAuditLog({
            admin_user_id: decodedToken.uid,
            action: 'heractiveer_leerling',
            school_id: adminData.school_id,
            leerling_hash: leerlingHash,
            nieuwe_klas: nieuweKlasActief,
            timestamp: Timestamp.now(),
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ handleHeractiveer:', error);
        return res.status(500).json({ error: error.message });
    }
}

// ─── HOOFD HANDLER ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // ── Authenticatie met een EIGEN catch ───────────────────────────────────
    // Infrastructuurfout (bv. ingetrokken key) NIET als 401 maskeren.
    let decodedToken;
    try {
        decodedToken = await verifyToken(req.headers.authorization);
    } catch (error) {
        return stuurAuthfoutResponse(res, error, '/archive');
    }

    try {
        const { action } = req.body;

        // ── Rate limit (categorie 'admin' — alle actions hier zijn beheer) ───
        // NB: de cron roept archiveerRankingsVoorSchool() rechtstreeks aan
        // (import in de Cloud Function), niet via HTTP — die raakt deze
        // limiter dus nooit.
        const rl = await checkRateLimit(req, { categorie: 'admin', uid: decodedToken.uid });
        if (!rl.toegestaan) return stuurRateLimitResponse(res, rl.retryAfter);

        switch (action) {
            case 'archiveer_rankings':
                return await handleArchiveerRankings(req, res, decodedToken);
            case 'deactiveer_ontbrekende':
                return await handleDeactiveerOntbrekende(req, res, decodedToken);
            case 'verwijder_verlopen':
                return await handleVerwijderVerlopen(req, res, decodedToken);
            case 'heractiveer':
                return await handleHeractiveer(req, res, decodedToken);
            default:
                return res.status(400).json({ error: `Onbekende action: ${action}` });
        }
    } catch (error) {
        // Authenticatie is hierboven al afgehandeld; wat hier landt is een
        // echte serverfout. Altijd loggen, nooit als 401 maskeren.
        console.error('❌ API Hoofd-error in /archive:', error);
        return res.status(500).json({ error: 'Interne serverfout' });
    }
}