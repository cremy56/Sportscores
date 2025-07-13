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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Deze listener is de enige bron van waarheid voor de auth-status.
    // Hij wordt aangeroepen bij de eerste laadbeurt en bij elke wijziging.
    // setLoading(false) wordt pas aangeroepen NADAT de eerste status bekend is.
    // Dit lost het timingprobleem op na de redirect van de magic link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Ruim de listener op als de component verdwijnt.
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  // Toon een laadindicator (of niets) zolang de auth-status wordt gecontroleerd.
  if (loading) {
    return <div></div>; 
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Als er geen sessie is, toon altijd de Login pagina */}
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            {/* De Setup-pagina is een openbare route voor ingelogde gebruikers die hun account nog moeten instellen */}
            <Route path="/setup-account" element={<SetupAccount />} />
            <Route path="/wachtwoord-wijzigen" element={<WachtwoordWijzigen />} />

            {/* Alle normale app-routes worden beschermd door ProtectedRoute */}
            <Route element={<ProtectedRoute />}>
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
