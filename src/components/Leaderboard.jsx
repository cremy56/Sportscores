// src/components/Leaderboard.jsx
import { useState, useEffect } from 'react';
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
        // Stap 1: Haal de testgegevens op (voor eenheid en score_richting)
        const testRef = doc(db, 'testen', testId);
        const testSnap = await getDoc(testRef);

        if (!testSnap.exists()) {
          throw new Error("Test niet gevonden.");
        }
        const currentTestData = testSnap.data();
        setTestData(currentTestData);

        // Stap 2: Bouw de query voor de scores
        const scoresRef = collection(db, 'scores');
        const scoreDirection = currentTestData.score_richting === 'hoog' ? 'desc' : 'asc';
        
        const q = query(
          scoresRef, 
          where('test_id', '==', testId),
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
  }, [testId]);

  if (loading) return <div className="text-center text-gray-500 pt-4">Laden...</div>;
  if (error) return <div className="text-center text-red-500 pt-4">{error}</div>;
  if (scores.length === 0) return <div className="text-center text-gray-500 pt-4">Nog geen scores ingevoerd voor deze test.</div>;


  return (
    <ol className="space-y-1 text-gray-700 max-w-md mx-auto">
      {scores.map((entry, index) => (
        <li 
          key={entry.leerling_id || index}
          className="flex justify-between items-center p-2 rounded-lg even:bg-green-500/10"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold w-6 text-center text-purple-800/60 text-[clamp(0.7rem,1.3vw,1rem)]">
              {index + 1}.
            </span>
            <span className="text-[clamp(0.7rem,1.6vw,1.05rem)]">
              {entry.leerling_naam || 'Onbekende leerling'} ({entry.score_jaar})
            </span>
          </div>
         <span className="font-bold text-[clamp(0.85rem,2vw,1.25rem)] text-purple-700">
            {testData?.eenheid === 'min'
                ? formatSeconds(entry.score)
                : `${entry.score} ${testData?.eenheid}`}
        </span>
        </li>
      ))}
    </ol>
  );
}
