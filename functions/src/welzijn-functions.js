// functions/src/welzijn-functions.js
const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, checkStreakMilestonesInternal, getTodayString } = require('./utils');

// =============================================
// WELZIJN KOMPAS XP SYSTEM
// =============================================
// userId = Firebase UID (welzijn data is opgeslagen per Firebase UID)
// smartschool_id_hash wordt gebruikt voor groeps-queries

// =============================================
// TRIGGER: Welzijn data geüpdatet
// =============================================
exports.onWelzijnKompasUpdated = onDocumentUpdated('welzijn/{userId}/dagelijkse_data/{dateString}', async (event) => {
  const userId = event.params.userId;   // Firebase UID
  const dateString = event.params.dateString;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};

  const newlyCompletedSegments = [];
  if ((afterData.stappen || 0) > 0 && !((beforeData.stappen || 0) > 0)) newlyCompletedSegments.push('beweging');
  if ((afterData.water_intake || 0) > 0 && !((beforeData.water_intake || 0) > 0)) newlyCompletedSegments.push('voeding');
  if ((afterData.slaap_uren || 0) > 0 && !((beforeData.slaap_uren || 0) > 0)) newlyCompletedSegments.push('slaap');
  if (afterData.humeur && !beforeData.humeur) newlyCompletedSegments.push('mentaal');
  if ((afterData.hartslag_rust || 0) > 0 && !((beforeData.hartslag_rust || 0) > 0)) newlyCompletedSegments.push('hart');

  try {
    if (newlyCompletedSegments.length > 0) {
      await awardWelzijnXP(userId, newlyCompletedSegments, dateString);
    }
    await checkKompasCompletionBonus(userId, afterData, dateString);
  } catch (error) {
    console.error('ERROR in onWelzijnKompasUpdated:', error);
    // Niet gooien → voorkomt onnodige retries
  }
});

// =============================================
// FIXED: Zelfde trigger maar met betere logging
// (Consolideer later met onWelzijnKompasUpdated)
// =============================================
exports.onWelzijnKompasUpdatedFixed = onDocumentUpdated('welzijn/{userId}/dagelijkse_data/{dateString}', async (event) => {
  const userId = event.params.userId;
  const dateString = event.params.dateString;

  try {
    const beforeData = event.data.before.data() || {};
    const afterData = event.data.after.data() || {};

    const newlyCompletedSegments = [];
    if ((afterData.stappen || 0) > 0 && !((beforeData.stappen || 0) > 0)) newlyCompletedSegments.push('beweging');
    if ((afterData.water_intake || 0) > 0 && !((beforeData.water_intake || 0) > 0)) newlyCompletedSegments.push('voeding');
    if ((afterData.slaap_uren || 0) > 0 && !((beforeData.slaap_uren || 0) > 0)) newlyCompletedSegments.push('slaap');
    if (afterData.humeur && !beforeData.humeur) newlyCompletedSegments.push('mentaal');
    if ((afterData.hartslag_rust || 0) > 0 && !((beforeData.hartslag_rust || 0) > 0)) newlyCompletedSegments.push('hart');

    if (newlyCompletedSegments.length > 0) {
      await awardWelzijnXP(userId, newlyCompletedSegments, dateString);
    }
    await checkKompasCompletionBonus(userId, afterData, dateString);

  } catch (error) {
    console.error('ERROR in onWelzijnKompasUpdatedFixed:', error);
  }
});

// =============================================
// HELPER: XP toekennen voor welzijn segmenten
// 
// ✅ FIX: FieldValue.increment gebruikt (niet handmatige berekening)
// =============================================
async function awardWelzijnXP(userId, completedSegments, dateString) {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists || userDoc.data().rol !== 'leerling') return;

  const xpPerSegment = 4;
  const totalXP = completedSegments.length * xpPerSegment;

  // ✅ FIX: FieldValue.increment (thread-safe)
  await userRef.update({
    xp: FieldValue.increment(totalXP),
    xp_current_period: FieldValue.increment(totalXP),
    xp_current_school_year: FieldValue.increment(totalXP),
    last_activity: FieldValue.serverTimestamp()
  });

  
  await logXPTransaction({
    user_id: userId,
    amount: totalXP,
    reason: 'welzijn_segment_completion',
    source_id: `welzijn_${dateString}`,
    metadata: { completed_segments: completedSegments }
  });
}

// =============================================
// HELPER: Kompas volledig bonus
// ✅ FIX: bonusXP gebruikt (was xpAmount undefined)
// ✅ FIX: FieldValue.increment
// =============================================
async function checkKompasCompletionBonus(userId, dayData, dateString) {
  const isKompasComplete =
    (dayData.stappen || 0) > 0 &&
    (dayData.water_intake || 0) > 0 &&
    (dayData.slaap_uren || 0) > 0 &&
    dayData.humeur &&
    (dayData.hartslag_rust || 0) > 0;

  if (!isKompasComplete || dayData.completion_bonus_awarded) return;

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return;

  const bonusXP = 10; // ✅ FIX: was xpAmount (undefined)

  await userRef.update({
    xp: FieldValue.increment(bonusXP),
    xp_current_period: FieldValue.increment(bonusXP),
    xp_current_school_year: FieldValue.increment(bonusXP),
    'weekly_stats.kompas_days': FieldValue.increment(1)
  });

  await db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(dateString).update({
    completion_bonus_awarded: true,
    completion_bonus_xp: bonusXP
  });

  await updateWelzijnStreak(userId, dateString);
}

// =============================================
// HELPER: Welzijn streak updaten
// =============================================
async function updateWelzijnStreak(userId, dateString) {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      streak_days: FieldValue.increment(1),
      last_activity: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating welzijn streak:', error);
  }
}

// =============================================
// EXPORT: Manuele XP toekennen (admin/testing)
// =============================================
exports.manualAwardWelzijnXP = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const adminDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!adminDoc.exists || !['administrator', 'super-administrator'].includes(adminDoc.data().rol)) {
    throw new Error('Only administrators can manually award welzijn XP');
  }

  const { userId, segments, dateString } = request.data;
  if (!userId || !segments || !Array.isArray(segments)) {
    throw new Error('Valid userId and segments array required');
  }

  try {
    await awardWelzijnXP(userId, segments, dateString || getTodayString());
    return {
      success: true,
      message: `Awarded welzijn XP for segments: ${segments.join(', ')}`,
      segments
    };
  } catch (error) {
    console.error('Error in manual welzijn XP award:', error);
    throw new Error('Failed to award welzijn XP: ' + error.message);
  }
});

// =============================================
// EXPORT: Wekelijkse bonussen
// ✅ FIX: userRef en xpAmount undefined bugs opgelost
// =============================================
exports.checkWeeklyBonuses = onSchedule('0 6 * * 1', async (event) => {
  try {
    const usersSnapshot = await db.collection('users').where('rol', '==', 'leerling').get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const weeklyStats = userData.weekly_stats || {};
      const kompasDays = weeklyStats.kompas_days || 0;
      const trainingCount = weeklyStats.trainingen || 0;

      if (kompasDays >= 5 && trainingCount >= 2 && !weeklyStats.perfectWeek) {
        await awardWeeklyBonus(userDoc, 50, 'perfect_week_bonus');
      }
      if (trainingCount >= 3 && !weeklyStats.trainingBonus) {
        await awardWeeklyBonus(userDoc, 25, 'weekly_training_bonus');
      }

      // Reset weekly stats
      await userDoc.ref.update({
        weekly_stats: {
          kompas_days: 0,
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

// ✅ FIX: userRef en xpAmount waren undefined
// userData parameter verwijderd (niet nodig)
async function awardWeeklyBonus(userDoc, bonusXP, reason) {
  try {
    // ✅ FIX: userDoc.ref gebruiken (niet userRef die niet bestond)
    await userDoc.ref.update({
      xp: FieldValue.increment(bonusXP),           // ✅ bonusXP (was xpAmount)
      xp_current_period: FieldValue.increment(bonusXP),
      xp_current_school_year: FieldValue.increment(bonusXP)
    });

   
    await logXPTransaction({
      user_id: userDoc.id,
      amount: bonusXP,
      reason
    });

    console.log(`Awarded ${bonusXP} XP (${reason}) to ${userDoc.id}`);
  } catch (error) {
    console.error('Error in awardWeeklyBonus:', error);
  }
}

// =============================================
// EXPORT: Test functie (debugging)
// =============================================
exports.testWelzijnXP = onCall(async (request) => {
  const { userId } = request.data;

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return { error: 'User not found', userId };

  const userData = userDoc.data();
  await userDoc.ref.update({ xp: FieldValue.increment(10) });

  return {
    success: true,
    message: `Added 10 XP to ${userData.naam}`,
    newXP: (userData.xp || 0) + 10
  };
});

// =============================================
// EXPORT: Streak milestones controleren
// =============================================
exports.checkStreakMilestones = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const { userId } = request.data;

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new Error('User not found');

    const userData = userDoc.data();
    const currentStreak = userData.streak_days || 0;
    const rewardedMilestones = userData.streak_milestones_rewarded || [];

    const milestones = [
      { days: 7, xp: 300, description: '7 dagen alle kompas segmenten' },
      { days: 30, xp: 1200, description: '30 dagen streak' },
      { days: 100, xp: 4000, description: '100 dagen streak' }
    ];

    const newRewards = [];

    for (const milestone of milestones) {
      if (currentStreak >= milestone.days && !rewardedMilestones.includes(milestone.days)) {
        await userRef.update({
          xp: FieldValue.increment(milestone.xp),
          xp_current_period: FieldValue.increment(milestone.xp),
          xp_current_school_year: FieldValue.increment(milestone.xp),
          streak_milestones_rewarded: FieldValue.arrayUnion(milestone.days)
        });

        await logStreakReward({
          user_id: userId,
          streak_days: milestone.days,
          xp_awarded: milestone.xp,
          description: milestone.description
        });

        newRewards.push(milestone);
      }
    }

    return { success: true, newRewards, currentStreak };

  } catch (error) {
    console.error('Error checking streak milestones:', error);
    throw error;
  }
});

async function logStreakReward(rewardData) {
  try {
    await db.collection('users').doc(rewardData.user_id).collection('streak_rewards').add({
      streak_days: rewardData.streak_days,
      xp_awarded: rewardData.xp_awarded,
      description: rewardData.description,
      awarded_at: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging streak reward:', error);
  }
}

// =============================================
// EXPORT: Dagelijkse streak update (scheduled)
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

      const yesterdayData = await db.collection('welzijn')
        .doc(userId)
        .collection('dagelijkse_data')
        .doc(yesterdayString)
        .get();

      if (yesterdayData.exists && yesterdayData.data().completion_bonus_awarded) {
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
// EXPORT: Debug functie
// =============================================
exports.debugWelzijnData = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const userId = request.auth.uid;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const welzijnDoc = await db.collection('welzijn').doc(userId).get();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    const [todayData, yesterdayData] = await Promise.all([
      db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(today).get(),
      db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(yesterdayString).get()
    ]);

    return {
      success: true,
      userId,
      userExists: userDoc.exists,
      userRole: userDoc.exists ? userDoc.data().rol : null,
      welzijnExists: welzijnDoc.exists,
      todayDataExists: todayData.exists,
      yesterdayDataExists: yesterdayData.exists,
      todayData: todayData.exists ? todayData.data() : null
    };
  } catch (error) {
    throw new Error(`Debug failed: ${error.message}`);
  }
});

// =============================================
// EXPORT: Klasse welzijn statistieken

// ✅ FIX: leerling_ids gebruikt voor groep query
// =============================================
exports.getClassWelzijnStats = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const { classId, schoolId, studentId } = request.data;
  if (!schoolId) throw new Error('School ID is required');

  try {
    let leerlingFirebaseUids = [];

    if (studentId) {
      // ✅ FIX: studentId = smartschool_id_hash
      // Zoek Firebase UID via smartschool_id_hash in users collectie
      const userQuery = await db.collection('users')
        .where('smartschool_id_hash', '==', studentId)
        .limit(1)
        .get();

      if (!userQuery.empty) {
        leerlingFirebaseUids.push(userQuery.docs[0].id); // Firebase UID
      } else {
        // Leerling nog niet ingelogd → geen welzijn data beschikbaar
        return { success: true, groupStats: {}, studentData: [] };
      }

    } else if (classId && classId !== 'all') {
      // ✅ FIX: leerling_ids zijn smartschool_id_hash waarden
      const groupDoc = await db.collection('groepen').doc(classId).get();
      if (!groupDoc.exists) return { success: true, groupStats: {}, studentData: [] };

      const leerlingHashes = groupDoc.data().leerling_ids || [];
      if (leerlingHashes.length === 0) {
        return { success: true, groupStats: {}, studentData: [] };
      }

      // ✅ FIX: Converteer smartschool_id_hash → Firebase UIDs via users collectie
      const chunkSize = 30;
      for (let i = 0; i < leerlingHashes.length; i += chunkSize) {
        const chunk = leerlingHashes.slice(i, i + chunkSize);
        const usersSnap = await db.collection('users')
          .where('smartschool_id_hash', 'in', chunk)
          .get();
        usersSnap.docs.forEach(d => leerlingFirebaseUids.push(d.id));
      }

    } else {
      return { success: true, groupStats: {}, studentData: [] };
    }

    if (leerlingFirebaseUids.length === 0) {
      return { success: true, groupStats: {}, studentData: [] };
    }

    // Haal welzijn data op per leerling (Firebase UID)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0];

    const studentDataPromises = leerlingFirebaseUids.map(async (firebaseUid) => {
      const userDoc = await db.collection('users').doc(firebaseUid).get();
      if (!userDoc.exists) return null;

      const student = userDoc.data();

      const welzijnHistorySnapshot = await db.collection('welzijn')
        .doc(firebaseUid)
        .collection('dagelijkse_data')
        .where(admin.firestore.FieldPath.documentId(), '>=', thirtyDaysAgoString)
        .get();

      const history = welzijnHistorySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0];

      const logsLast7Days = history.filter(h => h.id >= sevenDaysAgoString).length;
      const logsLast30Days = history.length;

      const avgSleep = logsLast30Days > 0
        ? history.reduce((sum, h) => sum + (h.slaap_uren || 0), 0) / logsLast30Days
        : 0;
      const avgSteps = logsLast30Days > 0
        ? history.reduce((sum, h) => sum + (h.stappen || 0), 0) / logsLast30Days
        : 0;

      const scores = history.map(h => {
        const s = {
          beweging: Math.min(100, (h.stappen || 0) / 10000 * 100),
          voeding: Math.min(100, (h.water_intake || 0) / 2000 * 100),
          slaap: ((h.slaap_uren || 0) / 8.5 * 80) + ((h.slaap_kwaliteit || 3) - 1) * 5,
          mentaal: h.humeur
            ? ({ 'Zeer goed': 100, 'Goed': 80, 'Neutraal': 60, 'Minder goed': 40, 'Slecht': 20 }[h.humeur] || 0)
            : 0,
          hart: h.hartslag_rust
            ? (100 - (Math.abs((h.hartslag_rust || 75) - 75) / 25 * 100))
            : 0
        };
        return (s.beweging + s.voeding + s.slaap + s.mentaal + s.hart) / 5;
      });

      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

      return {
        id: firebaseUid,
        naam: student.naam || 'Leerling',  // Naam beschikbaar na login
        logs: { last7days: logsLast7Days, last30days: logsLast30Days },
        avgSleep: parseFloat(avgSleep.toFixed(1)),
        avgSteps: Math.round(avgSteps),
        avgScore: Math.round(avgScore)
      };
    });

    const studentDataRaw = await Promise.all(studentDataPromises);
    const studentData = studentDataRaw.filter(Boolean);

    if (studentData.length === 0) {
      return { success: true, groupStats: {}, studentData: [] };
    }

    const groupStats = {
      totalStudents: studentData.length,
      activeParticipation: Math.round(
        (studentData.filter(s => s.logs.last7days > 0).length / studentData.length) * 100
      ) || 0,
      avgLogs7Days: parseFloat(
        (studentData.reduce((sum, s) => sum + s.logs.last7days, 0) / studentData.length).toFixed(1)
      ) || 0,
      avgLogs30Days: parseFloat(
        (studentData.reduce((sum, s) => sum + s.logs.last30days, 0) / studentData.length).toFixed(1)
      ) || 0,
      avgSleep: parseFloat(
        (studentData.reduce((sum, s) => sum + s.avgSleep, 0) / studentData.length).toFixed(1)
      ) || 0,
      avgSteps: Math.round(
        studentData.reduce((sum, s) => sum + s.avgSteps, 0) / studentData.length
      ) || 0,
      avgScore: Math.round(
        studentData.reduce((sum, s) => sum + s.avgScore, 0) / studentData.length
      ) || 0
    };

    return { success: true, groupStats, studentData };

  } catch (error) {
    console.error('Error in getClassWelzijnStats:', error);
    return { success: false, error: error.message };
  }
});