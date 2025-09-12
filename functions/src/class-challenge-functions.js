const {onCall} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { getWeekStart, getWeekEnd, getWeekNumber, logXPTransaction } = require('./utils');

// Class Challenge System
exports.createWeeklyClassChallenge = onSchedule('0 6 * * 1', async (event) => {
  
  
  try {
    console.log('Creating weekly class challenges...');
    
    // Get all active classes/groups
    const groupsSnapshot = await db.collection('groepen').get();
    
    for (const groupDoc of groupsSnapshot.docs) {
      const groupData = groupDoc.data();
      const groupId = groupDoc.id;
      
      // Count active students in group
      const studentsCount = groupData.leerlingen?.length || 0;
      if (studentsCount === 0) continue;
      
      // Calculate challenge targets based on group size
      const xpTarget = Math.max(2000, studentsCount * 150); // Minimum 2000 XP, or 150 per student
      const trainingTarget = Math.max(10, studentsCount * 2); // Minimum 10 trainings, or 2 per student
      
      // Get current week dates
      const now = new Date();
      const weekStart = getWeekStart(now);
      const weekEnd = getWeekEnd(now);
      const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
      
      // Create challenge
      const challengeData = {
        group_id: groupId,
        group_name: groupData.naam,
        school_id: groupData.school_id,
        week_id: weekId,
        week_start: weekStart,
        week_end: weekEnd,
        targets: {
          total_xp: xpTarget,
          total_trainings: trainingTarget
        },
        current_progress: {
          total_xp: 0,
          total_trainings: 0,
          participants: []
        },
        reward_xp: 40,
        status: 'active',
        created_at: FieldValue.serverTimestamp()
      };
      
      await db.collection('class_challenges').doc(`${groupId}_${weekId}`).set(challengeData);
      
      console.log(`Created challenge for group ${groupData.naam}: ${xpTarget} XP target`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error creating weekly class challenges:', error);
    throw error;
  }
});

// Function to update class challenge progress when students earn XP
exports.updateClassChallengeProgress = onCall(async (request) => {
 
  
  try {
    const { userId, xpEarned, action } = request.data; // action: 'xp', 'training', etc.
    
    // Get user's group
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'User not found' };
    
    const userData = userDoc.data();
    const userGroups = userData.groepen || [];
    
    // Get current week ID
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
    
    // Update progress for all user's groups
    for (const groupId of userGroups) {
      const challengeId = `${groupId}_${weekId}`;
      const challengeRef = db.collection('class_challenges').doc(challengeId);
      const challengeDoc = await challengeRef.get();
      
      if (!challengeDoc.exists) continue;
      
      const challengeData = challengeDoc.data();
      const currentProgress = challengeData.current_progress;
      
      // Update progress based on action type
      const updates = {};
      
      if (action === 'xp' && xpEarned) {
        updates['current_progress.total_xp'] = (currentProgress.total_xp || 0) + xpEarned;
      }
      
      if (action === 'training') {
        updates['current_progress.total_trainings'] = (currentProgress.total_trainings || 0) + 1;
      }
      
      // Track participant
      const participants = currentProgress.participants || [];
      if (!participants.includes(userId)) {
        updates['current_progress.participants'] = [...participants, userId];
      }
      
      // Update challenge
      if (Object.keys(updates).length > 0) {
        await challengeRef.update(updates);
        
        // Check if challenge is completed
        await checkChallengeCompletion(challengeId);
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error updating class challenge progress:', error);
    throw error;
  }
});

async function checkChallengeCompletion(challengeId) {
  
 
  const challengeRef = db.collection('class_challenges').doc(challengeId);
  const challengeDoc = await challengeRef.get();
  
  if (!challengeDoc.exists) return;
  
  const challengeData = challengeDoc.data();
  const progress = challengeData.current_progress;
  const targets = challengeData.targets;
  
  // Check if all targets are met
  const xpComplete = progress.total_xp >= targets.total_xp;
  const trainingComplete = progress.total_trainings >= targets.total_trainings;
  
  if (xpComplete && trainingComplete && challengeData.status === 'active') {
    // Challenge completed! Award XP to all participants
    await challengeRef.update({ 
      status: 'completed',
      completed_at: FieldValue.serverTimestamp()
    });
    
    // Award XP to participants
    const rewardXP = challengeData.reward_xp || 40;
    for (const userId of progress.participants) {
      await awardClassChallengeReward(userId, rewardXP, challengeData);
    }
    
    console.log(`Class challenge ${challengeId} completed! Awarded ${rewardXP} XP to ${progress.participants.length} students`);
  }
}

async function awardClassChallengeReward(userId, xpAmount, challengeData) {
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const currentXP = userData.xp || 0;
    const newXP = currentXP + xpAmount;
    const newSparks = Math.floor(newXP / 100);
    
    await userRef.update({
      xp: newXP,
      sparks: newSparks,
      last_class_challenge_reward: FieldValue.serverTimestamp()
    });
    
    // Log the reward
    await logXPTransaction( {
      user_id: userId,
      user_email: userData.email,
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
