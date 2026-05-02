// functions/src/welzijn-functions.js
const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, checkStreakMilestonesInternal, getTodayString } = require('./utils');

// =============================================
// XP BEDRAGEN — centraal beheerd
// =============================================
const XP = {
  WELZIJN_SEGMENT: 4,       // per segment (beweging/voeding/slaap/mentaal/hart)
  KOMPAS_BONUS: 80,         // bonus als alle 5 segmenten voltooid → totaal = 5×4 + 80 = 100 XP
  PERFECT_WEEK_WELZIJN: 500, // 5× kompas + 2× training in 1 week (welzijn aan)
  PERFECT_WEEK_TRAINING: 300, // 3× training in 1 week (welzijn uit)
  WEEKLY_TRAINING_BONUS: 150  // 3+ trainingen in de week (altijd)
};

// =============================================
// HELPER: school instellingen ophalen (gecached per run)
// =============================================
const schoolSettingsCache = {};
async function getSchoolSettings(schoolId) {
  if (!schoolId) return {};
  if (!schoolSettingsCache[schoolId]) {
    const schoolDoc = await db.collection('scholen').doc(schoolId).get();
    schoolSettingsCache[schoolId] = schoolDoc.exists
      ? (schoolDoc.data()?.instellingen || {})
      : {};
  }
  return schoolSettingsCache[schoolId];
}

// =============================================
// TRIGGER: Welzijn data geüpdatet
//
// FIX: Was twee identieke triggers (onWelzijnKompasUpdated
//      + onWelzijnKompasUpdatedFixed) → dubbele XP.
//      Samengevoegd tot één export.
// =============================================
exports.onWelzijnKompasUpdated = onDocumentUpdated(
  'welzijn/{userId}/dagelijkse_data/{dateString}',
  async (event) => {
    const userId = event.params.userId;
    const dateString = event.params.dateString;
    const beforeData = event.data.before.data() || {};
    const afterData = event.data.after.data() || {};

    const newlyCompletedSegments = [];
    if ((afterData.stappen       || 0) > 0 && !((beforeData.stappen       || 0) > 0)) newlyCompletedSegments.push('beweging');
    if ((afterData.water_intake  || 0) > 0 && !((beforeData.water_intake  || 0) > 0)) newlyCompletedSegments.push('voeding');
    if ((afterData.slaap_uren    || 0) > 0 && !((beforeData.slaap_uren    || 0) > 0)) newlyCompletedSegments.push('slaap');
    if (afterData.humeur && !beforeData.humeur)                                         newlyCompletedSegments.push('mentaal');
    if ((afterData.hartslag_rust || 0) > 0 && !((beforeData.hartslag_rust || 0) > 0)) newlyCompletedSegments.push('hart');

    try {
      if (newlyCompletedSegments.length > 0) {
        await awardWelzijnXP(userId, newlyCompletedSegments, dateString);
      }
      await checkKompasCompletionBonus(userId, afterData, dateString);
    } catch (error) {
      console.error('ERROR in onWelzijnKompasUpdated:', error);
    }
  }
);

// =============================================
// HELPER: XP toekennen per welzijn segment
// =============================================
async function awardWelzijnXP(userId, completedSegments, dateString) {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists || userDoc.data().rol !== 'leerling') return;

  const totalXP = completedSegments.length * XP.WELZIJN_SEGMENT;

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
//
// FIX: bonusXP was 10 → nu 80 (totaal kompas = 100 XP)
// FIX: streak_days increment verwijderd uit deze helper —
//      dat is uitsluitend de verantwoordelijkheid van
//      updateDailyStreaks (cron). Dit vond dubbel tellen.
// NIEUW: last_activity_date instellen voor two-pillar streak.
// =============================================
async function checkKompasCompletionBonus(userId, dayData, dateString) {
  const isKompasComplete =
    (dayData.stappen       || 0) > 0 &&
    (dayData.water_intake  || 0) > 0 &&
    (dayData.slaap_uren    || 0) > 0 &&
    dayData.humeur &&
    (dayData.hartslag_rust || 0) > 0;

  if (!isKompasComplete || dayData.completion_bonus_awarded) return;

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return;

  await userRef.update({
    xp: FieldValue.increment(XP.KOMPAS_BONUS),
    xp_current_period: FieldValue.increment(XP.KOMPAS_BONUS),
    xp_current_school_year: FieldValue.increment(XP.KOMPAS_BONUS),
    'weekly_stats.kompas_days': FieldValue.increment(1),
    last_activity_date: dateString   // two-pillar streak: cron checkt dit veld
  });

  await db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(dateString).update({
    completion_bonus_awarded: true,
    completion_bonus_xp: XP.KOMPAS_BONUS
  });

  await logXPTransaction({
    user_id: userId,
    amount: XP.KOMPAS_BONUS,
    reason: 'kompas_completion_bonus',
    source_id: `welzijn_${dateString}`
  });
}

// =============================================
// EXPORT: Wekelijkse bonussen (elke maandag 06:00)
//
// FIX: perfect week XP 50 → 500 (welzijn aan)
//      training bonus XP 25 → 150
// NIEUW: school check — welzijn uit → andere perfect week drempel
// =============================================
exports.checkWeeklyBonuses = onSchedule('0 6 * * 1', async (event) => {
  // Cache leegmaken voor nieuwe run
  for (const key of Object.keys(schoolSettingsCache)) {
    delete schoolSettingsCache[key];
  }

  try {
    const usersSnapshot = await db.collection('users').where('rol', '==', 'leerling').get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const weeklyStats = userData.weekly_stats || {};
      const kompasDays = weeklyStats.kompas_days || 0;
      const trainingCount = weeklyStats.trainingen || 0;

      // Schoolinstelling ophalen (gecached per schoolId)
      const settings = await getSchoolSettings(userData.school_id);
      const welzijnAan = settings.welzijnModuleActief !== false;

      // Perfect week — twee varianten op basis van schoolinstelling
      if (welzijnAan) {
        // Welzijn AAN: 5× kompas + 2× training
        if (kompasDays >= 5 && trainingCount >= 2 && !weeklyStats.perfectWeek) {
          await awardWeeklyBonus(userDoc, XP.PERFECT_WEEK_WELZIJN, 'perfect_week_bonus');
          await userDoc.ref.update({ 'weekly_stats.perfectWeek': true });
        }
      } else {
        // Welzijn UIT: enkel trainingsdrempel (3×)
        if (trainingCount >= 3 && !weeklyStats.perfectWeek) {
          await awardWeeklyBonus(userDoc, XP.PERFECT_WEEK_TRAINING, 'perfect_week_bonus_training_only');
          await userDoc.ref.update({ 'weekly_stats.perfectWeek': true });
        }
      }

      // Wekelijkse training bonus (altijd — ongeacht welzijn)
      if (trainingCount >= 3 && !weeklyStats.trainingBonus) {
        await awardWeeklyBonus(userDoc, XP.WEEKLY_TRAINING_BONUS, 'weekly_training_bonus');
        await userDoc.ref.update({ 'weekly_stats.trainingBonus': true });
      }

      // Weekly stats resetten voor nieuwe week
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
// EXPORT: Dagelijkse streak update (01:00 's nachts)
//
// TWO-PILLAR MODEL: streak telt als leerling gisteren
//   minstens één inzet-activiteit deed:
//   - Welzijn kompas volledig (last_activity_date)
//   - OF training gelogd/gevalideerd (last_activity_date)
//
// FIX: Was welzijn-only check op completion_bonus_awarded.
//      Nu: last_activity_date veld op users (string YYYY-MM-DD),
//      gezet door checkKompasCompletionBonus en awardTrainingXP.
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

      // Two-pillar check: was de leerling gisteren actief?
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
// EXPORT: Streak milestones manueel controleren
// (Wordt normaal intern afgehandeld via updateDailyStreaks)
// =============================================
exports.checkStreakMilestones = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');
  const { userId } = request.data;
  try {
    await checkStreakMilestonesInternal(userId || request.auth.uid);
    const userDoc = await db.collection('users').doc(userId || request.auth.uid).get();
    return { success: true, currentStreak: userDoc.data()?.streak_days || 0 };
  } catch (error) {
    console.error('Error checking streak milestones:', error);
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
    const today = getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    const [todayData, yesterdayData] = await Promise.all([
      db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(today).get(),
      db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(yesterdayString).get()
    ]);

    const userData = userDoc.exists ? userDoc.data() : null;
    return {
      success: true,
      userId,
      userExists: userDoc.exists,
      userRole: userData?.rol || null,
      streak_days: userData?.streak_days || 0,
      last_activity_date: userData?.last_activity_date || null,
      weekly_stats: userData?.weekly_stats || {},
      todayDataExists: todayData.exists,
      yesterdayDataExists: yesterdayData.exists,
      todayData: todayData.exists ? todayData.data() : null
    };
  } catch (error) {
    throw new Error(`Debug failed: ${error.message}`);
  }
});

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
    message: `Added 10 XP to ${userData.nickname || userId}`,
    newXP: (userData.xp || 0) + 10
  };
});

// =============================================
// EXPORT: Klasse welzijn statistieken
// =============================================
exports.getClassWelzijnStats = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const { classId, schoolId, studentId } = request.data;
  if (!schoolId) throw new Error('School ID is required');

  try {
    let leerlingFirebaseUids = [];

    if (studentId) {
      // studentId = smartschool_id_hash = toegestane_gebruikers_id
      const userQuery = await db.collection('users')
        .where('toegestane_gebruikers_id', '==', studentId)
        .limit(1)
        .get();

      if (!userQuery.empty) {
        leerlingFirebaseUids.push(userQuery.docs[0].id);
      } else {
        return { success: true, groupStats: {}, studentData: [] };
      }

    } else if (classId && classId !== 'all') {
      const groupDoc = await db.collection('groepen').doc(classId).get();
      if (!groupDoc.exists) return { success: true, groupStats: {}, studentData: [] };

      const leerlingHashes = groupDoc.data().leerling_ids || [];
      if (leerlingHashes.length === 0) {
        return { success: true, groupStats: {}, studentData: [] };
      }

      const chunkSize = 30;
      for (let i = 0; i < leerlingHashes.length; i += chunkSize) {
        const chunk = leerlingHashes.slice(i, i + chunkSize);
        const usersSnap = await db.collection('users')
          .where('toegestane_gebruikers_id', 'in', chunk)
          .get();
        usersSnap.docs.forEach(d => leerlingFirebaseUids.push(d.id));
      }

    } else {
      return { success: true, groupStats: {}, studentData: [] };
    }

    if (leerlingFirebaseUids.length === 0) {
      return { success: true, groupStats: {}, studentData: [] };
    }

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

      const logsLast7Days  = history.filter(h => h.id >= sevenDaysAgoString).length;
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
          voeding:  Math.min(100, (h.water_intake || 0) / 2000 * 100),
          slaap:    ((h.slaap_uren || 0) / 8.5 * 80) + ((h.slaap_kwaliteit || 3) - 1) * 5,
          mentaal:  h.humeur
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
        nickname: student.nickname || 'Leerling',
        logs: { last7days: logsLast7Days, last30days: logsLast30Days },
        avgSleep:  parseFloat(avgSleep.toFixed(1)),
        avgSteps:  Math.round(avgSteps),
        avgScore:  Math.round(avgScore)
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