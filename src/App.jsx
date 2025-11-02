// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { setupNetworkMonitoring } from './utils/firebaseUtils';
import CryptoJS from 'crypto-js'; // <-- 1. IMPORT CRYPTO-JS
import toast from 'react-hot-toast'; // <-- Nodig voor error handling

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

// --- 2. HASH FUNCTIE (buiten het component) ---
const generateHash = (smartschoolUserId) => {
    return CryptoJS.SHA256(smartschoolUserId).toString();
};

function DynamicHomepage({ schoolSettings }) {
  console.log('🏠 DynamicHomepage rendering, schoolSettings:', schoolSettings);
  if (schoolSettings?.sportdashboardAsHomepage) {
    return <Highscores />;
  }
  return <AdValvas />;
}

// 3. Verwijder HandleAuthRedirect (niet meer nodig)

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

    // --- 4. VOLLEDIG NIEUWE CHECKANDCREATEPROFILE FUNCTIE ---
    const checkAndCreateProfile = async () => {
        try {
            const docSnap = await getDoc(profileRef);
            
            if (docSnap.exists()) {
                // Profiel bestaat al, zet de listener op
                setupListener();
                return;
            }

            // --- Profiel bestaat niet, probeer het aan te maken ---
            
            // 1. Haal de Smartschool User ID op uit het Firebase Auth profiel
            //    (Dit komt uit de 'providerData' van de Smartschool login)
            const smartschoolUserId = user.providerData?.[0]?.uid;
            
            if (!smartschoolUserId) {
                console.error("Kon Smartschool User ID niet vinden in Auth profiel. (user.providerData[0].uid)");
                toast.error("Smartschool ID niet gevonden, uitloggen.");
                auth.signOut();
                return;
            }

            // 2. Genereer de HASH die je backend ook gebruikt
            const hashedSmartschoolId = generateHash(smartschoolUserId);
            
            // 3. Controleer de whitelist ('toegestane_gebruikers') met de HASH
            const allowedUserRef = doc(db, 'toegestane_gebruikers', hashedSmartschoolId);
            const allowedUserSnap = await getDoc(allowedUserRef);

            if (allowedUserSnap.exists()) {
                // Gebruiker staat op de whitelist!
                const whitelistData = allowedUserSnap.data();
                
                // 4. Maak het profiel aan in de 'users' collectie
                //    met de Firebase Auth UID als Document ID
                const initialProfileData = {
                    smartschool_id_hash: hashedSmartschoolId,
                    encrypted_name: whitelistData.encrypted_name, // Neem encrypted naam over
                    school_id: whitelistData.school_id,
                    rol: whitelistData.rol,
                    klas: whitelistData.klas || null,
                    gender: whitelistData.gender || null,
                    onboarding_complete: true, // Auto-complete voor Smartschool
                    created_at: new Date(),
                    last_login: new Date()//
          
                };

                await setDoc(profileRef, initialProfileData);
                
                // Zet de listener op nadat het profiel is aangemaakt
                setupListener();
                
            } else {
                // Niet op de whitelist. Log de gebruiker uit.
                console.error(`GEBRUIKER GEWEIGERD: Hash ${hashedSmartschoolId} (van Smartschool ID ${smartschoolUserId}) niet gevonden in 'toegestane_gebruikers'.`);
                toast.error("Je hebt geen toegang tot deze applicatie.");
                auth.signOut();
            }

        } catch (error) {
            console.error("Fout bij het controleren/aanmaken van profiel:", error);
            auth.signOut();
        }
    };

    checkAndCreateProfile();

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
    // Laadscherm (ongewijzigd)
  }

  // --- 5. OPGESCHOONDE ROUTES ---
  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
            <>
                {/* Alleen Smartschool is nog relevant */}
                <Route path="/auth/smartschool/callback" element={<UniversalLogin />} />
                {/* Stuur alle andere bezoekers naar de UniversalLogin */}
                <Route path="*" element={<UniversalLogin />} />
            </>
        ) : (
            <>
                {/* Redirect callback to home if already logged in */}
                <Route path="/auth/smartschool/callback" element={<Navigate to="/" replace />} />
                
                {/* Als je e-mail routes verwijdert, kunnen deze ook weg */}
                {/* <Route path="/setup-account" element={<SetupAccount />} /> */}
                {/* <Route path="/wachtwoord-wijzigen" element={<WachtwoordWijzigen />} /> */}

                <Route element={<ProtectedRoute profile={profile} school={school} />}>
                  <Route element={<Layout profile={profile} school={school} selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent} activeRole={activeRole} setActiveRole={setActiveRole} />}>
                    {/* Alle ingelogde routes blijven hetzelfde */}
                    <Route index element={<DynamicHomepage schoolSettings={schoolSettings} />} />
                    <Route path="/advalvas" element={<AdValvas />} />
                    <Route path="/highscores" element={<Highscores />} />
                    {/* ... etc. ... */}
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