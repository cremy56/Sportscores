// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
// 'getDoc' en 'setDoc' zijn verwijderd, 'onSnapshot' en 'doc' blijven
import { doc, onSnapshot } from 'firebase/firestore'; 
import { setupNetworkMonitoring } from './utils/firebaseUtils';
import toast from 'react-hot-toast'; // We hebben toast nodig voor de foutmelding

// Component Imports
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import UniversalLogin from './components/UniversalLogin';
import SchoolBeheer from './pages/SchoolBeheer';

// Pagina Imports (alle imports blijven hetzelfde)
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

// generateHash functie is hier verwijderd, die staat nu op de server

function DynamicHomepage({ schoolSettings }) {
  console.log('🏠 DynamicHomepage rendering, schoolSettings:', schoolSettings);
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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Gebruik de Firebase Auth UID als de sleutel voor de 'users' collectie
    const profileRef = doc(db, 'users', user.uid);
    let unsubscribeProfile;

    const setupListener = () => {
      unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const profileData = { id: docSnap.id, ...docSnap.data() };
          setProfile(profileData);
          
          if (!activeRole) {
            setActiveRole(profileData.rol);
          }
        }
      });
    };

    // --- 4. VERVANGEN checkAndCreateProfile FUNCTIE ---
    // Deze functie roept nu de veilige API-route aan.
    const checkAndCreateProfile = async (firebaseUser) => {
        try {
            // 1. Haal het token van de zojuist ingelogde gebruiker op
            const token = await firebaseUser.getIdToken();

            // 2. Roep de nieuwe, veilige API-route aan
            const response = await fetch('/api/checkAndCreateUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
                // Body is niet nodig, de API leest de ID uit het token
            });
            
            const result = await response.json();

            if (!response.ok) {
                // Als de API een 403 (verboden) of 500 stuurt, gooi een fout
                throw new Error(result.error || 'Kon profiel niet valideren');
            }
            
            console.log("Profiel check succesvol:", result.status);
            
            // 3. Zet de listener op (dit blijft hetzelfde)
            // Deze check is nodig omdat onSnapshot faalt als het document nog niet bestaat
            if (result.status === 'profile_created') {
                // Wacht even tot het profiel is gerepliceerd
                setTimeout(setupListener, 500); 
            } else {
                setupListener();
            }

        } catch (error) {
            // Als de check mislukt (bv. 403 Forbidden), log de gebruiker uit
            console.error("Fout bij het controleren/aanmaken van profiel:", error.message);
            toast.error(error.message);
            auth.signOut();
        }
    };

    // Roep de nieuwe functie aan met het 'user' object
    checkAndCreateProfile(user);

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [user, activeRole]); // Dependency array is correct

  // School listener - ongewijzigd
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
        if(user) setLoading(false);
    }
  }, [profile, user]);

  if (authLoading || loading) {
     // ... (je laadscherm)
     return <div className="fixed inset-0 bg-white flex items-center justify-center"><div>Laden...</div></div>;
  }

  // --- 5. OPGESCHOONDE ROUTES ---
  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
            <>
                {/* Alleen Smartschool is nog relevant */}
                <Route path="/auth/smartschool/callback" element={<UniversalLogin />} />
                <Route path="*" element={<UniversalLogin />} />
            </>
        ) : (
            <>
                <Route path="/auth/smartschool/callback" element={<Navigate to="/" replace />} />
                
                <Route element={<ProtectedRoute profile={profile} school={school} />}>
                  <Route element={<Layout profile={profile} school={school} selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent} activeRole={activeRole} setActiveRole={setActiveRole} />}>
                    <Route index element={<DynamicHomepage schoolSettings={schoolSettings} />} />
                    <Route path="/advalvas" element={<AdValvas />} />
                    <Route path="/highscores" element={<Highscores />} />
                    <Route path="/evolutie" element={<Evolutie />} />
                    <Route path="/groeiplan" element={<Groeiplan />} />
                    <Route path="/rewards" element={<Rewards />} />
                    <Route path="/groepsbeheer" element={<Groepsbeheer />} />
                    <Route path="/groep/:groepId" element={<GroupDetail />} />
                    <Route path="/sporttesten" element={<Sporttesten />} />
                    <Route path="/sporttesten/:testId" element={<TestDetailBeheer />} />
                    <Route path="/testafname/new/:groepId" element={<NieuweTestafname />} />
                    <Route path="/testafname/:testafnameId" element={<TestafnameDetail />} />
                    <Route path="/trainingsbeheer/schema/:schemaId" element={<SchemaDetail />} />
                    <Route path="/gezondheid" element={<Gezondheid />} />
                    <Route path="/gezondheid/welzijn" element={<Welzijnsmonitor />} />
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
                
                {/* Stuur /login en /register ook naar de homepage */}
                <Route path="/login" element={<Navigate to="/" />} />
                <Route path="/register" element={<Navigate to="/" />} />
           </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;