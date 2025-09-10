// src/components/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { formatScoreWithUnit } from '../utils/formatters.js';
import { Users, User } from 'lucide-react';

// --- HELPER FUNCTIE 1: Schooljaar veilig berekenen ---
function getSchoolYear(date) {
    if (!date || isNaN(new Date(date).getTime())) {
        return 'Onbekend'; // Voorkomt 'NaN' bij ongeldige datums
    }
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = januari, 7 = augustus
    
    // Schooljaar start in augustus
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

export default function Leaderboard({ testId }) { 
    const { profile } = useOutletContext();
    const [scores, setScores] = useState([]);
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAgeGroup, setShowAgeGroup] = useState(true); // Standaard leeftijdsgroep
    const [userAge, setUserAge] = useState(null);

    // Bereken gebruiker leeftijd
    useEffect(() => {
        if (profile?.geboortedatum) {
            const age = calculateAge(profile.geboortedatum);
            setUserAge(age);
        }
    }, [profile?.geboortedatum]);

    // Haal alle gebruikers op om leeftijden te kunnen filteren
    const [allUsers, setAllUsers] = useState({});
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersRef = collection(db, 'users');
                const usersQuery = query(usersRef, where('rol', '==', 'leerling'));
                const usersSnapshot = await getDocs(usersQuery);
                
                const usersData = {};
                usersSnapshot.docs.forEach(doc => {
                    const userData = doc.data();
                    usersData[userData.email] = userData;
                });
                
                setAllUsers(usersData);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        const fetchScores = async () => {
            if (!testId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);

            try {
                const testRef = doc(db, 'testen', testId);
                const testSnap = await getDoc(testRef);

                if (!testSnap.exists()) {
                    throw new Error("Test niet gevonden.");
                }
                const currentTestData = testSnap.data();
                setTestData(currentTestData);

                const scoresRef = collection(db, 'scores');
                const scoreDirection = currentTestData.score_richting === 'hoog' ? 'desc' : 'asc';
                
                let q;
                if (profile?.school_id) {
                    q = query(
                        scoresRef, 
                        where('test_id', '==', testId),
                        where('school_id', '==', profile.school_id),
                        orderBy('score', scoreDirection),
                        limit(50) // Meer ophalen om te kunnen filteren
                    );
                } else {
                    q = query(
                        scoresRef, 
                        where('test_id', '==', testId),
                        orderBy('score', scoreDirection),
                        limit(50)
                    );
                }

                const querySnapshot = await getDocs(q);
                const scoresData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        id: doc.id,
                        datum: data.datum?.toDate ? data.datum.toDate() : null
                    };
                });
                
                // Filter op leeftijdsgroep als showAgeGroup waar is en we de gebruiker leeftijd kennen
                let filteredScores = scoresData;
                if (showAgeGroup && userAge && Object.keys(allUsers).length > 0) {
                    filteredScores = scoresData.filter(score => {
                        const userData = allUsers[score.leerling_id];
                        if (!userData?.geboortedatum) return false;
                        
                        const scoreUserAge = calculateAge(userData.geboortedatum);
                        return scoreUserAge === userAge;
                    });
                }
                
                // Neem alleen top 5
                setScores(filteredScores.slice(0, 5));

            } catch (err) {
                console.error('Error fetching highscores:', err);
                setError('Kon de scores niet laden.');
            } finally {
                setLoading(false);
            }
        };

        fetchScores();
    }, [testId, profile?.school_id, showAgeGroup, userAge, allUsers]);

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
                    onClick={() => setShowAgeGroup(false)}
                    className="mt-2 text-xs text-purple-600 hover:text-purple-800 underline"
                >
                    Bekijk alle schoolscores
                </button>
            )}
        </div>
    );

    return (
        <div className="bg-white/80 rounded-xl p-4">
            {/* Toggle buttons */}
            {profile?.rol === 'leerling' && userAge && (
                <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setShowAgeGroup(true)}
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
                        onClick={() => setShowAgeGroup(false)}
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
            )}

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
                                    Schooljaar - {getSchoolYear(entry.datum)}
                                    {showAgeGroup && userAge && (
                                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                            {userAge} jaar
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