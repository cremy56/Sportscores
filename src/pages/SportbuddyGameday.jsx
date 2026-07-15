// src/pages/SportbuddyGameday.jsx
// Gameday-bestemming: de Sparring Kooi. Aparte route (/sportbuddy/gameday) zodat
// er straks vanuit meerdere plekken naartoe genavigeerd kan worden (aftelknop nu,
// later matchmaking/klassement). De game beheert zijn eigen schermen (menu →
// gevecht) intern; deze pagina levert enkel de terugweg naar de buddy.

import { Link } from 'react-router-dom';
import SparringKooi from '../components/sportbuddy/tools/SparringKooi';

export default function SportbuddyGameday() {
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
      <SparringKooi />
    </div>
  );
}
