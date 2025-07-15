// src/App.jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// We hebben supabaseClient hier niet meer nodig voor de authenticatie.
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

// --- LOKALE TESTGEBRUIKERS ---
// We gebruiken deze hardgecodeerde profielen om de app te testen zonder Supabase Auth.
const MOCK_PROFILES = {
  administrator: {
    id: '11111111-1111-1111-1111-111111111111',
    naam: 'Admin Gebruiker',
    email: 'admin@sportscores.be',
    rol: 'administrator',
    onboarding_complete: true,
  },
  leerkracht: {
    id: '22222222-2222-2222-2222-222222222222',
    naam: 'Test Leerkracht',
    email: 'leerkracht@sportscores.be',
    rol: 'leerkracht',
    onboarding_complete: true,
  },
  leerling: {
    id: '33333333-3333-3333-3333-333333333333',
    naam: 'Test Leerling',
    email: 'leerling@sportscores.be',
    rol: 'leerling',
    onboarding_complete: true,
  },
};
// -----------------------------


// --- Gebruikers-Selector Component ---
// Deze component vervangt de wachtwoordkluis en de Supabase login.
function UserSelector({ onLogin }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-6">Selecteer een Rol</h2>
        <p className="text-gray-600 mb-6">Log in als een testgebruiker om de applicatie te bekijken. De Supabase login is tijdelijk uitgeschakeld.</p>
        <div className="space-y-4">
          <button
            onClick={() => onLogin(MOCK_PROFILES.administrator)}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Login als Administrator
          </button>
          <button
            onClick={() => onLogin(MOCK_PROFILES.leerkracht)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login als Leerkracht
          </button>
          <button
            onClick={() => onLogin(MOCK_PROFILES.leerling)}
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

  // Als er geen profiel is (dus nog niet "ingelogd"), toon de gebruikers-selector.
  if (!profile) {
    return <UserSelector onLogin={setProfile} />;
  }

  // Zodra een rol is gekozen, wordt het profiel ingesteld en wordt de app getoond.
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
