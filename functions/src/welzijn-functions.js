const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, checkStreakMilestonesInternal, getTodayString } = require('./utils');
// ==============================================
// WELZIJN KOMPAS XP SYSTEM
// ==============================================

// Cloud Function die triggert wanneer welzijn dagelijkse data wordt geüpdatet
exports.onWelzijnKompasUpdated = onDocumentUpdated('welzijn/{userId}/dagelijkse_data/{dateString}', async (event) => {
  const userId = event.params.userId;
  const dateString = event.params.dateString;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};

  const newlyCompletedSegments = [];
  if (((afterData.stappen || 0) > 0) && !((beforeData.stappen || 0) > 0)) newlyCompletedSegments.push('beweging');
  if (((afterData.water_intake || 0) > 0) && !((beforeData.water_intake || 0) > 0)) newlyCompletedSegments.push('voeding');
  if (((afterData.slaap_uren || 0) > 0) && !((beforeData.slaap_uren || 0) > 0)) newlyCompletedSegments.push('slaap');
  if (afterData.humeur && !beforeData.humeur) newlyCompletedSegments.push('mentaal');
  if (((afterData.hartslag_rust || 0) > 0) && !((beforeData.hartslag_rust || 0) > 0)) newlyCompletedSegments.push('hart');

  if (newlyCompletedSegments.length > 0) {
    await awardWelzijnXP(userId, newlyCompletedSegments, dateString);
  }

  await checkKompasCompletionBonus(userId, afterData, dateString);
});

// Functie om XP toe te kennen voor welzijn segmenten
async function awardWelzijnXP(userId, completedSegments, dateString) {
  
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists || userDoc.data().rol !== 'leerling') return;

  const userData = userDoc.data();
  const xpPerSegment = 4;
  const totalXP = completedSegments.length * xpPerSegment;
  const newXP = (userData.xp || 0) + totalXP;

  // Update alleen XP, sparks en activiteit. Geen weekly_stats hier.
  await userRef.update({
    xp: newXP,
    sparks: Math.floor(newXP / 100),
    last_activity: FieldValue.serverTimestamp()
  });

  await logXPTransaction( { // ✅ Voeg db toe
  user_id: userId,
  user_email: userData.email,
  amount: totalXP,
  reason: 'welzijn_segment_completion',
  source_id: `welzijn_${dateString}`,
  balance_after: { xp: newXP, sparks: Math.floor(newXP / 100) },
  metadata: { completed_segments: completedSegments }
});
}
// Check voor volledig kompas bonus (extra XP als alle segmenten ingevuld zijn)
async function checkKompasCompletionBonus(userId, dayData, dateString) {
  

  const isKompasComplete = (dayData.stappen || 0) > 0 && (dayData.water_intake || 0) > 0 && (dayData.slaap_uren || 0) > 0 && dayData.humeur && (dayData.hartslag_rust || 0) > 0;

  if (isKompasComplete && !dayData.completion_bonus_awarded) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const bonusXP = 10;
      const newXP = (userData.xp || 0) + bonusXP;
      const weeklyStats = userData.weekly_stats || { kompas_days: 0, trainingen: 0 };
      const updatedWeeklyStats = { ...weeklyStats, kompas_days: (weeklyStats.kompas_days || 0) + 1 };

      await userRef.update({
        xp: newXP,
        sparks: Math.floor(newXP / 100),
        weekly_stats: updatedWeeklyStats
      });

      const dayRef = db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(dateString);
      await dayRef.update({
        completion_bonus_awarded: true,
        completion_bonus_xp: bonusXP
      });

      await updateWelzijnStreak(userId, dateString);
    }
  }
}
// Update welzijn streak (voor toekomstige streak beloningen)
async function updateWelzijnStreak(userId, dateString) {

  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      const currentStreak = userData.streak_days || 0;
      
      // Simpele streak update - check later voor gaten in data
      await userRef.update({
        streak_days: currentStreak + 1,
        last_activity: FieldValue.serverTimestamp()
      });
      
      console.log(`Updated streak for ${userId}: ${currentStreak + 1} days`);
    }
    
  } catch (error) {
    console.error('Error updating welzijn streak:', error);
  }
}

// Handmatige welzijn XP functie (voor testing)
exports.manualAwardWelzijnXP = onCall(async (request) => {
  
  
  // Check admin rechten
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const adminDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!adminDoc.exists || !['administrator', 'super-administrator'].includes(adminDoc.data().rol)) {
    throw new Error('Only administrators can manually award welzijn XP');
  }
  
  const { userId, segments, dateString } = request.data;
  
  if (!userId || !segments || !Array.isArray(segments)) {
    throw new Error('Valid userId and segments array required');
  }
  
  try {
    // Simuleer welzijn data voor testing
    const mockDayData = {
      stappen: segments.includes('beweging') ? 5000 : 0,
      water_intake: segments.includes('voeding') ? 1500 : 0,
      slaap_uren: segments.includes('slaap') ? 8 : 0,
      humeur: segments.includes('mentaal') ? 'Goed' : null,
      hartslag_rust: segments.includes('hart') ? 70 : 0
    };
    
    await awardWelzijnXP(userId, segments, dateString || getTodayString(), mockDayData);
    
    return {
      success: true,
      message: `Awarded welzijn XP for segments: ${segments.join(', ')}`,
      segments: segments
    };
    
  } catch (error) {
    console.error('Error in manual welzijn XP award:', error);
    throw new Error('Failed to award welzijn XP: ' + error.message);
  }
});
exports.checkWeeklyBonuses = onSchedule('0 6 * * 1', async (event) => {
 
  
  try {
    const usersSnapshot = await db.collection('users').where('rol', '==', 'leerling').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const weeklyStats = userData.weekly_stats || {};
      const kompasDays = weeklyStats.kompas_days || 0;
      const trainingCount = weeklyStats.trainingen || 0;
      
      if (kompasDays >= 5 && trainingCount >= 2 && !weeklyStats.perfectWeek) {
        await awardWeeklyBonus(userDoc, userData, 50, 'perfect_week_bonus');
      }
      if (trainingCount >= 3 && !weeklyStats.trainingBonus) {
        await awardWeeklyBonus(userDoc, userData, 25, 'weekly_training_bonus');
      }
      
      // Reset met de ENIGE CORRECTE datastructuur
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

async function awardWeeklyBonus(userDoc, userData, bonusXP, reason) {
 
  const currentXP = userData.xp || 0;
  const newXP = currentXP + bonusXP;
  const newSparks = Math.floor(newXP / 100);
  
  await userDoc.ref.update({
    xp: newXP,
    sparks: newSparks
  });
  
  await logXPTransaction({
    user_id: userDoc.id,
    user_email: userData.email,
    amount: bonusXP,
    reason: reason
  });
  
  console.log(`Awarded ${bonusXP} XP (${reason}) to ${userData.naam || userDoc.id}`);
}
exports.testWelzijnXP = onCall(async (request) => {

  const { userId } = request.data;
  console.log('Test functie voor userId:', userId);
  
 
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    return { error: 'User not found', userId };
  }
  
  const userData = userDoc.data();
  const currentXP = userData.xp || 0;
  
  await userDoc.ref.update({
    xp: currentXP + 10
  });
  
  return { 
    success: true, 
    message: `Added 10 XP to ${userData.naam}`,
    newXP: currentXP + 10
  };
});
exports.checkStreakMilestones = onCall(async (request) => {
  
  
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { userId } = request.data;
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const currentStreak = userData.streak_days || 0;
    const rewardedMilestones = userData.streak_milestones_rewarded || [];
    
    const milestones = [
      { days: 7, sparks: 3, description: '7 dagen alle kompas segmenten' },
      { days: 30, sparks: 12, description: '30 dagen streak' },
      { days: 100, sparks: 40, description: '100 dagen streak' }
    ];
    
    let newRewards = [];
    
    for (const milestone of milestones) {
      if (currentStreak >= milestone.days && !rewardedMilestones.includes(milestone.days)) {
        // Award Sparks
        const currentSparks = userData.sparks || 0;
        const newSparks = currentSparks + milestone.sparks;
        
        await userRef.update({
          sparks: newSparks,
          [`streak_milestones_rewarded`]: [...rewardedMilestones, milestone.days]
        });
        
        // Log the reward
        await logStreakReward({
          user_id: userId,
          user_email: userData.email,
          streak_days: milestone.days,
          sparks_awarded: milestone.sparks,
          description: milestone.description
        });
        
        newRewards.push(milestone);
        console.log(`Awarded ${milestone.sparks} Sparks for ${milestone.days} day streak to ${userData.naam}`);
      }
    }
    
    return {
      success: true,
      newRewards: newRewards,
      currentStreak: currentStreak
    };
    
  } catch (error) {
    console.error('Error checking streak milestones:', error);
    throw error;
  }
});

async function logStreakReward( rewardData) {
 
  try {
    await db.collection('users').doc(rewardData.user_id).collection('streak_rewards').add({
      streak_days: rewardData.streak_days,
      sparks_awarded: rewardData.sparks_awarded,
      description: rewardData.description,
      awarded_at: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging streak reward:', error);
  }
}

// Automated daily streak calculation and reward check
exports.updateDailyStreaks = onSchedule('0 1 * * *', async (event) => {
 
  
  try {
    console.log('Starting daily streak updates...');
    
    const usersSnapshot = await db.collection('users')
      .where('rol', '==', 'leerling')
      .get();
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Check if user completed kompas yesterday
      const yesterdayKompasRef = db.collection('welzijn')
        .doc(userId)
        .collection('dagelijkse_data')
        .doc(yesterdayString);
        
      const yesterdayData = await yesterdayKompasRef.get();
      
      if (yesterdayData.exists && yesterdayData.data().completion_bonus_awarded) {
        // User completed kompas yesterday - increment streak
        const newStreak = (userData.streak_days || 0) + 1;
        await userDoc.ref.update({ streak_days: newStreak });
        
        // Check for milestone rewards
       await checkStreakMilestonesInternal(userId);
        
        console.log(`Updated streak for ${userData.naam}: ${newStreak} days`);
      } else {
        // User didn't complete kompas yesterday - reset streak
        if (userData.streak_days > 0) {
          await userDoc.ref.update({ streak_days: 0 });
          console.log(`Reset streak for ${userData.naam}`);
        }
      }
    }
    
    console.log('Daily streak updates completed');
    return { success: true };
    
  } catch (error) {
    console.error('Error updating daily streaks:', error);
    throw error;
  }
});
// Add this debugging function to welzijn-functions.js
exports.debugWelzijnData = onCall(async (request) => {
  console.log('=== DEBUG WELZIJN FUNCTION START ===');
  
  if (!request.auth) {
    console.log('ERROR: No authentication');
    throw new Error('Authentication required');
  }
  
  const userId = request.auth.uid;
  console.log('User ID:', userId);
  
  try {
    // Check user exists and has correct role
    const userDoc = await db.collection('users').doc(userId).get();
    console.log('User doc exists:', userDoc.exists);
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('User role:', userData.rol);
      console.log('User XP:', userData.xp);
      console.log('User weekly_stats:', userData.weekly_stats);
    }
    
    // Check welzijn data structure
    const welzijnRef = db.collection('welzijn').doc(userId);
    const welzijnDoc = await welzijnRef.get();
    console.log('Welzijn doc exists:', welzijnDoc.exists);
    
    // Check recent dagelijkse_data
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    const todayDataRef = welzijnRef.collection('dagelijkse_data').doc(today);
    const yesterdayDataRef = welzijnRef.collection('dagelijkse_data').doc(yesterdayString);
    
    const [todayData, yesterdayData] = await Promise.all([
      todayDataRef.get(),
      yesterdayDataRef.get()
    ]);
    
    console.log('Today data exists:', todayData.exists);
    console.log('Yesterday data exists:', yesterdayData.exists);
    
    if (todayData.exists) {
      console.log('Today data:', todayData.data());
    }
    
    return {
      success: true,
      userId: userId,
      userExists: userDoc.exists,
      userRole: userDoc.exists ? userDoc.data().rol : null,
      welzijnExists: welzijnDoc.exists,
      todayDataExists: todayData.exists,
      yesterdayDataExists: yesterdayData.exists,
      todayData: todayData.exists ? todayData.data() : null
    };
    
  } catch (error) {
    console.error('Debug function error:', error);
    throw new Error(`Debug failed: ${error.message}`);
  }
});

// Add error handling to existing welzijn function
exports.onWelzijnKompasUpdatedFixed = onDocumentUpdated('welzijn/{userId}/dagelijkse_data/{dateString}', async (event) => {
  const userId = event.params.userId;
  const dateString = event.params.dateString;
  
  console.log(`=== WELZIJN UPDATE: ${userId} on ${dateString} ===`);
  
  try {
    const beforeData = event.data.before.data() || {};
    const afterData = event.data.after.data() || {};
    
    console.log('Before data:', beforeData);
    console.log('After data:', afterData);
    
    const newlyCompletedSegments = [];
    if (((afterData.stappen || 0) > 0) && !((beforeData.stappen || 0) > 0)) newlyCompletedSegments.push('beweging');
    if (((afterData.water_intake || 0) > 0) && !((beforeData.water_intake || 0) > 0)) newlyCompletedSegments.push('voeding');
    if (((afterData.slaap_uren || 0) > 0) && !((beforeData.slaap_uren || 0) > 0)) newlyCompletedSegments.push('slaap');
    if (afterData.humeur && !beforeData.humeur) newlyCompletedSegments.push('mentaal');
    if (((afterData.hartslag_rust || 0) > 0) && !((beforeData.hartslag_rust || 0) > 0)) newlyCompletedSegments.push('hart');

    console.log('Newly completed segments:', newlyCompletedSegments);

    if (newlyCompletedSegments.length > 0) {
      await awardWelzijnXPFixed(userId, newlyCompletedSegments, dateString);
    }

    await checkKompasCompletionBonusFixed(userId, afterData, dateString);
    
    console.log('=== WELZIJN UPDATE COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('ERROR in welzijn update:', error);
    // Don't throw - let the function complete to avoid retries
  }
});

// Fixed version with better error handling
async function awardWelzijnXPFixed(userId, completedSegments, dateString) {
  console.log(`Awarding XP to ${userId} for segments:`, completedSegments);
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error(`User ${userId} not found in users collection`);
      return;
    }
    
    const userData = userDoc.data();
    
    if (userData.rol !== 'leerling') {
      console.log(`User ${userId} is not a student, skipping XP award`);
      return;
    }

    const xpPerSegment = 4;
    const totalXP = completedSegments.length * xpPerSegment;
    const currentXP = userData.xp || 0;
    const newXP = currentXP + totalXP;

    console.log(`Updating XP: ${currentXP} + ${totalXP} = ${newXP}`);

    await userRef.update({
      xp: newXP,
      sparks: Math.floor(newXP / 100),
      last_activity: FieldValue.serverTimestamp()
    });

    // Log transaction with error handling
    try {
      await logXPTransaction({
        user_id: userId,
        user_email: userData.email,
        amount: totalXP,
        reason: 'welzijn_segment_completion',
        source_id: `welzijn_${dateString}`,
        balance_after: { xp: newXP, sparks: Math.floor(newXP / 100) },
        metadata: { completed_segments: completedSegments }
      });
    } catch (logError) {
      console.error('Failed to log XP transaction:', logError);
      // Continue execution even if logging fails
    }

    console.log(`Successfully awarded ${totalXP} XP to ${userId}`);
    
  } catch (error) {
    console.error(`Error awarding welzijn XP to ${userId}:`, error);
    throw error;
  }
}

async function checkKompasCompletionBonusFixed(userId, dayData, dateString) {
  console.log(`Checking kompas completion for ${userId} on ${dateString}`);
  
  try {
    const isKompasComplete = (dayData.stappen || 0) > 0 && 
                           (dayData.water_intake || 0) > 0 && 
                           (dayData.slaap_uren || 0) > 0 && 
                           dayData.humeur && 
                           (dayData.hartslag_rust || 0) > 0;

    console.log('Kompas complete:', isKompasComplete);
    console.log('Bonus already awarded:', dayData.completion_bonus_awarded);

    if (isKompasComplete && !dayData.completion_bonus_awarded) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const bonusXP = 10;
        const currentXP = userData.xp || 0;
        const newXP = currentXP + bonusXP;
        const weeklyStats = userData.weekly_stats || { kompas_days: 0, trainingen: 0 };
        const updatedWeeklyStats = { ...weeklyStats, kompas_days: (weeklyStats.kompas_days || 0) + 1 };

        await userRef.update({
          xp: newXP,
          sparks: Math.floor(newXP / 100),
          weekly_stats: updatedWeeklyStats
        });

        const dayRef = db.collection('welzijn').doc(userId).collection('dagelijkse_data').doc(dateString);
        await dayRef.update({
          completion_bonus_awarded: true,
          completion_bonus_xp: bonusXP
        });

        console.log(`Awarded completion bonus of ${bonusXP} XP to ${userId}`);
      }
    }
  } catch (error) {
    console.error(`Error checking kompas completion for ${userId}:`, error);
    throw error;
  }
}
// in src/welzijn-functions.js

exports.getClassWelzijnStats = onCall(async (request) => {
  if (!request.auth) throw new Error('Authentication required');

  const { classId, schoolId, studentId } = request.data;
  if (!schoolId) throw new Error('School ID is required');

  try {
    let studentEmails = [];

    // Bepaal voor welke leerlingen we data moeten ophalen
    if (studentId) {
  // Check of studentId een email is of document ID
      if (studentId.includes('@')) {
        // Het is een email - gebruik direct
        studentEmails.push(studentId);
      } else {
        // Het is een document ID - haal email op
        const studentDoc = await db.collection('users').doc(studentId).get();
        if (studentDoc.exists) {
          studentEmails.push(studentDoc.data().email);
        }
  
        studentEmails.push(studentDoc.data().email);
      }
    } else if (classId && classId !== 'all') {
      // Als er een specifieke groep is geselecteerd
      const groupDoc = await db.collection('groepen').doc(classId).get();
      if (groupDoc.exists) {
        studentEmails = groupDoc.data().leerling_ids || [];
      }
    } else {
      // Geen selectie, dus geen data
      return { success: true, groupStats: {}, studentData: [] };
    }

    if (studentEmails.length === 0) {
      return { success: true, groupStats: {}, studentData: [] };
    }

    // Haal alle relevante leerling-documenten op
    const usersSnapshot = await db.collection('users').where('email', 'in', studentEmails).get();
    const studentDocs = usersSnapshot.docs;

    // Data aggregatie
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const studentDataPromises = studentDocs.map(async (doc) => {
      const student = doc.data();
      const welzijnHistorySnapshot = await db.collection('welzijn').doc(doc.id)
        .collection('dagelijkse_data')
        .where(admin.firestore.FieldPath.documentId(), '>=', thirtyDaysAgo.toISOString().split('T')[0])
        .get();

      const history = welzijnHistorySnapshot.docs.map(d => ({...d.data(), id: d.id }));
      
      // Bereken stats voor deze ene leerling
      const logsLast7Days = history.filter(h => new Date(h.id) >= new Date(new Date().setDate(new Date().getDate() - 7))).length;
      const logsLast30Days = history.length;
      
      const avgSleep = history.length > 0 ? history.reduce((sum, h) => sum + (h.slaap_uren || 0), 0) / history.length : 0;
      const avgSteps = history.length > 0 ? history.reduce((sum, h) => sum + (h.stappen || 0), 0) / history.length : 0;
      
      const scores = history.map(h => {
          const s = {
              beweging: Math.min(100, (h.stappen || 0) / 10000 * 100),
              voeding: Math.min(100, (h.water_intake || 0) / 2000 * 100),
              slaap: ((h.slaap_uren || 0) / 8.5 * 80) + ((h.slaap_kwaliteit || 3) -1) * 5,
              mentaal: (h.humeur ? ({'Zeer goed':100, 'Goed':80, 'Neutraal':60, 'Minder goed':40, 'Slecht':20}[h.humeur] || 0) : 0),
              hart: (h.hartslag_rust ? (100 - (Math.abs((h.hartslag_rust || 75) - 75) / 25 * 100)) : 0)
          };
          return (s.beweging+s.voeding+s.slaap+s.mentaal+s.hart)/5;
      });
      const avgScore = scores.length > 0 ? scores.reduce((a,b) => a+b,0) / scores.length : 0;


      return {
        id: doc.id,
        naam: student.naam,
        logs: {
          last7days: logsLast7Days,
          last30days: logsLast30Days,
        },
        avgSleep: parseFloat(avgSleep.toFixed(1)),
        avgSteps: Math.round(avgSteps),
        avgScore: Math.round(avgScore),
      };
    });

    const studentData = await Promise.all(studentDataPromises);

    // Bereken groepsgemiddelden
    const groupStats = {
      totalStudents: studentData.length,
      activeParticipation: Math.round((studentData.filter(s => s.logs.last7days > 0).length / studentData.length) * 100) || 0,
      avgLogs7Days: parseFloat((studentData.reduce((sum, s) => sum + s.logs.last7days, 0) / studentData.length).toFixed(1)) || 0,
      avgLogs30Days: parseFloat((studentData.reduce((sum, s) => sum + s.logs.last30days, 0) / studentData.length).toFixed(1)) || 0,
      avgSleep: parseFloat((studentData.reduce((sum, s) => sum + s.avgSleep, 0) / studentData.length).toFixed(1)) || 0,
      avgSteps: Math.round(studentData.reduce((sum, s) => sum + s.avgSteps, 0) / studentData.length) || 0,
      avgScore: Math.round(studentData.reduce((sum, s) => sum + s.avgScore, 0) / studentData.length) || 0,
    };

    return { success: true, groupStats, studentData };

  } catch (error) {
    console.error('Error in getClassWelzijnStats:', error);
    return { success: false, error: error.message };
  }
});