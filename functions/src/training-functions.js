const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, updateClassChallengeProgressInternal, getWeekStart, getWeekNumber } = require('./utils');
// ==============================================
// TRAINING VALIDATION XP SYSTEM
// ==============================================

// Cloud Function die triggert wanneer een leerling_schema document wordt geüpdatet
exports.onTrainingWeekValidated = onDocumentUpdated('leerling_schemas/{schemaId}', async (event) => {
 
  const change = event.data;
  const schemaId = event.params.schemaId;
  const afterData = change.after.data();
  const beforeData = change.before.data();

  try {
    // --- LOGICA VOOR DIRECTE UPDATE VAN TRAININGSTELLER ---
    const now = new Date();
    const weekStart = getWeekStart(now);
    const currentWeekKey = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
    
    const trainingsBefore = beforeData.gevalideerde_weken?.[currentWeekKey]?.trainingen || {};
    const trainingsAfter = afterData.gevalideerde_weken?.[currentWeekKey]?.trainingen || {};
    
    // Als er een nieuwe trainingsdag is toegevoegd in de huidige week
    if (Object.keys(trainingsAfter).length > Object.keys(trainingsBefore).length) {
      console.log(`New training logged by ${afterData.leerling_id} for week ${currentWeekKey}`);
      
      const userQuery = await db.collection('users').where('email', '==', afterData.leerling_id).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        const weeklyStats = userData.weekly_stats || { kompas_days: 0, trainingen: 0 };
        
        const newTrainingCount = (weeklyStats.trainingen || 0) + 1;
        
        await userDoc.ref.update({
          'weekly_stats.trainingen': newTrainingCount
        });
        
        // Check direct voor de bonus als het doel van 3 is bereikt
        if (newTrainingCount === 3 && !weeklyStats.trainingBonus) {
          await awardWeeklyBonus(userDoc, userData, 25, 'weekly_training_bonus');
          // Markeer de bonus als toegekend om dubbele toekenning te voorkomen
          await userDoc.ref.update({ 'weekly_stats.trainingBonus': true });
        }
      }
    }

    // --- BESTAANDE LOGICA VOOR XP-TOEKENNING NA VALIDATIE ---
    const beforeValidated = beforeData.gevalideerde_weken || {};
    const afterValidated = afterData.gevalideerde_weken || {};
    let newlyValidatedWeeks = [];

    for (const [weekKey, weekData] of Object.entries(afterValidated)) {
      if (weekData.gevalideerd && !beforeValidated[weekKey]?.gevalideerd) {
        newlyValidatedWeeks.push({
          weekKey,
          weekData,
          trainingsXP: weekData.trainingsXP || 0
        });
      }
    }

    if (newlyValidatedWeeks.length > 0) {
      await awardTrainingXP(afterData.leerling_id, newlyValidatedWeeks, schemaId);
    }
    
  } catch (error) {
    console.error('Error processing schema update:', error);
  }
});

// Functie om XP toe te kennen aan een leerling
// In training-functions.js

async function awardTrainingXP(leerlingEmail, validatedWeeks, schemaId) {
  try {
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('email', '==', leerlingEmail).get();
    
    if (userQuery.empty) {
      console.error(`User not found with email: ${leerlingEmail}`);
      return;
    }
    
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    
    if (userData.rol !== 'leerling') {
      console.error(`User ${leerlingEmail} is not a student, skipping XP award`);
      return;
    }

    let totalXP = 0;
    validatedWeeks.forEach(week => {
      totalXP += week.trainingsXP || 0;
    });
    
    if (totalXP <= 0) {
      console.log('No XP to award for training validation.');
      return;
    }
    
    // --- START CORRECTIE ---
    // Update beide XP-scores (Carrière en Periode)
    await userRef.update({
  xp: FieldValue.increment(xpAmount),                // Carrièrescore
  xp_current_period: FieldValue.increment(xpAmount),  // Periodescore
  xp_current_school_year: FieldValue.increment(xpAmount) // Jaarscore
});
    // --- EINDE CORRECTIE ---
    
    console.log(`Successfully awarded ${totalXP} XP to ${userData.naam || leerlingEmail} for training.`);
    
    // Log de transactie (zonder balance_after, tenzij je die apart ophaalt)
    await logXPTransaction({
      user_id: userDoc.id,
      user_email: leerlingEmail,
      amount: totalXP,
      reason: 'training_validation',
      source_id: schemaId,
      metadata: { schema_id: schemaId, validated_weeks_count: validatedWeeks.length }
    });
    
    await updateClassChallengeProgressInternal(userDoc.id, totalXP, 'xp');
    
  } catch (error) {
    console.error('Error awarding training XP:', error);
    throw error;
  }
}
exports.manualAwardTrainingXP = onCall(async (request) => {
 
  
  // Check of gebruiker admin is
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!userDoc.exists || !['administrator', 'super-administrator'].includes(userDoc.data().rol)) {
    throw new Error('Only administrators can manually award XP');
  }
  
  const { userEmail, xpAmount, reason } = request.data;
  
  if (!userEmail || !xpAmount || xpAmount <= 0) {
    throw new Error('Valid userEmail and positive xpAmount required');
  }
  
  try {
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('email', '==', userEmail).get();
    
    if (userQuery.empty) {
      throw new Error('User not found');
    }
    
    const targetUserDoc = userQuery.docs[0];
    const targetUserData = targetUserDoc.data();
    const currentXP = targetUserData.xp || 0;
    const currentSparks = targetUserData.sparks || 0;
    const newXP = currentXP + xpAmount;
    const newSparks = Math.floor(newXP / 100);
    
    await targetUserDoc.ref.update({
      xp: newXP,
      sparks: newSparks
    });
    
    await logXPTransaction( {
      user_id: targetUserDoc.id,
      user_email: userEmail,
      transaction_type: 'earn',
      reward_type: 'xp',
      amount: xpAmount,
      reason: reason || 'manual_award',
      source_id: 'manual',
      balance_after: { xp: newXP, sparks: newSparks },
      metadata: {
        awarded_by: request.auth.uid,
        manual: true
      }
    });
    
    return {
      success: true,
      message: `Awarded ${xpAmount} XP to ${targetUserData.naam || userEmail}`,
      newTotals: { xp: newXP, sparks: newSparks }
    };
    
  } catch (error) {
    console.error('Error in manual XP award:', error);
    throw new Error('Failed to award XP: ' + error.message);
  }
});
// Add to index.js - Training Program Completion Detection
exports.checkTrainingProgramCompletion = onDocumentUpdated('leerling_schemas/{schemaId}', async (event) => {
  
  const change = event.data;
  const schemaId = event.params.schemaId;
  
  const afterData = change.after.data();
  
  try {
    // Check if the entire training program is now completed
    const isFullyCompleted = checkIfProgramFullyCompleted(afterData);
    
    if (isFullyCompleted && !afterData.completion_reward_awarded) {
      await awardProgramCompletionReward(afterData.leerling_id, schemaId, afterData);
    }
    
  } catch (error) {
    console.error('Error checking training program completion:', error);
  }
});

function checkIfProgramFullyCompleted(schemaData) {
  const gevalideerdeWeken = schemaData.gevalideerde_weken || {};
  const totalWeken = schemaData.total_weken || 0;
  
  if (totalWeken === 0) return false;
  
  // Count validated weeks
  let validatedCount = 0;
  Object.values(gevalideerdeWeken).forEach(week => {
    if (week.gevalideerd === true) {
      validatedCount++;
    }
  });
  
  // Consider program completed if 90% of weeks are validated
  const completionThreshold = Math.ceil(totalWeken * 0.9);
  return validatedCount >= completionThreshold;
}

async function awardProgramCompletionReward(leerlingEmail, schemaId, schemaData) {
  try {
    // Zoek de gebruiker op
    const usersQuery = await db.collection('users')
      .where('email', '==', leerlingEmail)
      .where('rol', '==', 'leerling')
      .get();
      
    if (usersQuery.empty) {
      console.error(`Student not found: ${leerlingEmail}`);
      return;
    }
    
    const userDoc = usersQuery.docs[0];
    const userData = userDoc.data();
    
    // CORRECT: Ken een XP-bonus toe in plaats van Sparks
    const completionXP = 800; // 8 Sparks * 100 XP/Spark
    
    await userRef.update({
  xp: FieldValue.increment(xpAmount),                // Carrièrescore
  xp_current_period: FieldValue.increment(xpAmount),  // Periodescore
  xp_current_school_year: FieldValue.increment(xpAmount) // Jaarscore
});
    
    // Markeer de beloning als toegekend in het schema
    await db.collection('leerling_schemas').doc(schemaId).update({
      completion_reward_awarded: true,
      completion_reward_xp: completionXP, // Log de XP-bonus
      completion_reward_date: FieldValue.serverTimestamp()
    });
    
    // Log de XP-transactie (niet de Sparks)
    await logXPTransaction({
        user_id: userDoc.id,
        amount: completionXP,
        reason: 'training_program_completion',
        source_id: schemaId
    });
    
    console.log(`Awarded ${completionXP} XP to ${userData.naam} for completing training program`);
    
  } catch (error) {
    console.error('Error awarding training program completion reward:', error);
  }
}

async function logTrainingCompletion(completionData) {

  try {
    await db.collection('users')
      .doc(completionData.user_id)
      .collection('training_completions')
      .add({
        schema_id: completionData.schema_id,
        program_name: completionData.program_name,
        sparks_awarded: completionData.sparks_awarded,
        completed_at: FieldValue.serverTimestamp()
      });
      
    console.log(`Training completion logged for user ${completionData.user_id}`);
  } catch (error) {
    console.error('Error logging training completion:', error);
  }
}

async function createCompletionNotification(userId, userName, sparksAwarded) {
  
  try {
    await db.collection('notifications').add({
      recipient_id: userId,
      type: 'training_completion',
      title: 'Training Program Voltooid!',
      message: `Gefeliciteerd ${userName}! Je hebt een volledig trainingsprogramma afgerond en ${sparksAwarded} Sparks verdiend.`,
      sparks_earned: sparksAwarded,
      read: false,
      created_at: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating completion notification:', error);
  }
}

// Manual function to check and award retroactive rewards
exports.checkRetroactiveTrainingRewards = onCall(async (request) => {
  
  
  // Admin check
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const adminDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!adminDoc.exists || !['administrator', 'super-administrator'].includes(adminDoc.data().rol)) {
    throw new Error('Admin access required');
  }
  
  try {
    const schemasSnapshot = await db.collection('leerling_schemas').get();
    let rewardsAwarded = 0;
    
    for (const schemaDoc of schemasSnapshot.docs) {
      const schemaData = schemaDoc.data();
      
      // Skip if already awarded
      if (schemaData.completion_reward_awarded) continue;
      
      // Check if program is completed
      if (checkIfProgramFullyCompleted(schemaData)) {
        await awardProgramCompletionReward(
          schemaData.leerling_id, 
          schemaDoc.id, 
          schemaData
        );
        rewardsAwarded++;
      }
    }
    
    return {
      success: true,
      message: `Checked ${schemasSnapshot.docs.length} training programs, awarded ${rewardsAwarded} completion rewards`,
      rewardsAwarded
    };
    
  } catch (error) {
    console.error('Error checking retroactive training rewards:', error);
    throw error;
  }
});
