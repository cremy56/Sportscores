// scripts/opkuis-welzijn.cjs — v2
// FIX t.o.v. v1 (dry-run 2026-07-04 18:56 onthulde):
//  - xp_transactions is een SUBcollectie onder users/{uid} (zie firestore.rules),
//    geen top-level collectie → per-user query i.p.v. db.collection('xp_transactions')
//  - welzijn-telling: ook dagelijkse_data via collectionGroup tellen, want
//    subdocumenten kunnen bestaan onder niet-bestaande hoofddocs (fantoom-ouders)
// Gebruik:  node scripts/opkuis-welzijn.cjs            → DRY-RUN
//           node scripts/opkuis-welzijn.cjs --execute  → effectieve verwijdering
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const EXECUTE = process.argv.includes('--execute');
const WELZIJN_XP_REASONS = [
  'welzijn_segment_xp', 'kompas_completion_bonus',
  'perfect_week_bonus', 'class_challenge_completion'
];

async function deleteCollectionDocs(query, label) {
  let total = 0;
  while (true) {
    const snap = await query.limit(300).get();
    if (snap.empty) break;
    total += snap.size;
    if (EXECUTE) {
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } else {
      break;
    }
  }
  console.log(`${EXECUTE ? 'WIS ' : 'DRY '} ${label}: ${total}${EXECUTE ? '' : '+'} docs`);
  return total;
}

async function main() {
  console.log(EXECUTE ? '=== EXECUTE-MODUS — er wordt definitief gewist ===' : '=== DRY-RUN — er wordt NIETS gewist ===');
  console.log('Datum:', new Date().toISOString());

  // A. welzijn: hoofddocs + ALLE dagelijkse_data (ook onder fantoom-ouders)
  const hoofd = await db.collection('welzijn').count().get();
  const dagelijks = await db.collectionGroup('dagelijkse_data').count().get();
  console.log(`${EXECUTE ? 'WIS ' : 'DRY '} welzijn: ${hoofd.data().count} hoofddocs, ${dagelijks.data().count} dagelijkse_data-docs (collectionGroup)`);
  if (EXECUTE) {
    await db.recursiveDelete(db.collection('welzijn'));
    const na = await db.collectionGroup('dagelijkse_data').count().get();
    console.log(`     na recursiveDelete resteren ${na.data().count} dagelijkse_data-docs (verwacht: 0)`);
  }

  // B. class_challenges
  await deleteCollectionDocs(db.collection('class_challenges'), 'class_challenges');

  // C. xp_transactions: SUBcollectie per user — per-user query, geen index nodig
  const users = await db.collection('users').get();
  let txTotal = 0;
  for (const u of users.docs) {
    const q = u.ref.collection('xp_transactions').where('reason', 'in', WELZIJN_XP_REASONS);
    while (true) {
      const snap = await q.limit(300).get();
      if (snap.empty) break;
      txTotal += snap.size;
      if (EXECUTE) {
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } else {
        break;
      }
    }
  }
  console.log(`${EXECUTE ? 'WIS ' : 'DRY '} xp_transactions (subcollecties, 4 welzijn-reasons): ${txTotal}${EXECUTE ? '' : '+'} docs over ${users.size} users`);

  // D. wees-velden op users (rol-filter weggelaten: ook oud-leerlingen meenemen)
  let fieldCount = 0;
  for (const u of users.docs) {
    const d = u.data();
    const updates = {};
    if (d.weekly_stats && 'kompas_days' in d.weekly_stats)
      updates['weekly_stats.kompas_days'] = admin.firestore.FieldValue.delete();
    if ('welzijn_gedeactiveerd' in d)
      updates['welzijn_gedeactiveerd'] = admin.firestore.FieldValue.delete();
    if ('welzijn_doelen' in d)
      updates['welzijn_doelen'] = admin.firestore.FieldValue.delete();
    if (Object.keys(updates).length) {
      fieldCount++;
      if (EXECUTE) await u.ref.update(updates);
    }
  }
  console.log(`${EXECUTE ? 'WIS ' : 'DRY '} users met wees-velden: ${fieldCount}`);

  // E. schoolinstelling welzijnModuleActief
  const scholen = await db.collection('scholen').get();
  for (const s of scholen.docs) {
    if (s.data()?.instellingen?.welzijnModuleActief !== undefined) {
      console.log(`${EXECUTE ? 'WIS ' : 'DRY '} scholen/${s.id}: welzijnModuleActief`);
      if (EXECUTE) await s.ref.update({
        'instellingen.welzijnModuleActief': admin.firestore.FieldValue.delete()
      });
    }
  }

  console.log('Klaar.');
}
main().catch(e => { console.error(e); process.exit(1); });
