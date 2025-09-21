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
import AdValvas from './pages/adValvas';
import Highscores from './pages/Highscores';
import Evolutie from './pages/Evolutie';
import Groeiplan from './pages/Groeiplan';
import Rewards from './pages/Rewards'; 
import Gebruikersbeheer from './pages/Gebruikersbeheer';
import Groepsbeheer from './pages/Groepsbeheer';
import GroupDetail from './pages/GroupDetail';
import TestDetailBeheer from './pages/TestDetailBeheer';
import Sporttesten from './pages/Sporttesten';
import TestafnameDetail from './pages/TestafnameDetail';
import NieuweTestafname from './pages/NieuweTestafname';
import SchemaDetail from './pages/SchemaDetail'; 
import Trainingsbeheer from './pages/Trainingsbeheer';
import Gezondheid from './pages/Gezondheid';
import Welzijnsmonitor from './pages/Welzijnsmonitor';
import BewegingDetail from './pages/BewegingDetail';
import MentaalDetail from './pages/MentaalDetail';
import VoedingDetail from './pages/VoedingDetail';
import SlaapDetail from './pages/SlaapDetail';
import HartDetail from './pages/HartDetail';
import EHBODetail from './pages/EHBODetail';
import Instellingen from './pages/Instellingen';
import AlgemeenInstellingen from './pages/AlgemeenInstellingen';

import UniversalLogin from './components/UniversalLogin';

// Component om de dynamische homepage te bepalen
function DynamicHomepage({ schoolSettings }) {
  // Als de instelling aanstaat, toon Highscores, anders Ad Valvas
  if (schoolSettings?.sportdashboardAsHomepage) {
    return <Highscores />;
  }
  return <AdValvas />;
}

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
  const [schoolSettings, setSchoolSettings] = useState(null); // Nieuwe state voor schoolinstellingen
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeRole, setActiveRole] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setSchool(null);
        setSchoolSettings(null); // Reset schoolinstellingen
        setActiveRole(null);
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
          const profileData = { id: docSnap.id, ...docSnap.data() };
          setProfile(profileData);
          
          // Zet de activeRole initieel gelijk aan de rol van het profiel
          if (!activeRole) {
            setActiveRole(profileData.rol);
          }
        }
      });
    };

const checkAndCreateProfile = async () => {
  try {
    const docSnap = await getDoc(profileRef);
    if (!docSnap.exists()) {
      // Voor Smartschool-gebruikers: zoek via custom token claims of user.uid
      // De user.uid komt uit de custom token die je hebt aangemaakt
      const allowedUserRef = doc(db, 'toegestane_gebruikers', user.uid);
      let allowedUserSnap = await getDoc(allowedUserRef);
      
      // Fallback: als het niet via uid werkt, probeer via email (voor email-gebruikers)
      if (!allowedUserSnap.exists() && user.email) {
        const emailRef = doc(db, 'toegestane_gebruikers', user.email);
        allowedUserSnap = await getDoc(emailRef);
      }
      
      if (allowedUserSnap.exists()) {
        const initialProfileData = {
          ...allowedUserSnap.data(),
          email: user.email || '', // Email kan null zijn voor Smartschool
          onboarding_complete: false,
          xp: 0,
          xp_current_period: 0,
          xp_current_school_year: 0,
          streak_days: 0,
          weekly_stats: {
            kompas: 0,
            trainingen: 0,
            perfectWeek: false
          },
          personal_records_count: 0
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
  }, [user, activeRole]);

  // School listener - nu met schoolinstellingen
  useEffect(() => {
    if (profile?.school_id) {
      const schoolRef = doc(db, 'scholen', profile.school_id);
      const unsubscribeSchool = onSnapshot(schoolRef, (schoolSnap) => {
        if (schoolSnap.exists()) {
          const schoolData = { id: schoolSnap.id, ...schoolSnap.data() };
          setSchool(schoolData);
          
          // Extract schoolinstellingen uit de school data
          setSchoolSettings(schoolData.instellingen || {});
        } else {
          setSchool(null);
          setSchoolSettings(null);
        }
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
              <Route path="/register" element={<Register />} />
              <Route path="/auth/smartschool/callback" element={<UniversalLogin />} />
              {isSignInWithEmailLink(auth, window.location.href) ? (
                  <Route path="*" element={<HandleAuthRedirect />} />
              ) : (
                  <Route path="*" element={<UniversalLogin />} />
              )}
          </>
      ) : (
          <>
              {/* Redirect callback to home if already logged in */}
              <Route path="/auth/smartschool/callback" element={<Navigate to="/" replace />} />
              <Route path="/setup-account" element={<SetupAccount />} />
              <Route path="/wachtwoord-wijzigen" element={<WachtwoordWijzigen />} />

            <Route element={<ProtectedRoute profile={profile} school={school} />}>
                  
                      <Route element={<Layout profile={profile} school={school} selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent} activeRole={activeRole} setActiveRole={setActiveRole} />}>
                       {/* Dynamische homepage route */}
                       <Route path="/" element={<DynamicHomepage schoolSettings={schoolSettings} />} />
                       
                       {/* Directe routes naar beide pagina's (voor navigatie) */}
                       <Route path="/advalvas" element={<AdValvas />} />
                       <Route path="/highscores" element={<Highscores />} />
                       
                      <Route path="/evolutie" element={<Evolutie />} />
                      <Route path="/groeiplan" element={<Groeiplan />} />
                      <Route path="/rewards" element={<Rewards />} />
                      <Route path="/groepsbeheer" element={<Groepsbeheer />} />
                      <Route path="/groep/:groepId" element={<GroupDetail />} />
                      <Route path="/sporttesten" element={<Sporttesten />} />
                      <Route path="/testafname/:groepId/:testId/:datum" element={<TestafnameDetail />} />
                      <Route path="/nieuwe-testafname" element={<NieuweTestafname />} />
                      <Route path="/testbeheer/:testId" element={<TestDetailBeheer />} />
                      <Route path="/groeiplan/schema" element={<SchemaDetail />} />

                      {(activeRole === 'leerling' || activeRole === 'administrator' || activeRole === 'super-administrator') && (
                        <>
                          <Route path="/gezondheid" element={<Gezondheid />} />
                          <Route path="/gezondheid/beweging" element={<BewegingDetail />} />
                          <Route path="/gezondheid/mentaal" element={<MentaalDetail />} /> 
                          <Route path="/gezondheid/voeding" element={<VoedingDetail />} />
                          <Route path="/gezondheid/slaap" element={<SlaapDetail />} />
                          <Route path="/gezondheid/hart" element={<HartDetail />} />
                           <Route path="/gezondheid/EHBO" element={<EHBODetail />} />
                        </>
                      )}
                      
                      {(activeRole === 'leerkracht' || activeRole === 'administrator' || activeRole === 'super-administrator') && (
                        <Route path="/welzijnsmonitor" element={<Welzijnsmonitor />} />
                      )}
                      
                      {(activeRole === 'administrator' || activeRole === 'super-administrator') && (
                        <Route path="/instellingen" element={<Instellingen />}>
                          <Route index element={<AlgemeenInstellingen />} />
                          <Route path="trainingsbeheer" element={<Trainingsbeheer />} />
                          <Route path="gebruikersbeheer" element={<Gebruikersbeheer />} />
                          {/* De foute voorwaarde is hier weggehaald */}
                          <Route path="schoolbeheer" element={<SchoolBeheer />} />
                        </Route>
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