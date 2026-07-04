// functions/src/cleanup-functions.js
// GERECUPEREERD uit Cloud Run-snapshot op 2026-07-04: verwijderOudeSporLabData
// draaide in de cloud maar de bron was uit de repo verdwenen. Vanaf nu weer
// onder versiebeheer; zelfde naam/trigger/regio → eerstvolgende deploy is een
// gewone update en de "does not exist in your local source"-prompt verdwijnt.
//
// GDPR-functie: handhaaft de bewaartermijn van Sport Lab-sessies en -deelnames
// (7 dagen na sluiting). Scores hebben een eigen mechanisme (TTL op vervalt_op —
// zie firestore.rules); die worden hier bewust NIET geraakt.
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

const getDb = () => admin.firestore();

// =============================================
// CRON: Oude sessies + deelnames verwijderen
// Elke nacht om 02:00 (Brussel):
//   - Sessies "gesloten" én ouder dan 7 dagen → verwijderen
//   - Bijhorende deelnames → verwijderen
//   - Telling naar audit_logs
// =============================================
exports.verwijderOudeSporLabData = onSchedule(
    {
        schedule: '0 2 * * *',
        timeZone: 'Europe/Brussels',
    },
    async (event) => {
        const db = getDb();
        const zevenDagenGeleden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        try {
            const sessiesSnap = await db.collection('sport_lab_sessions')
                .where('status', '==', 'gesloten')
                .get();

            if (sessiesSnap.empty) {
                console.log('Geen oude sessies gevonden.');
                return;
            }

            let verwijderdeSessies = 0;
            let verwijderdeDeelnames = 0;

            for (const sessieDoc of sessiesSnap.docs) {
                const geslotenOp = sessieDoc.data().gesloten_op?.toDate?.();
                if (!geslotenOp || geslotenOp > zevenDagenGeleden) continue;

                // Verwijder deelnames van deze sessie
                const deelnamesSnap = await db.collection('sport_lab_deelnames')
                    .where('sessie_id', '==', sessieDoc.id)
                    .get();

                const batch = db.batch();
                deelnamesSnap.docs.forEach(d => {
                    batch.delete(d.ref);
                    verwijderdeDeelnames++;
                });

                batch.delete(sessieDoc.ref);
                verwijderdeSessies++;

                await batch.commit();
            }

            console.log(`✅ ${verwijderdeSessies} sessie(s) en ${verwijderdeDeelnames} deelname(s) verwijderd.`);

            // Audit log
            await db.collection('audit_logs').add({
                actor_uid: 'cron',
                action: 'sportlab_cleanup',
                verwijderde_sessies: verwijderdeSessies,
                verwijderde_deelnames: verwijderdeDeelnames,
                timestamp: Timestamp.now(),
            });

        } catch (error) {
            console.error('❌ verwijderOudeSportLabData:', error);
            throw error;
        }
    }
);
