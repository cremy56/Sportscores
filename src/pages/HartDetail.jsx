import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, SparklesIcon, LinkIcon, HeartIcon, ChartBarIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/formatters';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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

// --- HARTSLAG ZONES VOOR TIENERS ---
const getHartslagZones = (leeftijd = 16) => {
  const maxHartslag = 220 - leeftijd;
  return {
    rust: { min: 60, max: 100, label: 'Rustig', color: '#10b981' },
    licht: { min: Math.round(maxHartslag * 0.5), max: Math.round(maxHartslag * 0.6), label: 'Lichte inspanning', color: '#3b82f6' },
    matig: { min: Math.round(maxHartslag * 0.6), max: Math.round(maxHartslag * 0.7), label: 'Matige inspanning', color: '#f59e0b' },
    intensief: { min: Math.round(maxHartslag * 0.7), max: Math.round(maxHartslag * 0.85), label: 'Intensief', color: '#ef4444' },
    max: { min: Math.round(maxHartslag * 0.85), max: maxHartslag, label: 'Maximaal', color: '#dc2626' }
  };
};

const getHartslagAdvies = (hartslag) => {
  if (hartslag < 60) return { status: 'Erg laag', emoji: '🟡', advies: 'Dit is ongewoon laag. Voel je je wel goed?' };
  if (hartslag <= 100) return { status: 'Normaal', emoji: '💚', advies: 'Perfect! Je hart is rustig en ontspannen.' };
  if (hartslag <= 120) return { status: 'Licht verhoogd', emoji: '🟡', advies: 'Beetje stress of net bewogen? Dat is normaal.' };
  if (hartslag <= 150) return { status: 'Verhoogd', emoji: '🟠', advies: 'Ben je net actief geweest of gestrest?' };
  return { status: 'Erg hoog', emoji: '🔴', advies: 'Dit is hoog voor rustpols. Rust even uit.' };
};

// --- HARTSLAG GRAFIEK ---
const HartslagGrafiek = ({ data }) => {
  const chartData = data.map(item => ({
    datum: new Date(item.id).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' }),
    rustpols: item.hartslag_rust || null,
    maxHartslag: item.hartslag_max || null,
  })).filter(item => item.rustpols || item.maxHartslag);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((entry) => (
            <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'rustpols' ? 'Rustpols: ' : 'Max tijdens sport: '}
              {entry.value} BPM
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <XAxis dataKey="datum" tick={{ fontSize: 12 }} />
        <YAxis domain={['dataMin - 10', 'dataMax + 10']} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={60} stroke="#10b981" strokeDasharray="3 3" label="Min normaal" />
        <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label="Max normaal" />
        <Line type="monotone" dataKey="rustpols" stroke="#ef4444" strokeWidth={3} dot={{ r: 5 }} name="Rustpols" />
        <Line type="monotone" dataKey="maxHartslag" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Max tijdens sport" />
      </LineChart>
    </ResponsiveContainer>
  );
};

// --- CONDITIE TEST ---
const ConditieTest = ({ onComplete }) => {
  const [testActief, setTestActief] = useState(false);
  const [stap, setStap] = useState(1);
  const [hartslagVoor, setHartslagVoor] = useState('');
  const [hartslagNa, setHartslagNa] = useState('');
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    let interval;
    if (testActief && timer > 0) {
      interval = setInterval(() => setTimer(timer - 1), 1000);
    } else if (timer === 0) {
      setStap(3);
      setTestActief(false);
    }
    return () => clearInterval(interval);
  }, [testActief, timer]);

  const startTest = () => {
    if (!hartslagVoor) {
      toast.error('Vul eerst je rustpols in');
      return;
    }
    setTestActief(true);
    setStap(2);
    setTimer(60);
  };

  const voltooiTest = () => {
    if (!hartslagNa) {
      toast.error('Vul je hartslag na de test in');
      return;
    }
    const herstel = parseInt(hartslagNa) - parseInt(hartslagVoor);
    const conditieScore = Math.max(0, 100 - (herstel * 2));
    onComplete({ hartslagVoor, hartslagNa, herstel, conditieScore });
    setStap(1);
    setHartslagVoor('');
    setHartslagNa('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <SparklesIcon className="w-6 h-6 text-red-500"/>
        Conditie Challenge
      </h2>
      
      {stap === 1 && (
        <div className="space-y-4">
          <p className="text-slate-600">Test je conditie met een simpele stap-test!</p>
          <div>
            <label className="block text-slate-600 mb-2">Rustpols (meet nu):</label>
            <input
              type="number"
              value={hartslagVoor}
              onChange={(e) => setHartslagVoor(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-red-500 focus:border-red-500"
              placeholder="BPM"
            />
          </div>
          <button
            onClick={startTest}
            className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors"
          >
            Start Test (1 min stappen)
          </button>
        </div>
      )}

      {stap === 2 && (
        <div className="text-center space-y-4">
          <div className="text-6xl font-bold text-red-500">{timer}</div>
          <p className="text-lg font-semibold">Stap op en neer van een trapje!</p>
          <p className="text-slate-600">Houd een steady tempo aan</p>
          <div className="w-full bg-red-100 rounded-full h-4">
            <div 
              className="bg-red-500 h-4 rounded-full transition-all duration-1000"
              style={{ width: `${((60 - timer) / 60) * 100}%` }}
            />
          </div>
        </div>
      )}

      {stap === 3 && (
        <div className="space-y-4">
          <p className="text-lg font-semibold text-center">Test voltooid! 🎉</p>
          <div>
            <label className="block text-slate-600 mb-2">Je hartslag nu:</label>
            <input
              type="number"
              value={hartslagNa}
              onChange={(e) => setHartslagNa(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-red-500 focus:border-red-500"
              placeholder="BPM"
            />
          </div>
          <button
            onClick={voltooiTest}
            className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors"
          >
            Bereken Conditiescore
          </button>
        </div>
      )}
    </div>
  );
};

// --- HARTSLAG EDUCATIE ---
const HartslagEducatie = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-xl font-bold text-slate-800 mb-4">Waarom hartslag tracken?</h2>
    <div className="space-y-4 text-sm text-slate-600">
      <div className="p-3 bg-red-50 rounded-xl border border-red-200">
        <h3 className="font-semibold text-red-800 mb-2">💪 Voor je prestaties</h3>
        <p>Een lagere rustpols betekent meestal betere conditie. Topsporters hebben vaak een rustpols van 40-60 BPM.</p>
      </div>
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">😰 Stress monitoring</h3>
        <p>Je hart klopt sneller bij stress, angst of opwinding. Dit is normaal en tijdelijk.</p>
      </div>
      <div className="p-3 bg-green-50 rounded-xl border border-green-200">
        <h3 className="font-semibold text-green-800 mb-2">🎯 Trainingszone</h3>
        <p>Voor optimale fitness train je tussen 60-80% van je maximale hartslag.</p>
      </div>
    </div>
  </div>
);

// --- HARTSLAG TIPS ---
const HartslagTips = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <LightBulbIcon className="w-6 h-6 text-yellow-500"/>
      Hart Tips
    </h2>
    <div className="space-y-3 text-sm">
      <div className="p-3 bg-yellow-50 rounded-xl">
        <p className="font-semibold text-yellow-800 mb-1">📱 Schermtijd</p>
        <p className="text-yellow-700">Te veel schermen verhoogt stress en hartslag. Neem regelmatig pauzes.</p>
      </div>
      <div className="p-3 bg-green-50 rounded-xl">
        <p className="font-semibold text-green-800 mb-1">💤 Slaap</p>
        <p className="text-green-700">Goed slapen verlaagt je rustpols en verbetert je conditie.</p>
      </div>
      <div className="p-3 bg-blue-50 rounded-xl">
        <p className="font-semibold text-blue-800 mb-1">🧘 Ademhaling</p>
        <p className="text-blue-700">Diepe buikademhaling kan je hartslag binnen 30 seconden verlagen.</p>
      </div>
    </div>
  </div>
);

// --- HARTSLAG BRONNEN ---
const HartslagBronnen = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-xl font-bold text-slate-800 mb-4">Meer weten?</h2>
    <div className="space-y-3">
      <a href="https://www.hartstichting.nl/jong" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 hover:bg-red-100 transition-colors">
        <LinkIcon className="w-5 h-5 flex-shrink-0"/>
        <div>
          <div className="font-semibold">Hartstichting voor jongeren</div>
          <div className="text-sm">Sport, stress en je hart</div>
        </div>
      </a>
      <a href="https://www.vub.be/sportgeneeskunde" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 hover:bg-red-100 transition-colors">
        <LinkIcon className="w-5 h-5 flex-shrink-0"/>
        <div>
          <div className="font-semibold">VUB Sportgeneeskunde</div>
          <div className="text-sm">Wetenschappelijke info</div>
        </div>
      </a>
    </div>
  </div>
);

const HartDetail = () => {
  const { profile } = useOutletContext();
  const effectiveUserId = getEffectiveUserId(profile);
  
  // State variabelen
  const [dagelijkseData, setDagelijkseData] = useState({});
  const [hartslagGeschiedenis, setHartslagGeschiedenis] = useState([]);
  const [recenteNotities, setRecenteNotities] = useState([]);
  const [hartslagNotitie, setHartslagNotitie] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  
  // Hartslag tracking state
  const [rustpols, setRustpols] = useState('');
  const [maxHartslag, setMaxHartslag] = useState('');
  const [activiteit, setActiviteit] = useState('');
  const [conditieScore, setConditieScore] = useState(0);

  useEffect(() => {
    if (!effectiveUserId) return;

    // Luister naar dagelijkse data
    const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
    const unsubscribeVandaag = onSnapshot(todayDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDagelijkseData(data);
        setRustpols(data.hartslag_rust || '');
        setMaxHartslag(data.hartslag_max || '');
        setActiviteit(data.hartslag_activiteit || '');
        setShowEditForm(false);
      }
    });
// Voeg deze component toe aan je HartDetail.jsx file, ergens tussen de andere component definities:

const HartslagFactoren = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-xl font-bold text-slate-800 mb-4">Wat beïnvloedt je hartslag?</h2>
    <div className="space-y-4 text-sm">
      <div className="p-4 bg-red-50 rounded-xl border border-red-200">
        <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
          <span>😰</span> Stress & Emoties
        </h3>
        <p className="text-red-700 mb-2">Angst, spanning of emotionele stress verhogen je hartslag door adrenaline vrijgifte.</p>
        <p className="text-xs text-red-600">Wetenschap: Sympathisch zenuwstelsel wordt geactiveerd bij stress.</p>
      </div>
      
      <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
        <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
          <span>💤</span> Slaapkwaliteit
        </h3>
        <p className="text-purple-700 mb-2">Slechte slaap verhoogt je rustpols de volgende dag met 2-7 BPM.</p>
        <p className="text-xs text-purple-600">Wetenschap: Slaaptekort verstoort hart-ritme variabiliteit (HRV).</p>
      </div>
      
      <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
        <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
          <span>☕</span> Cafeïne
        </h3>
        <p className="text-orange-700 mb-2">1 kopje koffie kan hartslag 3-11 BPM verhogen voor 2-5 uur.</p>
        <p className="text-xs text-orange-600">Wetenschap: Cafeïne blokkeert adenosine receptoren en verhoogt catecholamine.</p>
      </div>
      
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <span>🏃</span> Recente Activiteit
        </h3>
        <p className="text-blue-700 mb-2">Na intensieve training kan rustpols 12-24u verhoogd blijven.</p>
        <p className="text-xs text-blue-600">Wetenschap: Herstel van autonoom zenuwstelsel na sympathische activatie.</p>
      </div>
      
      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
        <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
          <span>🤒</span> Ziekte & Koorts
        </h3>
        <p className="text-green-700 mb-2">Elke graad koorts verhoogt hartslag met ~10 BPM.</p>
        <p className="text-xs text-green-600">Wetenschap: Immuunrespons en verhoogd metabolisme beïnvloeden hartritme.</p>
      </div>
      
      <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200">
        <h3 className="font-semibold text-cyan-800 mb-2 flex items-center gap-2">
          <span>🌡️</span> Temperatuur & Hydratatie
        </h3>
        <p className="text-cyan-700 mb-2">Hitte en dehydratatie verhogen hartslag om lichaam te koelen.</p>
        <p className="text-xs text-cyan-600">Wetenschap: Thermoregulatie vereist cardiovasculaire aanpassingen.</p>
      </div>
      
      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
        <h3 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
          <span>📱</span> Schermtijd & Blauw Licht
        </h3>
        <p className="text-indigo-700 mb-2">Excessieve schermtijd kan chronische stress en hogere rustpols veroorzaken.</p>
        <p className="text-xs text-indigo-600">Wetenschap: Blauw licht verstoort circadiane ritme en stresshormonen.</p>
      </div>
    </div>
  </div>
);
    // Luister naar hartslagnotities
    const notitiesQuery = query(
      collection(db, `welzijn/${effectiveUserId}/hartslag_notities`),
      orderBy('datum', 'desc'),
      limit(3)
    );
    const unsubscribeNotities = onSnapshot(notitiesQuery, (snapshot) => {
      setRecenteNotities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Haal hartslaggeschiedenis op voor grafiek
    const fetchHartslagGeschiedenis = async () => {
      const q = query(collection(db, `welzijn/${effectiveUserId}/dagelijkse_data`));
      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(day => day.hartslag_rust || day.hartslag_max)
        .sort((a, b) => new Date(a.id) - new Date(b.id))
        .slice(-14); // Laatste 2 weken
      setHartslagGeschiedenis(history);
    };

    fetchHartslagGeschiedenis();

    return () => {
      unsubscribeVandaag();
      unsubscribeNotities();
    };
  }, [effectiveUserId]);

  const handleHartslagSave = async () => {
    if (!effectiveUserId || !rustpols) {
      toast.error('Vul minimaal je rustpols in.');
      return;
    }
    
    const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
    
    try {
      await setDoc(todayDocRef, { 
        hartslag_rust: parseInt(rustpols),
        hartslag_max: maxHartslag ? parseInt(maxHartslag) : null,
        hartslag_activiteit: activiteit,
        datum: getTodayString()
      }, { merge: true });
      toast.success('Hartslagdata opgeslagen!');
      setShowEditForm(false);
    } catch (error) {
      toast.error('Kon hartslagdata niet opslaan.');
      console.error(error);
    }
  };

  const handleConditieTest = async (resultaat) => {
    setConditieScore(resultaat.conditieScore);
    
    // Sla testresultaat op
    if (effectiveUserId) {
      await addDoc(collection(db, `welzijn/${effectiveUserId}/conditie_tests`), {
        ...resultaat,
        datum: serverTimestamp(),
      });
    }
    
    toast.success(`Conditiescore: ${resultaat.conditieScore}/100! ${
      resultaat.conditieScore >= 80 ? 'Uitstekend! 💪' :
      resultaat.conditieScore >= 60 ? 'Goed bezig! 👍' :
      resultaat.conditieScore >= 40 ? 'Kan beter 💪' : 'Train meer voor betere conditie! 🏃'
    }`);
  };

  const handleNotitieSave = async (e) => {
    e.preventDefault();
    if (!effectiveUserId || !hartslagNotitie.trim()) return;

    try {
      await addDoc(collection(db, `welzijn/${effectiveUserId}/hartslag_notities`), {
        tekst: hartslagNotitie,
        datum: serverTimestamp(),
      });
      toast.success('Notitie opgeslagen!');
      setHartslagNotitie('');
    } catch (error) {
      toast.error('Kon notitie niet opslaan.');
      console.error(error);
    }
  };

  const hartslagAdvies = rustpols ? getHartslagAdvies(parseInt(rustpols)) : null;

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
        
        {/* Mobile Header */}
        <div className="lg:hidden mb-8">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-red-700 mb-2 group">
                <ArrowLeftIcon className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm">Terug</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Mijn Hart & Conditie</h1>
              <p className="text-slate-500 mt-1">Track je hartslag en verbeter je fitness</p>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block mb-12">
          <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-red-700 mb-6 group">
            <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
            Terug naar Mijn Gezondheid
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mijn Hart & Conditie</h1>
              <p className="text-slate-500 mt-2">Monitor je hartslag, test je conditie en verbeter je fitness</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Linker kolom - 2/3 breedte */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Hartslagtracker */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <HeartIcon className="w-6 h-6 text-red-500" />
                  Hartslagtracker
                </h2>
                
                {/* Al ingevoerde data tonen */}
                {dagelijkseData.hartslag_rust && !showEditForm ? (
                  <div className="mb-6 p-6 bg-red-50 rounded-xl border border-red-200">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-red-600 mb-2">{dagelijkseData.hartslag_rust} BPM</div>
                      <div className="text-sm text-red-700 mb-4">Rustpols vandaag</div>
                      
                      {hartslagAdvies && (
                        <div className="flex justify-center items-center gap-2 mb-4">
                          <span className="text-2xl">{hartslagAdvies.emoji}</span>
                          <div className="text-left">
                            <div className="font-semibold text-red-600">{hartslagAdvies.status}</div>
                            <div className="text-sm text-red-700">{hartslagAdvies.advies}</div>
                          </div>
                        </div>
                      )}
                      
                      {dagelijkseData.hartslag_max && (
                        <div className="text-sm text-red-600 mt-2">
                          Max tijdens sport: {dagelijkseData.hartslag_max} BPM
                          {dagelijkseData.hartslag_activiteit && ` (${dagelijkseData.hartslag_activiteit})`}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setShowEditForm(true)}
                      className="w-full mt-4 text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 rounded-lg py-2 hover:bg-red-50 transition-colors"
                    >
                      Aanpassen of toevoegen
                    </button>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-blue-700 text-sm text-center">
                      Nog geen hartslagdata voor vandaag. Meet je pols!
                    </p>
                  </div>
                )}

                {/* Hartslag invoer formulier */}
                {(!dagelijkseData.hartslag_rust || showEditForm) && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <h3 className="font-semibold text-blue-800 mb-2">📋 Hoe meet je je pols?</h3>
                      <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                        <li>Leg 2 vingers op je pols of nek</li>
                        <li>Tel het aantal klopjes in 15 seconden</li>
                        <li>Vermenigvuldig met 4 voor BPM</li>
                        <li>Meet in rust (zittend, 5 min ontspannen)</li>
                      </ol>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-slate-600 mb-2 font-medium">Rustpols (verplicht)</label>
                        <input
                          type="number"
                          min="30"
                          max="200"
                          value={rustpols}
                          onChange={(e) => setRustpols(e.target.value)}
                          className="w-full p-4 border border-slate-200 rounded-xl focus:ring-red-500 focus:border-red-500 text-lg"
                          placeholder="72"
                        />
                        <div className="text-xs text-slate-500 mt-1">Normaal: 60-100 BPM</div>
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-2 font-medium">Max tijdens sport (optioneel)</label>
                        <input
                          type="number"
                          min="100"
                          max="220"
                          value={maxHartslag}
                          onChange={(e) => setMaxHartslag(e.target.value)}
                          className="w-full p-4 border border-slate-200 rounded-xl focus:ring-red-500 focus:border-red-500 text-lg"
                          placeholder="160"
                        />
                        <input
                          type="text"
                          value={activiteit}
                          onChange={(e) => setActiviteit(e.target.value)}
                          className="w-full p-2 mt-2 border border-slate-200 rounded-lg focus:ring-red-500 focus:border-red-500 text-sm"
                          placeholder="bv. voetbal, hardlopen..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {showEditForm && (
                        <button 
                          onClick={() => {
                            setShowEditForm(false);
                            setRustpols(dagelijkseData.hartslag_rust || '');
                            setMaxHartslag(dagelijkseData.hartslag_max || '');
                            setActiviteit(dagelijkseData.hartslag_activiteit || '');
                          }}
                          className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all duration-200"
                        >
                          Annuleren
                        </button>
                      )}
                      <button 
                        onClick={handleHartslagSave}
                        disabled={!rustpols}
                        className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-4 rounded-xl hover:from-red-700 hover:to-red-600 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        Hartslagdata Opslaan
                      </button>
                    </div>
                  </div>
                )}
              </div>

             /* Hartslaggeschiedenis grafiek */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <ChartBarIcon className="w-6 h-6 text-red-500" />
                  Hartslaggeschiedenis & Variatie-analyse
                </h2>
                
                {/* Variatie feedback boven de grafiek */}
                {dagelijkseData.hartslag_rust && (
                  (() => {
                    const variatieAdvies = getHartslagVariatieAdvies(dagelijkseData.hartslag_rust, hartslagGeschiedenis);
                    return variatieAdvies ? (
                      <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{variatieAdvies.emoji}</span>
                          <div>
                            <div className="font-semibold text-slate-800">{variatieAdvies.message}</div>
                            <div className="text-sm text-slate-600 mt-1">{variatieAdvies.advies}</div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()
                )}
                
                {hartslagGeschiedenis.length > 0 ? (
                  <HartslagGrafiek data={hartslagGeschiedenis} />
                ) : (
                  <div className="text-center py-8 text-slate-500">Nog geen data voor de grafiek. Meet een paar dagen je hartslag!</div>
                )}
                
                {hartslagGeschiedenis.length >= 3 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                    <p className="font-semibold mb-1">Variatie is normaal!</p>
                    <p>Je hartslag kan dagelijks 5-10 BPM verschillen door stress, slaap, cafeïne, en activiteit. Patronen zijn belangrijker dan individuele metingen.</p>
                  </div>
                )}
              </div>

              /* Hartslag journaal */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6">Hartslag Journaal</h2>
                <form onSubmit={handleNotitieSave} className="space-y-4">
                  <div>
                    <label htmlFor="hartslag-note" className="block text-slate-600 mb-2 font-medium">
                      Hoe voelde je je? Wat beïnvloedde je hartslag?
                    </label>
                    <textarea 
                      id="hartslag-note"
                      rows="4"
                      value={hartslagNotitie}
                      onChange={(e) => setHartslagNotitie(e.target.value)}
                      className="w-full p-4 border border-slate-200 rounded-xl focus:ring-red-500 focus:border-red-500"
                      placeholder="bv. Hart klopte snel voor examen, na training snel hersteld, gestrest door deadline..."
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-3 rounded-xl hover:from-red-700 hover:to-red-600 transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Bewaar Notitie
                  </button>
                </form>
                
                {recenteNotities.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-700 mb-3">Recente notities:</h3>
                    <div className="space-y-3">
                      {recenteNotities.map(note => (
                        <div key={note.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-xs text-slate-500 mb-1">{formatDate(note.datum)}</div>
                          <div className="text-sm text-slate-700">{note.tekst}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            /* Rechter kolom - 1/3 breedte */
            <div className="space-y-6">
              
              /* Conditie Test */
              <ConditieTest onComplete={handleConditieTest} />
              
              /* Factoren die hartslag beïnvloeden */
              <HartslagFactoren />
              
              /* Hartslag Zones */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Trainingszones</h2>
                <p className="text-sm text-slate-600 mb-4">Voor 16-jarigen (past zich aan per leeftijd):</p>
                <div className="space-y-3">
                  {Object.entries(getHartslagZones(16)).map(([key, zone]) => (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: zone.color }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{zone.label}</div>
                        <div className="text-sm text-slate-600">{zone.min}-{zone.max} BPM</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              /* Educatie */
              <HartslagEducatie />
              
              /* Bronnen */
              <HartslagBronnen />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HartDetail;