// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
import Privacy from './pages/Privacy';

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

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser ? 'Logged in' : 'Logged out');
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

    // users collectie gebruikt Firebase UID als document ID
    const profileRef = doc(db, 'users', user.uid);
    let unsubscribeProfile;

    const checkAndCreateProfile = async (firebaseUser) => {
      try {
        // 1. Haal Firebase token op
        const token = await firebaseUser.getIdToken();

        // 2. Roep de veilige API-route aan
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

        console.log("Profiel check succesvol:", result.status);

        // 3. Start Firestore listener met token
        const setupListenerWithToken = () => {
          unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
              const profileData = { 
                id: docSnap.id,
                ...docSnap.data(),
                _token: token
              };
              setProfile(profileData);

              if (!activeRole) {
                setActiveRole(profileData.rol);
              }

              // Redirect naar setup-account als onboarding niet voltooid
              if (!profileData.onboarding_complete && window.location.pathname !== '/setup-account') {
                window.location.replace('/setup-account');
              }
            }
          });
        };

        // Kleine delay als profiel net aangemaakt is
        if (result.status === 'profile_created') {
          setTimeout(setupListenerWithToken, 500); 
        } else {
          setupListenerWithToken();
        }

      } catch (error) {
        // Bij fout (bv. 403 Forbidden) → uitloggen
        console.error("Fout bij profielcontrole:", error.message);
        toast.error(error.message);
        auth.signOut();
      }
    };

    checkAndCreateProfile(user);

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
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

  // Laadscherm
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
            {/* Niet ingelogd: alleen Smartschool login */}
            <Route path="/auth/smartschool/callback" element={<UniversalLogin />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<UniversalLogin />} />
          </>
        ) : (
          <>
            {/* Ingelogd: callback redirect naar homepage */}
            <Route path="/auth/smartschool/callback" element={<Navigate to="/" replace />} />
            <Route path="/setup-account" element={<SetupAccount />} />
            <Route path="/privacy" element={<Privacy />} />
            
            <Route element={<ProtectedRoute profile={profile} school={school} />}>
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
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/groepsbeheer" element={<Groepsbeheer />} />
                <Route path="/groep/:groepId" element={<GroupDetail />} />
                <Route path="/klas/:klasNaam" element={<GroupDetail />} />
                <Route path="/sporttesten" element={<Sporttesten />} />
                <Route path="/sporttesten/:testId" element={<TestDetailBeheer />} />
                <Route path="/nieuwe-testafname" element={<NieuweTestafname />} />
                <Route path="/testafname/:groepId/:testId/:datum" element={<TestafnameDetail />} />
                <Route path="/trainingsbeheer/schema/:schemaId" element={<SchemaDetail />} />
                <Route path="/gezondheid" element={<Gezondheid />} />
                <Route path="/welzijnsmonitor" element={<Welzijnsmonitor />} />
                <Route path="/gezondheid/beweging" element={<BewegingDetail />} />
                <Route path="/gezondheid/mentaal" element={<MentaalDetail />} />
                <Route path="/gezondheid/voeding" element={<VoedingDetail />} />
                <Route path="/gezondheid/slaap" element={<SlaapDetail />} />
                <Route path="/gezondheid/hart" element={<HartDetail />} />
                <Route path="/gezondheid/ehbo" element={<EHBODetail />} />
                
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