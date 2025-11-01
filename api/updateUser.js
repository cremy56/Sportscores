// api/updateUser.js
import { db } from '../src/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { userId, updates, currentUserProfileHash } = req.body;

        // Input validatie
        if (!userId) {
            return res.status(400).json({ error: 'userId is verplicht' });
        }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'updates object is verplicht' });
        }

        // Check of user bestaat
        const userRef = doc(db, 'toegestane_gebruikers', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        const userData = userDoc.data();

        // Alleen bepaalde velden mogen bewerkt worden
        const allowedFields = ['klas', 'gender', 'is_active'];
        const updateData = {};

        for (const field of allowedFields) {
            if (updates.hasOwnProperty(field)) {
                updateData[field] = updates[field];
            }
        }

        // Validatie gender (alleen voor leerlingen)
        if (updateData.gender && !['M', 'V', 'X'].includes(updateData.gender)) {
            return res.status(400).json({ error: 'Gender moet M, V of X zijn' });
        }

        // Validatie klas
        if (updateData.klas && typeof updateData.klas !== 'string') {
            return res.status(400).json({ error: 'Klas moet een string zijn' });
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Geen geldige velden om te updaten' });
        }

        // Voeg metadata toe
        updateData.last_updated = new Date();
        updateData.updated_by_hash = currentUserProfileHash || 'admin';

        console.log(`🔄 Updating user ${userId.substring(0, 16)}...`, updateData);

        // Update beide collections
        await updateDoc(doc(db, 'toegestane_gebruikers', userId), updateData);
        await updateDoc(doc(db, 'users', userId), updateData);

        console.log(`✅ User updated successfully`);

        res.status(200).json({ 
            success: true, 
            message: 'Gebruiker succesvol bijgewerkt',
            updatedFields: Object.keys(updateData).filter(k => !k.includes('updated'))
        });

    } catch (error) {
        console.error('❌ API Update Error:', error);
        res.status(500).json({ 
            error: 'Fout bij bijwerken: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}