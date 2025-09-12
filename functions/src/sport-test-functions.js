const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, updateClassChallengeProgressInternal, getPositionInArray, calculateAge } = require('./utils');

exports.awardTestParticipationXP = onCall({
  
  cors: [
    'https://sportscores-app.firebaseapp.com',
    'https://sportscores-app.web.app', 
    'https://www.sportscores.be',
    'http://localhost:3000',
    'http://localhost:5173'
  ]
}, async (request) => {

  
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { userId, testId, newScore } = request.data;
  
  console.log('=== AWARD TEST XP FUNCTION START ===');
  console.log('User ID:', userId);
  console.log('Test ID:', testId);
  console.log('New Score:', newScore);
  
  if (!userId || !testId) {
    throw new Error('userId and testId required');
  }
  
  try {
    // Haal user en test data op
   const [userDoc, testDoc] = await Promise.all([
    db.collection('users').doc(userId).get(),
    db.collection('testen').doc(testId).get()
  ]);
    
   if (!userDoc.exists) {
    console.log('User not found, checking toegestane_gebruikers...');
    const toegestaneUserDoc = await db.collection('toegestane_gebruikers').doc(userId).get(); // ✅ Fix
    if (!toegestaneUserDoc.exists) {
      throw new Error('User not found in users or toegestane_gebruikers');
    }
  }
    
    if (!testDoc.exists) {
      throw new Error('Test not found');
    }
    
    const userData = userDoc.exists ? userDoc.data() : {};
    const testData = testDoc.data();
    
    console.log('User data found:', !!userData);
    console.log('Test data found:', !!testData);
    console.log('Test score_richting:', testData.score_richting);
    
    let totalXP = 50; // Base XP voor test deelname
    const reasons = ['test_participation'];
    let prInfo = null;
    
    // Check voor Personal Record alleen als er een score is
    if (newScore !== null && newScore !== undefined) {
      console.log('Checking Personal Record...');
      prInfo = await checkPersonalRecord(userId, testId, newScore, testData);
      console.log('PR Result:', prInfo);
      
      if (prInfo.isPersonalRecord) {
        totalXP += 100; // Extra 100 XP voor PR
        reasons.push('personal_record');
        
        console.log(`Personal Record! User ${userId}: ${newScore} (previous: ${prInfo.previousBest}, improvement: ${prInfo.improvement})`);
      }
    }
    
    const currentXP = userData.xp || 0;
    const newXP = currentXP + totalXP;
    const newSparks = Math.floor(newXP / 100);
    
    // Update user stats - probeer eerst users, dan toegestane_gebruikers
    const updateData = {
      xp: newXP,
      sparks: newSparks,
      last_activity: FieldValue.serverTimestamp()
    };
    
    if (prInfo?.isPersonalRecord) {
      updateData.personal_records_count = (userData.personal_records_count || 0) + 1;
      updateData.last_personal_record = FieldValue.serverTimestamp();
    }
    
    try {
      if (userDoc.exists) {
        await userDoc.ref.update(updateData);
      } else {
        const toegestaneUserRef = db.collection('toegestane_gebruikers').doc(userId);
    await toegestaneUserRef.update(updateData);
      }
      console.log('User stats updated successfully');
    } catch (updateError) {
      console.error('Error updating user stats:', updateError);
      throw new Error('Failed to update user stats');
    }
    
    // Log transacties
    for (const reason of reasons) {
      const xpAmount = reason === 'test_participation' ? 50 : 100;
      await logXPTransaction( {
        user_id: userId,
        user_email: userData.email || userId,
        amount: xpAmount,
        reason: reason,
        source_id: testId,
        metadata: prInfo?.isPersonalRecord ? {
          previous_best: prInfo.previousBest,
          new_score: newScore,
          improvement: prInfo.improvement,
          test_name: testData.naam
        } : null
      });
    }
    
    // NIEUW: Check leaderboard positions and award Sparks
    if (newScore !== null && newScore !== undefined) {
      await checkLeaderboardPositionsInternal( userId, testId, newScore, userData.school_id);
    }
    
    // NIEUW: Update class challenge progress
    await updateClassChallengeProgressInternal( userId, totalXP, 'xp');
    
    console.log('=== AWARD TEST XP FUNCTION SUCCESS ===');
    console.log('Total XP awarded:', totalXP);
    console.log('Personal Record:', prInfo?.isPersonalRecord || false);
    
    return {
      success: true,
      message: `Awarded ${totalXP} XP for test${prInfo?.isPersonalRecord ? ' + PR' : ''}`,
      newTotals: { xp: newXP, sparks: newSparks },
      personalRecord: prInfo?.isPersonalRecord || false,
      improvement: prInfo?.improvement
    };
    
  } catch (error) {
    console.error('Error awarding test XP:', error);
    throw new Error('Failed to award test XP: ' + error.message);
  }
});

// Helper functies voor test XP functie
async function checkLeaderboardPositionsInternal(userId, testId, newScore, schoolId) { 

  
  if (!schoolId) return;

  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const testDoc = await db.collection('testen').doc(testId).get();
    
    if (!userDoc.exists || !testDoc.exists) return;
    
    const userData = userDoc.data();
    const testData = testDoc.data();
    
    // Check school records (simplified version)
    const schoolScoresQuery = await db.collection('scores')
      .where('test_id', '==', testId)
      .where('school_id', '==', schoolId)
      .where('score', '!=', null)
      .get();
    
    const schoolScores = [];
    schoolScoresQuery.docs.forEach(doc => {
      schoolScores.push(doc.data().score);
    });
    
    // Sort based on score direction
    schoolScores.sort((a, b) => {
      return testData.score_richting === 'hoog' ? b - a : a - b;
    });
    
    // Find position
    let schoolPosition = getPositionInArray(newScore, schoolScores, testData.score_richting);
    
    // Award school record Sparks
    if (schoolPosition >= 1 && schoolPosition <= 5) {
      let sparksAwarded = 0;
      if (schoolPosition === 1) sparksAwarded = 15;
      else if (schoolPosition === 2) sparksAwarded = 10;
      else sparksAwarded = 5; // 3rd-5th place
      
      const currentSparks = userData.sparks || 0;
      await userDoc.ref.update({ 
        sparks: currentSparks + sparksAwarded,
        last_school_record: FieldValue.serverTimestamp()
      });
      
      // Log achievement
      await db.collection('users').doc(userId).collection('achievements').add({
        type: 'school_record',
        test_id: testId,
        test_name: testData.naam,
        position: schoolPosition,
        sparks_awarded: sparksAwarded,
        score: newScore,
        achieved_at: FieldValue.serverTimestamp()
      });
      
      console.log(`Awarded ${sparksAwarded} Sparks for school position ${schoolPosition} to ${userData.naam}`);
    }
  } catch (error) {
    console.error('Error checking leaderboard positions:', error);
  }
}


// Trigger automatisch bij score updates (nieuwe Cloud Function)
exports.onScoreUpdated = onDocumentUpdated('scores/{scoreId}', async (event) => {
 
  console.log('TRIGGER START');
  
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  
  if (beforeData?.score === afterData?.score || !afterData?.score) {
    console.log('No score change');
    return;
  }
  
  try {
    const adminDb = admin.firestore();
    const userEmail = afterData.leerling_id; // Dit is eigenlijk een email
    
    console.log('Target user email:', userEmail);
    
    // Zoek in users collectie op email field
    console.log('Searching users by email...');
    const usersQuery = await adminDb.collection('users')
      .where('email', '==', userEmail)
      .get();
    
    let targetRef = null;
    let userData = null;
    let collectionUsed = '';
    
    if (!usersQuery.empty) {
      const userDoc = usersQuery.docs[0];
      targetRef = userDoc.ref;
      userData = userDoc.data();
      collectionUsed = 'users';
      console.log('Found in users collection by email');
      console.log('Current users XP:', userData.xp || 0);
    } else {
      console.log('Not found in users, trying toegestane_gebruikers...');
      // Fallback naar toegestane_gebruikers (met email als document ID)
      const toegestaneRef = adminDb.collection('toegestane_gebruikers').doc(userEmail);
      const toegestaneSnap = await toegestaneRef.get();
      
      if (toegestaneSnap.exists) {
        targetRef = toegestaneRef;
        userData = toegestaneSnap.data();
        collectionUsed = 'toegestane_gebruikers';
        console.log('Found in toegestane_gebruikers');
        console.log('Current toegestane XP:', userData.xp || 0);
      }
    }
    
    if (!targetRef || !userData) {
      console.log('User not found in either collection!');
      return;
    }
    
    // Rest van de update logica blijft hetzelfde
    const currentXP = userData.xp || 0;
    const newXP = currentXP + 150;
    
    console.log(`Collection: ${collectionUsed}`);
    console.log(`Attempting update: ${currentXP} -> ${newXP}`);
    
    await targetRef.update({
      xp: newXP,
      sparks: Math.floor(newXP / 100),
      last_update_test: new Date().toISOString(),
      last_collection_used: collectionUsed
    });
    
    console.log(`UPDATE SUCCESS in ${collectionUsed}`);
    
  } catch (error) {
    console.error('FUNCTION ERROR:', error);
  }
});

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

// Maak een interne versie van de XP functie die geen HTTP/auth nodig heeft:
async function awardTestParticipationXPInternal(userId, testId, newScore) {
  
  
  console.log('=== INTERNAL XP AWARD START ===');
  
  try {
    // Use admin SDK document references
    let userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      userDoc = await db.collection('toegestane_gebruikers').doc(userId).get();
    }
    
    const testDoc = await db.collection('testen').doc(testId).get();
    
    if (!userDoc.exists || !testDoc.exists) {
      throw new Error(`User or test not found. User exists: ${userDoc.exists}, Test exists: ${testDoc.exists}`);
    }
    
    const userData = userDoc.data();
    const testData = testDoc.data();
    
    // Check Personal Record
    const prInfo = await checkPersonalRecord(userId, testId, newScore, testData);
    
    let totalXP = 50; // Base XP
    if (prInfo.isPersonalRecord) {
      totalXP += 100; // PR bonus
    }
    
    // Update user XP
    const currentXP = userData.xp || 0;
    const newXP = currentXP + totalXP;
    const newSparks = Math.floor(newXP / 100);
    
    const updateData = {
      xp: newXP,
      sparks: newSparks,
      last_activity: FieldValue.serverTimestamp()
    };
    
    if (prInfo.isPersonalRecord) {
      updateData.personal_records_count = (userData.personal_records_count || 0) + 1;
    }
    
    await userDoc.ref.update(updateData);
    
    console.log(`Successfully awarded ${totalXP} XP to user ${userId}`);
    console.log(`Personal Record: ${prInfo.isPersonalRecord}`);
    
    return { success: true, totalXP, personalRecord: prInfo.isPersonalRecord };
    
  } catch (error) {
    console.error('Internal XP award error:', error);
    throw error;
  }
}
exports.checkLeaderboardPositions = onCall(async (request) => {

  
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { userId, testId, newScore, schoolId } = request.data;
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const testDoc = await db.collection('testen').doc(testId).get();
    
    if (!userDoc.exists || !testDoc.exists) {
      throw new Error('User or test not found');
    }
    
    const userData = userDoc.data();
    const testData = testDoc.data();
    const userAge = calculateAge(userData.geboortedatum);
    
    // Check school records
    const schoolRecords = await checkSchoolRecords(db, testId, schoolId, newScore, testData);
    // Check age records  
    const ageRecords = await checkAgeRecords(db, testId, userAge, newScore, testData);
    
    let totalSparks = 0;
    let achievements = [];
    
    // Award school record Sparks
    if (schoolRecords.position >= 1 && schoolRecords.position <= 5) {
      let sparksAwarded = 0;
      if (schoolRecords.position === 1) sparksAwarded = 15;
      else if (schoolRecords.position === 2) sparksAwarded = 10;
      else sparksAwarded = 5; // 3rd-5th place
      
      totalSparks += sparksAwarded;
      achievements.push({
        type: 'school_record',
        position: schoolRecords.position,
        sparks: sparksAwarded,
        description: `Schoolrecord ${schoolRecords.position}e plaats`
      });
    }
    
    // Award age record Sparks
    if (ageRecords.position >= 1 && ageRecords.position <= 5) {
      let sparksAwarded = 0;
      if (ageRecords.position <= 2) sparksAwarded = 5;
      else sparksAwarded = 3; // 3rd-5th place
      
      totalSparks += sparksAwarded;
      achievements.push({
        type: 'age_record', 
        position: ageRecords.position,
        sparks: sparksAwarded,
        description: `Leeftijdsrecord ${ageRecords.position}e plaats (${userAge} jaar)`
      });
    }
    
    // Award Sparks if any achievements
    if (totalSparks > 0) {
      const currentSparks = userData.sparks || 0;
      const newSparks = currentSparks + totalSparks;
      
      await userDoc.ref.update({
        sparks: newSparks,
        last_achievement: FieldValue.serverTimestamp()
      });
      
      // Log achievements
      for (const achievement of achievements) {
        await logLeaderboardAchievement( {
          user_id: userId,
          user_email: userData.email,
          test_id: testId,
          test_name: testData.naam,
          score: newScore,
          ...achievement
        });
      }
      
      console.log(`Awarded ${totalSparks} Sparks to ${userData.naam} for leaderboard positions`);
    }
    
    return {
      success: true,
      achievements: achievements,
      totalSparks: totalSparks,
      schoolPosition: schoolRecords.position,
      agePosition: ageRecords.position
    };
    
  } catch (error) {
    console.error('Error checking leaderboard positions:', error);
    throw error;
  }
});

async function checkSchoolRecords(db, testId, schoolId, newScore, testData) {
 
  const scoreRichting = testData.score_richting || 'hoog';
  
  // Query all scores for this test in this school
  const schoolScoresQuery = await db.collection('scores')
    .where('test_id', '==', testId)
    .where('school_id', '==', schoolId)
    .where('score', '!=', null)
    .get();
  
  const allScores = [];
  schoolScoresQuery.docs.forEach(doc => {
    const scoreData = doc.data();
    allScores.push({
      score: scoreData.score,
      userId: scoreData.leerling_id,
      datum: scoreData.datum
    });
  });
  
  // Sort scores based on test direction
  allScores.sort((a, b) => {
    return scoreRichting === 'hoog' ? b.score - a.score : a.score - b.score;
  });
  
  // Find position of new score
  let position = 1;
  for (const record of allScores) {
    if (scoreRichting === 'hoog' ? newScore > record.score : newScore < record.score) {
      break;
    }
    if (record.score !== newScore) {
      position++;
    }
  }
  
  return { position, totalScores: allScores.length + 1 };
}

async function checkAgeRecords(db, testId, userAge, newScore, testData) {
 
  const scoreRichting = testData.score_richting || 'hoog';
  
  // Query all users of the same age with scores for this test
  const usersOfAgeQuery = await db.collection('users')
    .where('rol', '==', 'leerling')
    .get();
  
  const sameAgeUserIds = [];
  usersOfAgeQuery.docs.forEach(doc => {
    const userData = doc.data();
    if (calculateAge(userData.geboortedatum) === userAge) {
      sameAgeUserIds.push(doc.id);
    }
  });
  
  if (sameAgeUserIds.length === 0) return { position: 1, totalScores: 1 };
  
  // Get scores for users of same age
  const ageScoresQuery = await db.collection('scores')
    .where('test_id', '==', testId)
    .where('leerling_id', 'in', sameAgeUserIds.slice(0, 10)) // Firestore 'in' limit
    .where('score', '!=', null)
    .get();
  
  const ageScores = [];
  ageScoresQuery.docs.forEach(doc => {
    const scoreData = doc.data();
    ageScores.push({
      score: scoreData.score,
      userId: scoreData.leerling_id
    });
  });
  
  // Sort and find position
  ageScores.sort((a, b) => {
    return scoreRichting === 'hoog' ? b.score - a.score : a.score - b.score;
  });
  
  let position = 1;
  for (const record of ageScores) {
    if (scoreRichting === 'hoog' ? newScore > record.score : newScore < record.score) {
      break;
    }
    if (record.score !== newScore) {
      position++;
    }
  }
  
  return { position, totalScores: ageScores.length + 1 };
}
async function logLeaderboardAchievement(achievementData) {
 
  try {
    await db.collection('users').doc(achievementData.user_id).collection('achievements').add({
      type: achievementData.type,
      test_id: achievementData.test_id,
      test_name: achievementData.test_name,
      position: achievementData.position,
      sparks_awarded: achievementData.sparks,
      score: achievementData.score,
      description: achievementData.description,
      achieved_at: FieldValue.serverTimestamp()
    });
    
    console.log(`Achievement logged: ${achievementData.description} for user ${achievementData.user_id}`);
  } catch (error) {
    console.error('Error logging leaderboard achievement:', error);
  }
}
