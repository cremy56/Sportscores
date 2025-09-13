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

function isInactive(lastActivity) {
  // Een leerling wordt als inactief beschouwd als de laatste activiteit meer dan 14 dagen geleden is.
  if (!lastActivity) return true; // Geen activiteit is ook inactief.
  
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  // Converteer Firestore Timestamp naar Date object indien nodig
  const activityDate = lastActivity.toDate ? lastActivity.toDate() : new Date(lastActivity);
  
  return activityDate < twoWeeksAgo;
}

function getStudentRecommendation(studentStats) {
  // Genereert een aanbeveling op basis van de prestaties van een leerling.
  if (studentStats.averageScore < 60 && studentStats.completedScenarios > 0) {
    return "Extra begeleiding en herhaling van basisprincipes wordt aangeraden.";
  }
  if (isInactive(studentStats.lastActivity)) {
      return "Leerling is al even niet meer actief geweest. Een motiverend gesprek kan helpen.";
  }
  return "Regelmatige oefening blijven aanmoedigen.";
}

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




// in ehbo-functions.js

exports.getClassEHBOStats = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const { classId, schoolId } = request.data;
  console.log(`[DEBUG] getClassEHBOStats started for classId: ${classId}, schoolId: ${schoolId}`);

  if (!classId || !schoolId || classId === 'all') {
    console.log('[DEBUG] No specific group selected. Returning empty array.');
    return { success: true, classStats: { totalStudents: 0 }, students: [] };
  }

  try {
    // STAP 1: Haal de leerling-e-mails uit de groep.
    const groupDoc = await db.collection('groepen').doc(classId).get();
    if (!groupDoc.exists) {
      console.error(`[DEBUG] Group ${classId} not found.`);
      throw new Error(`Group ${classId} not found`);
    }

    const leerlingIds = groupDoc.data().leerling_ids || [];
    console.log(`[DEBUG] Found ${leerlingIds.length} student emails in group doc:`, JSON.stringify(leerlingIds));

    if (leerlingIds.length === 0) {
      console.log('[DEBUG] Group has no students. Returning empty array.');
      return { success: true, classStats: { totalStudents: 0 }, students: [] };
    }

    // STAP 2: Zoek geregistreerde leerlingen in 'users'.
    console.log('[DEBUG] Querying "users" collection...');
    const registeredStudentsSnapshot = await db.collection('users')
      .where('rol', '==', 'leerling')
      .where('school_id', '==', schoolId)
      .where('email', 'in', leerlingIds)
      .get();

    const registeredStudentDocs = registeredStudentsSnapshot.docs;
    const registeredEmails = registeredStudentDocs.map(doc => doc.data().email);
    console.log(`[DEBUG] Found ${registeredStudentDocs.length} registered students in "users" collection.`);
    console.log('[DEBUG] Emails of registered students:', JSON.stringify(registeredEmails));

    // STAP 3: Zoek niet-geregistreerde leerlingen in 'toegestane_gebruikers'.
    const unregisteredEmails = leerlingIds.filter(email => !registeredEmails.includes(email));
    console.log(`[DEBUG] Found ${unregisteredEmails.length} emails to search in "toegestane_gebruikers":`, JSON.stringify(unregisteredEmails));

    const unregisteredStudentPromises = unregisteredEmails.map(email => 
      db.collection('toegestane_gebruikers').doc(email).get()
    );
    const unregisteredStudentSnapshots = await Promise.all(unregisteredStudentPromises);

    const unregisteredStudentDocs = unregisteredStudentSnapshots
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, data: () => ({ ...doc.data(), email: doc.id, isRegistered: false }) }));
    console.log(`[DEBUG] Found ${unregisteredStudentDocs.length} unregistered students in "toegestane_gebruikers".`);

    // STAP 4: Combineer de lijsten.
    const allStudentDocs = [...registeredStudentDocs, ...unregisteredStudentDocs];
    console.log(`[DEBUG] Total combined students found: ${allStudentDocs.length}`);

    // STAP 5: Verwerk de gecombineerde lijst (deze code blijft hetzelfde).
    const students = [];
    // ... (de rest van je bestaande verwerkingslogica, zoals de forEach-loop) ...
    allStudentDocs.forEach((doc) => {
        const studentData = doc.data();
        // ... etc ...
        students.push({ id: doc.id, name: studentData.naam, isRegistered: studentData.isRegistered !== false });
    });

    console.log('[DEBUG] Final students array being returned has length:', students.length);
    console.log('[DEBUG] Final students array content:', JSON.stringify(students));

    // Return de data
    // ... (de rest van de return-statement met classStats en students) ...
    return { success: true, classStats: { totalStudents: students.length }, students };

  } catch (error) {
    console.error('[ERROR] in getClassEHBOStats:', error);
    return { success: false, error: error.message };
  }
});



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
