const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, updateClassChallengeProgressInternal, calculateAge } = require('./utils');


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
  const batch = db.batch();

  // 1. ATTITUDE BELONING: Deelname
  const participationXP = 50;
  batch.update(userRef, {
    xp: FieldValue.increment(participationXP),
    xp_current_period: FieldValue.increment(participationXP),
    xp_current_school_year: FieldValue.increment(participationXP),
    last_activity: FieldValue.serverTimestamp()
  });
  await logXPTransaction({ user_id: userId, amount: participationXP, reason: 'test_participation', source_id: testId });

  // 2. PRESTATIE BELONING: Records
  if (newScore !== null && newScore !== undefined) {
    // A. Persoonlijk Record
    const prInfo = await checkPersonalRecord(userId, testId, newScore, testDoc.data());
    if (prInfo.isPersonalRecord) {
      const prXP = 500;
      // --- START CORRECTIE ---
      batch.update(userRef, {
        xp: FieldValue.increment(prXP),
        xp_current_school_year: FieldValue.increment(prXP),
        personal_records_count: FieldValue.increment(1) // Deze was je vergeten hier te updaten
      });
      // --- EINDE CORRECTIE ---
      await logXPTransaction({ user_id: userId, amount: prXP, reason: 'personal_record', source_id: testId });
    }

    // B. School- en Leeftijdsrecords
    const leaderboardInfo = await checkLeaderboardPositions(userId, testId, newScore, userData);
    if (leaderboardInfo.totalRecordXP > 0) {
      batch.update(userRef, {
        xp: FieldValue.increment(leaderboardInfo.totalRecordXP),
        xp_current_school_year: FieldValue.increment(leaderboardInfo.totalRecordXP)
      });
      for (const achievement of leaderboardInfo.achievements) {
        await logXPTransaction({ user_id: userId, amount: achievement.xp, reason: achievement.type, source_id: testId });
      }
    }
  }

  await batch.commit();
  await updateClassChallengeProgressInternal(userId, participationXP, 'xp');
  
  return { success: true, message: 'Test score verwerkt!' };
});

// Helper functies voor test XP functie
async function checkLeaderboardPositions(userId, testId, newScore, userData) {
  const testData = (await db.collection('testen').doc(testId).get()).data();
  const schoolId = userData.school_id;
  const userAge = calculateAge(userData.geboortedatum);
  
  const schoolPosition = await getPosition(db, 'school', { testId, schoolId, newScore, scoreRichting: testData.score_richting });
  const agePosition = await getPosition(db, 'age', { testId, userAge, newScore, scoreRichting: testData.score_richting, schoolId });

  let totalRecordXP = 0;
  const achievements = [];

  const recordTiers = { 1: 1000, 2: 750, 3: 500 };

  if (schoolPosition <= 3) {
    const xp = recordTiers[schoolPosition];
    totalRecordXP += xp;
    achievements.push({ type: 'school_record', position: schoolPosition, xp });
  }
  if (agePosition <= 3) {
    const xp = recordTiers[agePosition];
    totalRecordXP += xp;
    achievements.push({ type: 'age_record', position: agePosition, xp });
  }

  return { totalRecordXP, achievements };
}


// Voeg ook de checkPersonalRecord functie toe zoals eerder gedefinieerd
// HOUD ALLEEN DEZE VERSIE - verwijder de andere duplicaten
async function checkPersonalRecord(userId, testId, newScore, testData) {
  
  
  try {
    console.log('=== CHECK PERSONAL RECORD ===');
    console.log('User ID:', userId);
    console.log('Test ID:', testId);
    console.log('New Score:', newScore);
    
    // Use admin SDK query methods
    const historicalScoresRef = db.collection('scores')
      .where('leerling_id', '==', userId)
      .where('test_id', '==', testId)
      .where('score', '!=', null);
    
    const historicalScores = await historicalScoresRef.get();
    console.log('Historical scores found:', historicalScores.size);
    
    // Rest of function remains the same...
    if (historicalScores.empty) {
      console.log(`First score for user ${userId} on test ${testId} - automatic PR`);
      return { isPersonalRecord: true, previousBest: null, improvement: null };
    }
    
    const previousScores = [];
    historicalScores.docs.forEach(doc => {
      const scoreData = doc.data();
      if (scoreData.score !== newScore) {
        previousScores.push(scoreData.score);
      }
    });
    
    console.log('Previous scores:', previousScores);
    
    if (previousScores.length === 0) {
      console.log('No previous different scores found - this is a PR');
      return { isPersonalRecord: true, previousBest: null, improvement: null };
    }
    
    const scoreRichting = testData.score_richting || 'hoog';
    console.log('Score richting:', scoreRichting);
    
    let previousBest;
    if (scoreRichting === 'hoog') {
      previousBest = Math.max(...previousScores);
      const isPersonalRecord = newScore > previousBest;
      const improvement = isPersonalRecord ? newScore - previousBest : null;
      
      console.log(`Higher is better: new=${newScore}, previous best=${previousBest}, is PR=${isPersonalRecord}`);
      return { isPersonalRecord, previousBest, improvement };
    } else {
      previousBest = Math.min(...previousScores);
      const isPersonalRecord = newScore < previousBest;
      const improvement = isPersonalRecord ? previousBest - newScore : null;
      
      console.log(`Lower is better: new=${newScore}, previous best=${previousBest}, is PR=${isPersonalRecord}`);
      return { isPersonalRecord, previousBest, improvement };
    }
    
  } catch (error) {
    console.error('Error checking personal record:', error);
    return { isPersonalRecord: false, previousBest: null, improvement: null };
  }
}

