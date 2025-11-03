// api/checkAndCreateUser.js - ULTRA SAFE VERSION
import { db, verifyToken } from './firebaseAdmin.js';
import CryptoJS from 'crypto-js';

const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        console.log('=== START checkAndCreateUser ===');
        
        // === 1. AUTHENTICATIE ===
        console.log('Step 1: Verifying token...');
        const decodedToken = await verifyToken(req.headers.authorization);
        const firebaseUid = decodedToken.uid;
        
        console.log('Token verified:', {
            firebase_uid: firebaseUid,
            email: decodedToken.email || 'no email',
            has_provider_data: !!decodedToken.providerData
        });
        
        // === 2. CONTROLEER OF 'users' PROFIEL AL BESTAAT ===
        console.log('Step 2: Checking if profile exists...');
        const profileRef = db.collection('users').doc(firebaseUid);
        const docSnap = await profileRef.get();

        if (docSnap.exists()) {
            console.log('✅ Profile already exists');
            return res.status(200).json({ 
                success: true, 
                status: 'profile_exists', 
                userProfile: docSnap.data() 
            });
        }

        console.log('Profile does not exist, will create...');

        // === 3. GET SMARTSCHOOL USER ID ===
        console.log('Step 3: Getting Smartschool User ID...');
        
        let smartschoolUserId = firebaseUid; // Default fallback
        
        // Try custom claim
        if (decodedToken.smartschool_user_id) {
            smartschoolUserId = decodedToken.smartschool_user_id;
            console.log('Found in custom claim');
        }
        // Try provider data (safely)
        else if (decodedToken.providerData && 
                 Array.isArray(decodedToken.providerData) && 
                 decodedToken.providerData.length > 0 &&
                 decodedToken.providerData[0].uid) {
            smartschoolUserId = decodedToken.providerData[0].uid;
            console.log('Found in providerData');
        } else {
            console.log('Using Firebase UID as fallback');
        }
        
        console.log('Smartschool User ID:', smartschoolUserId);
        
        // === 4. GENERATE HASH ===
        console.log('Step 4: Generating hash...');
        const hashedSmartschoolId = generateHash(smartschoolUserId);
        console.log('Hash:', hashedSmartschoolId.substring(0, 16) + '...');
        
        // === 5. QUERY WHITELIST ===
        console.log('Step 5: Querying whitelist...');
        
        let whitelistDoc = null;
        let whitelistData = null;
        
        // Try query first
        try {
            console.log('Attempting query...');
            const whitelistQuery = await db.collection('toegestane_gebruikers')
                .where('smartschool_id_hash', '==', hashedSmartschoolId)
                .limit(1)
                .get();

            console.log('Query result:', {
                empty: whitelistQuery.empty,
                size: whitelistQuery.size
            });

            if (!whitelistQuery.empty) {
                whitelistDoc = whitelistQuery.docs[0];
                whitelistData = whitelistDoc.data();
                console.log('✅ Found via query');
            }
        } catch (queryError) {
            console.warn('⚠️ Query failed:', queryError.message);
        }
        
        // Fallback: scan all
        if (!whitelistData) {
            console.log('Fallback: Scanning all documents...');
            
            const allDocs = await db.collection('toegestane_gebruikers').get();
            console.log(`Scanning ${allDocs.size} documents...`);
            
            for (const doc of allDocs.docs) {
                const data = doc.data();
                if (data.smartschool_id_hash === hashedSmartschoolId) {
                    whitelistDoc = doc;
                    whitelistData = data;
                    console.log('✅ Found via scan');
                    break;
                }
            }
        }

        // === 6. CHECK RESULT ===
        if (!whitelistData) {
            console.error('❌ NOT FOUND IN WHITELIST');
            console.error('Searched for:', hashedSmartschoolId);
            
            // Debug: show sample data
            const sampleDocs = await db.collection('toegestane_gebruikers').limit(3).get();
            console.error('Sample documents:');
            sampleDocs.docs.forEach(doc => {
                console.error(`  ID: ${doc.id}`);
                console.error(`  Hash: ${doc.data().smartschool_id_hash}`);
            });
            
            return res.status(403).json({ 
                error: 'Je hebt geen toegang tot deze applicatie.',
                debug: {
                    searched_hash: hashedSmartschoolId,
                    smartschool_user_id: smartschoolUserId,
                    firebase_uid: firebaseUid
                }
            });
        }

        console.log('✅ Found in whitelist:', {
            doc_id: whitelistDoc.id,
            rol: whitelistData.rol,
            school_id: whitelistData.school_id
        });
        
        // === 7. CREATE PROFILE ===
        console.log('Step 6: Creating profile...');
        
        const initialProfileData = {
            smartschool_id_hash: hashedSmartschoolId,
            encrypted_name: whitelistData.encrypted_name,
            school_id: whitelistData.school_id,
            rol: whitelistData.rol,
            klas: whitelistData.klas || null,
            gender: whitelistData.gender || null,
            onboarding_complete: true,
            created_at: new Date(),
            last_login: new Date(),
        };

        await profileRef.set(initialProfileData);
        
        console.log('✅ Profile created successfully');
        console.log('=== END checkAndCreateUser (SUCCESS) ===');
        
        return res.status(201).json({ 
            success: true, 
            status: 'profile_created', 
            userProfile: initialProfileData 
        });

    } catch (error) {
        console.error('=== ERROR in checkAndCreateUser ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);
        
        if (error.message && error.message.includes('token')) {
            return res.status(401).json({ 
                error: 'Niet geauthenticeerd: ' + error.message 
            });
        }
        
        res.status(500).json({ 
            error: 'Serverfout bij profielcontrole',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

