// src/components/Leaderboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getAuth } from 'firebase/auth';// Importeer auth
// Verwijder alle 'firebase/firestore' imports
import { formatScoreWithUnit } from '../utils/formatters.js';

// --- HELPER FUNCTIE 1: Schooljaar veilig berekenen ---
// (Deze functie blijft hetzelfde, geen Firebase calls)
function getSchoolYear(dateStr) {
    if (!dateStr) return 'Onbekend';
    const date = new Date(dateStr); // Datum komt nu als ISO string van server
    if (isNaN(date.getTime())) {
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

// --- HELPER FUNCTIE 2 & 3 (getCachedUsers, calculateAge) ---
// Deze zijn VERWIJDERD en verplaatst naar de server.

export default function Leaderboard({ testId, globalAgeFilter, isLearner }) { 
    const { profile } = useOutletContext(); // Profile is nog steeds nodig voor school_id
    const [scores, setScores] = useState([]);
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    // Cleanup bij unmount
    useEffect(() => {
        isMountedRef.current = true; // Zet op true bij mount
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // HOOFDEFFECT: Haalt data op via de nieuwe API
    useEffect(() => {
        const fetchScores = async () => {
            if (!testId || !profile?.school_id) {
                setLoading(false);
                return;
            }
            
            setLoading(true);
            setError(null);

            try {
                const auth = getAuth(); // <-- KRIJG DE AUTH INSTANTIE
                const user = auth.currentUser; // <-- KRIJG DE USER VAN DE INSTANTIE
                if (!user) throw new Error("Niet ingelogd");
                const token = await user.getIdToken();

                const response = await fetch('/api/tests', { // <-- GEWIJZIGD
                method: 'POST',
                // ... headers ...
                body: JSON.stringify({
                    action: 'get_leaderboard', // <-- TOEGEVOEGD
                    testId: testId,
                    globalAgeFilter: globalAgeFilter 
                })
            });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Kon scores niet laden');
                }

                if (isMountedRef.current) {
                    setScores(data.scores);
                    setTestData(data.testData);
                }

            } catch (err) {
                console.error('Error fetching leaderboard via API:', err);
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
    }, [testId, profile?.school_id, globalAgeFilter]); // Dependency array blijft hetzelfde

    // --- RENDER LOGICA (blijft grotendeels hetzelfde) ---

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
           {!isLearner && (
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
            )}
            
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