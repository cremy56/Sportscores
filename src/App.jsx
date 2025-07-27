// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setSchool(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        const allowedUserRef = doc(db, 'toegestane_gebruikers', user.email);
        const allowedUserSnap = await getDoc(allowedUserRef);

        if (allowedUserSnap.exists()) {
          const initialProfileData = allowedUserSnap.data();
          initialProfileData.email = user.email;
          initialProfileData.onboarding_complete = false;
          await setDoc(doc(db, 'users', user.uid), initialProfileData);
        }
      }
    });

    return () => unsubscribeProfile();
  }, [user]);

  useEffect(() => {
    if (!profile?.school_id) {
      setSchool(null);
      setLoading(false);
      return;
    }

    const unsubscribeSchool = onSnapshot(doc(db, 'scholen', profile.school_id), (schoolSnap) => {
      if (schoolSnap.exists()) {
        setSchool({ id: schoolSnap.id, ...schoolSnap.data() });
      } else {
        console.error("School document niet gevonden!");
        setSchool(null);
      }
      setLoading(false);
    });

    return () => unsubscribeSchool;
  }, [profile]);

  if (loading) {
    return <div></div>;
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

                {/* --- AANGEPASTE ROUTE STRUCTUUR --- */}
                {/* ProtectedRoute ontvangt nu alle context data */}
                <Route element={<ProtectedRoute profile={profile} school={school} />}>
                    {/* Layout heeft geen props meer nodig, het haalt de context op */}
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
