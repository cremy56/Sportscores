import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, SparklesIcon, LinkIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/formatters';

// --- HULPFUNCTIES ---
const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const getEffectiveUserId = (profile) => {
  if (profile?.originalProfile?.rol === 'super-administrator' && profile?.rol === 'leerling') {
    return profile?.uid;
  }
  return profile?.uid || profile?.id;
};

// --- MAALTIJDOPTIES ---
const maaltijdOpties = [
  { naam: 'Ontbijt', emoji: '🌅', tips: ['Eiwitten toevoegen', 'Volkoren producten', 'Fruit erbij'] },
  { naam: 'Lunch', emoji: '☀️', tips: ['Groenten centraal', 'Goede portiegrootte', 'Langzame koolhydraten'] },
  { naam: 'Avondeten', emoji: '🌙', tips: ['Niet te laat eten', 'Lichte maaltijd', 'Veel groenten'] },
  { naam: 'Tussendoortje', emoji: '🍎', tips: ['Fruit of noten', 'Geen geraffineerde suikers', 'Kleine porties'] }
];

// --- VOEDINGSGROEPEN ---
const voedingsGroepen = [
  { naam: 'Groenten & Fruit', kleur: 'bg-green-100 text-green-700', doel: '5 porties per dag' },
  { naam: 'Granen', kleur: 'bg-yellow-100 text-yellow-700', doel: 'Minimaal 3 volkoren' },
  { naam: 'Eiwitten', kleur: 'bg-red-100 text-red-700', doel: '2-3 porties per dag' },
  { naam: 'Zuivel', kleur: 'bg-blue-100 text-blue-700', doel: '2-3 porties per dag' },
  { naam: 'Water', kleur: 'bg-cyan-100 text-cyan-700', doel: '1.5-2 liter per dag' }
];

// --- WATERTRACKER COMPONENT ---
const WaterTracker = ({ waterIntake, onWaterUpdate }) => {
  const doelWater = 2000; // ml
  const percentage = Math.min((waterIntake / doelWater) * 100, 100);
  
  const addWater = (amount) => {
    onWaterUpdate(waterIntake + amount);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        💧 Watertracker
      </h2>
      
      {/* Visuele waterfles */}
      <div className="flex justify-center mb-6">
        <div className="relative w-20 h-40 bg-slate-200 rounded-full overflow-hidden border-4 border-slate-300">
          <div 
            className="absolute bottom-0 w-full bg-gradient-to-t from-blue-400 to-cyan-300 transition-all duration-500"
            style={{ height: `${percentage}%` }}
          />
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-slate-300 rounded-b-full" />
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-slate-800">{waterIntake}ml</div>
        <div className="text-sm text-slate-600">van {doelWater}ml</div>
        <div className="text-xs text-slate-500 mt-1">{Math.round(percentage)}% van je doel</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => addWater(250)} className="bg-blue-100 text-blue-700 py-2 px-3 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm">
          +250ml
        </button>
        <button onClick={() => addWater(500)} className="bg-blue-100 text-blue-700 py-2 px-3 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm">
          +500ml
        </button>
        <button onClick={() => addWater(750)} className="bg-blue-100 text-blue-700 py-2 px-3 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm">
          +750ml
        </button>
      </div>
    </div>
  );
};

// --- SIMPELE MAALTIJD LOGGER COMPONENT ---
const SimpleMaaltijdLogger = ({ maaltijden, onQuickLog }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-xl font-bold text-slate-800 mb-4">Vandaag gegeten</h2>
    
    {/* Quick log knoppen */}
    <div className="grid grid-cols-2 gap-2 mb-6">
      {maaltijdOpties.map(optie => {
        const isLogged = maaltijden.some(m => m.type === optie.naam);
        return (
          <button
            key={optie.naam}
            onClick={() => onQuickLog(optie.naam)}
            className={`p-3 rounded-xl border-2 transition-all ${
              isLogged 
                ? 'border-green-500 bg-green-50 text-green-700' 
                : 'border-slate-200 hover:border-green-300 text-slate-600'
            }`}
          >
            <div className="text-lg mb-1">{optie.emoji}</div>
            <div className="text-sm font-medium">{optie.naam}</div>
            {isLogged && <div className="text-xs text-green-600 mt-1">✓ Klaar</div>}
          </button>
        );
      })}
    </div>
    
    {/* Simpele voortgang */}
    <div className="text-center">
      <div className="text-sm text-slate-600 mb-2">
        {maaltijden.length} van 4 maaltijden gelogd
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div 
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(maaltijden.length / 4) * 100}%` }}
        />
      </div>
    </div>
  </div>
);

// --- VOEDINGSTIPS COMPONENT ---
const VoedingsTips = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <SparklesIcon className="w-6 h-6 text-green-500"/>
      Dagelijkse Tips
    </h2>
    <div className="space-y-3">
      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
        <p className="font-semibold text-green-800 mb-2">🥗 Tip van de dag</p>
        <p className="text-sm text-green-700">Probeer elke maaltijd voor de helft te vullen met groenten. Dit zorgt voor meer vezels en vitamines!</p>
      </div>
      <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
        <p className="text-sm text-yellow-700"><strong>💡 Wist je dat:</strong> Een regenboog aan kleuren op je bord betekent meer variatie in voedingsstoffen!</p>
      </div>
    </div>
  </div>
);

// --- VOEDINGSBRONNEN COMPONENT ---
const VoedingsBronnen = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-xl font-bold text-slate-800 mb-4">Handige Links</h2>
    <div className="space-y-3">
      <a href="https://www.vigez.be" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 hover:bg-green-100 transition-colors">
        <LinkIcon className="w-5 h-5 flex-shrink-0"/>
        <div>
          <div className="font-semibold">VIGeZ - Gezonde Voeding</div>
          <div className="text-sm">Tips en recepten</div>
        </div>
      </a>
      <a href="https://www.etenmetklas.be" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 hover:bg-green-100 transition-colors">
        <LinkIcon className="w-5 h-5 flex-shrink-0"/>
        <div>
          <div className="font-semibold">Eten met Klas</div>
          <div className="text-sm">Educatief materiaal</div>
        </div>
      </a>
    </div>
  </div>
);

const VoedingDetail = () => {
  const { profile } = useOutletContext();
  const effectiveUserId = getEffectiveUserId(profile);
  
  // State variabelen
  const [dagelijkseData, setDagelijkseData] = useState({});
  const [maaltijden, setMaaltijden] = useState([]);
  const [recenteNotities, setRecenteNotities] = useState([]);
  const [voedingsNotitie, setVoedingsNotitie] = useState('');

  useEffect(() => {
    if (!effectiveUserId) return;

    // Luister naar dagelijkse data (inclusief water)
    const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
    const unsubscribeVandaag = onSnapshot(todayDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setDagelijkseData(docSnap.data());
      }
    });

    // Luister naar maaltijden van vandaag
    const maaltijdenQuery = query(
      collection(db, `welzijn/${effectiveUserId}/maaltijden`),
      orderBy('datum', 'desc'),
      limit(10)
    );
    const unsubscribeMaaltijden = onSnapshot(maaltijdenQuery, (snapshot) => {
      const today = getTodayString();
      const vandaagMaaltijden = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(maaltijd => {
          // Filter alleen maaltijden van vandaag
          const maaltijdDatum = maaltijd.datum?.toDate?.().toISOString().split('T')[0];
          return maaltijdDatum === today;
        });
      setMaaltijden(vandaagMaaltijden);
    });

    // Luister naar voedingsnotities
    const notitiesQuery = query(
      collection(db, `welzijn/${effectiveUserId}/voeding_notities`),
      orderBy('datum', 'desc'),
      limit(3)
    );
    const unsubscribeNotities = onSnapshot(notitiesQuery, (snapshot) => {
      setRecenteNotities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeVandaag();
      unsubscribeMaaltijden();
      unsubscribeNotities();
    };
  }, [effectiveUserId]);

  const handleWaterUpdate = async (nieuweWaterIntake) => {
    if (!effectiveUserId) return;
    const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
    try {
      await setDoc(todayDocRef, { water_intake: nieuweWaterIntake }, { merge: true });
      toast.success('Water bijgewerkt!');
    } catch (error) {
      toast.error('Kon water niet bijwerken.');
      console.error(error);
    }
  };

  const handleQuickLog = async (maaltijdType) => {
    if (!effectiveUserId) return;

    // Check of deze maaltijd al bestaat vandaag
    const bestaandeMaaltijd = maaltijden.find(m => m.type === maaltijdType);
    if (bestaandeMaaltijd) {
      toast.success(`${maaltijdType} al gelogd!`);
      return;
    }

    try {
      await addDoc(collection(db, `welzijn/${effectiveUserId}/maaltijden`), {
        type: maaltijdType,
        datum: serverTimestamp(),
      });
      toast.success(`${maaltijdType} gelogd!`);
    } catch (error) {
      toast.error('Kon maaltijd niet loggen.');
      console.error(error);
    }
  };

  const handleNotitieSave = async (e) => {
    e.preventDefault();
    if (!effectiveUserId || !voedingsNotitie.trim()) return;

    try {
      await addDoc(collection(db, `welzijn/${effectiveUserId}/voeding_notities`), {
        tekst: voedingsNotitie,
        datum: serverTimestamp(),
      });
      toast.success('Notitie opgeslagen!');
      setVoedingsNotitie('');
    } catch (error) {
      toast.error('Kon notitie niet opslaan.');
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
        
        {/* Mobile Header */}
        <div className="lg:hidden mb-8">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-green-700 mb-2 group">
                <ArrowLeftIcon className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm">Terug</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Mijn Voeding</h1>
              <p className="text-slate-500 mt-1">Volg je eetpatroon en hydratatie</p>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block mb-12">
          <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-green-700 mb-6 group">
            <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
            Terug naar Mijn Gezondheid
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mijn Voeding</h1>
              <p className="text-slate-500 mt-2">Volg je eetpatroon, hydratatie en voedingsgewoonten</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Linker kolom - 2/3 breedte */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Voedingsgroepen Overzicht */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6">Voedingsgroepen</h2>
                <p className="text-slate-600 mb-6">Probeer dagelijks uit elke groep te eten voor een gevarieerd voedingspatroon.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {voedingsGroepen.map(groep => (
                    <div key={groep.naam} className={`p-4 rounded-xl border-2 ${groep.kleur.replace('100', '200')} ${groep.kleur}`}>
                      <h3 className="font-bold mb-2">{groep.naam}</h3>
                      <p className="text-sm opacity-80">{groep.doel}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voedingsreflectie */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6">Voedingsreflectie</h2>
                <form onSubmit={handleNotitieSave} className="space-y-4">
                  <div>
                    <label htmlFor="voeding-note" className="block text-slate-600 mb-2">
                      Hoe voelde je je na je maaltijden vandaag? Wat ging goed?
                    </label>
                    <textarea 
                      id="voeding-note"
                      rows="3"
                      value={voedingsNotitie}
                      onChange={(e) => setVoedingsNotitie(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-green-500 focus:border-green-500"
                      placeholder="bv. Had veel energie na mijn ontbijt met havermout en fruit..."
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white font-bold py-3 rounded-xl hover:from-green-700 hover:to-green-600 transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Bewaar Reflectie
                  </button>
                </form>
                
                {recenteNotities.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-700 mb-3">Recente reflecties:</h3>
                    <div className="space-y-3">
                      {recenteNotities.map(note => (
                        <div key={note.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-xs text-slate-500 mb-1">{formatDate(note.datum)}</div>
                          <div className="text-sm text-slate-700">{note.tekst}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rechter kolom - 1/3 breedte */}
            <div className="space-y-6">
              
              {/* Watertracker */}
              <WaterTracker 
                waterIntake={dagelijkseData.water_intake || 0} 
                onWaterUpdate={handleWaterUpdate} 
              />
              
              {/* Simpele Maaltijden Logger */}
              <SimpleMaaltijdLogger 
                maaltijden={maaltijden} 
                onQuickLog={handleQuickLog} 
              />
              
              {/* Voedingstips */}
              <VoedingsTips />
              
              {/* Bronnen */}
              <VoedingsBronnen />
            </div>
          </div>
        </div>

        {/* Debug info */}
        <div className="mt-8 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4 inline-block">
            <div className="text-sm text-slate-600">
              Effective User ID: {effectiveUserId || 'N/A'} • Vandaag: {getTodayString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoedingDetail;