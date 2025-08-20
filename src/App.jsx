// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { setupNetworkMonitoring } from './utils/firebaseUtils';

// Component Imports
import Login from './Login';
import Register from './register';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SetupAccount from './pages/SetupAccount';
import WachtwoordWijzigen from './pages/WachtwoordWijzigen';
import SchoolBeheer from './pages/SchoolBeheer';

// Pagina Imports
import AdValvas from './pages/adValvas'; // AANGEPAST: Correcte import
import Highscores from './pages/Highscores';
import Evolutie from './pages/Evolutie';
import Leerlingbeheer from './pages/Leerlingbeheer';
import Groepsbeheer from './pages/Groepsbeheer';
import GroupDetail from './pages/GroupDetail';
import Testbeheer from './pages/Testbeheer';
import TestDetailBeheer from './pages/TestDetailBeheer';
import ScoresOverzicht from './pages/ScoresOverzicht';
import TestafnameDetail from './pages/TestafnameDetail';
import NieuweTestafname from './pages/NieuweTestafname';


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
    setupNetworkMonitoring();
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
        } else {
            setLoading(false);
        }
      }
    });
    return () => unsubscribeProfile();
  }, [user]);

  useEffect(() => {
    if (!profile) {
        if(user) setLoading(true);
        return;
    };
    if (!profile.school_id) {
        setSchool(null);
        setLoading(false);
        return;
    }
    const unsubscribeSchool = onSnapshot(doc(db, 'scholen', profile.school_id), (schoolSnap) => {
      if (schoolSnap.exists()) {
        setSchool({ id: schoolSnap.id, ...schoolSnap.data() });
      } else {
        setSchool(null);
      }
      setLoading(false);
    });
    return () => unsubscribeSchool;
  }, [profile, user]);

  if (loading) {
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
                        {/* AANGEPAST: De route voor de homepagina gebruikt nu de correcte 'AdValvas' component */}
                        <Route path="/" element={<AdValvas />} />
                        
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