const {onCall, onDocumentUpdated, onSchedule} = require('firebase-functions/v2/https');
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
