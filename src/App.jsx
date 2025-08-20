// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { setupNetworkMonitoring } from './utils/firebaseUtils';


import Login from './Login';
import Register from './register';
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
import SchoolBeheer from './pages/SchoolBeheer';

// Helper-component voor de magic link (onveranderd)
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
            navigate('/');
        };
        completeSignIn();
    }, [navigate]);
    return <div>Bezig met inloggen...</div>;
}


function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true); // Start altijd met laden

  useEffect(() => {
    // Deze listener is de ENIGE bron van waarheid voor de login-status.
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Als de gebruiker uitlogt, wissen we alles en stoppen we met laden.
      if (!currentUser) {
        setProfile(null);
        setSchool(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);
  
useEffect(() => {
    setupNetworkMonitoring();
}, []);

  useEffect(() => {
    // Dit effect wordt actief zodra er een gebruiker is.
    if (!user) return;

    // We zetten een real-time listener op voor het profieldocument.
    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        // EERSTE LOGIN: Het profiel bestaat nog niet. We maken het aan.
        const allowedUserRef = doc(db, 'toegestane_gebruikers', user.email);
        const allowedUserSnap = await getDoc(allowedUserRef);

        if (allowedUserSnap.exists()) {
          const initialProfileData = allowedUserSnap.data();
          initialProfileData.email = user.email;
          initialProfileData.onboarding_complete = false;
          
          await setDoc(doc(db, 'users', user.uid), initialProfileData);
        } else {
            // Gebruiker is niet toegestaan, maar heeft wel een account.
            // We stoppen met laden zodat de ProtectedRoute hem kan afhandelen.
            setLoading(false);
        }
      }
    });

    return () => unsubscribeProfile();
  }, [user]);

  useEffect(() => {
    // Dit effect wordt actief zodra het profiel is geladen.
    if (!profile) {
        // Als er een gebruiker is maar (nog) geen profiel, blijven we laden.
        // Tenzij de gebruiker is uitgelogd, dan is loading al false.
        if(user) setLoading(true);
        return;
    };

    if (!profile.school_id) {
        // Als er een profiel is, maar geen school_id (bv. tijdens onboarding),
        // zijn we klaar met laden voor dit stadium.
        setSchool(null);
        setLoading(false);
        return;
    }

    // Haal de schoolgegevens op.
    const unsubscribeSchool = onSnapshot(doc(db, 'scholen', profile.school_id), (schoolSnap) => {
      if (schoolSnap.exists()) {
        setSchool({ id: schoolSnap.id, ...schoolSnap.data() });
      } else {
        console.error("School document niet gevonden!");
        setSchool(null);
      }
      // DIT is het laatste wat we laden. Nu mag de app getoond worden.
      setLoading(false);
    });

    return () => unsubscribeSchool;
  }, [profile, user]); // Afhankelijk van user en profile

  if (loading) {
    // Toon een laadscherm om de "flits" te voorkomen
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
            <div style={{ border: '4px solid rgba(0, 0, 0, 0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: '#8b5cf6', animation: 'spin 1s ease infinite' }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
            <>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                {isSignInWithEmailLink(auth, window.location.href) ? (
                    <Route path="*" element={<HandleAuthRedirect />} />
                ) : (
                    <Route path="*" element={<Navigate to="/login" />} />
                )}
            </>
        ) : (
            <>
                <Route path="/setup-account" element={<SetupAccount />} />
                <Route path="/wachtwoord-wijzigen" element={<WachtwoordWijzigen />} />

                <Route element={<ProtectedRoute profile={profile} school={school} />}>
                    <Route element={<Layout />}>
                        <Route path="/" element={<AdValvasDashboard />} />
                        <Route path="/highscores" element={<Highscores />} />
                        <Route path="/evolutie" element={<Evolutie />} />
                        <Route path="/leerlingbeheer" element={<Leerlingbeheer />} />
                        <Route path="/groepsbeheer" element={<Groepsbeheer />} />
                        <Route path="/groep/:groepId" element={<GroupDetail />} />
                        <Route path="/scores" element={<ScoresOverzicht />} />
                        <Route path="/testafname/:groepId/:testId/:datum" element={<TestafnameDetail />} />
                        <Route path="/nieuwe-testafname" element={<NieuweTestafname />} />
                        <Route path="/testbeheer" element={<Testbeheer />} />
                        <Route path="/testbeheer/:testId" element={<TestDetailBeheer />} />
                        
                        {profile?.rol === 'administrator' && (
                          <Route path="/schoolbeheer" element={<SchoolBeheer />} />
                        )}
                    </Route>
                </Route>
                <Route path="/login" element={<Navigate to="/" />} />
                <Route path="/register" element={<Navigate to="/" />} />
            </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
