// functions/src/engagement-functions.js
// Opvolger van functions/src/welzijn-functions.js (verwijderd bij ontmanteling
// welzijnsmodule, jul 2026). Bevat UITSLUITEND inzet-logica op basis van
// trainingen — geen gezondheidsdata, geen kompas, geen welzijn-XP.
//
// Ontwerpprincipe Gezondheid 2.0: "XP beloont weten, nooit zijn of doen"
// → trainingen loggen is een sport-/inzetactiviteit, geen gezondheidsgegeven.
const {onCall} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, checkStreakMilestonesInternal } = require('./utils');

// =============================================
// XP BEDRAGEN — centraal beheerd
// (PERFECT_WEEK_WELZIJN en WELZIJN_SEGMENT/KOMPAS_BONUS
//  zijn verwijderd — welzijnsmodule bestaat niet meer)
// =============================================
const XP = {
  PERFECT_WEEK_TRAINING: 300,  // 3× training in 1 week
  WEEKLY_TRAINING_BONUS: 150   // 3+ trainingen in de week
};

// =============================================
// SCHEDULED: Wekelijkse bonussen (elke maandag 06:00)
//
// Was: twee varianten op basis van welzijnModuleActief.
// Nu:  het vroegere "welzijn uit"-scenario is het enige scenario.
// LET OP (bewust behouden gedrag): bij 3 trainingen vallen
// perfect week (300) én training bonus (150) samen = 450 XP.
// Herijking kan later, los van deze ontmanteling.
// =============================================
exports.checkWeeklyBonuses = onSchedule('0 6 * * 1', async (event) => {
  try {
    const usersSnapshot = await db.collection('users').where('rol', '==', 'leerling').get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const weeklyStats = userData.weekly_stats || {};
      const trainingCount = weeklyStats.trainingen || 0;

      // Perfect week: 3× training
      if (trainingCount >= 3 && !weeklyStats.perfectWeek) {
        await awardWeeklyBonus(userDoc, XP.PERFECT_WEEK_TRAINING, 'perfect_week_bonus_training_only');
        await userDoc.ref.update({ 'weekly_stats.perfectWeek': true });
      }

      // Wekelijkse training bonus
      if (trainingCount >= 3 && !weeklyStats.trainingBonus) {
        await awardWeeklyBonus(userDoc, XP.WEEKLY_TRAINING_BONUS, 'weekly_training_bonus');
        await userDoc.ref.update({ 'weekly_stats.trainingBonus': true });
      }

      // Weekly stats resetten voor nieuwe week
      // (kompas_days bestaat niet meer — bewust weggelaten uit de reset)
      await userDoc.ref.update({
        weekly_stats: {
          trainingen: 0,
          perfectWeek: false,
          trainingBonus: false
        }
      });
    }
  } catch (error) {
    console.error('Error in weekly bonus check:', error);
  }
});

// =============================================
// HELPER: XP bonus uitkeren
// =============================================
async function awardWeeklyBonus(userDoc, bonusXP, reason) {
  try {
    await userDoc.ref.update({
      xp: FieldValue.increment(bonusXP),
      xp_current_period: FieldValue.increment(bonusXP),
      xp_current_school_year: FieldValue.increment(bonusXP)
    });
    await logXPTransaction({ user_id: userDoc.id, amount: bonusXP, reason });
  } catch (error) {
    console.error('Error in awardWeeklyBonus:', error);
  }
}

// =============================================
// SCHEDULED: Dagelijkse streak update (01:00 's nachts)
//
// Was: two-pillar (kompas OF training). Nu: ÉÉN pijler —
// last_activity_date wordt uitsluitend nog gezet door
// awardTrainingXP. De streak = opeenvolgende dagen met
// een gelogde/gevalideerde training.
// =============================================
exports.updateDailyStreaks = onSchedule('0 1 * * *', async (event) => {
  try {
    const usersSnapshot = await db.collection('users').where('rol', '==', 'leerling').get();

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      const wasActive = userData.last_activity_date === yesterdayString;

      if (wasActive) {
        const newStreak = (userData.streak_days || 0) + 1;
        await userDoc.ref.update({ streak_days: newStreak });
        await checkStreakMilestonesInternal(userId);
      } else {
        if ((userData.streak_days || 0) > 0) {
          await userDoc.ref.update({ streak_days: 0 });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating daily streaks:', error);
    throw error;
  }
});

// =============================================
// CALLABLE: Streak milestones manueel controleren
// (Wordt normaal intern afgehandeld via updateDailyStreaks)
// =============================================
exports.checkStreakMilestones = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');
  const { userId } = request.data;
  try {
    await checkStreakMilestonesInternal(userId || request.auth.uid);
    return { success: true };
  } catch (error) {
    console.error('Error checking streak milestones:', error);
    throw new Error('Failed to check streak milestones: ' + error.message);
  }
});