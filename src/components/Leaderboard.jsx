// src/components/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';


function formatSeconds(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return seconds;

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  // Format met voorloopnullen
  const minsStr = mins.toString();
  const secsStr = secs < 10 ? `0${secs}` : secs.toString();

  return `${minsStr}:${secsStr}`;
}

export default function Leaderboard({ testId }) { 
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScores = async () => {
      if (!testId) return;
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc('get_top_5_scores_dynamic', {
        p_test_id: testId 
      });
      if (error) {
        console.error('Error fetching highscores:', error);
        setError('Kon de scores niet laden.');
      } else {
        setScores(data);
        console.log('Fetched scores:', data);
        data.forEach((entry, i) => {
          console.log(`Entry ${i}: score =`, entry.score, typeof entry.score, 'eenheid =', entry.eenheid);
        });
      }
      setLoading(false);
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
          key={`${testId}-${index}`}
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
            {entry.eenheid === 'seconden' ? formatSeconds(entry.score) : entry.score} {entry.eenheid}

          </span>
        </li>
      ))}
    </ol>
  );
}
