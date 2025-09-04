import React, { useState, useEffect } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Helper om de datum van vandaag in JJJJ-MM-DD formaat te krijgen
const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MijnGezondheid = () => {
  const { profile } = useOutletContext(); // Haal de ingelogde gebruiker op
  const navigate = useNavigate();
  
// NIEUWE LOGICA: Bepaal welke gebruiker ID te gebruiken
  const getEffectiveUserId = () => {
    // Als je super-admin bent EN een leerling impersoneert
    if (profile?.originalProfile?.rol === 'super-administrator' && profile?.rol === 'leerling') {
      return profile?.uid; // Gebruik de geïmpersoneerde leerling UID
    }
    // Anders gebruik je eigen UID
    return profile?.uid || profile?.originalProfile?.uid;
  };
  
  const effectiveUserId = getEffectiveUserId();
  console.log('DEBUG: Effective User ID:', effectiveUserId);
console.log('DEBUG: Profile structure:', profile);

  // State voor data uit Firestore
  const [welzijnDoelen, setWelzijnDoelen] = useState({ stappen: 10000, water: 2000, slaap: 8 });
  const [dagelijkseData, setDagelijkseData] = useState({ stappen: 0, hartslag_rust: 72, water_intake: 0, slaap_uren: 0 });
  
  // State voor de modals
  const [showHartslagModal, setShowHartslagModal] = useState(false);
  const [tempHartslag, setTempHartslag] = useState(72);
  const [showStappenModal, setShowStappenModal] = useState(false);
  const [tempStappen, setTempStappen] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Effect Hook om live data op te halen uit Firestore
  useEffect(() => {
    // Info modal voor eerste bezoek
    const hasVisited = localStorage.getItem('welzijn-visited');
    if (!hasVisited) {
      setShowInfoModal(true);
      localStorage.setItem('welzijn-visited', 'true');
    }

    if (!effectiveUserId) return; // Wacht tot het profiel geladen is

    console.log('DEBUG: Setting up Firestore listeners for profile:', effectiveUserId);

    // 1. Listener voor het hoofddocument (bevat de doelen)
    const welzijnDocRef = doc(db, 'welzijn', effectiveUserId);
    const unsubscribeWelzijn = onSnapshot(welzijnDocRef, (docSnap) => {
      console.log('DEBUG: Welzijn doc snapshot:', docSnap.exists() ? docSnap.data() : 'does not exist');
      if (docSnap.exists() && docSnap.data().doelen) {
        setWelzijnDoelen(docSnap.data().doelen);
      }
    });

    // 2. Listener voor de data van VANDAAG
    const todayString = getTodayString();
    const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', todayString);
    const unsubscribeVandaag = onSnapshot(todayDocRef, (docSnap) => {
      console.log('DEBUG: Daily data snapshot for', todayString, ':', docSnap.exists() ? docSnap.data() : 'does not exist');
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDagelijkseData(prev => ({...prev, ...data}));
        setTempHartslag(data.hartslag_rust || 72);
        setTempStappen(data.stappen || 0);
      } else {
        setDagelijkseData({ stappen: 0, hartslag_rust: 72, water_intake: 0, slaap_uren: 0 });
        setTempHartslag(72);
        setTempStappen(0);
      }
    });

    return () => {
      unsubscribeWelzijn();
      unsubscribeVandaag();
    };
  }, [effectiveUserId]);

  // GEFIXED: handleSegmentClick functie
  const handleSegmentClick = (segment) => {
    console.log(`${segment} segment geklikt`);
    if (segment === 'Beweging') {
      setTempStappen(dagelijkseData.stappen || 0); // GEFIXED: gebruik dagelijkseData.stappen
      setShowStappenModal(true);
    }
  };

  // Functie voor klikken op TEGEL (navigeert naar DETAILPAGINA)
  const handleTileClick = (path) => {
    navigate(path);
  };

  // Herbruikbare functie om data op te slaan
  const saveDataToDayDoc = async (dataToSave) => {
    if (!effectiveUserId) return;
   const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());

    try {
      console.log('DEBUG: Saving to Firestore:', dataToSave);
      await setDoc(todayDocRef, dataToSave, { merge: true });
      toast.success('Gegevens opgeslagen!');
    } catch (error) {
      console.error("Fout bij opslaan van dagelijkse data:", error);
      toast.error('Kon gegevens niet opslaan.');
    }
  };

  // Functies om de modals op te slaan
  const handleHartslagSave = () => {
    if (tempHartslag >= 30 && tempHartslag <= 220) {
      saveDataToDayDoc({ hartslag_rust: tempHartslag });
      setShowHartslagModal(false);
    } else {
      toast.error('Voer een geldige hartslag in (30-220 BPM)');
    }
  };

  const handleStappenSave = () => {
    if (tempStappen >= 0 && tempStappen <= 100000) {
      saveDataToDayDoc({ stappen: tempStappen });
      setShowStappenModal(false);
    } else {
      toast.error('Voer een geldig aantal stappen in (0-100.000)');
    }
  };

  // Bereken de percentages voor de UI op basis van de live data
  const welzijnScores = {
    beweging: welzijnDoelen.stappen > 0 ? Math.min(Math.round((dagelijkseData.stappen / welzijnDoelen.stappen) * 100), 100) : 0,
    voeding: 75, // Placeholder - kun je later vervangen door echte berekening
    slaap: 68,   // Placeholder - kun je later vervangen door echte berekening
    mentaal: 88, // Placeholder - kun je later vervangen door echte berekening
  };

  const getGemiddeldeScore = () => {
    const totaal = welzijnScores.beweging + welzijnScores.voeding + welzijnScores.slaap + welzijnScores.mentaal;
    return Math.round(totaal / 4);
  };

  const getBalansStatus = () => {
    const gemiddelde = getGemiddeldeScore();
    if (gemiddelde >= 80) return { status: 'Uitstekend', emoji: '🌟' };
    if (gemiddelde >= 70) return { status: 'Goed', emoji: '👍' };
    if (gemiddelde >= 60) return { status: 'Kan beter', emoji: '⚡' };
    return { status: 'Focus nodig', emoji: '🎯' };
  };

  const balansStatus = getBalansStatus();

  const WelzijnsKompas = () => (
    <div className="flex justify-center mb-8">
      <div className="relative">
        <div 
          className="relative w-96 h-96 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #e2e8f0, #cbd5e1)',
            boxShadow: `20px 20px 60px #94a3b8, -20px -20px 60px #ffffff`,
            transform: 'perspective(1000px) rotateX(10deg)',
          }}
        >
          {/* Achtergrond ring met lichte kleuren */}
          <div 
            className="absolute inset-4 rounded-full"
            style={{
              background: `conic-gradient(from -45deg, 
                #dbeafe 0deg 90deg,
                #dcfce7 90deg 180deg,
                #f3e8ff 180deg 270deg,
                #fed7aa 270deg 360deg)`,
              mask: 'radial-gradient(transparent 120px, black 120px)', 
              WebkitMask: 'radial-gradient(transparent 120px, black 120px)',
              boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.1)',
            }}
          />
          
          {/* Voorgrond ring met gevulde percentages */}
          <div 
            className="absolute inset-4 rounded-full"
            style={{
              background: `conic-gradient(from -45deg, 
                #3b82f6 0deg, #3b82f6 ${welzijnScores.beweging * 0.9}deg, transparent ${welzijnScores.beweging * 0.9}deg 90deg,
                #22c55e 90deg, #22c55e ${90 + welzijnScores.voeding * 0.9}deg, transparent ${90 + welzijnScores.voeding * 0.9}deg 180deg,
                #8b5cf6 180deg, #8b5cf6 ${180 + welzijnScores.slaap * 0.9}deg, transparent ${180 + welzijnScores.slaap * 0.9}deg 270deg,
                #f97316 270deg, #f97316 ${270 + welzijnScores.mentaal * 0.9}deg, transparent ${270 + welzijnScores.mentaal * 0.9}deg 360deg)`,
              mask: 'radial-gradient(transparent 120px, black 120px)', 
              WebkitMask: 'radial-gradient(transparent 120px, black 120px)',
            }}
          />
{/* Klikgebieden voor modals - SIMPELE rechthoeken in de hoeken */}
{/* Beweging segment - rechtsboven */}
<div 
  onClick={() => handleSegmentClick('Beweging')} 
  className="absolute cursor-pointer hover:bg-blue-500/10 transition-colors" 
  style={{ 
    top: '20px', 
    right: '90px', 
    width: '220px', 
    height: '60px',
    zIndex: 10
  }} 
/>

{/* Voeding segment - rechtsonder */}
<div 
  onClick={() => handleSegmentClick('Voeding')} 
  className="absolute cursor-pointer hover:bg-green-500/10 transition-colors" 
  style={{ 
    bottom: '90px', 
    right: '26px', 
    width: '60px', 
    height: '220px',
    zIndex: 10
  }} 
/>

{/* Slaap segment - linksonder */}
<div 
  onClick={() => handleSegmentClick('Slaap')} 
  className="absolute cursor-pointer hover:bg-purple-500/10 transition-colors" 
  style={{ 
    bottom: '16px', 
    left: '100px', 
    width: '220px', 
    height: '60px',
    zIndex: 10
  }} 
/>

{/* Mentaal segment - linksboven */}
<div 
  onClick={() => handleSegmentClick('Mentaal')} 
  className="absolute cursor-pointer hover:bg-orange-500/10 transition-colors" 
  style={{ 
    top: '80px', 
    left: '16px', 
    width: '60px', 
    height: '220px',
    zIndex: 10
  }} 
/>
          {/* Labels & Percentages */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2"><div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">Beweging</div></div>
          <div className="absolute pointer-events-none" style={{ top: '40px', left: '50%' }}><span className="text-gray-800 font-bold text-xl drop-shadow-lg">{welzijnScores.beweging}%</span></div>
          
          <div className="absolute -right-1 top-1/2 transform -translate-y-1/2"><div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">Voeding</div></div>
           <div className="absolute pointer-events-none" style={{ top: '60%', right: '30px' }}><span className="text-gray-800 font-bold text-xl drop-shadow-lg">{welzijnScores.voeding}%</span></div>

          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2"><div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">Slaap</div></div>
           <div className="absolute pointer-events-none" style={{ bottom: '40px', left: '50%' }}><span className="text-gray-800 font-bold text-xl drop-shadow-lg">{welzijnScores.slaap}%</span></div>
          
          <div className="absolute -left top-1/2 transform -translate-y-1/2"><div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">Mentaal</div></div>
           <div className="absolute pointer-events-none" style={{ top: '60%', left: '25px' }}><span className="text-gray-800 font-bold text-xl drop-shadow-lg">{welzijnScores.mentaal}%</span></div>

          {/* Hart in midden */}
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
            onClick={() => setShowHartslagModal(true)}
            style={{ width: '180px', height: '180px', background: 'linear-gradient(145deg, #ef4444, #dc2626, #b91c1c)', borderRadius: '50%', boxShadow: '0 20px 40px rgba(239, 68, 68, 0.4), inset 0 4px 8px rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'slowPulse 3s infinite ease-in-out' }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>❤️</div>
            <div className="text-white font-bold text-3xl leading-none filter drop-shadow-md">{dagelijkseData.hartslag_rust || 'N/A'}</div>
            <div className="text-white text-sm opacity-90 font-medium">BPM</div>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="mb-6 mt-20">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Mijn Gezondheid</h1>
              <div className="flex items-center text-gray-400 text-sm"><span className="mr-1">🔒</span><span>Privé gegevens</span></div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{balansStatus.emoji}</span>
                <div>
                  <div className="text-lg font-bold text-slate-800">{getGemiddeldeScore()}%</div>
                  <div className="text-xs text-slate-600">{balansStatus.status}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <WelzijnsKompas />

          {/* 5 Thema Tiles voor NAVIGATIE */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 max-w-5xl mx-auto">
            <div onClick={() => handleTileClick('/gezondheid/beweging')} className="bg-blue-50 rounded-xl p-4 border-2 border-blue-100 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105">
              <div className="text-center"><div className="text-2xl mb-2">🏃‍♂️</div><div className="text-lg font-bold text-blue-600">{welzijnScores.beweging}%</div><div className="text-sm text-gray-600 font-medium">Beweging</div></div>
            </div>
            <div onClick={() => handleTileClick('/gezondheid/voeding')} className="bg-green-50 rounded-xl p-4 border-2 border-green-100 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105">
              <div className="text-center"><div className="text-2xl mb-2">🥗</div><div className="text-lg font-bold text-green-600">{welzijnScores.voeding}%</div><div className="text-sm text-gray-600 font-medium">Voeding</div></div>
            </div>
            <div onClick={() => handleTileClick('/gezondheid/slaap')} className="bg-purple-50 rounded-xl p-4 border-2 border-purple-100 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105">
              <div className="text-center"><div className="text-2xl mb-2">🌙</div><div className="text-lg font-bold text-purple-600">{welzijnScores.slaap}%</div><div className="text-sm text-gray-600 font-medium">Slaap</div></div>
            </div>
            <div onClick={() => handleTileClick('/gezondheid/mentaal')} className="bg-orange-50 rounded-xl p-4 border-2 border-orange-100 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105">
              <div className="text-center"><div className="text-2xl mb-2">🧠</div><div className="text-lg font-bold text-orange-600">{welzijnScores.mentaal}%</div><div className="text-sm text-gray-600 font-medium">Mentaal</div></div>
            </div>
            <div onClick={() => setShowHartslagModal(true)} className="bg-red-50 rounded-xl p-4 border-2 border-red-100 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105 sm:col-span-1 col-span-2 sm:col-start-auto">
              <div className="text-center"><div className="text-2xl mb-2">❤️</div><div className="text-lg font-bold text-red-600">{dagelijkseData.hartslag_rust || 'N/A'}</div><div className="text-sm text-gray-600 font-medium">BPM</div></div>
            </div>
          </div>

          {/* DEBUG INFO - kan je later verwijderen */}
          <div className="max-w-2xl mx-auto bg-gray-100 p-4 rounded-lg text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>Profile UID: {profile?.uid || 'N/A'}</p>
            <p>Datum: {getTodayString()}</p>
            <p>Stappen: {dagelijkseData.stappen}</p>
            <p>Hartslag: {dagelijkseData.hartslag_rust}</p>
            <p>Doel stappen: {welzijnDoelen.stappen}</p>
            <p>Beweging %: {welzijnScores.beweging}%</p>
          </div>
        </div>
      </div>
      
      {/* Modals (Hartslag, Stappen, Info) */}
      {showInfoModal && ( <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"><div className="text-center mb-6"><div className="text-4xl mb-4">👆</div><h3 className="text-xl font-bold text-gray-800 mb-2">Welkom bij je Welzijnskompas!</h3><p className="text-gray-600">Klik op de gekleurde segmenten van het kompas voor snelle invoer, of gebruik de tegels eronder om naar de detailpagina's te gaan.</p></div><div className="text-center"><button onClick={() => setShowInfoModal(false)} className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">Begrepen</button></div></div></div>)}
      {showHartslagModal && ( <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"><div className="text-center mb-6"><div className="text-4xl mb-4">❤️</div><h3 className="text-xl font-bold text-gray-800 mb-2">Hartslag Invoeren</h3><p className="text-gray-600">Voer je hartslag in rust in</p></div><div className="mb-6"><input type="number" value={tempHartslag} onChange={(e) => setTempHartslag(parseInt(e.target.value, 10) || 0)} className="w-full text-center text-2xl font-bold p-4 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none" min="30" max="220" /></div><div className="flex gap-3"><button onClick={() => setShowHartslagModal(false)} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">Annuleren</button><button onClick={handleHartslagSave} className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors">Opslaan</button></div></div></div>)}
      {showStappenModal && ( <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"><div className="text-center mb-6"><div className="text-4xl mb-4">👟</div><h3 className="text-xl font-bold text-gray-800 mb-2">Stappen Invoeren</h3><p className="text-gray-600">Voer je aantal stappen voor vandaag in</p></div><div className="mb-6"><input type="number" value={tempStappen} onChange={(e) => setTempStappen(parseInt(e.target.value, 10) || 0)} className="w-full text-center text-2xl font-bold p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" min="0" max="100000" /><div className="text-center mt-4"><Link to="/gezondheid/beweging" className="text-sm text-purple-600 hover:text-purple-800 font-medium">Bekijk volledige bewegingsdetails →</Link></div></div><div className="flex gap-3"><button onClick={() => setShowStappenModal(false)} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">Annuleren</button><button onClick={handleStappenSave} className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">Opslaan</button></div></div></div>)}

     <style>{`
        @keyframes slowPulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1); 
            box-shadow: 
              0 20px 40px rgba(239, 68, 68, 0.4),
              inset 0 4px 8px rgba(255,255,255,0.2),
              inset 0 -4px 8px rgba(0,0,0,0.1);
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.05); 
            box-shadow: 
              0 25px 50px rgba(239, 68, 68, 0.5),
              inset 0 4px 8px rgba(255,255,255,0.3),
              inset 0 -4px 8px rgba(0,0,0,0.1);
          }
        }
      `}</style>
          </div>
  );
};

export default MijnGezondheid;