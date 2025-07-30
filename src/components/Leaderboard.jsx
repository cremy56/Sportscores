// src/components/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';

function formatSeconds(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return seconds;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const minsStr = mins.toString();
  const secsStr = secs < 10 ? `0${secs}` : secs.toString();
  return `${minsStr}'${secsStr}`;
}

export default function Leaderboard({ testId }) { 
  const { profile } = useOutletContext(); // Haal profiel op voor school_id
  const [scores, setScores] = useState([]);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScores = async () => {
      if (!testId || !profile?.school_id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // Stap 1: Haal de testgegevens op
        const testRef = doc(db, 'testen', testId);
        const testSnap = await getDoc(testRef);

        if (!testSnap.exists()) {
          throw new Error("Test niet gevonden.");
        }
        const currentTestData = testSnap.data();
        setTestData(currentTestData);

        // Stap 2: Bouw de query voor de scores - NU MET SCHOOL FILTER
        const scoresRef = collection(db, 'scores');
        const scoreDirection = currentTestData.score_richting === 'hoog' ? 'desc' : 'asc';
        
        const q = query(
          scoresRef, 
          where('test_id', '==', testId),
          where('school_id', '==', profile.school_id), // 🔒 PRIVACY: Filter op school
          orderBy('score', scoreDirection),
          limit(5)
        );

        // Stap 3: Haal de scores op
        const querySnapshot = await getDocs(q);
        const scoresData = querySnapshot.docs.map(doc => doc.data());
        
        setScores(scoresData);

      } catch (err) {
        console.error('Error fetching highscores:', err);
        setError('Kon de scores niet laden.');
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [testId, profile?.school_id]);

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
            key={entry.leerling_id || index}
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
                  Schooljaar {entry.score_jaar}-{entry.score_jaar + 1}
                </div>
              </div>
            </div>
            <span className="font-bold text-lg text-purple-700">
              {testData?.eenheid === 'min'
                ? formatSeconds(entry.score)
                : `${entry.score} ${testData?.eenheid}`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}