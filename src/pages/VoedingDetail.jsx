import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, LightBulbIcon, PhoneIcon, SparklesIcon, ChartBarIcon, PlusIcon, LinkIcon } from '@heroicons/react/24/outline';
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

// --- VOEDINGSMIDDELEN DATABASE ---
const voedingsmiddelen = [
  // Fruit
  { naam: 'Appel', categorie: 'Fruit', emoji: '🍎', voedingswaarde: 'Rijk aan vezels en vitamine C' },
  { naam: 'Banaan', categorie: 'Fruit', emoji: '🍌', voedingswaarde: 'Goede bron van kalium en energie' },
  { naam: 'Sinaasappel', categorie: 'Fruit', emoji: '🍊', voedingswaarde: 'Hoge vitamine C inhoud' },
  { naam: 'Druiven', categorie: 'Fruit', emoji: '🍇', voedingswaarde: 'Antioxidanten en natuurlijke suikers' },
  
  // Groenten
  { naam: 'Wortel', categorie: 'Groenten', emoji: '🥕', voedingswaarde: 'Rijk aan bètacaroteen' },
  { naam: 'Broccoli', categorie: 'Groenten', emoji: '🥦', voedingswaarde: 'Hoge foliumzuur en vitamine K' },
  { naam: 'Tomaat', categorie: 'Groenten', emoji: '🍅', voedingswaarde: 'Lycopeen en vitamine C' },
  { naam: 'Komkommer', categorie: 'Groenten', emoji: '🥒', voedingswaarde: 'Veel water en weinig calorieën' },
  
  // Granen & Brood
  { naam: 'Volkoren brood', categorie: 'Granen', emoji: '🍞', voedingswaarde: 'Vezels en B-vitamines' },
  { naam: 'Havermout', categorie: 'Granen', emoji: '🥣', voedingswaarde: 'Langzame koolhydraten en vezels' },
  { naam: 'Bruine rijst', categorie: 'Granen', emoji: '🍚', voedingswaarde: 'Volkorengraan met mineralen' },
  
  // Eiwitten
  { naam: 'Kip', categorie: 'Eiwitten', emoji: '🍗', voedingswaarde: 'Magere eiwitbron' },
  { naam: 'Vis', categorie: 'Eiwitten', emoji: '🐟', voedingswaarde: 'Omega-3 vetzuren en eiwit' },
  { naam: 'Eieren', categorie: 'Eiwitten', emoji: '🥚', voedingswaarde: 'Compleet eiwit en choline' },
  { naam: 'Bonen', categorie: 'Eiwitten', emoji: '🫘', voedingswaarde: 'Plantaardig eiwit en vezels' },
  
  // Zuivel
  { naam: 'Melk', categorie: 'Zuivel', emoji: '🥛', voedingswaarde: 'Calcium en eiwit' },
  { naam: 'Yoghurt', categorie: 'Zuivel', emoji: '🥄', voedingswaarde: 'Probiotica en calcium' },
  { naam: 'Kaas', categorie: 'Zuivel', emoji: '🧀', voedingswaarde: 'Calcium en eiwit' },
  
  // Gezonde snacks
  { naam: 'Noten', categorie: 'Snacks', emoji: '🥜', voedingswaarde: 'Gezonde vetten en eiwit' },
  { naam: 'Donkere chocolade', categorie: 'Snacks', emoji: '🍫', voedingswaarde: 'Antioxidanten (in gematigde hoeveelheden)' }
];

// --- UITGEBREIDE MAALTIJD LOGGER ---
const UitgebreideMaaltijdLogger = ({ gelogdeVoeding, onAddVoeding, onSwitchToSimple }) => {
  const [selectedCategorie, setSelectedCategorie] = useState('Alle');
  const [showVoedingModal, setShowVoedingModal] = useState(false);
  
  const categorieën = ['Alle', ...new Set(voedingsmiddelen.map(v => v.categorie))];
  
  const gefilterdVoeding = selectedCategorie === 'Alle' 
    ? voedingsmiddelen 
    : voedingsmiddelen.filter(v => v.categorie === selectedCategorie);
    
  const vandaagGegeten = gelogdeVoeding.filter(item => {
    const vandaag = new Date().toDateString();
    const itemDatum = item.datum?.toDate?.()?.toDateString();
    return itemDatum === vandaag;
  });
  
  const categorieScore = () => {
    const categorieënVandaag = new Set(vandaagGegeten.map(item => 
      voedingsmiddelen.find(v => v.naam === item.voedingsmiddel)?.categorie
    ).filter(Boolean));
    return Math.round((categorieënVandaag.size / 5) * 100); // 5 hoofdcategorieën
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Uitgebreid Voedingslog</h2>
        <button 
          onClick={onSwitchToSimple}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Terug naar simpel
        </button>
      </div>
      
      {/* Variatie score */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-slate-800">Variatie Score</span>
          <span className="text-lg font-bold text-green-600">{categorieScore()}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${categorieScore()}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-2">Probeer uit alle voedingsgroepen te eten!</p>
      </div>
      
      {/* Vandaag gegeten overzicht */}
      <div className="mb-4">
        <h3 className="font-semibold text-slate-700 mb-2">Vandaag gegeten ({vandaagGegeten.length} items)</h3>
        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
          {vandaagGegeten.map((item, index) => {
            const voedingsitem = voedingsmiddelen.find(v => v.naam === item.voedingsmiddel);
            return (
              <span key={index} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs">
                {voedingsitem?.emoji} {item.voedingsmiddel}
              </span>
            );
          })}
        </div>
      </div>
      
      <button 
        onClick={() => setShowVoedingModal(true)}
        className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors"
      >
        + Voedingsmiddel toevoegen
      </button>
      
      {/* Modal voor voedingsmiddel selectie */}
      {showVoedingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Voedingsmiddel kiezen</h3>
              <button onClick={() => setShowVoedingModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            {/* Categorie filter */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {categorieën.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategorie(cat)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategorie === cat 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Voedingsmiddelen lijst */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {gefilterdVoeding.map(item => (
                <button
                  key={item.naam}
                  onClick={() => {
                    onAddVoeding(item);
                    setShowVoedingModal(false);
                  }}
                  className="w-full p-3 text-left hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{item.naam}</div>
                      <div className="text-xs text-gray-500">{item.voedingswaarde}</div>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.categorie}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
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

// --- MAALTIJD LOGGER COMPONENT ---
const MaaltijdLogger = ({ maaltijden, onAddMaaltijd }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-bold text-slate-800">Maaltijdenlogboek</h2>
      <button onClick={onAddMaaltijd} className="bg-green-500 text-white font-bold py-2 px-4 rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2 text-sm">
        <PlusIcon className="w-5 h-5" />
        <span>Voeg toe</span>
      </button>
    </div>
    
    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
      {maaltijden.length > 0 ? (
        maaltijden.map(maaltijd => (
          <div key={maaltijd.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="text-lg">{maaltijdOpties.find(m => m.naam === maaltijd.type)?.emoji}</span>
                <div>
                  <span className="font-semibold text-slate-800">{maaltijd.type}</span>
                  {maaltijd.beschrijving && <p className="text-sm text-slate-600">{maaltijd.beschrijving}</p>}
                </div>
              </div>
              <span className="text-xs text-slate-500">{formatDate(maaltijd.datum)}</span>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center py-8 text-slate-500">Nog geen maaltijden gelogd vandaag.</p>
      )}
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
  
  const [dagelijkseData, setDagelijkseData] = useState({});
  const [maaltijden, setMaaltijden] = useState([]);
  const [recenteNotities, setRecenteNotities] = useState([]);
  const [voedingsNotitie, setVoedingsNotitie] = useState('');
  const [showMaaltijdModal, setShowMaaltijdModal] = useState(false);
  const [nieuweMaaltijd, setNieuweMaaltijd] = useState({ type: 'Ontbijt', beschrijving: '' });

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

  const handleAddMaaltijd = async (e) => {
    e.preventDefault();
    if (!effectiveUserId || !nieuweMaaltijd.beschrijving.trim()) return;

    try {
      await addDoc(collection(db, `welzijn/${effectiveUserId}/maaltijden`), {
        ...nieuweMaaltijd,
        datum: serverTimestamp(),
      });
      toast.success('Maaltijd toegevoegd!');
      setShowMaaltijdModal(false);
      setNieuweMaaltijd({ type: 'Ontbijt', beschrijving: '' });
    } catch (error) {
      toast.error('Kon maaltijd niet toevoegen.');
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
              
              {/* Maaltijden Logger - Keuze tussen simpel en uitgebreid */}
              {uitgebreidMode ? (
                <UitgebreideMaaltijdLogger 
                  gelogdeVoeding={gelogdeVoeding}
                  onAddVoeding={handleAddVoeding}
                  onSwitchToSimple={() => setUitgebreidMode(false)}
                />
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Vandaag gegeten</h2>
                    <button 
                      onClick={() => setUitgebreidMode(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Uitgebreid loggen
                    </button>
                  </div>
                  
                  {/* Quick log knoppen */}
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {maaltijdOpties.map(optie => {
                      const isLogged = maaltijden.some(m => m.type === optie.naam);
                      return (
                        <button
                          key={optie.naam}
                          onClick={() => handleQuickLog(optie.naam)}
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
              )}
              
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
      
      {/* Modal voor nieuwe maaltijd */}
      {showMaaltijdModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Nieuwe Maaltijd</h3>
              <p className="text-gray-600">Voeg toe wat je gegeten hebt</p>
            </div>
            
            <form onSubmit={handleAddMaaltijd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type Maaltijd</label>
                <div className="grid grid-cols-2 gap-2">
                  {maaltijdOpties.map(option => (
                    <button
                      key={option.naam}
                      type="button"
                      onClick={() => setNieuweMaaltijd({...nieuweMaaltijd, type: option.naam})}
                      className={`p-3 rounded-xl border-2 transition-colors ${
                        nieuweMaaltijd.type === option.naam 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : 'border-slate-200 hover:border-green-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{option.emoji}</div>
                      <div className="text-sm font-medium">{option.naam}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                <textarea
                  rows="3"
                  value={nieuweMaaltijd.beschrijving}
                  onChange={(e) => setNieuweMaaltijd({...nieuweMaaltijd, beschrijving: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-green-500 focus:border-green-500"
                  placeholder="bv. Havermout met banaan en noten, groene thee"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowMaaltijdModal(false)} 
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuleren
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoedingDetail;