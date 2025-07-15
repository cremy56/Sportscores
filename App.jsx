// src/App.jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// We hebben supabase hier niet meer nodig voor de authenticatie-check.
// import { supabase } from './supabaseClient'; 
import Layout from './components/Layout';
import Highscores from './pages/Highscores';
import Evolutie from './pages/Evolutie';
import ProtectedRoute from './components/ProtectedRoute';
import Leerlingbeheer from './pages/Leerlingbeheer';
import Groepsbeheer from './pages/Groepsbeheer';
import Testbeheer from './pages/Testbeheer';
import TestDetailBeheer from './pages/TestDetailBeheer';
import ScoresOverzicht from './pages/ScoresOverzicht';
import TestafnameDetail from './pages/TestafnameDetail';
import NieuweTestafname from './pages/NieuweTestafname';
import GroupDetail from './pages/GroupDetail';
import WachtwoordWijzigen from './pages/WachtwoordWijzigen';

// Dit is de hardgecodeerde "wachtwoordkluis"
const SITE_PASSWORD = 'geheim'; // Verander dit naar een eigen, sterk wachtwoord

// Dit is de component die de gebruiker te zien krijgt bij het openen van de site.
function PasswordGate({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      // Creëer een "nep" profiel om de rest van de app te laten werken.
      // U kunt de rol aanpassen naar 'leerkracht' of 'leerling' om die weergave te testen.
      const mockProfile = {
        id: 'mock-user-id-123',
        naam: 'Test Gebruiker',
        email: 'test@sportscores.be',
        rol: 'administrator',
        onboarding_complete: true,
      };
      onLogin(mockProfile);
    } else {
      setError('Incorrect wachtwoord');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold text-center mb-6">Toegang Beveiligd</h2>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Voer het wachtwoord in"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Inloggen
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  // We gebruiken nu een 'profile' state in plaats van een 'session' state.
  const [profile, setProfile] = useState(null);

  // Als er geen profiel is (dus nog niet ingelogd), toon de wachtwoordkluis.
  if (!profile) {
    return <PasswordGate onLogin={setProfile} />;
  }

  // Zodra het juiste wachtwoord is ingevoerd, wordt het profiel ingesteld en wordt de app getoond.
  return (
    <BrowserRouter>
      <Routes>
        {/* We hebben de /setup-account en /wachtwoord-wijzigen routes hier even niet nodig */}
        <Route element={<ProtectedRoute profile={profile} />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Highscores />} />
            <Route path="/evolutie" element={<Evolutie />} />
            <Route path="/leerlingbeheer" element={<Leerlingbeheer />} />
            <Route path="/groepsbeheer" element={<Groepsbeheer />} />
            <Route path="/groep/:groepId" element={<GroupDetail />} />
            <Route path="/scores" element={<ScoresOverzicht />} />
            <Route path="/testafname/:groepId/:testId/:datum" element={<TestafnameDetail />} />
            <Route path="/nieuwe-testafname" element={<NieuweTestafname />} />
            <Route path="/testbeheer" element={<Testbeheer />} />
            <Route path="/testbeheer/:testId" element={<TestDetailBeheer />} />
             <Route path="/wachtwoord-wijzigen" element={<WachtwoordWijzigen />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
