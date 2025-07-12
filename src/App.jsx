// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './Login';
import Layout from './components/Layout';
import Highscores from './pages/Highscores';
import Evolutie from './pages/Evolutie';
import SetupAccount from './pages/SetupAccount'; // Importeer de nieuwe pagina
import ProtectedRoute from './components/ProtectedRoute'; // Importeer de nieuwe route-beschermer
import Leerlingbeheer from './pages/Leerlingbeheer';
import Groepsbeheer from './pages/Groepsbeheer';
import Testbeheer from './pages/Testbeheer';
import TestDetailBeheer from './pages/TestDetailBeheer';
import ScoresOverzicht from './pages/ScoresOverzicht';   // Nieuw
import TestafnameDetail from './pages/TestafnameDetail'; // Nieuw
import NieuweTestafname from './pages/NieuweTestafname'; // Hernoemd
import GroupDetail from './pages/GroupDetail';
import WachtwoordWijzigen from './pages/WachtwoordWijzigen';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const koppelUuidAanGebruiker = async () => {
      if (!session?.user) return;

      const user = session.user;

      const { error } = await supabase
        .from('users')
        .update({ id: user.id })
        .eq('email', user.email)
        .is('id', null); // Alleen als id nog niet ingevuld is

      if (error) {
        console.error('Fout bij koppelen uuid aan users-tabel:', error.message);
      }
    };

    koppelUuidAanGebruiker();
  }, [session]);

  if (loading) {
    return <div></div>; // Toon niets of een laad-indicator tijdens de eerste sessie-check
    
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Als er geen sessie is, toon altijd de Login pagina */}
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            {/* De Setup-pagina is een speciale, openbare route voor ingelogde gebruikers */}
            <Route path="/setup-account" element={<SetupAccount />} />

            {/* Alle normale app-routes worden nu beschermd */}
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
                <Route path="/groep/:groepId" element={<GroupDetail />} />
                <Route path="/wachtwoord-wijzigen" element={<WachtwoordWijzigen />} />
                {/* Voeg hier later andere beschermde routes toe */}
              </Route>
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;