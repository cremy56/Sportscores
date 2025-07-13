// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './Login';
import Layout from './components/Layout';
import Highscores from './pages/Highscores';
import Evolutie from './pages/Evolutie';
import SetupAccount from './pages/SetupAccount';
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

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // onAuthStateChange is de enige bron van waarheid.
    // Het wordt aangeroepen bij de eerste laadbeurt en bij elke login/logout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user) {
        // Haal het profiel op zodra de gebruiker is ingelogd.
        // De RLS policy staat dit toe op basis van het e-mailadres.
        const { data: profileData, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();

        setProfile(profileData);
        if (error && error.code !== 'PGRST116') {
          console.error('Fout bij ophalen profiel:', error);
        }
      } else {
        // Zorg ervoor dat het profiel wordt gewist bij uitloggen.
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div></div>; // Toon een lege pagina tijdens het laden
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Als er geen sessie is, toon de Login pagina */}
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            {/* De Setup-pagina is altijd toegankelijk voor ingelogde gebruikers */}
            <Route path="/setup-account" element={<SetupAccount />} />
            <Route path="/wachtwoord-wijzigen" element={<WachtwoordWijzigen />} />

            {/* De ProtectedRoute component ontvangt nu het profiel als prop */}
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
              </Route>
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
