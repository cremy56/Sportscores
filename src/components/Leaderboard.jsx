// src/components/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';

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

// --- HELPER FUNCTIE 2: Score met eenheid correct formatteren ---
function formatScoreWithUnit(score, eenheid) {
    if (score === null || score === undefined) return '-';
    
    const eenheidLower = eenheid?.toLowerCase();

    if (eenheidLower === 'aantal') {
        return `${score}x`;
    }
    if (eenheidLower === 'min' || eenheidLower === 'sec' || eenheidLower === 'seconden') {
        const mins = Math.floor(score / 60);
        const secs = Math.floor(score % 60);
        return `${mins}'${secs.toString().padStart(2, '0')}"`;
    }
    return `${score} ${eenheid}`;
}

export default function Leaderboard({ testId }) { 
  const [scores, setScores] = useState([]);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        
        const q = query(
          scoresRef, 
          where('test_id', '==', testId),
          // De school_id filter is goed, maar niet nodig als je de highscores per school toont. 
          // Voor nu laten we het weg om het simpeler te houden, tenzij je highscores van alle scholen door elkaar wilt tonen.
          orderBy('score', scoreDirection),
          limit(5)
        );

        const querySnapshot = await getDocs(q);
        // --- AANPASSING: Converteer datum naar Date-object ---
        const scoresData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                datum: data.datum?.toDate ? data.datum.toDate() : null
            };
        });
        
        setScores(scoresData);

      } catch (err) {
        console.error('Error fetching highscores:', err);
        setError('Kon de scores niet laden.');
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [testId]);

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
      <div className="text-sm">Nog geen scores ingevoerd voor deze test.</div>
    </div>
  );

  return (
    <div className="bg-white/80 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Top 5 Scores</h3>
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
                {/* --- AANPASSING: Gebruik getSchoolYear functie --- */}
                <div className="text-xs text-gray-500">
                  Schooljaar - {getSchoolYear(entry.datum)}
                </div>
              </div>
            </div>
            {/* --- AANPASSING: Gebruik formatScoreWithUnit functie --- */}
            <span className="font-bold text-lg text-purple-700">
              {formatScoreWithUnit(entry.score, testData?.eenheid)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}