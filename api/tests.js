// pages/api/tests.js
import { db, verifyToken } from '../lib/firebaseAdmin.js';
import { Timestamp } from 'firebase-admin/firestore';

// --- FUNCTIE 1: GET TESTS (Logica van getTests.js) ---
async function handleGetTests(req, res, decodedToken) {
    try {
        // === 2. AUTORISATIE (Haal school_id van de gebruiker) ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const schoolId = adminUserSnap.data().school_id;

        if (!schoolId) {
            return res.status(400).json({ error: 'Geen school_id aan jouw profiel gekoppeld.' });
        }

        // === 3. DATA OPHALEN ===
        const testenRef = db.collection('testen');
        const q = testenRef
            .where('school_id', '==', schoolId)
            .where('is_actief', '==', true)
            .orderBy('naam');
        
        const querySnapshot = await q.get();
        const testenData = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));

        return res.status(200).json({ success: true, testen: testenData });

    } catch (error) {
        console.error('❌ API Error in handleGetTests:', error);
        return res.status(500).json({ error: 'Fout bij ophalen van testen' });
    }
}


// --- FUNCTIE 2: GET LEADERBOARD (Logica van getLeaderboard.js) ---

// --- Plak hier de helpers van getLeaderboard.js ---
function calculateAge(birthDate) {
    if (!birthDate) return null;
    // Converteer Firestore Timestamp naar JS Date
    const birth = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}
const usersCache = new Map();
const cacheExpiry = 5 * 60 * 1000; // 5 minuten

async function getCachedUsers(schoolId) {
    const cacheKey = `users_school_${schoolId}`;
    const cached = usersCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < cacheExpiry) {
        return cached.data;
    }

    try {
        // Haal alleen actieve leerlingen op uit de 'toegestane_gebruikers'
        // Dit is de 'source of truth' voor wie mag meedoen.
        const toegestaneQuery = db.collection('toegestane_gebruikers')
            .where('rol', '==', 'leerling')
            .where('school_id', '==', schoolId)
            .where('is_active', '==', true);

        const snapshot = await toegestaneQuery.get();
        
        const usersData = new Map();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // Gebruik de hash (document ID) als sleutel
            usersData.set(doc.id, {
                geboortedatum: data.geboortedatum || null, // Zorg dat dit veld bestaat!
                naam: data.decrypted_name || 'Leerling' // Gebruik de ontsleutelde naam (als je die opslaat) of de gehashte.
                // BELANGRIJK: Je moet de 'naam' ontsleutelen of de 'users' collectie joinen
                // Voor nu gebruiken we een placeholder
            });
        });

        // OPMERKING: Een betere implementatie zou hier de 'users' collectie joinen
        // op basis van de hash om de 'geboortedatum' op te halen, 
        // aangezien die misschien niet in 'toegestane_gebruikers' staat.
        // Voorbeeld:
        const usersSnap = await db.collection('users').where('school_id', '==', schoolId).get();
        usersSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.smartschool_id_hash && usersData.has(data.smartschool_id_hash)) {
                usersData.set(data.smartschool_id_hash, {
                    ...usersData.get(data.smartschool_id_hash), // Behoud data van toegestane_gebruikers
                    geboortedatum: data.geboortedatum || null // Pak geboortedatum van 'users'
                });
            }
        });

        usersCache.set(cacheKey, { data: usersData, timestamp: Date.now() });
        return usersData;

    } catch (error) {
        console.error('Server error fetching users data:', error);
        return new Map();
    }
}
// --- Einde helpers ---

async function handleGetLeaderboard(req, res, decodedToken) {
    // Plak hier de 'try...catch' block uit getLeaderboard.js
    // MAAR... sla de 'verifyToken' en 'adminUserSnap' stappen over.
    try {
        const { testId, globalAgeFilter } = req.body; // Haal payload op
        
        // === 2. AUTORISATIE (Alleen schoolId nodig) ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const schoolId = adminUserSnap.data().school_id;

        // === 3. HAAL BENODIGDE DATA OP ===
        // 3a. Test data
        const testRef = db.collection('testen').doc(testId);
        const testSnap = await testRef.get();
        if (!testSnap.exists) {
            return res.status(404).json({ error: 'Test niet gevonden' });
        }
        const testData = testSnap.data();

        // 3b. Scores
        const scoresRef = db.collection('scores');
        const scoreDirection = testData.score_richting === 'hoog' ? 'desc' : 'asc';
        
        const scoresQuery = scoresRef
            .where('test_id', '==', testId)
            .where('school_id', '==', schoolId)
            .orderBy('score', scoreDirection)
            .limit(globalAgeFilter ? 200 : 20); // Meer ophalen voor filtering

        const scoresSnapshot = await scoresQuery.get();
        let rawScores = scoresSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            datum: doc.data().datum?.toDate ? doc.data().datum.toDate().toISOString() : null
        }));

        // === 4. LEEFTIJDSFILTERING (indien nodig) ===
        if (globalAgeFilter) {
            const usersData = await getCachedUsers(schoolId); // Dit is nu een Map
            
            const filteredScores = [];
            for (const score of rawScores) {
                // 'leerling_id' in 'scores' moet de HASH zijn (doc.id van toegestane_gebruikers)
                const userData = usersData.get(score.leerling_id); 

                if (!userData || !userData.geboortedatum) {
                    continue; // Sla score over als we geen leeftijd hebben
                }
                
                const scoreUserAge = calculateAge(userData.geboortedatum);
                if (scoreUserAge === null) continue;

                // Filterlogica (van Highscores.jsx)
                const targetAge = globalAgeFilter;
                let isMatch = false;
                if (targetAge === 12) isMatch = scoreUserAge <= 12;
                else if (targetAge === 17) isMatch = scoreUserAge >= 17;
                else isMatch = scoreUserAge === targetAge;
                
                if (isMatch) {
                    filteredScores.push(score);
                }
            }
            rawScores = filteredScores;
        }

        // 5. Neem de top 5 en stuur terug
        const top5Scores = rawScores.slice(0, 5);
        
        res.status(200).json({ 
            success: true, 
            scores: top5Scores,
            testData: testData // Stuur testdata mee
        });
        

    } catch (error) {
        console.error('❌ API Error in handleGetLeaderboard:', error);
        return res.status(500).json({ error: 'Fout bij ophalen van leaderboard' });
    }
}


// --- HOOFD HANDLER (Router) ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
    
    try {
        const decodedToken = await verifyToken(req.headers.authorization);
        const { action } = req.body; // We gebruiken 'action' om te routeren

        switch (action) {
            case 'get_tests':
                return await handleGetTests(req, res, decodedToken);
            
            case 'get_leaderboard':
                return await handleGetLeaderboard(req, res, decodedToken);
            
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

    } catch (error) {
         if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Hoofd-error in /tests:', error);
        return res.status(500).json({ error: 'Fout bij verwerken test data' });
    }
}