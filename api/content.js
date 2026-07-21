// pages/api/getAdValvasData.js
import { db, verifyToken } from '../lib/firebaseAdmin.js';
import { checkRateLimit, stuurRateLimitResponse } from '../lib/rateLimiter.js';
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


// --- Helper 0: Nicknames batch ophalen voor leerling_ids ---
async function getNicknamesForLeerlingen(leerlingIds) {
    const nicknameMap = new Map();
    if (!leerlingIds.length) return nicknameMap;
    const chunks = [];
    for (let i = 0; i < leerlingIds.length; i += 30) chunks.push(leerlingIds.slice(i, i + 30));
    for (const chunk of chunks) {
        
        const snap = await db.collection('users')
            .where('toegestane_gebruikers_id', 'in', chunk)
            .get();
        
        snap.docs.forEach(d => nicknameMap.set(d.data().toegestane_gebruikers_id, d.data().nickname || 'Sporter'));
    }
    return nicknameMap;
}

// --- Helper 1: Haal Test Highscores ---
async function getTestHighscores(schoolId) {
    try {
        const testenQuery = db.collection('testen')
            .where('school_id', '==', schoolId)
            .where('is_actief', '==', true);

        const testenSnap = await testenQuery.get();
        const allTests = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const testHighscorePromises = allTests.map(async (test) => {
            const direction = test.score_richting === 'laag' ? 'asc' : 'desc';
            const scoreSnap = await db.collection('scores')
                .where('test_id', '==', test.id)
                .orderBy('score', direction)
                .limit(3)
                .get();

            if (scoreSnap.empty) return null;

            // Nicknames batch ophalen
            const leerlingIds = scoreSnap.docs.map(d => d.data().leerling_id).filter(Boolean);
            const nicknameMap = await getNicknamesForLeerlingen(leerlingIds);

            const scores = scoreSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    leerling_naam: nicknameMap.get(data.leerling_id) || 'Sporter',
                    datum: data.datum?.toDate ? data.datum.toDate().toISOString() : new Date().toISOString()
                };
            });

            return { test, scores };
        });

        const results = await Promise.all(testHighscorePromises);
        return results.filter(Boolean);
    } catch (error) {
        console.error('Server error fetching highscores:', error);
        return [];
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

        // Nicknames ophalen voor alle scores van vandaag
        const todayLeerlingIds = todayScoresSnap.docs.map(d => d.data().leerling_id).filter(Boolean);
        const nicknameMap = await getNicknamesForLeerlingen(todayLeerlingIds);

        for (const scoreDoc of todayScoresSnap.docs) {
            const scoreData = scoreDoc.data();
            activeTestIds.add(scoreData.test_id);
            todayScoresData.push(scoreData);

            // Controleer op record
            const testRef = db.collection('testen').doc(scoreData.test_id);
            const testSnap = await testRef.get();
            // 🐛 FIX (jul 2026): .exists is in de Admin SDK een property, geen
            // functie — testSnap.exists() gooide een TypeError waardoor
            // breaking news bij elke dashboard-load crashte.
            if (!testSnap.exists) continue;

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
                        subtitle: `${nicknameMap.get(scoreData.leerling_id) || 'Sporter'} behaalde ${formatScoreWithUnit(scoreData.score, testData.eenheid)}`,
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
                .filter(snap => snap.exists) // 🐛 FIX: property, geen functie
                .map(snap => ({ id: snap.id, ...snap.data() }));
        }
        
        // ── Dagactiviteit per klas+test ────────────────────────────────────
        // "3A heeft de Cooper-test gelopen — 22 leerlingen". Klasnamen zijn
        // geen persoonsgegevens; individuele leerlingen komen hier NIET in
        // voor. Groepen van 1-2 leerlingen slaan we over: op een publiek
        // scherm is "1 leerling uit 3A deed de Cooper-test" herleidbaar.
        const MIN_GROEP = 3;
        const testNaamCache = new Map(activeTestsData.map(t => [t.id, t]));
        const perKlasTest = new Map();

        for (const s of todayScoresData) {
            if (!s.klas || !s.test_id) continue; // groepstestafnames hebben klas: null
            const sleutel = `${s.klas}|${s.test_id}`;
            if (!perKlasTest.has(sleutel)) {
                perKlasTest.set(sleutel, { klas: s.klas, test_id: s.test_id, leerlingen: new Set() });
            }
            if (s.leerling_id) perKlasTest.get(sleutel).leerlingen.add(s.leerling_id);
        }

        const dagActiviteit = [];
        for (const item of perKlasTest.values()) {
            const aantal = item.leerlingen.size;
            if (aantal < MIN_GROEP) continue;
            const test = testNaamCache.get(item.test_id);
            if (!test) continue;
            dagActiviteit.push({
                klas: item.klas,
                testNaam: test.naam,
                aantalLeerlingen: aantal
            });
        }
        dagActiviteit.sort((a, b) => b.aantalLeerlingen - a.aantalLeerlingen);

        return {
            breakingNews,
            activeTests: activeTestsData,
            todayScores: todayScoresData,
            dagActiviteit: dagActiviteit.slice(0, 6)
        };

    } catch (error) {
        console.error('Server error fetching breaking news:', error);
        return { breakingNews: [], activeTests: [], todayScores: [], dagActiviteit: [] };
    }
}

// --- Helper 4: Weekstatistieken (geaggregeerd, niet herleidbaar) ---
// Toont schaal, geen personen: aantal scores, actieve klassen, testsoorten.
async function getWeekStats(schoolId) {
    try {
        const nu = new Date();
        const weekGeleden = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() - 7);

        const snap = await db.collection('scores')
            .where('school_id', '==', schoolId)
            .where('datum', '>=', Timestamp.fromDate(weekGeleden))
            .get();

        if (snap.empty) return null;

        const klassen = new Set();
        const testen = new Set();
        const leerlingen = new Set();

        snap.docs.forEach(d => {
            const s = d.data();
            if (s.klas) klassen.add(s.klas);
            if (s.test_id) testen.add(s.test_id);
            if (s.leerling_id) leerlingen.add(s.leerling_id);
        });

        return {
            aantalScores: snap.size,
            aantalKlassen: klassen.size,
            aantalTesten: testen.size,
            aantalLeerlingen: leerlingen.size
        };
    } catch (error) {
        console.error('Server error fetching weekstats:', error);
        return null;
    }
}


// --- FUNCTIE 2: CREATE MEDEDELING (Logica van createMededeling.js) ---
async function handleCreateData(req, res, decodedToken) {
    // try...catch block uit createMededeling.js
    try {
        // === 2. AUTORISATIE (Haal profiel op) ===
        // We hebben de token al, we hebben de body nodig
        const { type, tekst, zichtbaarheidInDagen } = req.body;

        const adminUserSnap = await db.collection('users').doc(decodedToken.uid).get();
        if (!adminUserSnap.exists) {
            return res.status(403).json({ error: 'Jouw gebruikersprofiel is niet gevonden.' });
        }
        const adminProfile = adminUserSnap.data();

        // Check of de rol wel mededelingen mag posten
        if (!['leerkracht', 'super-administrator'].includes(adminProfile.rol)) {
            return res.status(403).json({ error: 'Je hebt geen rechten om dit te doen.' });
        }

        // === 3. VALIDATIE ===
        if (!tekst || !tekst.trim()) {
            return res.status(400).json({ error: 'Bericht mag niet leeg zijn.' });
        }
        if (!['event', 'prestatie'].includes(type)) {
            return res.status(400).json({ error: 'Ongeldig type bericht.' });
        }
        const dagen = parseInt(zichtbaarheidInDagen, 10);
        if (isNaN(dagen) || dagen < 1 || dagen > 30) {
            return res.status(400).json({ error: 'Ongeldige zichtbaarheid (1-30 dagen).' });
        }

        // === 4. DATA VERWERKEN (Veilig) ===
        const maakDatum = new Date();
        const vervalDatum = new Date();
        vervalDatum.setDate(maakDatum.getDate() + dagen);

        const mededelingData = {
            school_id: adminProfile.school_id,

            type: type,
            tekst: tekst.trim(),
            maakDatum: Timestamp.fromDate(maakDatum),
            vervalDatum: Timestamp.fromDate(vervalDatum)
        };

        await db.collection('mededelingen').add(mededelingData);

        res.status(200).json({ success: true, message: 'Bericht succesvol geplaatst!' });

    } catch (error) {
        console.error('❌ API Error in POST /content:', error);
        res.status(500).json({ error: 'Fout bij opslaan van mededeling' });
    }
}


// --- HOOFD HANDLER (Router) ---
// VERVANG je oude 'export default' handler met DEZE
// Onderscheidt een ECHTE tokenverificatiefout van een infrastructuurfout.
//
// Waarom dit bestaat: voorheen stond hier error.message.includes('token').
// Die check labelde ook infrastructuurfouten als 401 — een ingetrokken
// service-account-key geeft "Failed to fetch access token", wat dus als
// "niet ingelogd" naar de client ging ZONDER logging. Dat maskeerde in
// juli 2026 een productie-uitval van ±15 minuten.
//
// De Admin SDK zet op echte auth-fouten een .code van de vorm 'auth/...'
// (bv. auth/id-token-expired, auth/argument-error). Infrastructuurfouten
// hebben die code niet. Dat is de betrouwbare scheidslijn; we vallen alleen
// terug op tekstherkenning voor de expliciete gevallen die onze eigen
// verifyToken-wrapper gooit.
function isEchteTokenfout(error) {
    if (typeof error?.code === 'string' && error.code.startsWith('auth/')) {
        // Uitzondering: dit is een configuratie-/infrastructuurprobleem aan
        // ONZE kant, geen ongeldig token van de gebruiker.
        if (error.code === 'auth/internal-error') return false;
        return true;
    }
    // Geen 'auth/'-code = geen echte auth-fout. verifyToken() in
    // lib/firebaseAdmin.js zet zelf 'auth/geen-token' bij een ontbrekende of
    // misvormde Authorization-header, dus we hoeven niet op fouttekst terug
    // te vallen. Alles zonder code behandelen we als infrastructuurfout:
    // luid loggen is beter dan stil een 401 teruggeven.
    return false;
}

export default async function handler(req, res) {
    // ── Stap 1: authenticatie, met een EIGEN catch ──────────────────────────
    // Zo hoeft de brede catch hieronder nooit te raden of iets een auth- of
    // een infrastructuurfout was.
    let decodedToken;
    try {
        decodedToken = await verifyToken(req.headers.authorization);
    } catch (error) {
        if (isEchteTokenfout(error)) {
            // Geen error.message doorgeven aan de client: dat lekt interne
            // details. De reden staat in de log.
            console.warn('[auth] tokenverificatie geweigerd:', error.code || error.message);
            return res.status(401).json({ error: 'Niet geauthenticeerd' });
        }
        // Infrastructuurfout (bv. ingetrokken key, Secret Manager onbereikbaar):
        // LUID loggen en als 503 melden, niet stil als 401 wegmoffelen.
        console.error('❌ [auth] INFRASTRUCTUURFOUT bij tokenverificatie:', error);
        return res.status(503).json({ error: 'Authenticatiedienst tijdelijk niet beschikbaar' });
    }

    try {

        // ── Rate limit (per gebruiker: GET = lees, POST = schrijf) ───────────
        const rl = await checkRateLimit(req, {
            categorie: req.method === 'GET' ? 'lees' : 'schrijf',
            uid: decodedToken.uid,
        });
        if (!rl.toegestaan) return stuurRateLimitResponse(res, rl.retryAfter);

        if (req.method === 'GET') {
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
                newsAndTestData,
                weekStats
            ] = await Promise.all([
                getTestHighscores(schoolId),
                getMededelingen(schoolId),
                getBreakingNewsAndActiveTests(schoolId),
                getWeekStats(schoolId)
            ]);

            // === 4. STUUR GECOMBINEERD ANTWOORD TERUG ===
            return res.status(200).json({
                success: true,
                testHighscores: highscoresData,
                mededelingen: mededelingenData,
                breakingNews: newsAndTestData.breakingNews,
                activeTests: newsAndTestData.activeTests,
                dagActiviteit: newsAndTestData.dagActiviteit,
                weekStats
            });
        }

        if (req.method === 'POST') {
            return await handleCreateData(req, res, decodedToken);
        }
        
        // Als het geen GET of POST is
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

    } catch (error) {
        // Authenticatie is hierboven al afgehandeld; wat hier landt is een
        // echte serverfout. Altijd loggen, nooit als 401 maskeren.
        console.error('❌ API Hoofd-error in /content:', error);
        res.status(500).json({ error: 'Interne serverfout' });
    }
}