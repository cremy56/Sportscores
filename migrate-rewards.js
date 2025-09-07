// cleanup-and-migrate-students-only.js
// 1. Verwijder rewards velden van non-leerlingen
// 2. Voeg rewards velden alleen toe aan leerlingen

import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// Initialiseer de Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();

// STAP 1: Verwijder rewards velden van non-leerlingen
async function removeRewardsFromNonStudents() {
  console.log('Removing rewards fields from non-students (admins, teachers)...');
  
  try {
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    
    const batch = db.batch();
    let cleanupCount = 0;
    
    usersSnapshot.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      
      // Als gebruiker GEEN leerling is en WEL rewards velden heeft
      if (userData.rol !== 'leerling' && userData.hasOwnProperty('xp')) {
        const userRef = db.collection('users').doc(userDoc.id);
        
        // Verwijder alle rewards velden
        batch.update(userRef, {
          xp: admin.firestore.FieldValue.delete(),
          sparks: admin.firestore.FieldValue.delete(),
          streak_days: admin.firestore.FieldValue.delete(),
          personal_records_count: admin.firestore.FieldValue.delete(),
          last_activity: admin.firestore.FieldValue.delete(),
          weekly_stats: admin.firestore.FieldValue.delete()
        });
        
        cleanupCount++;
        console.log(`  - Removing rewards from ${userData.rol}: ${userData.naam || userData.email}`);
      }
    });
    
    if (cleanupCount > 0) {
      await batch.commit();
      console.log(`Successfully removed rewards data from ${cleanupCount} non-students`);
    } else {
      console.log('No non-students with rewards data found');
    }
    
  } catch (error) {
    console.error('Error removing rewards from non-students:', error);
  }
}

// STAP 2: Voeg rewards velden toe ALLEEN aan leerlingen
async function addRewardsToStudentsOnly() {
  console.log('Adding rewards fields to students only...');
  
  try {
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    
    const batch = db.batch();
    let addCount = 0;
    
    usersSnapshot.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      
      // Alleen leerlingen EN alleen als ze nog geen rewards velden hebben
      if (userData.rol === 'leerling' && !userData.hasOwnProperty('xp')) {
        const userRef = db.collection('users').doc(userDoc.id);
        
        batch.update(userRef, {
          // Essentiële rewards velden
          xp: 0,
          sparks: 0,
          streak_days: 0,
          personal_records_count: 0,
          last_activity: null,
          
          // Wekelijkse statistieken (minimaal)
          weekly_stats: {
            kompas: 0,
            trainingen: 0,
            perfectWeek: false
          }
        });
        
        addCount++;
        console.log(`  - Adding rewards to student: ${userData.naam || userData.email}`);
      }
    });
    
    if (addCount > 0) {
      await batch.commit();
      console.log(`Successfully added rewards data to ${addCount} students`);
    } else {
      console.log('All students already have rewards data');
    }
    
  } catch (error) {
    console.error('Error adding rewards to students:', error);
  }
}

// STAP 3: Toon overzicht van wie wat heeft
async function showCurrentState() {
  console.log('\nCurrent state overview:');
  
  try {
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    
    const roleStats = {
      'leerling': { total: 0, withRewards: 0 },
      'leerkracht': { total: 0, withRewards: 0 },
      'administrator': { total: 0, withRewards: 0 },
      'super-administrator': { total: 0, withRewards: 0 }
    };
    
    usersSnapshot.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      const rol = userData.rol || 'unknown';
      
      if (roleStats[rol]) {
        roleStats[rol].total++;
        if (userData.hasOwnProperty('xp')) {
          roleStats[rol].withRewards++;
        }
      }
    });
    
    console.log('\nRole breakdown:');
    Object.entries(roleStats).forEach(([role, stats]) => {
      console.log(`${role}: ${stats.withRewards}/${stats.total} have rewards data`);
    });
    
  } catch (error) {
    console.error('Error showing current state:', error);
  }
}

// HOOFD FUNCTIE
async function cleanupAndMigrate() {
  console.log('Starting cleanup and student-only rewards migration...\n');
  
  // Toon huidige staat
  await showCurrentState();
  
  console.log('\n--- Starting cleanup ---');
  // Verwijder rewards van non-leerlingen
  await removeRewardsFromNonStudents();
  
  console.log('\n--- Adding to students ---');
  // Voeg rewards toe aan leerlingen
  await addRewardsToStudentsOnly();
  
  console.log('\n--- Final state ---');
  // Toon eindresultaat
  await showCurrentState();
  
  console.log('\nCleanup and migration completed successfully!');
  console.log('\nNow only students (leerlingen) have rewards data.');
}

// Run de cleanup en migratie
cleanupAndMigrate().catch(console.error);