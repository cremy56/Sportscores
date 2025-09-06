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
// --- VOEDINGSMIDDELEN DATABASE ---
const voedingsmiddelen = [
  // Fruit
  { naam: 'Appel', categorie: 'Fruit', emoji: '🍎', voedingswaarde: 'Rijk aan vezels en vitamine C' },
  { naam: 'Banaan', categorie: 'Fruit', emoji: '🍌', voedingswaarde: 'Goede bron van kalium en energie' },
  { naam: 'Sinaasappel', categorie: 'Fruit', emoji: '🍊', voedingswaarde: 'Hoge vitamine C inhoud' },
  { naam: 'Druiven', categorie: 'Fruit', emoji: '🍇', voedingswaarde: 'Antioxidanten en natuurlijke suikers' },
  { naam: 'Aardbei', categorie: 'Fruit', emoji: '🍓', voedingswaarde: 'Vitamine C en foliumzuur' },
  { naam: 'Kiwi', categorie: 'Fruit', emoji: '🥝', voedingswaarde: 'Zeer rijk aan vitamine C' },
  { naam: 'Ananas', categorie: 'Fruit', emoji: '🍍', voedingswaarde: 'Bromelaine enzym en vitamine C' },
  { naam: 'Mango', categorie: 'Fruit', emoji: '🥭', voedingswaarde: 'Vitamine A en C' },
  { naam: 'Peer', categorie: 'Fruit', emoji: '🍐', voedingswaarde: 'Vezels en kalium' },
  { naam: 'Perzik', categorie: 'Fruit', emoji: '🍑', voedingswaarde: 'Vitamine A en C' },
  
  // Groenten
  { naam: 'Wortel', categorie: 'Groenten', emoji: '🥕', voedingswaarde: 'Rijk aan bètacaroteen' },
  { naam: 'Broccoli', categorie: 'Groenten', emoji: '🥦', voedingswaarde: 'Hoge foliumzuur en vitamine K' },
  { naam: 'Tomaat', categorie: 'Groenten', emoji: '🍅', voedingswaarde: 'Lycopeen en vitamine C' },
  { naam: 'Komkommer', categorie: 'Groenten', emoji: '🥒', voedingswaarde: 'Veel water en weinig calorieën' },
  { naam: 'Paprika', categorie: 'Groenten', emoji: '🫑', voedingswaarde: 'Vitamine C en antioxidanten' },
  { naam: 'Spinazie', categorie: 'Groenten', emoji: '🥬', voedingswaarde: 'IJzer en foliumzuur' },
  { naam: 'Sla', categorie: 'Groenten', emoji: '🥗', voedingswaarde: 'Laag in calorieën, hoog in water' },
  { naam: 'Ui', categorie: 'Groenten', emoji: '🧅', voedingswaarde: 'Prebiotica en flavonoïden' },
  { naam: 'Courgette', categorie: 'Groenten', emoji: '🥒', voedingswaarde: 'Laag in calorieën, veel vitamines' },
  { naam: 'Bloemkool', categorie: 'Groenten', emoji: '🥦', voedingswaarde: 'Vitamine C en vezels' },
  
  // Granen & Brood
  { naam: 'Volkoren brood', categorie: 'Granen', emoji: '🍞', voedingswaarde: 'Vezels en B-vitamines' },
  { naam: 'Wit brood', categorie: 'Granen', emoji: '🍞', voedingswaarde: 'Snelle energie' },
  { naam: 'Havermout', categorie: 'Granen', emoji: '🥣', voedingswaarde: 'Langzame koolhydraten en vezels' },
  { naam: 'Bruine rijst', categorie: 'Granen', emoji: '🍚', voedingswaarde: 'Volkorengraan met mineralen' },
  { naam: 'Witte rijst', categorie: 'Granen', emoji: '🍚', voedingswaarde: 'Snelle energie' },
  { naam: 'Quinoa', categorie: 'Granen', emoji: '🌾', voedingswaarde: 'Compleet eiwit en vezels' },
  { naam: 'Volkoren pasta', categorie: 'Granen', emoji: '🍝', voedingswaarde: 'Complexe koolhydraten' },
  { naam: 'Witte pasta', categorie: 'Granen', emoji: '🍝', voedingswaarde: 'Snelle energie' },
  { naam: 'Muesli', categorie: 'Granen', emoji: '🥣', voedingswaarde: 'Vezels en langzame energie' },
  { naam: 'Cornflakes', categorie: 'Granen', emoji: '🥣', voedingswaarde: 'Snelle energie' },
  
  // Eiwitten
  { naam: 'Kip', categorie: 'Eiwitten', emoji: '🍗', voedingswaarde: 'Magere eiwitbron' },
  { naam: 'Vis', categorie: 'Eiwitten', emoji: '🐟', voedingswaarde: 'Omega-3 vetzuren en eiwit' },
  { naam: 'Eieren', categorie: 'Eiwitten', emoji: '🥚', voedingswaarde: 'Compleet eiwit en choline' },
  { naam: 'Bonen', categorie: 'Eiwitten', emoji: '🫘', voedingswaarde: 'Plantaardig eiwit en vezels' },
  { naam: 'Linzen', categorie: 'Eiwitten', emoji: '🌱', voedingswaarde: 'Plantaardig eiwit en ijzer' },
  { naam: 'Kikkererwten', categorie: 'Eiwitten', emoji: '🫛', voedingswaarde: 'Eiwit en vezels' },
  { naam: 'Tofu', categorie: 'Eiwitten', emoji: '🧈', voedingswaarde: 'Plantaardig eiwit en calcium' },
  { naam: 'Zalm', categorie: 'Eiwitten', emoji: '🐟', voedingswaarde: 'Omega-3 en hoogwaardig eiwit' },
  { naam: 'Hamburger', categorie: 'Eiwitten', emoji: '🍔', voedingswaarde: 'Eiwit en energie' },
  { naam: 'Worst', categorie: 'Eiwitten', emoji: '🌭', voedingswaarde: 'Eiwit en vet' },
  
  // Zuivel
  { naam: 'Melk', categorie: 'Zuivel', emoji: '🥛', voedingswaarde: 'Calcium en eiwit' },
  { naam: 'Yoghurt', categorie: 'Zuivel', emoji: '🥄', voedingswaarde: 'Probiotica en calcium' },
  { naam: 'Kaas', categorie: 'Zuivel', emoji: '🧀', voedingswaarde: 'Calcium en eiwit' },
  { naam: 'Griekse yoghurt', categorie: 'Zuivel', emoji: '🥄', voedingswaarde: 'Hoog eiwit en probiotica' },
  { naam: 'Kwark', categorie: 'Zuivel', emoji: '🥛', voedingswaarde: 'Zeer hoog eiwit, laag vet' },
  { naam: 'IJs', categorie: 'Zuivel', emoji: '🍦', voedingswaarde: 'Calcium en snelle energie' },
  
  // Snacks & treats
  { naam: 'Noten', categorie: 'Snacks', emoji: '🥜', voedingswaarde: 'Gezonde vetten en eiwit' },
  { naam: 'Amandelen', categorie: 'Snacks', emoji: '🌰', voedingswaarde: 'Vitamine E en magnesium' },
  { naam: 'Walnoten', categorie: 'Snacks', emoji: '🌰', voedingswaarde: 'Omega-3 vetzuren' },
  { naam: 'Avocado', categorie: 'Snacks', emoji: '🥑', voedingswaarde: 'Gezonde vetten en vezels' },
  { naam: 'Chips', categorie: 'Snacks', emoji: '🥨', voedingswaarde: 'Zout en energie' },
  { naam: 'Koekjes', categorie: 'Snacks', emoji: '🍪', voedingswaarde: 'Snelle energie' },
  { naam: 'Chocoladereep', categorie: 'Snacks', emoji: '🍫', voedingswaarde: 'Snelle energie' },
  { naam: 'Snoep', categorie: 'Snacks', emoji: '🍬', voedingswaarde: 'Snelle energie' },
  { naam: 'Popcorn', categorie: 'Snacks', emoji: '🍿', voedingswaarde: 'Vezels en energie' },
  { naam: 'Friet', categorie: 'Snacks', emoji: '🍟', voedingswaarde: 'Koolhydraten en vet' },
  { naam: 'Donuts', categorie: 'Snacks', emoji: '🍩', voedingswaarde: 'Snelle energie' },
  
  // Maaltijden
  { naam: 'Pizza', categorie: 'Maaltijden', emoji: '🍕', voedingswaarde: 'Koolhydraten, eiwitten en vet' },
  { naam: 'Sandwich', categorie: 'Maaltijden', emoji: '🥪', voedingswaarde: 'Variatie aan voedingsstoffen' },
  { naam: 'Salade', categorie: 'Maaltijden', emoji: '🥗', voedingswaarde: 'Vitamines en vezels' },
  { naam: 'Soep', categorie: 'Maaltijden', emoji: '🍲', voedingswaarde: 'Variatie aan voedingsstoffen' },
  
  // Dranken
  { naam: 'Water', categorie: 'Dranken', emoji: '💧', voedingswaarde: 'Essentieel voor hydratatie' },
  { naam: 'Groene thee', categorie: 'Dranken', emoji: '🍵', voedingswaarde: 'Antioxidanten en cafeïne' },
  { naam: 'Koffie', categorie: 'Dranken', emoji: '☕', voedingswaarde: 'Antioxidanten en cafeïne' },
  { naam: 'Verse jus', categorie: 'Dranken', emoji: '🧃', voedingswaarde: 'Vitamines en snelle energie' },
  { naam: 'Frisdrank', categorie: 'Dranken', emoji: '🥤', voedingswaarde: 'Snelle energie' },
  { naam: 'Energiedrank', categorie: 'Dranken', emoji: '⚡', voedingswaarde: 'Cafeïne en snelle energie' },
  { naam: 'Sportdrank', categorie: 'Dranken', emoji: '🧃', voedingswaarde: 'Elektrolyten en energie' }
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
const SimpleMaaltijdLogger = ({ maaltijden, onQuickLog, onSwitchToAdvanced }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold text-slate-800">Vandaag gegeten</h2>
      <button 
        onClick={onSwitchToAdvanced}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        Uitgebreid loggen
      </button>
    </div>
    
    {/* Rest van je component blijft hetzelfde */}
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
const [gelogdeVoeding, setGelogdeVoeding] = useState([]);
const [recenteNotities, setRecenteNotities] = useState([]);
const [voedingsNotitie, setVoedingsNotitie] = useState('');
const [uitgebreidMode, setUitgebreidMode] = useState(false);
const [showVoedingModal, setShowVoedingModal] = useState(false);
const [selectedCategorie, setSelectedCategorie] = useState('Alle');

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
        const maaltijdDatum = maaltijd.datum?.toDate?.().toISOString().split('T')[0];
        return maaltijdDatum === today;
      });
    setMaaltijden(vandaagMaaltijden);
  });

  // Luister naar uitgebreide voeding logs
  const voedingQuery = query(
    collection(db, `welzijn/${effectiveUserId}/voeding_logs`),
    orderBy('datum', 'desc'),
    limit(50)
  );
  const unsubscribeVoeding = onSnapshot(voedingQuery, (snapshot) => {
    setGelogdeVoeding(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    unsubscribeVoeding();
    unsubscribeNotities();
  };
}, [effectiveUserId]); // uitgebreidMode weggehaald uit dependencies

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
const handleAddVoeding = async (voedingsitem) => {
  if (!effectiveUserId) return;

  try {
    await addDoc(collection(db, `welzijn/${effectiveUserId}/voeding_logs`), {
      voedingsmiddel: voedingsitem.naam,
      categorie: voedingsitem.categorie,
      voedingswaarde: voedingsitem.voedingswaarde,
      datum: serverTimestamp(),
    });
    toast.success(`${voedingsitem.naam} toegevoegd!`);
  } catch (error) {
    toast.error('Kon voedingsmiddel niet toevoegen.');
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
// Helper functies voor uitgebreide modus
const getVandaagGegeten = () => {
  const vandaag = new Date().toDateString();
  return gelogdeVoeding.filter(item => {
    const itemDatum = item.datum?.toDate?.()?.toDateString();
    return itemDatum === vandaag;
  });
};

const getCategorieScore = () => {
  const vandaagGegeten = getVandaagGegeten();
  const gevariëerdeCategorieën = new Set(vandaagGegeten.map(item => 
    voedingsmiddelen.find(v => v.naam === item.voedingsmiddel)?.categorie
  ).filter(cat => ['Fruit', 'Groenten', 'Granen', 'Eiwitten', 'Zuivel'].includes(cat)));
  
  return Math.round((gevariëerdeCategorieën.size / 5) * 100);
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
             {/* Maaltijden Logger - Keuze tussen simpel en uitgebreid */}
{/* Maaltijden Logger - Keuze tussen simpel en uitgebreid */}
{uitgebreidMode ? (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold text-slate-800">Uitgebreid Voedingslog</h2>
      <button 
        onClick={() => setUitgebreidMode(false)}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        Terug naar simpel
      </button>
    </div>
    
    {/* Variatie score */}
    <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-slate-800">Variatie Score</span>
        <span className="text-lg font-bold text-green-600">{getCategorieScore()}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full transition-all duration-300"
          style={{ width: `${getCategorieScore()}%` }}
        />
      </div>
      <p className="text-xs text-slate-600 mt-2">Probeer uit verschillende voedingsgroepen te eten voor meer variatie!</p>
    </div>
    
    {/* Vandaag gegeten overzicht */}
    <div className="mb-4">
      <h3 className="font-semibold text-slate-700 mb-2">
        Vandaag gegeten ({getVandaagGegeten().length} items)
      </h3>
      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
        {getVandaagGegeten().length > 0 ? (
          getVandaagGegeten().map((item, index) => {
            const voedingsitem = voedingsmiddelen.find(v => v.naam === item.voedingsmiddel);
            return (
              <span key={index} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs">
                {voedingsitem?.emoji} {item.voedingsmiddel}
              </span>
            );
          })
        ) : (
          <span className="text-sm text-slate-500">Nog geen voedingsmiddelen toegevoegd</span>
        )}
      </div>
    </div>
    
    <button 
      onClick={() => setShowVoedingModal(true)}
      className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors"
    >
      + Voedingsmiddel toevoegen
    </button>
  </div>
) : (
  <SimpleMaaltijdLogger 
    maaltijden={maaltijden} 
    onQuickLog={handleQuickLog}
    onSwitchToAdvanced={() => setUitgebreidMode(true)}
  />
)}
              
              {/* Voedingstips */}
              <VoedingsTips />
              
              {/* Bronnen */}
              <VoedingsBronnen />
            </div>
          </div>
        </div>

        
      </div>
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
          {['Alle', 'Fruit', 'Groenten', 'Granen', 'Eiwitten', 'Zuivel', 'Snacks', 'Maaltijden', 'Dranken'].map(cat => (
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
        {voedingsmiddelen
          .filter(item => selectedCategorie === 'Alle' || item.categorie === selectedCategorie)
          .map(item => (
          <button
            key={item.naam}
            onClick={() => {
              handleAddVoeding(item);
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

export default VoedingDetail;