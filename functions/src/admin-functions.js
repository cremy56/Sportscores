const {onCall, onDocumentUpdated} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {FieldValue} = require('firebase-admin/firestore');
const db = admin.firestore();
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
  const userDoc = await db.collection('users').doc(uid).get(); // ✅ Fix
  
  if (!userDoc.exists || userDoc.data().rol !== 'administrator') {
    throw new Error('Alleen administrators kunnen consistency checks uitvoeren');
  }
  
  const inconsistencies = [];
  
 try {
    // Check alle scores tegen user namen
    const scoresSnapshot = await db.collection('scores').get(); // ✅ Fix
    
    for (const scoreDoc of scoresSnapshot.docs) {
      const scoreData = scoreDoc.data();
      const leerlingDoc = await db.collection('users') // ✅ Fix
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
    await db.collection('consistency_reports').add({ // ✅ Fix
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
exports.onUserRegistration = onCall(async (request) => {
 
  const { email } = request.data;
  
  
  try {
    // Check of er data is in toegestane_gebruikers
    const toegestaneRef = db.collection('toegestane_gebruikers').doc(email);
    const toegestaneSnap = await toegestaneRef.get();
    
    if (toegestaneSnap.exists) {
      const toegestaneData = toegestaneSnap.data();
      
      // Kopieer data naar users collectie
      const userRef = db.collection('users').doc(email);
      await userRef.set({
        ...toegestaneData,
        registered_at: FieldValue.serverTimestamp()
      });
      
      console.log(`Migrated data for ${email} from toegestane_gebruikers to users`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
});
module.exports = {
  onUserNameChange,
  checkDataConsistency,
  onUserRegistration
};