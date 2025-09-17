const {onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
const { logXPTransaction, updateClassChallengeProgressInternal } = require('./utils');
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
    // OPMERKING: De directe update van weekly_stats is hier verwijderd.
    // Dit wordt nu centraal afgehandeld door de 'checkWeeklyBonuses' functie in welzijn-functions.js.

    const beforeValidated = beforeData.gevalideerde_weken || {};
    const afterValidated = afterData.gevalideerde_weken || {};
    let newlyValidatedWeeks = [];

    for (const [weekKey, weekData] of Object.entries(afterValidated)) {
      if (weekData.gevalideerd && !beforeValidated[weekKey]?.gevalideerd) {
        newlyValidatedWeeks.push({
          weekKey,
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
    const userQuery = await db.collection('users').where('email', '==', leerlingEmail).get();
    if (userQuery.empty) return;
    
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    if (userData.rol !== 'leerling') return;

    let totalXP = 0;
    validatedWeeks.forEach(week => {
      totalXP += week.trainingsXP || 0;
    });
    
    if (totalXP <= 0) return;
    
    // --- START CORRECTIE ---
    // Gebruik de 'totalXP' variabele die we hierboven hebben berekend.
    await userDoc.ref.update({
      xp: FieldValue.increment(totalXP),
      xp_current_period: FieldValue.increment(totalXP),
      xp_current_school_year: FieldValue.increment(totalXP)
    });
    // --- EINDE CORRECTIE ---
    
    console.log(`Successfully awarded ${totalXP} XP to ${userData.naam} for training.`);
    await logXPTransaction({ user_id: userDoc.id, amount: totalXP, reason: 'training_validation', source_id: schemaId });
    await updateClassChallengeProgressInternal(userDoc.id, totalXP, 'xp');
    
  } catch (error) {
    console.error('Error awarding training XP:', error);
  }
}

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
    const usersQuery = await db.collection('users').where('email', '==', leerlingEmail).get();
    if (usersQuery.empty) return;

    const userDoc = usersQuery.docs[0];
    const completionXP = 800; // De beloning is 800 XP
    
    await userDoc.ref.update({
      xp: FieldValue.increment(completionXP),
      xp_current_period: FieldValue.increment(completionXP),
      xp_current_school_year: FieldValue.increment(completionXP),
      completed_programs: FieldValue.increment(1)
    });

    await db.collection('leerling_schemas').doc(schemaId).update({ completion_reward_awarded: true, completion_reward_xp: completionXP });
    await logXPTransaction({ user_id: userDoc.id, amount: completionXP, reason: 'training_program_completion', source_id: schemaId });
    
    // Roep de gecorrigeerde logging/notificatie helpers aan
    await logTrainingCompletion({ user_id: userDoc.id, schema_id: schemaId, program_name: schemaData.naam, xp_awarded: completionXP });
    await createCompletionNotification(userDoc.id, userDoc.data().naam, completionXP);

  } catch (error) {
    console.error('Error awarding program completion reward:', error);
  }
}

async function logTrainingCompletion(completionData) {

  try {
    await db.collection('users').doc(completionData.user_id).collection('training_completions').add({
      schema_id: completionData.schema_id,
      program_name: completionData.program_name,
      xp_awarded: completionData.xp_awarded, // Was sparks_awarded
      completed_at: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging training completion:', error);
  }
}

async function createCompletionNotification(userId, userName, xpAwarded) {
  try {
    await db.collection('notifications').add({
      recipient_id: userId,
      type: 'training_completion',
      title: 'Trainingsprogramma Voltooid!',
      message: `Gefeliciteerd ${userName}! Je hebt een volledig trainingsprogramma afgerond en ${xpAwarded} XP verdiend.`, // Aangepaste tekst
      xp_earned: xpAwarded, // Was sparks_earned
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
