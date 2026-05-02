// functions/src/archive-functions.js
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');
const db = admin.firestore();

// =============================================
// GEDEELDE KERNLOGICA
// Identiek aan archiveerRankingsVoorSchool in api/archive.js
// maar dan in CommonJS voor Cloud Functions
// =============================================
async function archiveerRankingsVoorSchool(schoolId) {
    const nu = new Date();
    const maand = nu.getMonth() + 1;
    const jaar = nu.getFullYear();
    const schooljaar = maand >= 9 ? jaar : jaar - 1;
    const schooljaarLabel = `${schooljaar}-${schooljaar + 1}`;

    const testenSnap = await db.collection('testen')
        .where('school_id', '==', schoolId)
        .where('is_actief', '==', true)
        .get();

    let gearchiveerdeRankings = 0;
    let geblokkeerdeNicknames = 0;
    const batch = db.batch();

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

            batch.set(db.collection('ranking_archief').doc(archiveId), {
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
            }, { merge: true });

            gearchiveerdeRankings++;

            batch.set(db.collection('nickname_archief').doc(nickname), {
                school_id: schoolId,
                geblokkeerd_sinds: Timestamp.now(),
                reden: 'alltime_ranking',
                schooljaar: schooljaarLabel,
            }, { merge: true });

            geblokkeerdeNicknames++;
        });
    }

    await batch.commit();

    // Audit log via aparte service account
    await db.collection('audit_logs').add({
        actor_uid: 'cron',
        action: 'archiveer_rankings_automatisch',
        school_id: schoolId,
        schooljaar: schooljaarLabel,
        gearchiveerde_rankings: gearchiveerdeRankings,
        geblokkeerde_nicknames: geblokkeerdeNicknames,
        timestamp: Timestamp.now(),
    });

    return { gearchiveerdeRankings, geblokkeerdeNicknames, schooljaarLabel };
}

// =============================================
// CRON: Archiveer rankings — 31 augustus 23:00
// Triggert aan het einde van elk schooljaar
// voor alle scholen in de database
// =============================================
exports.archiveerJaarlijkseRankings = onSchedule(
    {
        schedule: '0 23 31 8 *',  // 31 augustus om 23:00 UTC (= middernacht Belgische tijd)
        timeZone: 'Europe/Brussels',
    },
    async (event) => {
        console.log('🗂️ Start jaarlijkse ranking archivering...');

        try {
            // Haal alle actieve scholen op
            const scholenSnap = await db.collection('scholen').get();

            if (scholenSnap.empty) {
                console.log('Geen scholen gevonden.');
                return;
            }

            const resultaten = [];

            for (const schoolDoc of scholenSnap.docs) {
                const schoolId = schoolDoc.id;
                console.log(`Archiveren voor school: ${schoolId}`);

                try {
                    const result = await archiveerRankingsVoorSchool(schoolId);
                    resultaten.push({ schoolId, ...result, success: true });
                    console.log(`✅ ${schoolId}: ${result.gearchiveerdeRankings} rankings gearchiveerd`);
                } catch (schoolError) {
                    console.error(`❌ Fout voor school ${schoolId}:`, schoolError);
                    resultaten.push({ schoolId, success: false, error: schoolError.message });
                }
            }

            console.log('✅ Jaarlijkse archivering voltooid:', JSON.stringify(resultaten));
            return { success: true, resultaten };

        } catch (error) {
            console.error('❌ Kritieke fout in archiveerJaarlijkseRankings:', error);
            throw error;
        }
    }
);

// =============================================
// CRON: XP periodes resetten — 1 januari + 1 september
// Reset xp_current_period voor alle leerlingen
// zodat elke rapportperiode opnieuw start
// =============================================
exports.resetXPPeriode = onSchedule(
    {
        schedule: '0 0 1 1,9 *',  // 1 januari en 1 september om 00:00
        timeZone: 'Europe/Brussels',
    },
    async (event) => {
        console.log('🔄 Start XP periode reset...');

        try {
            // Reset in batches van 500
            const leerlingenSnap = await db.collection('users')
                .where('rol', '==', 'leerling')
                .get();

            if (leerlingenSnap.empty) {
                console.log('Geen leerlingen gevonden.');
                return;
            }

            const chunks = [];
            for (let i = 0; i < leerlingenSnap.docs.length; i += 500) {
                chunks.push(leerlingenSnap.docs.slice(i, i + 500));
            }

            for (const chunk of chunks) {
                const batch = db.batch();
                chunk.forEach(doc => {
                    batch.update(doc.ref, {
                        xp_current_period: 0,
                        periode_reset_op: Timestamp.now(),
                    });
                });
                await batch.commit();
            }

            // Op 1 september ook het schooljaar resetten
            const nu = new Date();
            if (nu.getMonth() === 8) { // September = maand 8 (0-indexed)
                const jaarChunks = [];
                for (let i = 0; i < leerlingenSnap.docs.length; i += 500) {
                    jaarChunks.push(leerlingenSnap.docs.slice(i, i + 500));
                }
                for (const chunk of jaarChunks) {
                    const batch = db.batch();
                    chunk.forEach(doc => {
                        batch.update(doc.ref, {
                            xp_current_school_year: 0,
                            streak_milestones_rewarded: [],
                            schooljaar_reset_op: Timestamp.now(),
                        });
                    });
                    await batch.commit();
                }
                console.log(`✅ Schooljaar XP gereset voor ${leerlingenSnap.docs.length} leerlingen`);
            }

            await db.collection('audit_logs').add({
                actor_uid: 'cron',
                action: 'reset_xp_periode',
                leerlingen_gereset: leerlingenSnap.docs.length,
                timestamp: Timestamp.now(),
            });

            console.log(`✅ XP periode gereset voor ${leerlingenSnap.docs.length} leerlingen`);

        } catch (error) {
            console.error('❌ Fout in resetXPPeriode:', error);
            throw error;
        }
    }
);