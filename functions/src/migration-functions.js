// functions/src/migration-functions.js
// Email-to-ID Migratie Cloud Functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * FASE 1: DRY RUN - Analyze what would be migrated
 * No data is written to the database
 */
exports.analyzeEmailMigration = functions
  .https
  .onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Security check - validate admin token
    const adminToken = req.query.admin_token || req.body.admin_token;
    
    if (!adminToken) {
      return res.status(401).json({
        error: 'Missing admin_token parameter',
        message: 'Provide ?admin_token=YOUR_TOKEN in request'
      });
    }

    // Validate token matches environment variable
    // For testing: use token from .env.local or allow any token (DEV ONLY)
const validToken = process.env.MIGRATION_ADMIN_TOKEN || 'dev_token_12345';
    
    if (adminToken !== validToken) {
      return res.status(403).json({
        error: 'Invalid admin token',
        message: 'Token does not match. Check MIGRATION_ADMIN_TOKEN in Firebase config.'
      });
    }

    const db = admin.firestore();
    
    try {
      console.log('🔍 Starting email migration analysis...');
      
      // Step 1: Build email → smartschool_id map from toegestane_gebruikers
      console.log('📊 Step 1: Building email→ID map from toegestane_gebruikers...');
      
      const emailToIdMap = {};
      const usersSnap = await db.collection('toegestane_gebruikers').get();
      
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.email) {
          // Use lowercase for case-insensitive matching
          emailToIdMap[data.email.toLowerCase()] = doc.id; // doc.id = smartschool_id_hash
        }
      });
      
      console.log(`✅ Found ${Object.keys(emailToIdMap).length} users in toegestane_gebruikers`);
      
      // Step 2: Find all scores with email IDs
      console.log('📊 Step 2: Scanning scores collection for email-based IDs...');
      
      const scoresSnap = await db.collection('scores').get();
      
      const analysis = {
        total_scores: 0,
        email_based_scores: 0,
        can_migrate: 0,
        no_matching_user: 0,
        by_school: {},
        mismatches: [],
        duplicates_check: {
          unique_emails: 0,
          unique_smartschool_ids: 0
        }
      };
      
      const emailsFound = new Set();
      const smartschoolIdsWillCreate = new Set();
      
      scoresSnap.forEach(doc => {
        const data = doc.data();
        analysis.total_scores++;
        
        // Check if leerling_id is an email
        if (data.leerling_id && data.leerling_id.includes('@')) {
          analysis.email_based_scores++;
          
          const email = data.leerling_id.toLowerCase();
          emailsFound.add(email);
          
          const smartschoolId = emailToIdMap[email];
          
          if (smartschoolId) {
            // Can migrate
            analysis.can_migrate++;
            smartschoolIdsWillCreate.add(smartschoolId);
            
            // Track by school
            const school = data.school_id || 'unknown';
            analysis.by_school[school] = (analysis.by_school[school] || 0) + 1;
            
            console.log(`  ✅ ${email} → ${smartschoolId}`);
          } else {
            // Cannot migrate - mismatch
            analysis.no_matching_user++;
            analysis.mismatches.push({
              score_doc_id: doc.id,
              email: data.leerling_id,
              leerling_naam: data.leerling_naam || 'unknown',
              school_id: data.school_id,
              test_id: data.test_id,
              score: data.score,
              datum: data.datum
            });
            
            console.warn(`  ❌ MISMATCH: ${email} has no matching smartschool_id`);
          }
        }
      });
      
      analysis.duplicates_check.unique_emails = emailsFound.size;
      analysis.duplicates_check.unique_smartschool_ids = smartschoolIdsWillCreate.size;
      
      // Safety check: if creating more IDs than emails exist, we have a problem
      if (smartschoolIdsWillCreate.size !== emailsFound.size) {
        console.warn(`⚠️ WARNING: Unique emails (${emailsFound.size}) != Unique IDs (${smartschoolIdsWillCreate.size})`);
        analysis.warning = 'Potential duplicate emails found - review mismatches';
      }
      
      console.log('✅ Analysis complete!');
      
      // Determine recommendation
      let recommendation = '';
      if (analysis.no_matching_user === 0) {
        recommendation = '✅ SAFE TO MIGRATE: All email-based scores have matching users';
      } else if (analysis.no_matching_user <= 5) {
        recommendation = `⚠️ REVIEW RECOMMENDED: ${analysis.no_matching_user} mismatches found - may proceed with caution`;
      } else {
        recommendation = `❌ DO NOT PROCEED: ${analysis.no_matching_user} mismatches found - too many to proceed safely`;
      }
      
      const response = {
        status: 'analysis_complete',
        timestamp: new Date().toISOString(),
        environment: 'analysis_only_no_data_changed',
        analysis,
        recommendation,
        next_steps: analysis.no_matching_user === 0
          ? 'Run migrateScoresToSmartschoolId with env=staging to test'
          : 'Fix mismatches in toegestane_gebruikers before migrating'
      };
      
      return res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.toString()
      });
    }
  });

/**
 * FASE 2: EXECUTE MIGRATION
 * Actually migrates data in staging or production
 */
exports.migrateScoresToSmartschoolId = functions
  .https
  .onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // STRICT security validation
    const adminToken = req.query.admin_token || req.body.admin_token;
    const environment = req.query.env || req.body.env;
    const confirmation = req.query.confirm || req.body.confirm;
    
    if (!adminToken) {
      return res.status(401).json({
        error: 'Missing admin_token parameter'
      });
    }
    
    const validToken = process.env.MIGRATION_ADMIN_TOKEN || 'change_me_in_firebase_config';
    if (adminToken !== validToken) {
      return res.status(403).json({
        error: 'Invalid admin token'
      });
    }
    
    if (!environment || !['staging', 'production'].includes(environment)) {
      return res.status(400).json({
        error: 'Invalid or missing env parameter',
        message: 'Must specify env=staging or env=production'
      });
    }
    
    if (confirmation !== 'yes_i_have_backup') {
      return res.status(403).json({
        error: 'Missing safety confirmation',
        message: 'Must pass confirm=yes_i_have_backup to proceed',
        safety_note: 'This ensures you have a backup before migrating'
      });
    }

    const db = admin.firestore();
    let migratedCount = 0;
    let failureCount = 0;
    const errors = [];
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Starting migration for ${environment}...`);
      
      // Step 1: Build email → smartschool_id map
      console.log('📊 Building email→ID map...');
      const emailToIdMap = {};
      const usersSnap = await db.collection('toegestane_gebruikers').get();
      
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.email) {
          emailToIdMap[data.email.toLowerCase()] = doc.id;
        }
      });
      
      console.log(`✅ Built map with ${Object.keys(emailToIdMap).length} users`);
      
      // Step 2: Get all scores to migrate
      console.log('📊 Scanning scores...');
      const scoresSnap = await db.collection('scores').get();
      
      const batch = db.batch();
      const scoresToMigrate = [];
      
      scoresSnap.forEach(scoreDoc => {
        const scoreData = scoreDoc.data();
        
        if (scoreData.leerling_id && scoreData.leerling_id.includes('@')) {
          const email = scoreData.leerling_id.toLowerCase();
          const smartschoolId = emailToIdMap[email];
          
          if (smartschoolId) {
            scoresToMigrate.push({
              oldDocId: scoreDoc.id,
              email,
              smartschoolId,
              data: scoreData
            });
          } else {
            failureCount++;
            errors.push({
              score_id: scoreDoc.id,
              email,
              reason: 'No matching smartschool_id found'
            });
          }
        }
      });
      
      console.log(`✅ Found ${scoresToMigrate.length} scores to migrate, ${failureCount} failures`);
      
      // Step 3: Migrate using batch
      console.log(`📦 Migrating ${scoresToMigrate.length} documents...`);
      
      scoresToMigrate.forEach(item => {
        const newDocRef = db
          .collection('scores')
          .doc(item.smartschoolId)
          .collection('score_entries')
          .doc(item.oldDocId);
        
        batch.set(newDocRef, {
          ...item.data,
          leerling_id: item.smartschoolId,  // Use smartschool_id instead of email
          migrated_from_email: item.email,
          migrated_at: admin.firestore.FieldValue.serverTimestamp(),
          migration_env: environment,
          migration_batch_id: req.query.batch_id || 'manual_' + Date.now()
        });
        
        migratedCount++;
      });
      
      // Commit batch
      console.log('✅ Committing batch to Firestore...');
      await batch.commit();
      
      const duration = Date.now() - startTime;
      
      console.log('✅ Migration complete!');
      
      const response = {
        status: 'success',
        environment,
        migrated_count: migratedCount,
        failure_count: failureCount,
        errors: errors.slice(0, 10),  // Show first 10 errors
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        next_steps: failureCount === 0
          ? '✅ All scores migrated! Verify in Firestore and test Firestore rules.'
          : `⚠️ ${failureCount} scores failed. Check errors and manually fix, then retry.`
      };
      
      return res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ Migration error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message,
        details: error.toString(),
        migrated_so_far: migratedCount,
        critical_note: 'Batch was NOT committed. No data was changed.'
      });
    }
  });

/**
 * UTILITY: Get migration status and statistics
 */
exports.getMigrationStatus = functions
  .https
  .onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    
    const db = admin.firestore();
    
    try {
      // Count scores with new structure (migrated)
      const newStructureSnap = await db
        .collectionGroup('score_entries')
        .where('migrated_at', '!=', null)
        .get();
      
      // Count scores with old structure (not migrated)
      const oldStructureSnap = await db
        .collection('scores')
        .get();
      
      let oldStyleCount = 0;
      oldStructureSnap.forEach(doc => {
        const data = doc.data();
        if (data.leerling_id && data.leerling_id.includes('@')) {
          oldStyleCount++;
        }
      });
      
      res.json({
        status: 'status_report',
        migrated_scores: newStructureSnap.size,
        remaining_email_scores: oldStyleCount,
        migration_percentage: oldStyleCount === 0 
          ? 100 
          : Math.round((newStructureSnap.size / (newStructureSnap.size + oldStyleCount)) * 100)
      });
      
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });
