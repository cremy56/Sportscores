// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import Login from './Login';
import Register from './pages/Register'; // Importeer de nieuwe pagina
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

// Een helper-component om de magic link-login af te handelen
function HandleAuthRedirect() {
    const navigate = useNavigate();

    useEffect(() => {
        const completeSignIn = async () => {
            if (isSignInWithEmailLink(auth, window.location.href)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) {
                    email = window.prompt('Geef uw e-mailadres op ter bevestiging');
                }
                if (email) {
                    try {
                        await signInWithEmailLink(auth, email, window.location.href);
                        window.localStorage.removeItem('emailForSignIn');
                    } catch (error) {
                        console.error("Fout bij inloggen met magic link:", error);
                    }
                }
            }
            // Na de poging tot inloggen, navigeer naar de hoofdpagina.
            // De onAuthStateChanged listener zal de rest afhandelen.
            navigate('/');
        };
        
        completeSignIn();
    }, [navigate]);

    return <div>Bezig met inloggen...</div>;
}


function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Gebruiker is ingelogd, haal het profiel op
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // Profiel bestaat al
          setProfile(userSnap.data());
        } else {
          // EERSTE LOGIN: Profiel bestaat nog niet, maak het aan.
          const allowedUserRef = doc(db, 'toegestane_gebruikers', currentUser.email);
          const allowedUserSnap = await getDoc(allowedUserRef);

          if (allowedUserSnap.exists()) {
            const initialProfileData = allowedUserSnap.data();
            initialProfileData.email = currentUser.email; // Voeg e-mail toe
            initialProfileData.onboarding_complete = false; // Zet onboarding op false
            
            // Maak het nieuwe document aan in de 'users' collectie
            await setDoc(doc(db, 'users', currentUser.uid), initialProfileData);
            setProfile(initialProfileData);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div></div>; // Toon een lege pagina tijdens het laden
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* De routes voor niet-ingelogde gebruikers */}
        {!user ? (
            <>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                {/* Een speciale route om de redirect van de magic link op te vangen */}
                {isSignInWithEmailLink(auth, window.location.href) ? (
                    <Route path="*" element={<HandleAuthRedirect />} />
                ) : (
                    /* Stuur alle andere routes naar de login pagina */
                    <Route path="*" element={<Navigate to="/login" />} />
                )}
            </>
        ) : (
            /* De routes voor ingelogde gebruikers */
            <>
                <Route path="/setup-account" element={<SetupAccount />} />
                <Route path="/wachtwoord-wijzigen" element={<WachtwoordWijzigen />} />

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
                {/* Stuur een ingelogde gebruiker die naar /login of /register gaat naar de homepagina */}
                <Route path="/login" element={<Navigate to="/" />} />
                <Route path="/register" element={<Navigate to="/" />} />
            </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
