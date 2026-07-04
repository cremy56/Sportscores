// functions/src/class-challenge-functions.js
const {onCall} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { getWeekStart, getWeekEnd, getWeekNumber, logXPTransaction } = require('./utils');

// =============================================
// XP BEDRAGEN
// =============================================
const CHALLENGE_REWARD_XP = 500; // FIX: was 40

// =============================================
// HELPER: Schoolinstelling ophalen
// =============================================
async function getSchoolSettings(schoolId) {
  if (!schoolId) return {};
  const schoolDoc = await db.collection('scholen').doc(schoolId).get();
  return schoolDoc.exists ? (schoolDoc.data()?.instellingen || {}) : {};
}

// =============================================
// SCHEDULED: Wekelijkse class challenges aanmaken
//
// NIEUW: school welzijn check — als welzijn uit,
//        enkel training target (geen kompas component).
//        Training target wordt hoger als compensatie.
// =============================================
exports.createWeeklyClassChallenge = onSchedule('0 6 * * 1', async (event) => {
  try {
    const groupsSnapshot = await db.collection('groepen').get();

    for (const groupDoc of groupsSnapshot.docs) {
      const groupData = groupDoc.data();
      const groupId = groupDoc.id;

      const studentsCount = groupData.leerling_ids?.length || 0;
      if (studentsCount === 0) continue;

      const xpTarget = Math.max(2000, studentsCount * 150);
      const trainingTargetBase = Math.max(10, studentsCount * 2);

      const now = new Date();
      const weekStart = getWeekStart(now);
      const weekEnd = getWeekEnd(now);
      const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;

      // Schoolinstelling ophalen voor welzijn-afhankelijke targets
      const settings = await getSchoolSettings(groupData.school_id);
      const welzijnAan = settings.welzijnModuleActief !== false;

      const targets = welzijnAan
        ? {
            total_xp: xpTarget,
            total_trainings: trainingTargetBase
            // kompas_days wordt bijgehouden via weekly_stats maar niet als
            // apart target — XP-bijdrage van kompas telt automatisch mee in total_xp
          }
        : {
            total_xp: xpTarget,
            // Welzijn uit: training target ×1.5 als compensatie
            total_trainings: Math.ceil(trainingTargetBase * 1.5)
          };

      await db.collection('class_challenges').doc(`${groupId}_${weekId}`).set({
        group_id: groupId,
        group_name: groupData.naam,
        school_id: groupData.school_id,
        week_id: weekId,
        week_start: weekStart,
        week_end: weekEnd,
        targets,
        welzijn_actief: welzijnAan,
        current_progress: { total_xp: 0, total_trainings: 0, participants: [] },
        reward_xp: CHALLENGE_REWARD_XP,
        status: 'active',
        created_at: FieldValue.serverTimestamp()
      });
    }

    return { success: true };

  } catch (error) {
    console.error('Error creating weekly class challenges:', error);
    throw error;
  }
});

// =============================================
// CALLABLE: Update challenge voortgang
//
// FIX: userData.smartschool_id_hash bestaat niet in users.
//      Correct veld: userData.toegestane_gebruikers_id.
// =============================================
exports.updateClassChallengeProgress = onCall(async (request) => {
  try {
    const { userId, xpEarned, action } = request.data;

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'User not found' };

    const userData = userDoc.data();

    // FIX: toegestane_gebruikers_id (niet smartschool_id_hash)
    const leerlingHash = userData.toegestane_gebruikers_id;
    if (!leerlingHash) return { success: true };

    const groepenQuery = await db.collection('groepen')
      .where('school_id', '==', userData.school_id)
      .where('leerling_ids', 'array-contains', leerlingHash)
      .get();

    if (groepenQuery.empty) return { success: true };

    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;

    for (const groupDoc of groepenQuery.docs) {
      const groupId = groupDoc.id;
      const challengeId = `${groupId}_${weekId}`;
      const challengeRef = db.collection('class_challenges').doc(challengeId);
      const challengeDoc = await challengeRef.get();

      if (!challengeDoc.exists) continue;

      const currentProgress = challengeDoc.data().current_progress;
      const updates = {};

      if (action === 'xp' && xpEarned) {
        updates['current_progress.total_xp'] = (currentProgress.total_xp || 0) + xpEarned;
      }
      if (action === 'training') {
        updates['current_progress.total_trainings'] = (currentProgress.total_trainings || 0) + 1;
      }

      const participants = currentProgress.participants || [];
      if (!participants.includes(userId)) {
        updates['current_progress.participants'] = [...participants, userId];
      }

      if (Object.keys(updates).length > 0) {
        await challengeRef.update(updates);
        await checkChallengeCompletion(challengeId);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Error updating class challenge progress:', error);
    throw error;
  }
});

// =============================================
// HELPER: Check of challenge voltooid is
// =============================================
async function checkChallengeCompletion(challengeId) {
  const challengeRef = db.collection('class_challenges').doc(challengeId);
  const challengeDoc = await challengeRef.get();
  if (!challengeDoc.exists) return;

  const challengeData = challengeDoc.data();
  const { current_progress: progress, targets } = challengeData;

  const xpComplete       = progress.total_xp >= targets.total_xp;
  const trainingComplete = progress.total_trainings >= targets.total_trainings;

  if (xpComplete && trainingComplete && challengeData.status === 'active') {
    await challengeRef.update({
      status: 'completed',
      completed_at: FieldValue.serverTimestamp()
    });

    const rewardXP = challengeData.reward_xp || CHALLENGE_REWARD_XP;
    for (const userId of progress.participants) {
      await awardClassChallengeReward(userId, rewardXP, challengeData);
    }
  }
}

// =============================================
// HELPER: XP toekennen aan challenge deelnemers
// =============================================
async function awardClassChallengeReward(userId, xpAmount, challengeData) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;

    await userRef.update({
      xp: FieldValue.increment(xpAmount),
      xp_current_period: FieldValue.increment(xpAmount),
      xp_current_school_year: FieldValue.increment(xpAmount)
    });

    await logXPTransaction({
      user_id: userId,
      amount: xpAmount,
      reason: 'class_challenge_completion',
      source_id: challengeData.week_id,
      metadata: {
        group_name: challengeData.group_name,
        week_id: challengeData.week_id
      }
    });

  } catch (error) {
    console.error('Error awarding class challenge reward:', error);
  }
}