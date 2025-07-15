// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient'; // We hebben Supabase weer nodig
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

// --- CONFIGURATIE ---
// Vul hier de gegevens in van ECHTE, WERKENDE gebruikers in uw Supabase-project.
// Voor elke rol die u wilt testen, heeft u een account nodig dat het onboarding-proces
// al heeft voltooid.
const REAL_USER_CREDENTIALS = {
  administrator: {
    email: 'uw-admin-email@adres.com',
    password: 'admin-wachtwoord',
  },
  leerkracht: {
    email: 'uw-leerkracht-email@adres.com',
    password: 'leerkracht-wachtwoord',
  },
  leerling: {
    email: 'uw-leerling-email@adres.com',
    password: 'leerling-wachtwoord',
  },
};
// --------------------


// --- Gebruikers-Selector Component ---
// Deze component start de ECHTE login-poging.
function UserSelector({ onLoginAttempt }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-6">Selecteer een Rol</h2>
        <p className="text-gray-600 mb-6">Klik op een rol om te proberen in te loggen bij Supabase met een vooraf ingesteld testaccount.</p>
        <div className="space-y-4">
          <button
            onClick={() => onLoginAttempt(REAL_USER_CREDENTIALS.administrator)}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Login als Administrator
          </button>
          <button
            onClick={() => onLoginAttempt(REAL_USER_CREDENTIALS.leerkracht)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login als Leerkracht
          </button>
          <button
            onClick={() => onLoginAttempt(REAL_USER_CREDENTIALS.leerling)}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Login als Leerling
          </button>
        </div>
      </div>
    </div>
  );
}


// --- Hoofdcomponent ---
function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Functie om de login-poging te starten
  const handleLoginAttempt = async (credentials) => {
    setLoading(true);
    setError(null);
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword(credentials);

    if (loginError) {
      setError(loginError);
      setLoading(false);
      return;
    }

    if (session?.user) {
      const { data: profileData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      setProfile(profileData);
    }
    setLoading(false);
  };

  // Als we aan het laden zijn na een klik
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Bezig met inloggen bij Supabase...</div>;
  }

  // Als er een fout is opgetreden
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600">Supabase Login Mislukt</h2>
          <p className="mt-2 text-gray-700">De bekende fout is opgetreden:</p>
          <p className="mt-2 text-sm text-red-500 bg-red-50 p-2 rounded">{error.message}</p>
          <button onClick={() => setError(null)} className="mt-4 px-4 py-2 bg-gray-200 rounded">Opnieuw proberen</button>
        </div>
      </div>
    );
  }

  // Als er nog geen profiel is, toon de selector
  if (!profile) {
    return <UserSelector onLoginAttempt={handleLoginAttempt} />;
  }

  // Zodra de login succesvol is, toon de app
  return (
    <BrowserRouter>
      <Routes>
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
