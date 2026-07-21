// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, onIdTokenChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore'; 
import { setupNetworkMonitoring } from './utils/firebaseUtils';
import toast from 'react-hot-toast';

// Component Imports
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import UniversalLogin from './components/UniversalLogin';
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
import SetupAccount from './pages/SetupAccount';
import NieuweTestafname from './pages/NieuweTestafname';
import SchemaDetail from './pages/SchemaDetail'; 
import Trainingsbeheer from './pages/Trainingsbeheer';
import EHBODetail from './pages/EHBODetail';
import EHBOMonitor from './pages/EHBOMonitor';
import Instellingen from './pages/Instellingen';
import AlgemeenInstellingen from './pages/AlgemeenInstellingen';
import SportLab from './pages/SportLab';
import Sportbuddy from './pages/Sportbuddy';
import SportbuddyModule from './pages/SportbuddyModule';
import SportbuddyGameday from './pages/SportbuddyGameday';

function DynamicHomepage({ schoolSettings }) {
  if (schoolSettings?.sportdashboardAsHomepage) {
    return <Highscores />;
  }
  return <AdValvas />;
}

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeRole, setActiveRole] = useState(null);

  // 🐛 FIX (jul 2026): het ID-token werd één keer bij login opgehaald en
  // daarna als statische string in profile._token gedeeld met de hele app.
  // Firebase-tokens verlopen na 1 uur → app-brede 401's bij lange sessies.
  // Oplossing: de SDK ververst tokens zelf proactief en meldt dat via
  // onIdTokenChanged — wij houden profile._token synchroon.
  const tokenRef = useRef(null);

  useEffect(() => {
    const unsubscribeToken = onIdTokenChanged(auth, async (currentUser) => {
      if (!currentUser) {
        tokenRef.current = null;
        return;
      }
      try {
        const versToken = await currentUser.getIdToken();
        tokenRef.current = versToken;
        setProfile(p => (p ? { ...p, _token: versToken } : p));
      } catch (err) {
        console.error('Token-verversing mislukt:', err.message);
      }
    });
    return () => unsubscribeToken();
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setProfile(null);
        setSchool(null);
        setSchoolSettings(null);
        setActiveRole(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    setupNetworkMonitoring();
  }, []);

  // Profile listener + checkAndCreateProfile
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const profileRef = doc(db, 'users', user.uid);
    let unsubscribeProfile;

    const checkAndCreateProfile = async (firebaseUser) => {
      try {
        const token = await firebaseUser.getIdToken();
        tokenRef.current = token;

        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Kon profiel niet valideren');
        }

        const setupListenerWithToken = () => {
          unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
              const profileData = { 
                id: docSnap.id,
                ...docSnap.data(),
                _token: tokenRef.current || token // altijd het meest recente token
              };
              setProfile(profileData);

              if (!activeRole) {
                setActiveRole(profileData.rol);
              }

              if (!profileData.onboarding_complete && window.location.pathname !== '/setup-account') {
                window.location.replace('/setup-account');
              }
            }
          });
        };

        if (result.status === 'profile_created') {
          setTimeout(setupListenerWithToken, 500); 
        } else {
          setupListenerWithToken();
        }

      } catch (error) {
        console.error("Fout bij profielcontrole:", error.message);
        toast.error(error.message);
        auth.signOut();
      }
    };

    checkAndCreateProfile(user);

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [user, activeRole]);

  // School listener
  useEffect(() => {
    if (profile?.school_id) {
      const schoolRef = doc(db, 'scholen', profile.school_id);
      const unsubscribeSchool = onSnapshot(schoolRef, (schoolSnap) => {
        if (schoolSnap.exists()) {
          const schoolData = { id: schoolSnap.id, ...schoolSnap.data() };
          setSchool(schoolData);
          setSchoolSettings(schoolData.instellingen || {});
        } else {
          setSchool(null);
          setSchoolSettings(null);
        }
        setLoading(false);
      });
      return () => unsubscribeSchool;
    } else {
      if (user) setLoading(false);
    }
  }, [profile, user]);

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div>Laden...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <>
            <Route path="/auth/smartschool/callback" element={<UniversalLogin />} />
            <Route path="*" element={<UniversalLogin />} />
          </>
        ) : (
          <>
            <Route path="/auth/smartschool/callback" element={<Navigate to="/" replace />} />
            <Route path="/setup-account" element={<SetupAccount />} />
            
            <Route element={<ProtectedRoute profile={profile} school={school} />}>

              {/* KIOSKMODUS — het permanente scherm in de sporthal.
                  Valt BEWUST buiten <Layout>: geen navigatiebalk, geen
                  knoppen, alleen de content. Nog steeds achter
                  ProtectedRoute, dus login blijft vereist.
                  Open deze URL één keer op de sporthal-pc in fullscreen;
                  gewone gebruikers komen hier nooit vanzelf terecht. */}
              <Route
                path="/advalvas-kiosk"
                element={<AdValvas kiosk profile={profile} school={school} />}
              />

              <Route element={
                <Layout
                  profile={profile}
                  school={school}
                  selectedStudent={selectedStudent}
                  setSelectedStudent={setSelectedStudent}
                  activeRole={activeRole}
                  setActiveRole={setActiveRole}
                />
              }>
                <Route index element={<DynamicHomepage schoolSettings={schoolSettings} />} />
                <Route path="/advalvas" element={<AdValvas />} />
                <Route path="/highscores" element={<Highscores />} />
                <Route path="/evolutie" element={<Evolutie />} />
                <Route path="/groeiplan" element={<Groeiplan />} />
                <Route path="/groeiplan/schema" element={<SchemaDetail />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/groepsbeheer" element={<Groepsbeheer />} />
                <Route path="/groep/:groepId" element={<GroupDetail />} />
                <Route path="/klas/:klasNaam" element={<GroupDetail />} />
                <Route path="/sporttesten" element={<Sporttesten />} />
                <Route path="/sporttesten/:testId" element={<TestDetailBeheer />} />
                <Route path="/testbeheer/:testId" element={<TestDetailBeheer />} />
                <Route path="/nieuwe-testafname" element={<NieuweTestafname />} />
                <Route path="/testafname/:groepId/:testId/:datum" element={<TestafnameDetail />} />
                <Route path="/trainingsbeheer/schema/:schemaId" element={<SchemaDetail />} />

                {/* ONTMANTELD jul 2026 — welzijnsmodule (Gezondheid 2.0: datavrij by design).
                    Redirects vangen oude bookmarks op. /gezondheid/ehbo staat vóór de
                    wildcard maar wint sowieso: react-router v6 rangschikt op specificiteit. */}
                <Route path="/gezondheid/ehbo" element={<Navigate to="/ehbo" replace />} />
                <Route path="/gezondheid/*" element={<Navigate to="/" replace />} />
                <Route path="/gezondheid" element={<Navigate to="/" replace />} />

                {/* EHBO — eigen pagina, los van de (gesloopte) welzijnsmodule */}
                <Route path="/ehbo" element={<EHBODetail />} />
                <Route path="/sportlab" element={<SportLab />} />

                {/* Sportbuddy — Gezondheid 2.0, datavrij by design (fictieve atleet) */}
                <Route path="/sportbuddy" element={<Sportbuddy />} />
                <Route path="/sportbuddy/module/:moduleId" element={<SportbuddyModule />} />
                <Route path="/sportbuddy/gameday" element={<SportbuddyGameday />} />

                {/* EHBO Monitor — leerkrachtdashboard, opvolger van Welzijnsmonitor */}
                <Route path="/ehbo-monitor" element={<EHBOMonitor />} />
                <Route path="/welzijnsmonitor" element={<Navigate to="/ehbo-monitor" replace />} />

                <Route path="/instellingen" element={<Instellingen />}>
                  <Route index element={<AlgemeenInstellingen />} />
                  <Route path="trainingsbeheer" element={<Trainingsbeheer />} />
                  <Route path="gebruikersbeheer" element={<Gebruikersbeheer />} />
                  <Route path="schoolbeheer" element={<SchoolBeheer />} />
                </Route>
              </Route>
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;