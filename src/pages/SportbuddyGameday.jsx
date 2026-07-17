// src/pages/SportbuddyGameday.jsx
// Gameday-bestemming: de Sparring Kooi. Aparte route (/sportbuddy/gameday) zodat
// er straks vanuit meerdere plekken naartoe genavigeerd kan worden (aftelknop nu,
// later matchmaking/klassement). De game beheert zijn eigen schermen (menu →
// gevecht) intern; deze pagina levert de terugweg + voedt de buddy aan de game.
// Datavrij: de vechter erft alleen het uiterlijk/de bouw van het fictieve personage.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SparringKooi from '../components/sportbuddy/tools/SparringKooi';
import { sportbuddyApi } from '../data/sportbuddy/api';

export default function SportbuddyGameday() {
  const [buddy, setBuddy] = useState(null);
  const [graad, setGraad] = useState(2);
  const [laden, setLaden] = useState(true);

  // Buddy ophalen (zelfde patroon als SportbuddyModule): uiterlijk + bouw voor de vechter.
  const haalBuddy = useCallback(async () => {
    try {
      const result = await sportbuddyApi({ action: 'get_buddy' });
      if (result.buddy) {
        setBuddy(result.buddy);
        if (result.buddy.weergave?.graad) setGraad(result.buddy.weergave.graad);
      }
    } catch (error) {
      console.error('get_buddy (gameday) mislukt:', error.message);
    } finally {
      setLaden(false);
    }
  }, []);

  useEffect(() => { haalBuddy(); }, [haalBuddy]);

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 bg-slate-950 -z-10" />
      <div className="max-w-5xl mx-auto px-3 py-3">
        <Link
          to="/sportbuddy"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-300 hover:text-white bg-white/10 border border-white/15 rounded-full px-3 py-1.5 transition-colors"
        >
          ← Terug naar je buddy
        </Link>
      </div>
      {laden ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
        </div>
      ) : (
        <SparringKooi buddy={buddy} graad={graad} />
      )}
    </div>
  );
}
