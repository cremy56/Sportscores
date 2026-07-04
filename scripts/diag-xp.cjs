// scripts/diag-xp.cjs — leest alleen; toont welke reasons er werkelijk in
// users/{uid}/xp_transactions staan, zodat we valse negatieven uitsluiten.
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

(async () => {
  const users = await db.collection('users').get();
  const reasons = new Map();
  let total = 0;
  for (const u of users.docs) {
    const snap = await u.ref.collection('xp_transactions').get();
    total += snap.size;
    snap.docs.forEach(d => {
      const data = d.data();
      const r = data.reason ?? data.reden ?? '(geen reason-veld: ' + Object.keys(data).join(',') + ')';
      reasons.set(r, (reasons.get(r) || 0) + 1);
    });
  }
  console.log(`Totaal xp_transactions over ${users.size} users: ${total}`);
  if (total === 0) {
    console.log('→ Subcollecties zijn leeg: er is nooit een welzijn-XP-transactie gelogd. Niets te wissen bij stap C.');
  } else {
    console.log('Verdeling per reason:');
    [...reasons.entries()].sort((a, b) => b[1] - a[1]).forEach(([r, n]) => console.log(`  ${n}× ${r}`));
  }
})().catch(e => { console.error(e); process.exit(1); });
