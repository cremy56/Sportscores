// functions/src/ehbo-functions.js
const {onCall} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction } = require('./utils');

// =============================================
// EHBO OBJECTIVES (in memory)
// =============================================
const EHBO_OBJECTIVES = {
  "obj_001": { id: "obj_001", title: "Veiligheid beoordelen", description: "Kan situatie veilig inschatten en prioriteiten stellen", required_scenarios: ["bewusteloos", "brand", "bloeding"], required_score: 75, weight: 1 },
  "obj_002": { id: "obj_002", title: "Bewustzijn & vitale functies", description: "Kan bewustzijn en ademhaling correct beoordelen", required_scenarios: ["bewusteloos", "epilepsie", "ademstilstand"], required_score: 80, weight: 2 },
  "obj_003": { id: "obj_003", title: "Hulpdiensten inschakelen", description: "Weet wanneer en hoe 112 te bellen", required_scenarios: ["communicatie_hulpdiensten", "hartaanval", "anafylaxie"], required_score: 90, weight: 2 },
  "obj_004": { id: "obj_004", title: "Reanimatie & AED", description: "Kan reanimatie en AED correct toepassen", required_scenarios: ["reanimatie", "aed_gebruik", "verdrinking"], required_score: 85, weight: 3 },
  "obj_005": { id: "obj_005", title: "Eerste hulp basis", description: "Kan basale eerste hulp en wondverzorging", required_scenarios: ["verstuiking", "bloedneus", "wondverzorging"], required_score: 70, weight: 1 },
  "obj_006": { id: "obj_006", title: "Verslikking & brandwonden", description: "Kan omgaan met verslikking en brandwonden", required_scenarios: ["choking", "brand"], required_score: 80, weight: 2 },
  "obj_007": { id: "obj_007", title: "Complexe noodsituaties", description: "Kan omgaan met hartproblemen en ernstige allergieën", required_scenarios: ["hartaanval", "anafylaxie"], required_score: 85, weight: 2 }
};

// =============================================
// HELPERS
// =============================================
function isInactive(lastActivity) {
  if (!lastActivity) return true;
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const activityDate = lastActivity.toDate ? lastActivity.toDate() : new Date(lastActivity);
  return activityDate < twoWeeksAgo;
}

function getStudentRecommendation(studentStats) {
  if (studentStats.averageScore < 60 && studentStats.completedScenarios > 0) {
    return "Extra begeleiding en herhaling van basisprincipes wordt aangeraden.";
  }
  if (isInactive(studentStats.lastActivity)) {
    return "Leerling is al even niet meer actief geweest. Een motiverend gesprek kan helpen.";
  }
  return "Regelmatige oefening blijven aanmoedigen.";
}

function calculateEHBOObjectives(userScenarios, scenarioScores) {
  const objectives = {};
  Object.values(EHBO_OBJECTIVES).forEach(objective => {
    const relevantScenarios = objective.required_scenarios.filter(s => userScenarios.includes(s));
    if (relevantScenarios.length === 0) {
      objectives[objective.id] = { status: 'not_started', progress: 0, best_score: 0, completed_scenarios: [], missing_scenarios: objective.required_scenarios };
      return;
    }
    const scores = relevantScenarios.map(s => completedScenarios.includes(s) ? scenarioScores / completedScenarios.length : 0).filter(s => s > 0);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const progress = (relevantScenarios.length / objective.required_scenarios.length) * 100;
    objectives[objective.id] = {
      status: (averageScore >= objective.required_score && progress >= 80) ? 'completed' : relevantScenarios.length > 0 ? 'in_progress' : 'not_started',
      progress: Math.round(progress),
      best_score: averageScore,
      completed_scenarios: relevantScenarios,
      missing_scenarios: objective.required_scenarios.filter(s => !relevantScenarios.includes(s)),
      attempts: relevantScenarios.length
    };
  });
  return objectives;
}

// =============================================
// EXPORT: EHBO XP toekennen

// =============================================
exports.awardEHBOXP = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');
  const { userId, scenarioId } = request.data;
  if (!userId || !scenarioId) throw new Error('userId and scenarioId required');

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists || userDoc.data().rol !== 'leerling') {
      throw new Error('User not found or is not a student');
    }

    const userData = userDoc.data();
    const baseScenarioId = scenarioId.split('_enhanced_')[0];
    const completionStats = userData.ehbo_completion_stats || {};
    const completionCount = completionStats[baseScenarioId] || 0;

    let xpAmount = 1;
    if (completionCount === 0) xpAmount = 30;
    else if (completionCount === 1) xpAmount = 10;
    else if (completionCount === 2) xpAmount = 5;

    await userRef.update({
      xp: FieldValue.increment(xpAmount),
      xp_current_period: FieldValue.increment(xpAmount),
      xp_current_school_year: FieldValue.increment(xpAmount)
    });

   
    await logXPTransaction({
      user_id: userId,
      amount: xpAmount,
      reason: `ehbo_completion_${completionCount + 1}`,
      source_id: scenarioId
    });

    return { success: true, message: `Awarded ${xpAmount} XP` };

  } catch (error) {
    console.error('Error awarding EHBO XP:', error);
    throw new Error('Failed to award EHBO XP');
  }
});

// =============================================
// EXPORT: EHBO progress opslaan
// ✅ FIX: totalXP bug opgelost (was undefined)
// =============================================
exports.saveEHBOProgress = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const { userId, scenarioId } = request.data;
  if (!userId || !scenarioId) throw new Error('userId and scenarioId are required');

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists || userDoc.data().rol !== 'leerling') {
      throw new Error('User not found or is not a student');
    }

    // ✅ FIX: Alleen progress opslaan (XP via awardEHBOXP)
    const baseScenarioId = scenarioId.split('_enhanced_')[0];
    const scenarioKey = `ehbo_completion_stats.${baseScenarioId}`;

    await userRef.update({
      [scenarioKey]: FieldValue.increment(1),
      last_activity: FieldValue.serverTimestamp()
    });

    return { success: true, message: 'EHBO progress saved successfully' };

  } catch (error) {
    console.error('Error saving EHBO progress:', error);
    throw new Error('Failed to save EHBO progress: ' + error.message);
  }
});

// =============================================
// EXPORT: Klas EHBO statistieken
// ✅ Correct: al eerder bijgewerkt met smartschool_id_hash
// =============================================
exports.getClassEHBOStats = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const { classId, schoolId, studentId } = request.data;

  // Single student query
  if (studentId) {
    try {
      let studentDoc;
      let isRegistered = false;

      const usersQuery = await db.collection('users')
        .where('smartschool_id_hash', '==', studentId)
        .limit(1)
        .get();

      if (!usersQuery.empty) {
        studentDoc = usersQuery.docs[0];
        isRegistered = true;
      } else {
        const toegestaneDoc = await db.collection('toegestane_gebruikers').doc(studentId).get();
        if (!toegestaneDoc.exists) throw new Error('Student niet gevonden');
        studentDoc = toegestaneDoc;
        isRegistered = false;
      }

      const studentData = studentDoc.data();
      const scenarioCount = (studentData.completed_ehbo_scenarios || []).length;
      const totalScenarioCount = 15;
      const progressPercentage = Math.round((scenarioCount / totalScenarioCount) * 100);
      const averageScore = scenarioCount > 0 ? Math.round((studentData.ehbo_total_score || 0) / scenarioCount) : 0;

      return {
        success: true,
        classStats: { totalStudents: 1, studentsCompleted: progressPercentage >= 80 ? 1 : 0, averageScore },
        students: [{
          id: studentDoc.id,
          name: isRegistered ? (studentData.naam || 'Leerling') : '[Naam versleuteld]',
          isRegistered,
          progressPercentage,
          averageScore,
          completedScenarios: scenarioCount,
          certificationReady: isRegistered && progressPercentage >= 80,
          lastActivity: studentData.last_activity ? studentData.last_activity.toDate().toLocaleDateString('nl-BE') : 'N.v.t.'
        }]
      };

    } catch (error) {
      console.error('Error fetching single student:', error);
      return { success: false, error: error.message };
    }
  }

  if (!classId || !schoolId || classId === 'all') {
    return { success: true, classStats: { totalStudents: 0 }, students: [] };
  }

  try {
    const groupDoc = await db.collection('groepen').doc(classId).get();
    if (!groupDoc.exists) throw new Error(`Groep ${classId} niet gevonden`);

    const leerlingIds = groupDoc.data().leerling_ids || [];
    if (leerlingIds.length === 0) {
      return { success: true, classStats: { totalStudents: 0 }, students: [] };
    }

    const chunkSize = 30;
    const registeredStudentDocs = [];
    for (let i = 0; i < leerlingIds.length; i += chunkSize) {
      const chunk = leerlingIds.slice(i, i + chunkSize);
      const snap = await db.collection('users').where('smartschool_id_hash', 'in', chunk).get();
      registeredStudentDocs.push(...snap.docs);
    }

    const registeredHashes = registeredStudentDocs.map(doc => doc.data().smartschool_id_hash);
    const unregisteredHashes = leerlingIds.filter(hash => !registeredHashes.includes(hash));
    const unregisteredDocs = await Promise.all(unregisteredHashes.map(hash => db.collection('toegestane_gebruikers').doc(hash).get()));

    const unregisteredStudentDocs = unregisteredDocs.filter(doc => doc.exists).map(doc => ({
      id: doc.id,
      data: () => ({ ...doc.data(), isRegistered: false, completed_ehbo_scenarios: [], ehbo_total_score: 0 })
    }));

    const allStudentDocs = [...registeredStudentDocs, ...unregisteredStudentDocs];

    const classStats = { totalStudents: allStudentDocs.length, studentsStarted: 0, studentsCompleted: 0, averageScore: 0, strugglingStudents: [], topPerformers: [] };
    const students = [];
    let totalScoreSum = 0;
    let studentsWithScores = 0;

    allStudentDocs.forEach(doc => {
      const studentData = doc.data();
      const isRegistered = studentData.isRegistered !== false;
      const completedScenarios = studentData.completed_ehbo_scenarios || [];
      const totalScore = studentData.ehbo_total_score || 0;
      const scenarioCount = completedScenarios.length;
      const totalScenarioCount = 15;
      let progressPercentage = 0;
      const averageScore = isRegistered && scenarioCount > 0 ? Math.round(totalScore / scenarioCount) : 0;

      if (isRegistered && scenarioCount > 0) {
        classStats.studentsStarted++;
        progressPercentage = Math.round((scenarioCount / totalScenarioCount) * 100);
        if (progressPercentage >= 80) classStats.studentsCompleted++;
        if (totalScore > 0) { totalScoreSum += averageScore; studentsWithScores++; }
      }

      const studentResult = {
        id: doc.id,
        name: isRegistered ? (studentData.naam || 'Leerling') : '[Naam versleuteld]',
        isRegistered, progressPercentage, averageScore,
        completedScenarios: scenarioCount,
        certificationReady: isRegistered && progressPercentage >= 80,
        lastActivity: studentData.last_activity ? studentData.last_activity.toDate().toLocaleDateString('nl-BE') : 'N.v.t.'
      };

      students.push(studentResult);

      if (isRegistered && ((averageScore < 60 && scenarioCount > 0) || isInactive(studentData.last_activity))) {
        classStats.strugglingStudents.push({ name: studentResult.name, issue: (averageScore < 60 && scenarioCount > 0) ? 'low_scores' : 'inactive', recommendation: getStudentRecommendation(studentResult) });
      }
      if (isRegistered && averageScore > 85 && scenarioCount >= 5) {
        classStats.topPerformers.push({ name: studentResult.name, averageScore, completedScenarios: scenarioCount });
      }
    });

    classStats.averageScore = studentsWithScores > 0 ? Math.round(totalScoreSum / studentsWithScores) : 0;
    students.sort((a, b) => {
      if (a.isRegistered && !b.isRegistered) return -1;
      if (!a.isRegistered && b.isRegistered) return 1;
      return b.progressPercentage - a.progressPercentage;
    });

    return { success: true, classStats, students };

  } catch (error) {
    console.error('Error in getClassEHBOStats:', error);
    return { success: false, error: error.message };
  }
});

// =============================================
// EXPORT: School EHBO statistieken
// ✅ FIX: scenarioCount undefined bug opgelost

// =============================================
exports.getSchoolEHBOStats = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const { schoolId } = request.data;
  if (!schoolId) throw new Error('schoolId is required');

  try {
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!userDoc.exists) throw new Error('User not found');

    const userData = userDoc.data();
    if (!['leerkracht', 'administrator', 'super-administrator'].includes(userData.rol)) {
      throw new Error('Access denied - requires teacher or administrator role');
    }
    if (userData.rol !== 'super-administrator' && userData.school_id !== schoolId) {
      throw new Error('Access denied - can only view stats for your own school');
    }

    const studentsSnapshot = await db.collection('users')
      .where('rol', '==', 'leerling')
      .where('school_id', '==', schoolId)
      .get();

    let totalStudents = 0;
    let studentsStarted = 0;
    let studentsCompleted = 0;
    let totalScoreSum = 0;
    let studentsWithScores = 0;

    studentsSnapshot.docs.forEach(doc => {
      try {
        const data = doc.data();
        const completedScenarios = data.completed_ehbo_scenarios || [];
        const totalScore = data.ehbo_total_score || 0;
        const scenarioCount = completedScenarios.length; // ✅ FIX: was undefined!
        const totalScenarioCount = 15;

        totalStudents++;

        if (scenarioCount > 0) {
          studentsStarted++;

          // ✅ FIX: gebruik scenarioCount (niet undefined variabele)
          const progressPercentage = Math.round((scenarioCount / totalScenarioCount) * 100);
          if (progressPercentage >= 80) studentsCompleted++;

          if (totalScore > 0) {
            const averageScore = totalScore / scenarioCount;
            totalScoreSum += averageScore;
            studentsWithScores++;
          }
        }
      } catch (studentError) {
        console.error('Error processing student:', doc.id, studentError);
      }
    });

    const schoolStats = {
      totalStudents,
      studentsStarted,
      studentsCompleted,
      certificationReady: studentsCompleted,
      averageScore: studentsWithScores > 0 ? Math.round(totalScoreSum / studentsWithScores) : 0,
      complianceRate: totalStudents > 0 ? Math.round((studentsCompleted / totalStudents) * 100) : 0,
      participationRate: totalStudents > 0 ? Math.round((studentsStarted / totalStudents) * 100) : 0
    };

    return {
      success: true,
      schoolStats,
      objectives: EHBO_OBJECTIVES,
      lastUpdated: new Date().toISOString(),
      metadata: { schoolId, requestedBy: userData.naam || 'Unknown', requestedAt: new Date().toISOString() }
    };

  } catch (error) {
    console.error('getSchoolEHBOStats error:', error.message);
    return {
      success: false,
      error: error.message,
      schoolStats: { totalStudents: 0, studentsStarted: 0, studentsCompleted: 0, certificationReady: 0, averageScore: 0, complianceRate: 0, participationRate: 0 },
      objectives: EHBO_OBJECTIVES || {},
      lastUpdated: new Date().toISOString()
    };
  }
});