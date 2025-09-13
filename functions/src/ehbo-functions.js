const {onCall} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction } = require('./utils');

// Scenario to Objective Mapping (in memory, geen database)
const EHBO_OBJECTIVES = {
  "obj_001": {
    id: "obj_001",
    title: "Veiligheid beoordelen",
    description: "Kan situatie veilig inschatten en prioriteiten stellen",
    required_scenarios: ["bewusteloos", "brand", "bloeding"],
    required_score: 75,
    weight: 1
  },
  "obj_002": {
    id: "obj_002", 
    title: "Bewustzijn & vitale functies",
    description: "Kan bewustzijn en ademhaling correct beoordelen",
    required_scenarios: ["bewusteloos", "epilepsie", "ademstilstand"],
    required_score: 80,
    weight: 2 // Verhoogd omdat vitale functies cruciaal zijn
  },
  "obj_003": {
    id: "obj_003",
    title: "Hulpdiensten inschakelen",
    description: "Weet wanneer en hoe 112 te bellen", 
    required_scenarios: ["communicatie_hulpdiensten", "hartaanval", "anafylaxie"],
    required_score: 90,
    weight: 2 // Belangrijk voor alle noodsituaties
  },
  "obj_004": {
    id: "obj_004",
    title: "Reanimatie & AED",
    description: "Kan reanimatie en AED correct toepassen",
    required_scenarios: ["reanimatie", "aed_gebruik", "verdrinking"],
    required_score: 85,
    weight: 3 // Hoogste gewicht - levensreddend
  },
  "obj_005": {
    id: "obj_005",
    title: "Eerste hulp basis",
    description: "Kan basale eerste hulp en wondverzorging",
    required_scenarios: ["verstuiking", "bloedneus", "wondverzorging"],
    required_score: 70,
    weight: 1
  },
  "obj_006": {
    id: "obj_006",
    title: "Verslikking & brandwonden",
    description: "Kan omgaan met verslikking en brandwonden",
    required_scenarios: ["choking", "brand"], // Gecorrigeerd: "brand" ipv "brandwond"
    required_score: 80,
    weight: 2
  },
  "obj_007": {
    id: "obj_007",
    title: "Complexe noodsituaties",
    description: "Kan omgaan met hartproblemen en ernstige allergieën",
    required_scenarios: ["hartaanval", "anafylaxie"],
    required_score: 85,
    weight: 2
  }
};
// EHBO scenario XP
exports.awardEHBOXP = onCall(async (request) => {
  
  
  if (!request.auth) throw new Error('Authentication required');
  
  const { userId, scenarioId, xpAmount = 30 } = request.data;
  if (!userId || !scenarioId) throw new Error('userId and scenarioId required');
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || userDoc.data().rol !== 'leerling') {
      throw new Error('User not found or is not a student');
    }
    
    const userData = userDoc.data();
    const currentXP = userData.xp || 0;
    const newXP = currentXP + xpAmount;
    
    // --- START WIJZIGING: Voeg 'last_activity' toe ---
    await userRef.update({
      xp: newXP,
      sparks: Math.floor(newXP / 100),
      last_activity: FieldValue.serverTimestamp() // Cruciaal voor streaks
    });
    // --- EINDE WIJZIGING ---
    
    await logXPTransaction( {
      user_id: userId,
      user_email: userData.email,
      amount: xpAmount,
      reason: 'ehbo_scenario_completion',
      source_id: scenarioId
    });
    
    return {
      success: true,
      message: `Awarded ${xpAmount} XP for EHBO scenario`,
      newTotals: { xp: newXP, sparks: Math.floor(newXP / 100) }
    };
    
  } catch (error) {
    console.error('Error awarding EHBO XP:', error);
    throw new Error('Failed to award EHBO XP: ' + error.message);
  }
});
exports.saveEHBOProgress = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { userId, scenarioId, score } = request.data;
  if (!userId || !scenarioId) {
    throw new Error('userId and scenarioId are required');
  }
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || userDoc.data().rol !== 'leerling') {
      throw new Error('User not found or is not a student');
    }
    
    const userData = userDoc.data();
    const completedScenarios = userData.completed_ehbo_scenarios || [];
    
    // Check if already completed
    if (completedScenarios.includes(scenarioId)) {
      throw new Error('EHBO scenario already completed');
    }
    
    // Update alleen progress data - GEEN XP (dat doet awardEHBOXP al)
    await userRef.update({
      completed_ehbo_scenarios: FieldValue.arrayUnion(scenarioId),
      ehbo_total_score: FieldValue.increment(score || 0),
      ehbo_streak: FieldValue.increment(1),
      last_activity: FieldValue.serverTimestamp() // Voor streak tracking
    });
    
    return { 
      success: true, 
      message: 'EHBO progress saved successfully'
    };
    
  } catch (error) {
    console.error('Error saving EHBO progress:', error);
    throw new Error('Failed to save EHBO progress: ' + error.message);
  }
});

// Replace your getClassEHBOStats function with this clean version
// Replace your getClassEHBOStats function with this clean version
exports.getClassEHBOStats = onCall(async (request) => {
  console.log('=== getClassEHBOStats START ===');
  
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { classId, schoolId, studentId } = request.data;
  console.log('Parameters:', { classId, schoolId, studentId });
  
  try {
    // Verify user access
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    if (!['leerkracht', 'administrator', 'super-administrator'].includes(userData.rol)) {
      throw new Error('Access denied');
    }
    
    console.log('Access granted for role:', userData.rol);
    
    // Get students based on filters
    let studentsSnapshot;
    
    if (studentId) {
      // For admin: get specific student by email
      console.log('Getting specific student by email:', studentId);
      
      // First, try to find in registered users
      const emailQuery = await db.collection('users')
        .where('email', '==', studentId)
        .where('rol', '==', 'leerling')
        .where('school_id', '==', schoolId)
        .limit(1)
        .get();
      
      if (!emailQuery.empty) {
        // Student is registered
        const studentDoc = emailQuery.docs[0];
        const studentData = studentDoc.data();
        console.log('Found registered student:', studentData.naam);
        studentsSnapshot = { docs: [studentDoc] };
        
      } else {
        // Check if student is in toegestane_gebruikers (not yet registered)
        console.log('Student not found in users, checking toegestane_gebruikers...');
        
        const toegestaneDoc = await db.collection('toegestane_gebruikers').doc(studentId).get();
        
        if (toegestaneDoc.exists) {
          const toegestaneData = toegestaneDoc.data();
          console.log('Found unregistered student:', toegestaneData.naam);
          
          // Return specific error for unregistered students
          return {
            success: false,
            error: `Student "${toegestaneData.naam}" is nog niet geregistreerd. De student moet eerst inloggen om EHBO gegevens te kunnen bekijken.`,
            studentStatus: 'unregistered',
            studentName: toegestaneData.naam,
            studentEmail: studentId,
            classStats: {
              totalStudents: 0,
              studentsStarted: 0,
              studentsCompleted: 0,
              averageScore: 0,
              objectiveCompletion: {},
              strugglingStudents: [],
              topPerformers: []
            },
            students: []
          };
          
        } else {
          // Student not found in either collection
          console.log('Student not found in either collection:', studentId);
          return {
            success: false,
            error: `Student "${studentId}" niet gevonden. Controleer of het email adres correct is en of de student toegang heeft tot deze school.`,
            studentStatus: 'not_found',
            classStats: {
              totalStudents: 0,
              studentsStarted: 0,
              studentsCompleted: 0,
              averageScore: 0,
              objectiveCompletion: {},
              strugglingStudents: [],
              topPerformers: []
            },
            students: []
          };
        }
      }
      
    } else {
      // For teacher/admin: get students by school/class
      let query = db.collection('users')
        .where('rol', '==', 'leerling')
        .where('school_id', '==', schoolId);
      
      if (classId && classId !== 'all') {
        console.log('Filtering by class/group:', classId);
        
        if (classId === 'my_students') {
          // For admins with leerling_ids, filter by specific student IDs
          const userData = await db.collection('users').doc(request.auth.uid).get();
          const userProfile = userData.data();
          
          if (userProfile.leerling_ids && userProfile.leerling_ids.length > 0) {
            console.log('Filtering by leerling_ids:', userProfile.leerling_ids);
            query = query.where('email', 'in', userProfile.leerling_ids.slice(0, 10)); // Firestore 'in' limit
          }
        } else {
          // Regular class filtering
          query = query.where('klas', '==', classId);
        }
      }
      
      console.log('Executing query...');
      studentsSnapshot = await query.get();
    }
    
    console.log('Found students:', studentsSnapshot.docs.length);
    
    // Initialize stats
    const classStats = {
      totalStudents: 0,
      studentsStarted: 0,
      studentsCompleted: 0,
      averageScore: 0,
      objectiveCompletion: {},
      strugglingStudents: [],
      topPerformers: []
    };
    
    const students = [];
    let totalScoreSum = 0;
    let studentsWithScores = 0;
    
    // Initialize objective completion tracking
    Object.keys(EHBO_OBJECTIVES).forEach(objId => {
      classStats.objectiveCompletion[objId] = {
        completed: 0,
        total: 0,
        title: EHBO_OBJECTIVES[objId].title
      };
    });
    
    // Process each student
    studentsSnapshot.docs.forEach((doc) => {
      try {
        const studentData = doc.data();
        const completedScenarios = studentData.completed_ehbo_scenarios || [];
        const totalScore = studentData.ehbo_total_score || 0;
        const scenarioCount = completedScenarios.length;

        // Skip students with no activity
        if (scenarioCount === 0) return;

        classStats.totalStudents++;
        classStats.studentsStarted++;

        // Calculate objectives
        const objectives = calculateEHBOObjectives(completedScenarios, totalScore);

        // Count objective completions
        Object.entries(objectives).forEach(([objId, objData]) => {
          if (classStats.objectiveCompletion[objId]) {
            classStats.objectiveCompletion[objId].total++;
            if (objData.status === 'completed') {
              classStats.objectiveCompletion[objId].completed++;
            }
          }
        });

        // Calculate progress
        const completedObjectives = Object.values(objectives).filter(obj => obj.status === 'completed').length;
        const progressPercentage = Math.round((completedObjectives / Object.keys(EHBO_OBJECTIVES).length) * 100);

        if (progressPercentage >= 80) {
          classStats.studentsCompleted++;
        }

        // Calculate average score
        const averageScore = scenarioCount > 0 ? Math.round(totalScore / scenarioCount) : 0;
        if (averageScore > 0) {
          totalScoreSum += averageScore;
          studentsWithScores++;
        }

        // Build student object
        const studentStats = {
          id: doc.id,
          name: studentData.naam || 'Onbekend',
          email: studentData.email || doc.id,
          completedScenarios: scenarioCount,
          totalScore: totalScore,
          averageScore: averageScore,
          progressPercentage: progressPercentage,
          objectives: objectives,
          lastActivity: studentData.last_activity,
          certificationReady: progressPercentage >= 80 && averageScore >= 75,
          strugglingAreas: identifyStrugglingAreas(objectives)
        };

        students.push(studentStats);

        // Check for struggling students
        if (averageScore < 60 || isInactive(studentData.last_activity)) {
          classStats.strugglingStudents.push({
            name: studentData.naam || 'Onbekend',
            issue: averageScore < 60 ? 'low_scores' : 'inactive',
            lastScore: averageScore,
            recommendation: getStudentRecommendation(studentStats)
          });
        }

        // Check for top performers
        if (averageScore > 85 && scenarioCount >= 5) {
          classStats.topPerformers.push({
            name: studentData.naam || 'Onbekend',
            averageScore: averageScore,
            completedScenarios: scenarioCount
          });
        }

      } catch (studentError) {
        console.error('Error processing student:', doc.id, studentError);
      }
    });

    // Finalize stats
    classStats.averageScore = studentsWithScores > 0 ? Math.round(totalScoreSum / studentsWithScores) : 0;
    students.sort((a, b) => b.progressPercentage - a.progressPercentage);

    console.log('=== SUCCESS ===');
    
    return {
      success: true,
      classStats,
      students: students.slice(0, 50),
      objectives: EHBO_OBJECTIVES,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('=== ERROR ===', error.message);
    
    return {
      success: false,
      error: error.message,
      classStats: {
        totalStudents: 0,
        studentsStarted: 0,
        studentsCompleted: 0,
        averageScore: 0,
        objectiveCompletion: {},
        strugglingStudents: [],
        topPerformers: []
      },
      students: []
    };
  }
});

// Helper functions
function identifyStrugglingAreas(objectives) {
  try {
    return Object.entries(objectives || {})
      .filter(([objId, obj]) => obj.status !== 'completed' && obj.best_score < 70)
      .map(([objId]) => EHBO_OBJECTIVES[objId]?.title || 'Onbekend')
      .slice(0, 3);
  } catch (error) {
    return [];
  }
}

function isInactive(lastActivity) {
  if (!lastActivity) return true;
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const activityDate = lastActivity.toDate ? lastActivity.toDate() : new Date(lastActivity);
  return activityDate < twoWeeksAgo;
}

function getStudentRecommendation(studentStats) {
  if (studentStats.averageScore < 60) {
    return "Extra begeleiding en herhaling van basisprincipes";
  }
  if (studentStats.strugglingAreas.length > 2) {
    return `Focus op: ${studentStats.strugglingAreas.join(', ')}`;
  }
  return "Regelmatige oefening aanmoedigen";
}


// Complete getSchoolEHBOStats function with proper access control

exports.getSchoolEHBOStats = onCall(async (request) => {
  console.log('=== getSchoolEHBOStats FUNCTION START ===');
  console.log('Request auth:', !!request.auth);
  console.log('Request data:', request.data);
  
  if (!request.auth) {
    console.log('ERROR: No authentication');
    throw new Error('Authentication required');
  }
  
  const { schoolId } = request.data;
  console.log('School ID:', schoolId);
  
  if (!schoolId) {
    console.log('ERROR: No schoolId provided');
    throw new Error('schoolId is required');
  }
  
  try {
    // Verify user access - FIXED to include all three roles
    console.log('Verifying user access for:', request.auth.uid);
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    console.log('User doc exists:', userDoc.exists);
    
    if (!userDoc.exists) {
      console.log('ERROR: User document not found');
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    console.log('User role:', userData.rol);
    console.log('User school_id:', userData.school_id);
    
    // FIXED: Allow leerkracht, administrator, and super-administrator
    if (!['leerkracht', 'administrator', 'super-administrator'].includes(userData.rol)) {
      console.log('ERROR: Access denied for role:', userData.rol);
      throw new Error('Access denied - requires teacher or administrator role');
    }
    
    // Optional: Verify user belongs to the school (except for super-administrators)
    if (userData.rol !== 'super-administrator' && userData.school_id !== schoolId) {
      console.log('ERROR: User school mismatch. User school:', userData.school_id, 'Requested school:', schoolId);
      throw new Error('Access denied - can only view stats for your own school');
    }
    
    console.log('Building students query for school:', schoolId);
    const studentsQuery = db.collection('users')
      .where('rol', '==', 'leerling')
      .where('school_id', '==', schoolId);
    
    console.log('Executing students query...');
    const studentsSnapshot = await studentsQuery.get();
    console.log('Found students:', studentsSnapshot.docs.length);
    
    let totalStudents = 0;
    let studentsStarted = 0;
    let studentsCompleted = 0;
    let totalScoreSum = 0;
    let studentsWithScores = 0;
    
    console.log('Processing students...');
    studentsSnapshot.docs.forEach((doc, index) => {
      try {
        const data = doc.data();
        const completedScenarios = data.completed_ehbo_scenarios || [];
        const totalScore = data.ehbo_total_score || 0;
        
        totalStudents++;
        
        if (completedScenarios.length > 0) {
          studentsStarted++;
          
          // Calculate objectives real-time
          const objectives = calculateEHBOObjectives(completedScenarios, totalScore);
          const completedObjectives = Object.values(objectives).filter(obj => obj.status === 'completed').length;
          const totalObjectives = Object.keys(EHBO_OBJECTIVES).length;
          const progressPercentage = (completedObjectives / totalObjectives) * 100;
          
          if (progressPercentage >= 80) {
            studentsCompleted++;
          }
          
          if (totalScore > 0 && completedScenarios.length > 0) {
            const averageScore = totalScore / completedScenarios.length;
            totalScoreSum += averageScore;
            studentsWithScores++;
          }
        }
        
      } catch (studentError) {
        console.error('Error processing student:', doc.id, studentError);
        // Continue processing other students
      }
    });
    
    console.log('Calculating final stats...');
    const schoolStats = {
      totalStudents,
      studentsStarted,
      studentsCompleted,
      certificationReady: studentsCompleted,
      averageScore: studentsWithScores > 0 ? Math.round(totalScoreSum / studentsWithScores) : 0,
      complianceRate: totalStudents > 0 ? Math.round((studentsCompleted / totalStudents) * 100) : 0,
      participationRate: totalStudents > 0 ? Math.round((studentsStarted / totalStudents) * 100) : 0
    };
    
    console.log('Final school stats:', schoolStats);
    console.log('=== getSchoolEHBOStats FUNCTION SUCCESS ===');
    
    return {
      success: true,
      schoolStats,
      objectives: EHBO_OBJECTIVES,
      lastUpdated: new Date().toISOString(),
      metadata: {
        schoolId: schoolId,
        requestedBy: userData.naam || 'Unknown',
        requestedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('=== getSchoolEHBOStats FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return a proper error response instead of throwing
    return {
      success: false,
      error: error.message,
      schoolStats: {
        totalStudents: 0,
        studentsStarted: 0,
        studentsCompleted: 0,
        certificationReady: 0,
        averageScore: 0,
        complianceRate: 0,
        participationRate: 0
      },
      objectives: EHBO_OBJECTIVES || {},
      lastUpdated: new Date().toISOString()
    };
  }
});


// Helper function: Calculate objectives from scenario data
function calculateEHBOObjectives(userScenarios, scenarioScores) {
  const objectives = {};
  
  Object.values(EHBO_OBJECTIVES).forEach(objective => {
    const relevantScenarios = objective.required_scenarios.filter(scenario => 
      userScenarios.includes(scenario)
    );
    
    if (relevantScenarios.length === 0) {
      objectives[objective.id] = {
        status: 'not_started',
        progress: 0,
        best_score: 0,
        completed_scenarios: [],
        missing_scenarios: objective.required_scenarios
      };
      return;
    }
    
    // Calculate best scores for relevant scenarios
    const scores = relevantScenarios.map(scenario => {
      // Find best score for this scenario from user's history
      return getScenarioScore(scenario, scenarioScores, userScenarios);
    }).filter(score => score > 0);
    
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const progress = (relevantScenarios.length / objective.required_scenarios.length) * 100;
    const isCompleted = averageScore >= objective.required_score && progress >= 80; // 80% van scenarios gedaan
    
    objectives[objective.id] = {
      status: isCompleted ? 'completed' : relevantScenarios.length > 0 ? 'in_progress' : 'not_started',
      progress: Math.round(progress),
      best_score: averageScore,
      completed_scenarios: relevantScenarios,
      missing_scenarios: objective.required_scenarios.filter(s => !relevantScenarios.includes(s)),
      attempts: relevantScenarios.length
    };
  });
  
  return objectives;
}

// Helper: Get scenario score from user data
function getScenarioScore(scenarioId, totalScore, completedScenarios) {
  // Simplified: assume average score based on total
  if (completedScenarios.includes(scenarioId)) {
    return totalScore / completedScenarios.length; // Rough estimate
  }
  return 0;
}
// Helper functions (same as before but simpler)
function identifyStrugglingAreas(objectives) {
  return Object.values(objectives)
    .filter(obj => obj.status !== 'completed' && obj.best_score < 70)
    .map(obj => EHBO_OBJECTIVES[obj.id] ? EHBO_OBJECTIVES[obj.id].title : 'Unknown');
}
function isInactive(lastActivity) {
  if (!lastActivity) return true;
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  return new Date(lastActivity.toDate ? lastActivity.toDate() : lastActivity) < twoWeeksAgo;
}

function getStudentRecommendation(studentStats) {
  if (studentStats.averageScore < 60) {
    return "Extra begeleiding en herhaling van basisprincipes";
  }
  if (studentStats.strugglingAreas.length > 2) {
    return `Focus op: ${studentStats.strugglingAreas.join(', ')}`;
  }
  return "Regelmatige oefening aanmoedigen";
}
