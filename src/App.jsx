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
import Groeiplan from './pages/Groeiplan';
import Gebruikersbeheer from './pages/Gebruikersbeheer';
import Groepsbeheer from './pages/Groepsbeheer';
import GroupDetail from './pages/GroupDetail';
import Testbeheer from './pages/Testbeheer';
import TestDetailBeheer from './pages/TestDetailBeheer';
import ScoresOverzicht from './pages/ScoresOverzicht';
import TestafnameDetail from './pages/TestafnameDetail';
import NieuweTestafname from './pages/NieuweTestafname';
import SchemaDetail from './pages/SchemaDetail'; 
import Trainingsbeheer from './pages/Trainingsbeheer';
import Gezondheid from './pages/Gezondheid';
import Welzijnsmonitor from './pages/Welzijnsmonitor';
import BewegingDetail from './pages/BewegingDetail';


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
  const [selectedStudent, setSelectedStudent] = useState(null);

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
    if (!user) {
      setLoading(false);
      return;
    }

    const profileRef = doc(db, 'users', user.uid);
    let unsubscribeProfile;

    const setupListener = () => {
      unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      });
    };

    const checkAndCreateProfile = async () => {
      try {
        const docSnap = await getDoc(profileRef);
        if (!docSnap.exists()) {
          const allowedUserRef = doc(db, 'toegestane_gebruikers', user.email);
          const allowedUserSnap = await getDoc(allowedUserRef);
          if (allowedUserSnap.exists()) {
            const initialProfileData = {
              ...allowedUserSnap.data(),
              email: user.email,
              onboarding_complete: false
            };
            await setDoc(profileRef, initialProfileData);
          } else {
            console.error("Gebruiker niet gevonden in toegestane_gebruikers.");
          }
        }
        setupListener();
      } catch (error) {
        console.error("Fout bij het controleren/aanmaken van profiel:", error);
      }
    };

    checkAndCreateProfile();

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [user]);


  useEffect(() => {
    if (profile?.school_id) {
      const schoolRef = doc(db, 'scholen', profile.school_id);
      const unsubscribeSchool = onSnapshot(schoolRef, (schoolSnap) => {
        setSchool(schoolSnap.exists() ? { id: schoolSnap.id, ...schoolSnap.data() } : null);
        setLoading(false);
      });
      return () => unsubscribeSchool;
    } else {
        if(user) setLoading(false);
    }
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
                
                    {/* --- CORRECTIE HIER --- */}
                    {/* Combineer de twee Layout routes in één enkele route die de props én de onderliggende pagina's bevat. */}
                    <Route element={<Layout profile={profile} school={school} selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent} />}>
                        <Route path="/" element={<AdValvas />} />
                        
                        <Route path="/highscores" element={<Highscores />} />
                        <Route path="/evolutie" element={<Evolutie />} />
                        <Route path="/groepsbeheer" element={<Groepsbeheer />} />
                        <Route path="/groep/:groepId" element={<GroupDetail />} />
                        <Route path="/scores" element={<ScoresOverzicht />} />
                        <Route path="/testafname/:groepId/:testId/:datum" element={<TestafnameDetail />} />
                        <Route path="/nieuwe-testafname" element={<NieuweTestafname />} />
                        <Route path="/testbeheer" element={<Testbeheer />} />
                        <Route path="/testbeheer/:testId" element={<TestDetailBeheer />} />
                        <Route path="/groeiplan" element={<Groeiplan />} />
                        <Route path="/groeiplan/schema" element={<SchemaDetail />} />

                        {(profile?.rol === 'leerling' || profile?.rol === 'super-administrator') && (
                          <>
                            <Route path="/gezondheid" element={<Gezondheid />} />
                            <Route path="/gezondheid/beweging" element={<BewegingDetail />} />
                          </>

                        )}
                        {(profile?.rol === 'leerkracht' || profile?.rol === 'administrator' || profile?.rol === 'super-administrator') && (
                          <Route path="/welzijnsmonitor" element={<Welzijnsmonitor />} />
                        )}
                        {(profile?.rol === 'administrator' || profile?.rol === 'super-administrator') && (
                          <>
                            <Route path="/gebruikersbeheer" element={<Gebruikersbeheer />} />
                            <Route path="/trainingsbeheer" element={<Trainingsbeheer />} /> 
                          </>
                        )}
                        {/* Route die ENKEL voor de super-admin is */}
                        {profile?.rol === 'super-administrator' && (
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