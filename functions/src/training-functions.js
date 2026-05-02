// functions/src/training-functions.js
const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, updateClassChallengeProgressInternal, getTodayString } = require('./utils');

// =============================================
// XP BEDRAGEN
// =============================================
const PROGRAM_COMPLETION_XP = 800;

// =============================================
// HELPER: Leerling opzoeken via smartschool_id_hash
//
// FIX: leerling_id in leerling_schemas = smartschool_id_hash
//      = toegestane_gebruikers_id in users.
//      Zoek via users.toegestane_gebruikers_id (correct veld).
//      Niet via smartschool_id_hash (bestaat niet in users).
// =============================================
async function getUserByHash(leerlingHash) {
  const userQuery = await db.collection('users')
    .where('toegestane_gebruikers_id', '==', leerlingHash)
    .limit(1)
    .get();

  if (userQuery.empty) {
    console.warn(`Geen gebruiker gevonden voor hash: ${leerlingHash}`);
    return null;
  }

  return userQuery.docs[0];
}

// =============================================
// TRIGGER: Training week gevalideerd
// =============================================
exports.onTrainingWeekValidated = onDocumentUpdated('leerling_schemas/{schemaId}', async (event) => {
  const schemaId = event.params.schemaId;
  const afterData = event.data.after.data();
  const beforeData = event.data.before.data();

  try {
    const beforeValidated = beforeData.gevalideerde_weken || {};
    const afterValidated = afterData.gevalideerde_weken || {};
    const newlyValidatedWeeks = [];

    for (const [weekKey, weekData] of Object.entries(afterValidated)) {
      if (weekData.gevalideerd && !beforeValidated[weekKey]?.gevalideerd) {
        newlyValidatedWeeks.push({
          weekKey,
          trainingsXP: weekData.trainingsXP || 0
        });
      }
    }

    if (newlyValidatedWeeks.length > 0) {
      await awardTrainingXP(afterData.leerling_id, newlyValidatedWeeks, schemaId);
    }

  } catch (error) {
    console.error('Error processing schema update:', error);
  }
});

// =============================================
// HELPER: Training XP toekennen
//
// FIX: Lookup via toegestane_gebruikers_id (niet smartschool_id_hash).
// NIEUW: weekly_stats.trainingen verhogen voor perfect week check.
// NIEUW: last_activity_date zetten voor two-pillar streak.
// NIEUW: class challenge training action triggeren.
// =============================================
async function awardTrainingXP(leerlingHash, validatedWeeks, schemaId) {
  try {
    const userDoc = await getUserByHash(leerlingHash);
    if (!userDoc) return;

    const userData = userDoc.data();
    if (userData.rol !== 'leerling') return;

    let totalXP = 0;
    validatedWeeks.forEach(week => {
      totalXP += week.trainingsXP || 0;
    });

    if (totalXP <= 0) return;

    const todayString = getTodayString();

    await userDoc.ref.update({
      xp: FieldValue.increment(totalXP),
      xp_current_period: FieldValue.increment(totalXP),
      xp_current_school_year: FieldValue.increment(totalXP),
      // two-pillar streak: elke gevalideerde training telt als activiteit
      last_activity_date: todayString,
      last_activity: FieldValue.serverTimestamp(),
      // weekly_stats bijhouden voor perfect week + weekly training bonus
      'weekly_stats.trainingen': FieldValue.increment(validatedWeeks.length)
    });

    await logXPTransaction({
      user_id: userDoc.id,
      amount: totalXP,
      reason: 'training_validation',
      source_id: schemaId
    });

    // Klas challenge: XP bijdrage + training teller
    await updateClassChallengeProgressInternal(userDoc.id, totalXP, 'xp');
    await updateClassChallengeProgressInternal(userDoc.id, 0, 'training');

  } catch (error) {
    console.error('Error awarding training XP:', error);
  }
}

// =============================================
// TRIGGER: Volledige trainingsprogramma check
// =============================================
exports.checkTrainingProgramCompletion = onDocumentUpdated('leerling_schemas/{schemaId}', async (event) => {
  const schemaId = event.params.schemaId;
  const afterData = event.data.after.data();

  try {
    const isFullyCompleted = checkIfProgramFullyCompleted(afterData);

    if (isFullyCompleted && !afterData.completion_reward_awarded) {
      await awardProgramCompletionReward(afterData.leerling_id, schemaId, afterData);
    }

  } catch (error) {
    console.error('Error checking training program completion:', error);
  }
});

// =============================================
// HELPER: 90% van weken gevalideerd?
// =============================================
function checkIfProgramFullyCompleted(schemaData) {
  const gevalideerdeWeken = schemaData.gevalideerde_weken || {};
  const totalWeken = schemaData.total_weken || 0;
  if (totalWeken === 0) return false;

  let validatedCount = 0;
  Object.values(gevalideerdeWeken).forEach(week => {
    if (week.gevalideerd === true) validatedCount++;
  });

  const completionThreshold = Math.ceil(totalWeken * 0.9);
  return validatedCount >= completionThreshold;
}

// =============================================
// HELPER: Programma completion beloning
//
// FIX: Lookup via toegestane_gebruikers_id.
// FIX: nickname gebruiken (naam bestaat niet in users).
// =============================================
async function awardProgramCompletionReward(leerlingHash, schemaId, schemaData) {
  try {
    const userDoc = await getUserByHash(leerlingHash);
    if (!userDoc) return;

    const userData = userDoc.data();

    await userDoc.ref.update({
      xp: FieldValue.increment(PROGRAM_COMPLETION_XP),
      xp_current_period: FieldValue.increment(PROGRAM_COMPLETION_XP),
      xp_current_school_year: FieldValue.increment(PROGRAM_COMPLETION_XP),
      completed_programs: FieldValue.increment(1)
    });

    await db.collection('leerling_schemas').doc(schemaId).update({
      completion_reward_awarded: true,
      completion_reward_xp: PROGRAM_COMPLETION_XP
    });

    await logXPTransaction({
      user_id: userDoc.id,
      amount: PROGRAM_COMPLETION_XP,
      reason: 'training_program_completion',
      source_id: schemaId
    });

    await logTrainingCompletion({
      user_id: userDoc.id,
      schema_id: schemaId,
      program_name: schemaData.naam,
      xp_awarded: PROGRAM_COMPLETION_XP
    });

    // FIX: nickname ipv naam (naam bestaat niet in users)
    const nickname = userData.nickname || 'Leerling';
    await createCompletionNotification(userDoc.id, nickname, PROGRAM_COMPLETION_XP);

  } catch (error) {
    console.error('Error awarding program completion reward:', error);
  }
}

// =============================================
// HELPER: Voltooiing loggen
// =============================================
async function logTrainingCompletion(completionData) {
  try {
    await db.collection('users').doc(completionData.user_id).collection('training_completions').add({
      schema_id: completionData.schema_id,
      program_name: completionData.program_name,
      xp_awarded: completionData.xp_awarded,
      completed_at: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging training completion:', error);
  }
}

// =============================================
// HELPER: Voltooiingsnotificatie aanmaken
//
// FIX: Gebruikt nickname (niet naam).
// =============================================
async function createCompletionNotification(userId, nickname, xpAwarded) {
  try {
    await db.collection('notifications').add({
      recipient_id: userId,
      type: 'training_completion',
      title: 'Trainingsprogramma Voltooid!',
      message: `Gefeliciteerd ${nickname}! Je hebt een volledig trainingsprogramma afgerond en ${xpAwarded} XP verdiend.`,
      xp_earned: xpAwarded,
      read: false,
      created_at: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating completion notification:', error);
  }
}

// =============================================
// EXPORT: Retroactieve beloningen (admin)
// =============================================
exports.checkRetroactiveTrainingRewards = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const adminDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!adminDoc.exists || !['administrator', 'super-administrator'].includes(adminDoc.data().rol)) {
    throw new Error('Admin access required');
  }

  try {
    const schemasSnapshot = await db.collection('leerling_schemas').get();
    let rewardsAwarded = 0;

    for (const schemaDoc of schemasSnapshot.docs) {
      const schemaData = schemaDoc.data();
      if (schemaData.completion_reward_awarded) continue;

      if (checkIfProgramFullyCompleted(schemaData)) {
        await awardProgramCompletionReward(
          schemaData.leerling_id,
          schemaDoc.id,
          schemaData
        );
        rewardsAwarded++;
      }
    }

    return {
      success: true,
      message: `Checked ${schemasSnapshot.docs.length} schemas, awarded ${rewardsAwarded} completion rewards`,
      rewardsAwarded
    };

  } catch (error) {
    console.error('Error checking retroactive training rewards:', error);
    throw error;
  }
});