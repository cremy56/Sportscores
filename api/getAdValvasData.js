// pages/api/getAdValvasData.js
import { db, verifyToken } from './firebaseAdmin.js';
import { Timestamp } from 'firebase-admin/firestore'; // Belangrijk! Gebruik de Admin Timestamp

// Helper functie (kopiëren uit je client-side utils)
const formatScoreWithUnit = (score, unit) => {
    if (score === null || score === undefined) return '-';
    if (unit === 'tijd') {
        const totalSeconds = score;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 100);
        
        if (minutes > 0) {
            return `${minutes}'${seconds.toString().padStart(2, '0')}"${milliseconds.toString().padStart(2, '0')}`;
        } else {
            return `${seconds}"${milliseconds.toString().padStart(2, '0')}`;
        }
    } else if (unit === 'punten') {
        return `${score} ptn`;
    }
    return `${score} ${unit || ''}`;
};


// --- Helper 1: Haal Test Highscores ---
async function getTestHighscores(schoolId) {
    // Logica gekopieerd uit adValvas.jsx (fetchTestHighscores)
    try {
        const testenQuery = db.collection('testen')
            .where('school_id', '==', schoolId)
            .where('is_actief', '==', true);
        
        const testenSnap = await testenQuery.get();
        const allTests = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const testHighscorePromises = allTests.map(async (test) => {
            const direction = test.score_richting === 'laag' ? 'asc' : 'desc';
            const scoreQuery = db.collection('scores')
                .where('test_id', '==', test.id)
                .orderBy('score', direction)
                .limit(3);
            
            const scoreSnap = await scoreQuery.get();
            const scores = scoreSnap.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                // Converteer server Timestamp naar ISO string
                datum: doc.data().datum?.toDate ? doc.data().datum.toDate().toISOString() : new Date().toISOString()
            }));

            return scores.length > 0 ? { test, scores } : null;
        });

        const results = await Promise.all(testHighscorePromises);
        return results.filter(Boolean);
    } catch (error) {
        console.error('Server error fetching highscores:', error);
        return []; // Fout, maar crash niet
    }
}

// --- Helper 2: Haal Mededelingen ---
async function getMededelingen(schoolId) {
    // Logica gekopieerd uit adValvas.jsx (fetchMededelingen)
    try {
        const vandaag = Timestamp.now(); // Gebruik server timestamp
        const mededelingenQuery = db.collection('mededelingen')
            .where('school_id', '==', schoolId)
            .where('vervalDatum', '>', vandaag);
        
        const querySnapshot = await mededelingenQuery.get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Server error fetching mededelingen:', error);
        return [];
    }
}

// --- Helper 3: Haal Breaking News & Actieve Tests ---
async function getBreakingNewsAndActiveTests(schoolId) {
    // Logica gekopieerd uit adValvas.jsx (detectBreakingNews & fetchTodaysScores)
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const todayScoresQuery = db.collection('scores')
            .where('school_id', '==', schoolId)
            .where('datum', '>=', Timestamp.fromDate(startOfDay));
            
        const todayScoresSnap = await todayScoresQuery.get();
        
        const breakingNews = [];
        const activeTestIds = new Set();
        const todayScoresData = []; // Stuur ook de scores van vandaag mee

        for (const scoreDoc of todayScoresSnap.docs) {
            const scoreData = scoreDoc.data();
            activeTestIds.add(scoreData.test_id);
            todayScoresData.push(scoreData);

            // Controleer op record
            const testRef = db.collection('testen').doc(scoreData.test_id);
            const testSnap = await testRef.get();
            if (!testSnap.exists()) continue;

            const testData = testSnap.data();
            const direction = testData.score_richting === 'laag' ? 'asc' : 'desc';

            const previousBestQuery = db.collection('scores')
                .where('test_id', '==', scoreData.test_id)
                .where('datum', '<', Timestamp.fromDate(startOfDay))
                .orderBy('score', direction)
                .limit(1);
            
            const previousBestSnap = await previousBestQuery.get();
            
            let isNewRecord = false;
            if (previousBestSnap.empty) {
                isNewRecord = true;
            } else {
                const previousBest = previousBestSnap.docs[0].data();
                if (testData.score_richting === 'hoog') {
                    isNewRecord = scoreData.score > previousBest.score;
                } else {
                    isNewRecord = scoreData.score < previousBest.score;
                }
            }
            
            if (isNewRecord) {
                breakingNews.push({
                    type: 'breaking_news', // Gebruik het `const CONTENT_TYPES` object niet op de server
                    data: {
                        title: `🏆 NIEUW RECORD! ${testData.naam}`,
                        subtitle: `${scoreData.leerling_naam} behaalde ${formatScoreWithUnit(scoreData.score, testData.eenheid)}`,
                        test: testData,
                        score: scoreData,
                        timestamp: scoreData.datum?.toDate ? scoreData.datum.toDate().toISOString() : new Date().toISOString()
                    },
                    priority: 15,
                    id: `breaking-${scoreDoc.id}`,
                    createdAt: Date.now()
                });
            }
        }

        // Haal de testdocumenten op voor de actieve tests
        let activeTestsData = [];
        if (activeTestIds.size > 0) {
            const testPromises = Array.from(activeTestIds).map(testId => db.collection('testen').doc(testId).get());
            const testSnaps = await Promise.all(testPromises);
            activeTestsData = testSnaps
                .filter(snap => snap.exists())
                .map(snap => ({ id: snap.id, ...snap.data() }));
        }
        
        return { breakingNews, activeTests: activeTestsData, todayScores: todayScoresData };

    } catch (error) {
        console.error('Server error fetching breaking news:', error);
        return { breakingNews: [], activeTests: [], todayScores: [] };
    }
}


// --- HOOFD HANDLER ---
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // === 1. AUTHENTICATIE ===
        const decodedToken = await verifyToken(req.headers.authorization);
        
        // === 2. HAAL PROFIEL (en school_id) ===
        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const schoolId = adminUserSnap.data().school_id;

        if (!schoolId) {
            return res.status(400).json({ error: 'Geen school_id aan jouw profiel gekoppeld.' });
        }

        // === 3. VOER ALLE QUERIES PARALLEL UIT ===
        const [
            highscoresData, 
            mededelingenData, 
            newsAndTestData
        ] = await Promise.all([
            getTestHighscores(schoolId),
            getMededelingen(schoolId),
            getBreakingNewsAndActiveTests(schoolId)
        ]);

        // === 4. STUUR GECOMBINEERD ANTWOORD TERUG ===
        res.status(200).json({
            success: true,
            testHighscores: highscoresData,
            mededelingen: mededelingenData,
            breakingNews: newsAndTestData.breakingNews,
            activeTests: newsAndTestData.activeTests,
            todayScores: newsAndTestData.todayScores // Optioneel, maar kan nuttig zijn
        });

    } catch (error) {
        if (error.message.includes('token')) {
            return res.status(401).json({ error: 'Niet geauthenticeerd: ' + error.message });
        }
        console.error('❌ API Error in getAdValvasData:', error);
        res.status(500).json({ error: 'Fout bij ophalen van dashboard data' });
    }
}