// api/updateUser.js
import { db, verifyToken } from './firebaseAdmin.js'; // <-- AANGEPAST

export default async function handler(req, res) {

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // === 1. AUTHENTICATIE ===
        const decodedToken = await verifyToken(req.headers.authorization);

        const { userId, updates, currentUserProfileHash } = req.body;

        // === 2. VALIDATIE ===
        if (!userId) {
            return res.status(400).json({ error: 'userId is verplicht' });
        }
        // ... (rest van je validatie blijft hetzelfde) ...
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'updates object is verplicht' });
        }
        
        // === 3. DATA VERWERKEN ===
        const userRef = db.collection('toegestane_gebruikers').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists()) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        // ... (allowedFields logica blijft hetzelfde) ...
        const allowedFields = ['klas', 'gender', 'is_active'];
        const updateData = {};
        for (const field of allowedFields) {
            if (updates.hasOwnProperty(field)) {
                updateData[field] = updates[field];
            }
        }
        if (updateData.gender && !['M', 'V', 'X'].includes(updateData.gender)) {
            return res.status(400).json({ error: 'Gender moet M, V of X zijn' });
        }
        if (updateData.klas && typeof updateData.klas !== 'string') {
            return res.status(400).json({ error: 'Klas moet een string zijn' });
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Geen geldige velden om te updaten' });
        }

        updateData.last_updated = new Date();
        updateData.updated_by_hash = currentUserProfileHash || 'admin';

        console.log(`🔄 [${decodedToken.email}] Updating user ${userId.substring(0, 16)}...`);

        // Update whitelist
        await userRef.update(updateData);

        // Update 'users' profiel indien het bestaat
        const userProfileRef = db.collection('users').doc(userId);
        const userProfileSnap = await userProfileRef.get();

        if (userProfileSnap.exists) {
            console.log('User profiel bestaat, ook updaten...');
            await userProfileRef.update(updateData);
        } else {
            console.log('User profiel bestaat nog niet, update overgeslagen.');
        }

        console.log(`✅ User updated successfully`);

        res.status(200).json({ 
            success: true, 
            message: 'Gebruiker succesvol bijgewerkt',
            updatedFields: Object.keys(updateData).filter(k => !k.includes('updated'))
        });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Update Error:', error);
        res.status(500).json({ 
            error: 'Fout bij bijwerken: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}