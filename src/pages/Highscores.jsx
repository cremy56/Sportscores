// src/components/Leaderboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { formatScoreWithUnit } from '../utils/formatters.js';
import { Users, User } from 'lucide-react';
import Leaderboard from '../components/Leaderboard';

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

export default function Leaderboard({ testId }) { 
    const { profile } = useOutletContext();
    const [scores, setScores] = useState([]);
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
   const [showAgeGroup, setShowAgeGroup] = useState(false); 
const [selectedAge, setSelectedAge] = useState(null);
    const [userAge, setUserAge] = useState(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
    if (profile?.rol === 'leerling') {
        setShowAgeGroup(true); // Leerlingen beginnen met leeftijdsgroep
    } else {
        setShowAgeGroup(false); // Admins beginnen met hele school
        setSelectedAge(null); // Reset age selection
    }
}, [profile?.rol]);

    // Bereken gebruiker leeftijd (geen database query)
    useEffect(() => {
        if (profile?.geboortedatum) {
            const age = calculateAge(profile.geboortedatum);
            setUserAge(age);
        }
    }, [profile?.geboortedatum]);

    // Cleanup bij unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const fetchScores = async () => {
            if (!testId || !profile?.school_id) {
                setLoading(false);
                return;
            }
            
            setLoading(true);
            setError(null);

            try {
                 // DEBUG LOGGING
                console.log('=== LEADERBOARD DEBUG ===');
                console.log('Profile role:', profile?.rol);
                console.log('School ID:', profile?.school_id);
                console.log('Show age group:', showAgeGroup);
               
                console.log('User age:', userAge);
                // 1. Test data ophalen (slechts 1 document read)
                const testRef = doc(db, 'testen', testId);
                const testSnap = await getDoc(testRef);

                if (!testSnap.exists()) {
                    throw new Error("Test niet gevonden.");
                }
                const currentTestData = testSnap.data();
                setTestData(currentTestData);

                // 2. Scores ophalen - BEPERKT tot 10 in plaats van 50
                const scoresRef = collection(db, 'scores');
                const scoreDirection = currentTestData.score_richting === 'hoog' ? 'desc' : 'asc';
                
                const scoresQuery = query(
                    scoresRef, 
                    where('test_id', '==', testId),
                    where('school_id', '==', profile.school_id),
                    orderBy('score', scoreDirection),
                    limit(10) // Gereduceerd van 50 naar 10
                );

                const querySnapshot = await getDocs(scoresQuery);
                const rawScores = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        id: doc.id,
                        datum: data.datum?.toDate ? data.datum.toDate() : null
                    };
                });
            console.log('Raw scores count:', rawScores.length);
                // Check if component is still mounted
                if (!isMountedRef.current) return;

                // 3. Alleen gebruikersdata ophalen als we leeftijdsfiltering nodig hebben
               // 3. Filtering op basis van rol en selecties
                let filteredScores = rawScores;

                console.log('Starting filtering logic...');

                // Voor leerlingen: alleen filteren als ze expliciet hun leeftijdsgroep kiezen
                if (profile?.rol === 'leerling' && showAgeGroup && userAge && profile?.school_id) {
                    console.log('Filtering for student age group:', userAge);
                    const usersData = await getCachedUsers(profile.school_id);
                    
                    if (!isMountedRef.current) return;
                    
                    filteredScores = rawScores.filter(score => {
                        const userData = usersData[score.leerling_id];
                        if (!userData?.geboortedatum) return false;
                        
                        const scoreUserAge = calculateAge(userData.geboortedatum);
                        return scoreUserAge === userAge;
                    });
                    console.log('Filtered scores (student):', filteredScores.length);
                }
                // Voor admins: alleen filteren als ze een specifieke leeftijd selecteren
                else if ((profile?.rol === 'administrator' || profile?.rol === 'super-administrator' || profile?.rol === 'leerkracht') && selectedAge && profile?.school_id) {
                    console.log('Filtering for admin selected age:', selectedAge);
                    const usersData = await getCachedUsers(profile.school_id);
                    
                    if (!isMountedRef.current) return;
                    
                    filteredScores = rawScores.filter(score => {
                        const userData = usersData[score.leerling_id];
                        if (!userData?.geboortedatum) return false;
                        
                        const scoreUserAge = calculateAge(userData.geboortedatum);
                        return scoreUserAge === selectedAge;
                    });
                    console.log('Filtered scores (admin):', filteredScores.length);
                }
                // Anders: geen filtering (toon alle rawScores)
                else {
                    console.log('No filtering applied - showing all scores');
                }

                console.log('Final filtered scores:', filteredScores.length);
                
                // Top 5 scores
                setScores(filteredScores.slice(0, 5));

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
    }, [testId, profile?.school_id, showAgeGroup, userAge, selectedAge]);

    // Toggle functie - geen nieuwe database queries
    const handleToggle = (newShowAgeGroup) => {
        setShowAgeGroup(newShowAgeGroup);
    };

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
                {showAgeGroup 
                    ? `Nog geen scores van ${userAge}-jarigen voor deze test.`
                    : 'Nog geen scores ingevoerd voor deze test.'
                }
            </div>
            {showAgeGroup && (
                <button 
                    onClick={() => handleToggle(false)}
                    className="mt-2 text-xs text-purple-600 hover:text-purple-800 underline"
                >
                    Bekijk alle schoolscores
                </button>
            )}
        </div>
    );

    return (
        <div className="bg-white/80 rounded-xl p-4">
            {/* Toggle buttons - alleen voor leerlingen */}
            {profile?.rol === 'leerling' && userAge ? (
    // Leerling: toggle tussen eigen leeftijd en hele school
    <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
            onClick={() => handleToggle(true)}
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                showAgeGroup
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
            }`}
        >
            <User className="w-4 h-4 mr-1" />
            {userAge} jaar
        </button>
        <button
            onClick={() => handleToggle(false)}
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                !showAgeGroup
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
            }`}
        >
            <Users className="w-4 h-4 mr-1" />
            Hele school
        </button>
    </div>
) : (profile?.rol === 'administrator' || profile?.rol === 'super-administrator' || profile?.rol === 'leerkracht') ? (
    // Admin/leerkracht: dropdown voor leeftijden
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter op leeftijd:
        </label>
        <select
            value={selectedAge || ''}
            onChange={(e) => setSelectedAge(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
            <option value="">Alle leeftijden (hele school)</option>
            {[12, 13, 14, 15, 16, 17].map(age => (
                <option key={age} value={age}>{age} jaar</option>
            ))}
        </select>
    </div>
) : null}

            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Top 5 Scores
                {showAgeGroup && userAge && (
                    <span className="block text-sm font-normal text-gray-600 mt-1">
                        Leeftijdsgroep: {userAge} jaar
                    </span>
                )}
            </h3>
            
            <ol className="space-y-2 text-gray-700">
                {scores.map((entry, index) => (
                    <li 
                        key={entry.id || index}
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
                                    {((profile?.rol === 'leerling' && showAgeGroup && userAge) || 
                                      ((profile?.rol === 'administrator' || profile?.rol === 'super-administrator' || profile?.rol === 'leerkracht') && selectedAge)) && (
                                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                            {profile?.rol === 'leerling' ? userAge : selectedAge} jaar
                                        </span>
                                    )}
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