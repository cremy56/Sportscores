const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();

// =============================================
// XP TRANSACTIE LOGGER
// =============================================
async function logXPTransaction(transactionData) {
  try {
    const userId = transactionData.user_id;
    await db.collection('users').doc(userId).collection('xp_transactions').add({
      amount: transactionData.amount,
      reason: transactionData.reason,
      source_id: transactionData.source_id || null,
      balance_after: transactionData.balance_after || null,
      metadata: transactionData.metadata || null,
      created_at: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging XP transaction:', error);
  }
}

// =============================================
// WEEK HELPERS
// =============================================
function getWeekStart(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getWeekEnd(date) {
  const result = getWeekStart(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateAge(geboortedatum) {
  if (!geboortedatum) return 0;
  const birthDate = new Date(geboortedatum);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// =============================================
// KLAS CHALLENGE PROGRESS UPDATER
//
// FIX: userData.groepen bestaat niet in users.
//      Zoek groepen via toegestane_gebruikers_id
//      in de groepen collectie (leerling_ids array).
// =============================================
async function updateClassChallengeProgressInternal(userId, xpEarned, action) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();

    // FIX: leerling_ids in groepen = smartschool_id_hash = toegestane_gebruikers_id
    const leerlingHash = userData.toegestane_gebruikers_id;
    if (!leerlingHash) return;

    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;

    // Query groepen waar deze leerling in zit
    const groepenQuery = await db.collection('groepen')
      .where('school_id', '==', userData.school_id)
      .where('leerling_ids', 'array-contains', leerlingHash)
      .get();

    if (groepenQuery.empty) return;

    for (const groupDoc of groepenQuery.docs) {
      const groupId = groupDoc.id;
      const challengeRef = db.collection('class_challenges').doc(`${groupId}_${weekId}`);
      const challengeDoc = await challengeRef.get();

      if (!challengeDoc.exists) continue;

      const challengeData = challengeDoc.data();
      const currentProgress = challengeData.current_progress || {};
      const participants = currentProgress.participants || [];

      const updates = {};

      if (action === 'xp' && xpEarned) {
        updates['current_progress.total_xp'] = (currentProgress.total_xp || 0) + xpEarned;
      }

      if (action === 'training') {
        updates['current_progress.total_trainings'] = (currentProgress.total_trainings || 0) + 1;
      }

      if (!participants.includes(userId)) {
        updates['current_progress.participants'] = [...participants, userId];
      }

      if (Object.keys(updates).length > 0) {
        await challengeRef.update(updates);
      }
    }
  } catch (error) {
    console.error('Error updating class challenge:', error);
  }
}

// =============================================
// POSITIE HELPER (voor leaderboard)
// =============================================
function getPositionInArray(newScore, existingScores, scoreRichting) {
  let position = 1;
  for (const score of existingScores) {
    if (scoreRichting === 'hoog' ? newScore > score : newScore < score) {
      break;
    }
    if (score !== newScore) {
      position++;
    }
  }
  return position;
}

// =============================================
// STREAK MILESTONE CHECKER
//
// Milestones (sparks × 100 = XP):
//   7d  → 3 sparks × 100 = 300 XP
//   30d → 12 sparks × 100 = 1200 XP
//  100d → 40 sparks × 100 = 4000 XP
// =============================================
async function checkStreakMilestonesInternal(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const currentStreak = userData.streak_days || 0;
    const rewardedMilestones = userData.streak_milestones_rewarded || [];

    const milestones = [
      { days: 7,   sparks: 3,  description: '7 dagen streak' },
      { days: 30,  sparks: 12, description: '30 dagen streak' },
      { days: 100, sparks: 40, description: '100 dagen streak' }
    ];

    for (const milestone of milestones) {
      if (currentStreak >= milestone.days && !rewardedMilestones.includes(milestone.days)) {
        const xpAmount = milestone.sparks * 100;

        await userRef.update({
          xp: FieldValue.increment(xpAmount),
          xp_current_period: FieldValue.increment(xpAmount),
          xp_current_school_year: FieldValue.increment(xpAmount),
          streak_milestones_rewarded: FieldValue.arrayUnion(milestone.days)
        });

        await logXPTransaction({
          user_id: userId,
          amount: xpAmount,
          reason: 'streak_milestone',
          metadata: { streak_days: milestone.days }
        });

        await db.collection('users').doc(userId).collection('streak_rewards').add({
          streak_days: milestone.days,
          xp_awarded: xpAmount,
          description: milestone.description,
          awarded_at: FieldValue.serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error('Error checking internal streak milestones:', error);
  }
}

module.exports = {
  logXPTransaction,
  getWeekStart,
  getWeekEnd,
  getWeekNumber,
  getTodayString,
  calculateAge,
  updateClassChallengeProgressInternal,
  getPositionInArray,
  checkStreakMilestonesInternal
};