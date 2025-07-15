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
const SITE_PASSWORD = 'geheim'; // Het wachtwoord voor de "kluis"

// VUL HIER DE GEGEVENS IN VAN EEN ECHTE, WERKENDE GEBRUIKER IN UW NIEUWE SUPABASE PROJECT
// U moet eerst een gebruiker aanmaken en het onboarding proces (wachtwoord instellen) voltooien.
const TEST_USER_EMAIL = 'cremy56@gmail.com';
const TEST_USER_PASSWORD = 'KASporttesten!';
// --------------------


// --- Wachtwoordkluis Component (onveranderd) ---
function PasswordGate({ onCorrectPassword }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      onCorrectPassword();
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
            <label className="block text-gray-700 mb-2" htmlFor="password">Wachtwoord</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Voer het wachtwoord in"/>
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">Inloggen</button>
        </form>
      </div>
    </div>
  );
}

// --- De daadwerkelijke applicatie die de Supabase-sessie beheert ---
function AuthenticatedApp() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Luister naar veranderingen in de authenticatiestatus
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Zodra de gebruiker is ingelogd, halen we het ECHTE profiel op uit de database.
        const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Probeer direct in te loggen met de testgebruiker
    const loginTestUser = async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      });
      if (error) {
        console.error("Supabase login error:", error);
        setLoading(false); // Stop met laden als de login mislukt
      }
    };
    loginTestUser();

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Authenticeren met Supabase...</div>;
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600">Supabase Login Mislukt</h2>
          <p className="mt-2 text-gray-700">Kon niet inloggen met de testgebruiker.</p>
          <p className="mt-1 text-sm text-gray-500">Controleer de `TEST_USER_EMAIL` en `TEST_USER_PASSWORD` in `App.jsx`.</p>
        </div>
      </div>
    );
  }

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

// --- Hoofdcomponent die schakelt tussen de kluis en de app ---
function App() {
  const [siteUnlocked, setSiteUnlocked] = useState(false);

  if (!siteUnlocked) {
    return <PasswordGate onCorrectPassword={() => setSiteUnlocked(true)} />;
  }

  return <AuthenticatedApp />;
}

export default App;
