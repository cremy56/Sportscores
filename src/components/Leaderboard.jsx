// src/components/Leaderboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { formatScoreWithUnit } from '../utils/formatters.js';
import { Users, User } from 'lucide-react';

// CACHE voor gebruikersdata om duplicate queries te voorkomen
const usersCache = new Map();
const cacheExpiry = 5 * 60 * 1000; // 5 minuten

// --- HELPER FUNCTIE 1: Schooljaar veilig berekenen ---
function getSchoolYear(date) {
    if (!date || isNaN(new Date(date).getTime())) {
        return 'Onbekend';
    }
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (month >= 7) {
        return `${year}-${year + 1}`;
    } else {
        return `${year - 1}-${year}`;
    }
}

// --- HELPER FUNCTIE 2: Leeftijd berekenen ---
function calculateAge(birthDate) {
    if (!birthDate) return null;
    
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// --- HELPER FUNCTIE 3: Gecachte gebruikersdata ophalen ---
async function getCachedUsers(schoolId) {
    const cacheKey = `users_${schoolId}`;
    const cached = usersCache.get(cacheKey);
    
    // Check cache expiry
    if (cached && (Date.now() - cached.timestamp) < cacheExpiry) {
        return cached.data;
    }
    
    try {
        // Alleen relevante velden ophalen om kosten te beperken
        const usersRef = collection(db, 'users');
        const usersQuery = query(
            usersRef, 
            where('rol', '==', 'leerling'),
            where('school_id', '==', schoolId)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        const usersData = {};
        usersSnapshot.docs.forEach(doc => {
            const userData = doc.data();
            // Alleen relevante velden cachen
            usersData[userData.email] = {
                geboortedatum: userData.geboortedatum,
                naam: userData.naam
            };
        });
        
        // Cache voor 5 minuten
        usersCache.set(cacheKey, {
            data: usersData,
            timestamp: Date.now()
        });
        
        return usersData;
    } catch (error) {
        console.error('Error fetching users:', error);
        return {};
    }
}

export default function Leaderboard({ testId, globalAgeFilter }) { 
    const { profile } = useOutletContext();
    const [scores, setScores] = useState([]);
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    // Cleanup bij unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // HOOFDEFFECT: Deze wordt getriggerd bij elke wijziging van testId, school_id of globalAgeFilter
    useEffect(() => {
        const fetchScores = async () => {
            if (!testId || !profile?.school_id) {
                setLoading(false);
                return;
            }
            
            setLoading(true);
            setError(null);

            try {
                console.log('=== FETCHING SCORES ===');
                console.log('Test ID:', testId);
                console.log('School ID:', profile.school_id);
                console.log('Global Age Filter:', globalAgeFilter);
                console.log('Profile Role:', profile.rol);

                // 1. Test data ophalen
                const testRef = doc(db, 'testen', testId);
                const testSnap = await getDoc(testRef);

                if (!testSnap.exists()) {
                    throw new Error("Test niet gevonden.");
                }
                const currentTestData = testSnap.data();
                setTestData(currentTestData);

                // 2. Scores ophalen - meer ophalen als we gaan filteren op leeftijd
                const scoresRef = collection(db, 'scores');
                const scoreDirection = currentTestData.score_richting === 'hoog' ? 'desc' : 'asc';
                
                const scoresQuery = query(
                    scoresRef, 
                    where('test_id', '==', testId),
                    where('school_id', '==', profile.school_id),
                    orderBy('score', scoreDirection),
                    limit(globalAgeFilter ? 200 : 20) // Veel meer ophalen bij filtering
                );

                const querySnapshot = await getDocs(scoresQuery);
                let rawScores = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        id: doc.id,
                        datum: data.datum?.toDate ? data.datum.toDate() : null
                    };
                });

                console.log('Raw scores ophgehaald:', rawScores.length);

                // Check if component is still mounted
                if (!isMountedRef.current) return;

                // 3. LEEFTIJDSFILTERING
                if (globalAgeFilter && profile?.school_id) {
                    console.log('=== FILTERING BY AGE ===');
                    console.log('Target age:', globalAgeFilter);
                    
                    // Haal gebruikersdata op
                    const usersData = await getCachedUsers(profile.school_id);
                    console.log('Users data keys:', Object.keys(usersData).length);
                    
                    if (!isMountedRef.current) return;
                    
                    // Filter scores op basis van leeftijd
                    const filteredScores = [];
                    
                    rawScores.forEach((score, index) => {
                        const userData = usersData[score.leerling_id];
                        
                        if (!userData) {
                            console.log(`No user data found for: ${score.leerling_id} (${score.leerling_naam})`);
                            return;
                        }
                        
                        if (!userData.geboortedatum) {
                            console.log(`No birth date for user: ${score.leerling_id} (${score.leerling_naam})`);
                            return;
                        }
                        
                        const scoreUserAge = calculateAge(userData.geboortedatum);
                        
                        if (scoreUserAge === globalAgeFilter) {
                            console.log(`✓ Including: ${score.leerling_naam} (age ${scoreUserAge}, score: ${score.score})`);
                            filteredScores.push(score);
                        } else {
                            console.log(`✗ Excluding: ${score.leerling_naam} (age ${scoreUserAge}, wanted ${globalAgeFilter})`);
                        }
                    });
                    
                    rawScores = filteredScores;
                    console.log(`Filtered to ${rawScores.length} scores for age ${globalAgeFilter}`);
                } else {
                    console.log('No age filtering - showing all scores');
                }

                // 4. Neem de top 5
                const top5Scores = rawScores.slice(0, 5);
                console.log('Final top 5 scores:', top5Scores.map(s => `${s.leerling_naam}: ${s.score}`));
                
                setScores(top5Scores);

            } catch (err) {
                console.error('Error fetching highscores:', err);
                if (isMountedRef.current) {
                    setError('Kon de scores niet laden.');
                }
            } finally {
                if (isMountedRef.current) {
                    setLoading(false);
                }
            }
        };

        fetchScores();
    }, [testId, profile?.school_id, globalAgeFilter]); // BELANGRIJKE DEPENDENCY ARRAY

    if (loading) return (
        <div className="text-center text-gray-500 pt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
            Laden...
        </div>
    );
    
    if (error) return (
        <div className="text-center text-red-500 pt-4 bg-red-50 rounded-lg p-3">
            {error}
        </div>
    );
    
    if (scores.length === 0) return (
        <div className="text-center text-gray-500 pt-4 bg-gray-50 rounded-lg p-4">
            <div className="text-sm">
                {globalAgeFilter 
                    ? `Nog geen scores van ${globalAgeFilter}-jarigen voor deze test.`
                    : 'Nog geen scores ingevoerd voor deze test.'
                }
            </div>
        </div>
    );

    return (
        <div className="bg-white/80 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Top 5 Scores
                {globalAgeFilter && (
                    <span className="block text-sm font-normal text-gray-600 mt-1">
                        Leeftijdsgroep: {globalAgeFilter} jaar
                    </span>
                )}
                {!globalAgeFilter && (
                    <span className="block text-sm font-normal text-gray-600 mt-1">
                        Alle leeftijden
                    </span>
                )}
            </h3>
            
            <ol className="space-y-2 text-gray-700">
                {scores.map((entry, index) => (
                    <li 
                        key={`${entry.id || entry.leerling_id}-${index}-${globalAgeFilter || 'all'}`}
                        className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-200' :
                            index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-200' :
                            index === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-200' :
                            'bg-gray-50 hover:bg-gray-100'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-500 text-white' :
                                index === 2 ? 'bg-orange-500 text-white' :
                                'bg-purple-100 text-purple-700'
                            }`}>
                                {index + 1}
                            </span>
                            <div>
                                <span className="font-medium text-gray-900">
                                    {entry.leerling_naam || 'Onbekende leerling'}
                                </span>
                                <div className="text-xs text-gray-500">
                                    {getSchoolYear(entry.datum)}
                                </div>
                            </div>
                        </div>
                        <span className="font-bold text-lg text-purple-700">
                            {formatScoreWithUnit(entry.score, testData?.eenheid)}
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}