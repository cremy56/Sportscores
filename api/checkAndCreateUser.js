// api/checkAndCreateUser.js - FINAL FIX
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
        // === 1. AUTHENTICATIE ===
        const decodedToken = await verifyToken(req.headers.authorization);
        const firebaseUid = decodedToken.uid;
        
        console.log('🔍 Checking user:', {
            firebase_uid: firebaseUid,
            email: decodedToken.email
        });
        
        // === 2. CONTROLEER OF 'users' PROFIEL AL BESTAAT ===
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

        // === 3. PROFIEL BESTAAT NIET ===
        // We moeten nu het Smartschool User ID vinden
        // Optie A: Het zit in een custom claim
        // Optie B: Het zit in providerData
        // Optie C: Het IS de Firebase UID (maar blijkbaar niet in jouw geval)
        
        // Probeer alle opties:
        const smartschoolUserId = 
            decodedToken.smartschool_user_id ||           // Custom claim
            decodedToken.providerData?.[0]?.uid ||        // Provider UID
            decodedToken.uid;                             // Fallback
        
        console.log('🔑 Smartschool User ID:', smartschoolUserId);
        
        // Hash it
        const hashedSmartschoolId = generateHash(smartschoolUserId);
        
        console.log('🔐 Generated hash:', hashedSmartschoolId.substring(0, 16) + '...');
        
        // === 4. ZOEK IN WHITELIST OP BASIS VAN FIELD, NIET DOCUMENT ID ===
        const whitelistQuery = await db.collection('toegestane_gebruikers')
            .where('smartschool_id_hash', '==', hashedSmartschoolId)
            .limit(1)
            .get();

        if (whitelistQuery.empty) {
            console.error('❌ User not found in whitelist');
            console.error('Searched for smartschool_id_hash:', hashedSmartschoolId);
            
            return res.status(403).json({ 
                error: 'Je hebt geen toegang tot deze applicatie.',
                debug: process.env.NODE_ENV === 'development' ? {
                    smartschool_user_id: smartschoolUserId,
                    hash: hashedSmartschoolId,
                    firebase_uid: firebaseUid
                } : undefined
            });
        }

        // === 5. WHITELIST ENTRY GEVONDEN ===
        const whitelistDoc = whitelistQuery.docs[0];
        const whitelistData = whitelistDoc.data();
        
        console.log('✅ Found in whitelist:', {
            doc_id: whitelistDoc.id,
            rol: whitelistData.rol,
            school_id: whitelistData.school_id
        });
        
        // === 6. MAAK PROFIEL AAN ===
        // BELANGRIJK: Document ID = Firebase Auth UID
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
        
        console.log('✅ Profile created for Firebase UID:', firebaseUid);
        
        return res.status(201).json({ 
            success: true, 
            status: 'profile_created', 
            userProfile: initialProfileData 
        });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ 
                error: 'Niet geauthenticeerd: ' + error.message 
            });
        }
        console.error("❌ API Error:", error);
        res.status(500).json({ 
            error: 'Serverfout bij profielcontrole',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}