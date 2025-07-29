const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onCall} = require('firebase-functions/v2/https');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');

initializeApp();

// ==============================================
// DATA CONSISTENCY MONITORING
// ==============================================

// Cloud Function voor naam wijzigingen monitoren
exports.onUserNameChange = onDocumentUpdated('users/{userId}', async (event) => {
    const change = event.data;
    const userId = event.params.userId;

    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Check of naam is gewijzigd
    if (beforeData.naam !== afterData.naam) {
      console.log(`Naam wijziging gedetecteerd voor ${userId}: ${beforeData.naam} -> ${afterData.naam}`);
      
      // Update alle scores met oude naam
      await updateDenormalizedNames(userId, beforeData.naam, afterData.naam);
      
      // Log voor monitoring
      await logNameChange(userId, beforeData.naam, afterData.naam);
    }
  });

async function updateDenormalizedNames(userId, oldName, newName) {
  const db = getFirestore();
  const batch = db.batch();
  
  try {
    // Zoek alle scores met oude naam
    const scoresQuery = await db.collection('scores')
      .where('leerling_id', '==', userId)
      .where('leerling_naam', '==', oldName)
      .get();
    
    console.log(`Gevonden ${scoresQuery.docs.length} scores om bij te werken`);
    
    // Update in batches (max 500 per batch)
    scoresQuery.docs.forEach(doc => {
      batch.update(doc.ref, { 
        leerling_naam: newName,
        laatst_bijgewerkt: FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`Succesvol ${scoresQuery.docs.length} scores bijgewerkt`);
    
  } catch (error) {
    console.error('Fout bij updaten denormalized names:', error);
    // Send alert to administrators
    await sendAlertToAdmins(userId, oldName, newName, error);
  }
}

async function logNameChange(userId, oldName, newName) {
  const db = getFirestore();
  
  await db.collection('audit_log').add({
    type: 'name_change',
    userId: userId,
    oldName: oldName,
    newName: newName,
    timestamp: FieldValue.serverTimestamp(),
    status: 'completed'
  });
}

async function sendAlertToAdmins(userId, oldName, newName, error) {
  const db = getFirestore();
  
  // Zoek alle administrators
  const adminsQuery = await db.collection('users')
    .where('rol', '==', 'administrator')
    .get();
  
  // Create notifications for admins
  const batch = db.batch();
  
  adminsQuery.docs.forEach(adminDoc => {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      recipient: adminDoc.id,
      type: 'data_consistency_error',
      message: `Fout bij bijwerken naam van ${oldName} naar ${newName} voor gebruiker ${userId}`,
      error: error.message,
      timestamp: FieldValue.serverTimestamp(),
      read: false
    });
  });
  
  await batch.commit();
}

// ==============================================
// CONSISTENCY CHECK FUNCTIE
// ==============================================

// Handmatige consistency check (kan periodiek worden uitgevoerd)
exports.checkDataConsistency = onCall(async (request) => {
  // Verify user is admin
  const uid = request.auth.uid;
  const userDoc = await getFirestore().collection('users').doc(uid).get();
  
  if (!userDoc.exists || userDoc.data().rol !== 'administrator') {
    throw new Error('Alleen administrators kunnen consistency checks uitvoeren');
  }
  
  const inconsistencies = [];
  
  try {
    // Check alle scores tegen user namen
    const scoresSnapshot = await getFirestore().collection('scores').get();
    
    for (const scoreDoc of scoresSnapshot.docs) {
      const scoreData = scoreDoc.data();
      const leerlingDoc = await getFirestore()
        .collection('users')
        .doc(scoreData.leerling_id)
        .get();
      
      if (leerlingDoc.exists) {
        const actualName = leerlingDoc.data().naam;
        const storedName = scoreData.leerling_naam;
        
        if (actualName !== storedName) {
          inconsistencies.push({
            scoreId: scoreDoc.id,
            leerlingId: scoreData.leerling_id,
            actualName: actualName,
            storedName: storedName
          });
        }
      }
    }
    
    // Log resultaten
    await getFirestore().collection('consistency_reports').add({
      timestamp: FieldValue.serverTimestamp(),
      inconsistencies: inconsistencies,
      totalScoresChecked: scoresSnapshot.docs.length,
      performedBy: uid
    });
    
    return {
      success: true,
      inconsistenciesFound: inconsistencies.length,
      totalChecked: scoresSnapshot.docs.length,
      inconsistencies: inconsistencies
    };
    
  } catch (error) {
    console.error('Consistency check failed:', error);
    throw new Error('Consistency check failed');
  }
});