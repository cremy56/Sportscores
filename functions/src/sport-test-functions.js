const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, updateClassChallengeProgressInternal, getPositionInArray } = require('./utils');

// ─── Leeftijd uit de klas ─────────────────────────────────────────────────────
// FIX: checkLeaderboardPositions gebruikte calculateAge(userData.geboortedatum),
// maar de users-collectie bevat GEEN geboortedatum (auth.js schrijft die niet;
// GDPR-keuze: zo min mogelijk persoonsgegevens in users). De leeftijd werd dus
// altijd 0 en het leeftijdsrecord sloeg nergens op. Overal elders in het project
// wordt de leeftijd uit de klas afgeleid (src/utils/klasUtils.js) — dat doen we
// hier ook, zodat beide kanten dezelfde definitie hanteren.
function leeftijdUitKlas(klas) {
  if (!klas) return null;
  const m = String(klas).match(/^(\d+)/);
  if (!m) return null;
  const leerjaar = parseInt(m[1], 10);
  return (leerjaar >= 1 && leerjaar <= 6) ? 11 + leerjaar : null;
}

// ─── Positie binnen een ranglijst ─────────────────────────────────────────────
// FIX: getPosition() werd aangeroepen maar bestond nergens — niet in dit
// bestand en niet in utils.js (dat exporteert getPositionInArray, met een
// andere signatuur). Elke aanroep gooide een ReferenceError.
//
// soort 'school' → positie tussen alle scores van deze test in de school
// soort 'age'    → idem, maar enkel tussen leeftijdsgenoten (via klas)
async function getPosition(soort, { testId, schoolId, newScore, scoreRichting, leeftijd }) {
  const snap = await db.collection('scores')
    .where('test_id', '==', testId)
    .where('school_id', '==', schoolId)
    .get();

  let rijen = snap.docs
    .map(d => d.data())
    .filter(r => typeof r.score === 'number');

  if (soort === 'age') {
    // Zonder bekende leeftijd is een leeftijdsrecord betekenisloos.
    if (!leeftijd) return Infinity;
    rijen = rijen.filter(r => leeftijdUitKlas(r.klas) === leeftijd);
  }

  const bestaande = rijen
    .map(r => r.score)
    .sort((a, b) => (scoreRichting === 'laag' ? a - b : b - a));

  return getPositionInArray(newScore, bestaande, scoreRichting === 'laag' ? 'laag' : 'hoog');
}


exports.awardTestScore = onCall({
  cors: [ 'https://sportscores-app.firebaseapp.com', 'https://sportscores-app.web.app', 'https://www.sportscores.be', 'http://localhost:5173' ]
}, async (request) => {
  if (!request.auth) throw new Error('Authentication required');
  const { userId, testId, newScore } = request.data;
  if (!userId || !testId) throw new Error('userId and testId are required');

  const userRef = db.collection('users').doc(userId);
  const [userDoc, testDoc] = await Promise.all([userRef.get(), db.collection('testen').doc(testId).get()]);
  if (!userDoc.exists || !testDoc.exists) throw new Error('User or test not found');

  const userData = userDoc.data();
  // FIX: users bevat GEEN smartschool_id_hash — auth.js schrijft daar
  // toegestane_gebruikers_id. studentHash was dus altijd undefined, waardoor
  // checkPersonalRecord op een lege scoregeschiedenis werkte en ELKE score
  // als persoonlijk record telde (+500 XP per keer).
  const studentHash = userData.toegestane_gebruikers_id;
  const batch = db.batch();

  // XP-transacties worden pas NA een geslaagde commit weggeschreven.
  // FIX: ze werden hiervóór gelogd, terwijl de bijbehorende increments in de
  // batch zaten die daarna pas commit. Crashte er iets tussenin (en dat gebeurde
  // altijd, zie checkLeaderboardPositions), dan stond er in het XP-logboek van
  // de leerling +50 of +500 XP die nooit op zijn saldo terechtkwam. Het logboek
  // is juist wat je bij een geschil raadpleegt, dus dat moet kloppen.
  const teLoggen = [];

  // 1. ATTITUDE BELONING: Deelname
  const participationXP = 50;
  batch.update(userRef, {
    xp: FieldValue.increment(participationXP),
    xp_current_period: FieldValue.increment(participationXP),
    xp_current_school_year: FieldValue.increment(participationXP),
    last_activity: FieldValue.serverTimestamp()
  });
  teLoggen.push({ user_id: userId, amount: participationXP, reason: 'test_participation', source_id: testId });

  // 2. PRESTATIE BELONING: Records
  if (newScore !== null && newScore !== undefined) {
    // A. Persoonlijk Record
    const prInfo = await checkPersonalRecord(studentHash, testId, newScore, testDoc.data());
    if (prInfo.isPersonalRecord) {
      const prXP = 500;
      batch.update(userRef, {
        xp: FieldValue.increment(prXP),
        xp_current_school_year: FieldValue.increment(prXP),
        personal_records_count: FieldValue.increment(1)
      });
      teLoggen.push({ user_id: userId, amount: prXP, reason: 'personal_record', source_id: testId });
    }

    // B. School- en Leeftijdsrecords
    // In een eigen try/catch: een fout in de ranglijstberekening mag de
    // deelname-XP niet meeslepen. Die is namelijk al verdiend.
    try {
      const leaderboardInfo = await checkLeaderboardPositions({
        testId, newScore, userData, testData: testDoc.data()
      });
      if (leaderboardInfo.totalRecordXP > 0) {
        batch.update(userRef, {
          xp: FieldValue.increment(leaderboardInfo.totalRecordXP),
          xp_current_school_year: FieldValue.increment(leaderboardInfo.totalRecordXP)
        });
        for (const achievement of leaderboardInfo.achievements) {
          teLoggen.push({ user_id: userId, amount: achievement.xp, reason: achievement.type, source_id: testId });
        }
      }
    } catch (error) {
      console.error('Ranglijstposities konden niet bepaald worden:', error);
    }
  }

  await batch.commit();

  // Pas nu loggen: de increments staan vast.
  for (const transactie of teLoggen) {
    await logXPTransaction(transactie);
  }

  await updateClassChallengeProgressInternal(userId, participationXP, 'xp');
  
  return { success: true, message: 'Test score verwerkt!' };
});

// Helper functies voor test XP functie
// FIX: werd aangeroepen met VIER argumenten terwijl de functie er DRIE nam
// (checkLeaderboardPositions(userId, testId, newScore, userData)). Alles
// schoof een plek op: testId kreeg de userId, userData kreeg een getal. Het
// opzoeken van de test vond niets en testData.score_richting gooide een
// TypeError. De signatuur is nu expliciet en de aanroep aangepast.
async function checkLeaderboardPositions({ testId, newScore, userData, testData }) {
  const schoolId = userData.school_id;
  const leeftijd = leeftijdUitKlas(userData.klas);

  const schoolPosition = await getPosition('school', { testId, schoolId, newScore, scoreRichting: testData.score_richting });
  const agePosition = await getPosition('age', { testId, schoolId, newScore, scoreRichting: testData.score_richting, leeftijd });

  let totalRecordXP = 0;
  const achievements = [];

  // --- START WIJZIGING: Beloningen uitgebreid naar Top 5 ---
  const recordTiers = { 
    1: 1000, 
    2: 750, 
    3: 500,
    4: 250, // Nieuwe beloning voor 4e plaats
    5: 100  // Nieuwe beloning voor 5e plaats
  };

  if (schoolPosition <= 5) { // Voorwaarde aangepast van 3 naar 5
    const xp = recordTiers[schoolPosition];
    totalRecordXP += xp;
    achievements.push({ type: 'school_record', position: schoolPosition, xp });
  }
  if (agePosition <= 5) { // Voorwaarde aangepast van 3 naar 5
    const xp = recordTiers[agePosition];
    totalRecordXP += xp;
    achievements.push({ type: 'age_record', position: agePosition, xp });
  }
  // --- EINDE WIJZIGING ---

  return { totalRecordXP, achievements };
}


// Voeg ook de checkPersonalRecord functie toe zoals eerder gedefinieerd
// HOUD ALLEEN DEZE VERSIE - verwijder de andere duplicaten
async function checkPersonalRecord(studentHash, testId, newScore, testData) {
  
  
  try {
   
    // Use admin SDK query methods
    const historicalScoresRef = db.collection('scores')
      .where('leerling_id', '==', studentHash)  // ✅ smartschool_id_hash
      .where('test_id', '==', testId)
      .where('score', '!=', null);
    
    const historicalScores = await historicalScoresRef.get();
    
    
    // Rest of function remains the same...
    if (historicalScores.empty) {
      
      return { isPersonalRecord: true, previousBest: null, improvement: null };
    }
    
    const previousScores = [];
    historicalScores.docs.forEach(doc => {
      const scoreData = doc.data();
      if (scoreData.score !== newScore) {
        previousScores.push(scoreData.score);
      }
    });
    
    
    
    if (previousScores.length === 0) {
      
      return { isPersonalRecord: true, previousBest: null, improvement: null };
    }
    
    const scoreRichting = testData.score_richting || 'hoog';
    
    
    let previousBest;
    if (scoreRichting === 'hoog') {
      previousBest = Math.max(...previousScores);
      const isPersonalRecord = newScore > previousBest;
      const improvement = isPersonalRecord ? newScore - previousBest : null;
      
      
      return { isPersonalRecord, previousBest, improvement };
    } else {
      previousBest = Math.min(...previousScores);
      const isPersonalRecord = newScore < previousBest;
      const improvement = isPersonalRecord ? previousBest - newScore : null;
      
      
      return { isPersonalRecord, previousBest, improvement };
    }
    
  } catch (error) {
    console.error('Error checking personal record:', error);
    return { isPersonalRecord: false, previousBest: null, improvement: null };
  }
}

