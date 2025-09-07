import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ChartBarIcon, PlusIcon, SparklesIcon, LightBulbIcon, PhoneIcon, LinkIcon, HeartIcon, ExclamationTriangleIcon, UserGroupIcon, ClockIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/formatters';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// Helper functie voor effectieve gebruiker ID
const getEffectiveUserId = (profile) => {
  if (profile?.originalProfile?.rol === 'super-administrator' && profile?.rol === 'leerling') {
    return profile?.uid;
  }
  return profile?.uid || profile?.id;
};

const moodOptions = [
  { mood: 'Zeer goed', emoji: '😄', score: 100, color: '#4ade80' },
  { mood: 'Goed', emoji: '🙂', score: 80, color: '#a3e635' },
  { mood: 'Neutraal', emoji: '😐', score: 60, color: '#facc15' },
  { mood: 'Minder goed', emoji: '😕', score: 40, color: '#fb923c' },
  { mood: 'Slecht', emoji: '😞', score: 20, color: '#f87171' },
];

// Uitgebreide mood tracking met meer dimensies
const moodDimensies = [
  { id: 'energie', label: 'Energie', emoji: '⚡' },
  { id: 'motivatie', label: 'Motivatie', emoji: '🎯' },
  { id: 'concentratie', label: 'Concentratie', emoji: '🧠' },
  { id: 'zelfvertrouwen', label: 'Zelfvertrouwen', emoji: '💪' },
  { id: 'sociale_verbinding', label: 'Sociale verbinding', emoji: '👥' },
  { id: 'ontspanning', label: 'Ontspanning', emoji: '🧘' }
];

// Angst/depressie screening vragen (PHQ-2 en GAD-2 gebaseerd)
const screeningVragen = [
  {
    id: 'depressie_1',
    categorie: 'depressie',
    vraag: 'Weinig interesse of plezier in activiteiten',
    beschrijving: 'Afgelopen 2 weken'
  },
  {
    id: 'depressie_2',
    categorie: 'depressie',
    vraag: 'Neerslachtig, depressief of hopeloos gevoel',
    beschrijving: 'Afgelopen 2 weken'
  },
  {
    id: 'angst_1',
    categorie: 'angst',
    vraag: 'Nerveus, angstig of gespannen gevoeld',
    beschrijving: 'Afgelopen 2 weken'
  },
  {
    id: 'angst_2',
    categorie: 'angst',
    vraag: 'Niet kunnen stoppen met of controleren van zorgen',
    beschrijving: 'Afgelopen 2 weken'
  }
];

const screeningOpties = [
  { waarde: 0, label: 'Helemaal niet' },
  { waarde: 1, label: 'Enkele dagen' },
  { waarde: 2, label: 'Meer dan de helft van de dagen' },
  { waarde: 3, label: 'Bijna elke dag' }
];

// Relationele vaardigheden componenten
const relationeleVaardigheden = [
  {
    id: 'actief_luisteren',
    titel: 'Actief Luisteren',
    beschrijving: 'Leer hoe je echt naar anderen luistert',
    oefeningen: [
      'Herhaal wat de ander zegt in je eigen woorden',
      'Stel open vragen: "Hoe voelde je je toen?"',
      'Leg je telefoon weg tijdens gesprekken'
    ]
  },
  {
    id: 'empathie',
    titel: 'Empathie Ontwikkelen',
    beschrijving: 'Verstaan en voelen wat anderen ervaren',
    oefeningen: [
      'Probeer je voor te stellen hoe de ander zich voelt',
      'Vraag: "Hoe kan ik je het beste steunen?"',
      'Deel je eigen gevoelens op een gepaste manier'
    ]
  },
  {
    id: 'grenzen_stellen',
    titel: 'Gezonde Grenzen',
    beschrijving: 'Leer "nee" zeggen en je grenzen respecteren',
    oefeningen: [
      'Oefen zeggen: "Dat werkt niet voor mij"',
      'Geef uitleg zonder je te verontschuldigen',
      'Respecteer ook de grenzen van anderen'
    ]
  },
  {
    id: 'conflict_oplossen',
    titel: 'Conflictoplossing',
    beschrijving: 'Gezonde manieren om meningsverschillen aan te pakken',
    oefeningen: [
      'Gebruik "ik-boodschappen": "Ik voel me..."',
      'Zoek naar win-win oplossingen',
      'Neem pauzes als emoties hoog oplopen'
    ]
  }
];

// Stress management technieken
const stressManagementTechnieken = [
  {
    id: 'tijdmanagement',
    titel: 'Tijdmanagement',
    beschrijving: 'Plannen en prioriteiten stellen',
    tips: [
      'Maak dagelijks een to-do lijst',
      'Deel grote taken op in kleinere stappen',
      'Plan ook tijd in voor pauzes'
    ]
  },
  {
    id: 'ontspanning',
    titel: 'Ontspanningstechnieken',
    beschrijving: 'Lichamelijke en mentale ontspanning',
    tips: [
      'Probeer de 4-7-8 ademhalingstechniek',
      'Doe dagelijks 10 minuten mindfulness',
      'Gebruik progressieve spierontspanning'
    ]
  },
  {
    id: 'cognitief',
    titel: 'Gedachten Herstructureren',
    beschrijving: 'Negatieve gedachtenpatronen doorbreken',
    tips: [
      'Vraag je af: "Is deze gedachte realistisch?"',
      'Zoek naar bewijs voor en tegen je zorgen',
      'Vervang "Ik kan dit niet" door "Ik leer dit nog"'
    ]
  }
];

const getMoodProps = (mood) => moodOptions.find(m => m.mood === mood) || { score: 0, color: '#9ca3af' };

// Uitgebreide grafiek componenten
const CustomYAxisTick = ({ x, y, payload }) => {
  const { value } = payload;
  const option = moodOptions.find(opt => opt.score === value);

  if (option) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={-10} y={0} dy={4} textAnchor="end" fill="#666" fontSize={16}>
          {option.emoji}
        </text>
      </g>
    );
  }
  return null;
};

const MentaalGrafiek = ({ data }) => {
  const chartData = data.map(item => ({
    datum: new Date(item.id).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    humeur: item.humeur,
    score: getMoodProps(item.humeur).score,
    stress: item.stress_niveau || null,
    energie: item.mood_dimensies?.energie || null,
    motivatie: item.mood_dimensies?.motivatie || null,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const humeurData = payload.find(p => p.dataKey === 'score');
      const stressData = payload.find(p => p.dataKey === 'stress');
      const energieData = payload.find(p => p.dataKey === 'energie');
      
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-bold mb-2">{label}</p>
          {humeurData && humeurData.value && (
            <p className="text-sm" style={{ color: humeurData.fill }}>
              {`Humeur: ${humeurData.payload.humeur}`}
            </p>
          )}
          {stressData && stressData.value && (
            <p className="text-sm" style={{ color: stressData.stroke }}>
              {`Stress: ${stressData.value}/5`}
            </p>
          )}
          {energieData && energieData.value && (
            <p className="text-sm text-yellow-600">
              {`Energie: ${energieData.value}/5`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
        {moodOptions.map(option => (
          <ReferenceLine 
            key={option.score}
            y={option.score} 
            yAxisId="left" 
            stroke="#e5e7eb" 
            strokeDasharray="3 3" 
          />
        ))}
        <XAxis dataKey="datum" tick={{ fontSize: 12 }} />
        <YAxis 
          yAxisId="left" 
          domain={[0, 100]} 
          ticks={[20, 40, 60, 80, 100]}
          tick={<CustomYAxisTick />} 
          width={40}
          tickFormatter={() => ''}
          tickLine={false}
        />
        <YAxis yAxisId="right" orientation="right" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: '#3b82f6' }} />
        
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        <Bar dataKey="score" name="Humeur" yAxisId="left" barSize={20}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getMoodProps(entry.humeur).color || '#e2e8f0'} />
          ))}
        </Bar>

        <Line type="monotone" dataKey="stress" name="Stress" yAxisId="right" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
        <Line type="monotone" dataKey="energie" name="Energie" yAxisId="right" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Radar chart voor mood dimensies
const MoodRadarChart = ({ data }) => {
  const radarData = moodDimensies.map(dimensie => ({
    dimensie: dimensie.label,
    waarde: data[dimensie.id] || 3,
    fullMark: 5
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={radarData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dimensie" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
        <Radar
          name="Huidige staat"
          dataKey="waarde"
          stroke="#f97316"
          fill="#f97316"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

// Ademhalingsoefening component
const AdemhalingOefening = () => {
  const [ademhalingTekst, setAdemhalingTekst] = useState('Adem in');

  useEffect(() => {
    let interval;
    const updateText = () => {
      setAdemhalingTekst('Adem in');
      setTimeout(() => setAdemhalingTekst('Houd vast'), 3200);
      setTimeout(() => setAdemhalingTekst('Adem uit'), 4800);
    };

    updateText();
    interval = setInterval(updateText, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center p-4">
      <p className="text-slate-600 mb-6">Focus op je ademhaling. Volg de cirkel.</p>
      <div className="flex justify-center items-center h-48">
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 bg-orange-400 rounded-full animate-ademhaling"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white font-bold text-lg">{ademhalingTekst}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5 Zintuigen oefening component
const VijfZintuigenOefening = () => (
  <div className="p-4 space-y-3">
    <p className="text-slate-600">Neem even de tijd om je omgeving waar te nemen. Benoem voor jezelf:</p>
    <ul className="list-disc list-inside space-y-2 text-slate-700">
      <li><span className="font-bold">5 dingen</span> die je kunt zien 👁️</li>
      <li><span className="font-bold">4 dingen</span> die je kunt voelen 🖐️</li>
      <li><span className="font-bold">3 dingen</span> die je kunt horen 👂</li>
      <li><span className="font-bold">2 dingen</span> die je kunt ruiken 👃</li>
      <li><span className="font-bold">1 ding</span> dat je kunt proeven 👅</li>
    </ul>
  </div>
);

// Progressieve spierontspanning
const ProgressieveOntspanning = () => {
  const [actieveStap, setActieveStap] = useState(0);
  const [isActief, setIsActief] = useState(false);

  const stappen = [
    'Span je vuisten aan (5 sec)',
    'Ontspan je handen',
    'Span je armen aan',
    'Ontspan je armen',
    'Span je schouders aan',
    'Ontspan je schouders',
    'Span je gezicht aan',
    'Ontspan je gezicht',
    'Voel de volledige ontspanning'
  ];

  const startOefening = () => {
    setIsActief(true);
    setActieveStap(0);
    
    stappen.forEach((_, index) => {
      setTimeout(() => {
        setActieveStap(index);
        if (index === stappen.length - 1) {
          setTimeout(() => setIsActief(false), 3000);
        }
      }, index * 3000);
    });
  };

  return (
    <div className="p-4 text-center">
      <p className="text-slate-600 mb-4">Progressieve spierontspanning helpt om fysieke spanning los te laten.</p>
      
      {!isActief ? (
        <button 
          onClick={startOefening}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
        >
          Start Oefening
        </button>
      ) : (
        <div className="space-y-4">
          <div className="text-2xl font-bold text-orange-600">
            Stap {actieveStap + 1} van {stappen.length}
          </div>
          <div className="text-lg bg-orange-50 p-4 rounded-xl border border-orange-200">
            {stappen[actieveStap]}
          </div>
          <div className="w-full bg-orange-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((actieveStap + 1) / stappen.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const MentaalDetail = () => {
  const { profile } = useOutletContext();
  const effectiveUserId = getEffectiveUserId(profile);
  const [mentaleGeschiedenis, setMentaleGeschiedenis] = useState([]);
  const [dagelijkseData, setDagelijkseData] = useState({});
  const [stressNiveau, setStressNiveau] = useState(3);
  const [positieveNotitie, setPositieveNotitie] = useState('');
  const [recenteNotities, setRecenteNotities] = useState([]);
  const [actieveOefening, setActieveOefening] = useState('ademhaling');
  const [actieveTab, setActieveTab] = useState('overzicht');
  
  // Nieuwe state voor uitgebreide functionaliteit
  const [moodDimensieWaarden, setMoodDimensieWaarden] = useState({});
  const [screeningAntwoorden, setScreeningAntwoorden] = useState({});
  const [actieveRelationeleVaardigheid, setActieveRelationeleVaardigheid] = useState(null);
  const [actieveStressTechniek, setActieveStressTechniek] = useState(null);

  useEffect(() => {
    if (!effectiveUserId) return;

    const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
    const unsubscribeVandaag = onSnapshot(todayDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDagelijkseData(data);
        if (data.stress_niveau) {
          setStressNiveau(data.stress_niveau);
        }
        if (data.mood_dimensies) {
          setMoodDimensieWaarden(data.mood_dimensies);
        }
        if (data.screening_antwoorden) {
          setScreeningAntwoorden(data.screening_antwoorden);
        }
      }
    });

    const notitiesQuery = query(
      collection(db, `welzijn/${effectiveUserId}/mentale_notities`),
      orderBy('datum', 'desc'),
      limit(3)
    );
    const unsubscribeNotities = onSnapshot(notitiesQuery, (snapshot) => {
      setRecenteNotities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchMentaleGeschiedenis = async () => {
      const q = query(collection(db, `welzijn/${effectiveUserId}/dagelijkse_data`));
      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.humeur || item.stress_niveau);
        
      setMentaleGeschiedenis(history.sort((a, b) => new Date(a.id) - new Date(b.id)));
    };

    fetchMentaleGeschiedenis();

    return () => {
      unsubscribeVandaag();
      unsubscribeNotities();
    };
  }, [effectiveUserId]);

  const handleStressSave = async () => {
    if (!effectiveUserId) return;
    const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
    try {
      await setDoc(todayDocRef, { stress_niveau: stressNiveau }, { merge: true });
      toast.success('Stressniveau opgeslagen!');
    } catch (error) {
      toast.error('Kon stressniveau niet opslaan.');
      console.error(error);
    }
  };

  const handleMoodDimensieSave = async () => {
  if (!effectiveUserId) {
    toast.error('Geen gebruiker gevonden');
    return;
  }
  
  console.log('Saving mood dimensions:', moodDimensieWaarden);
  const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
  
  try {
    await setDoc(todayDocRef, { mood_dimensies: moodDimensieWaarden }, { merge: true });
    toast.success('Mood dimensies opgeslagen!');
    console.log('Successfully saved:', moodDimensieWaarden);
  } catch (error) {
    console.error('Error saving mood dimensions:', error);
    toast.error('Kon mood dimensies niet opslaan: ' + error.message);
  }
};

  const handleScreeningSave = async () => {
    if (!effectiveUserId) return;
    const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
    try {
      await setDoc(todayDocRef, { screening_antwoorden: screeningAntwoorden }, { merge: true });
      toast.success('Screening opgeslagen!');
    } catch (error) {
      toast.error('Kon screening niet opslaan.');
      console.error(error);
    }
  };
  
  const handleNotitieSave = async (e) => {
    e.preventDefault();
    if (!effectiveUserId || !positieveNotitie.trim()) return;

    const notitiesColRef = collection(db, `welzijn/${effectiveUserId}/mentale_notities`);
    try {
      await addDoc(notitiesColRef, {
        tekst: positieveNotitie,
        datum: serverTimestamp(),
      });
      toast.success('Notitie opgeslagen!');
      setPositieveNotitie('');
    } catch (error) {
      toast.error('Kon notitie niet opslaan.');
      console.error(error);
    }
  };

  // Bereken screening scores
  const getScreeningScore = (categorie) => {
    const vragen = screeningVragen.filter(v => v.categorie === categorie);
    return vragen.reduce((total, vraag) => total + (screeningAntwoorden[vraag.id] || 0), 0);
  };

  const getScreeningInterpretatie = (score, categorie) => {
    if (score >= 3) {
      return {
        niveau: 'Verhoogd risico',
        kleur: 'text-red-600',
        achtergrond: 'bg-red-50',
        advies: `Het wordt aangeraden om met een vertrouwenspersoon of professional te praten over je ${categorie}klachten.`
      };
    } else if (score >= 2) {
      return {
        niveau: 'Licht verhoogd',
        kleur: 'text-amber-600',
        achtergrond: 'bg-amber-50',
        advies: 'Blijf je welzijn in de gaten houden en gebruik de beschikbare tools.'
      };
    } else {
      return {
        niveau: 'Laag risico',
        kleur: 'text-green-600',
        achtergrond: 'bg-green-50',
        advies: 'Ga zo door met het monitoren van je mentale welzijn!'
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
        
        {/* Mobile Header */}
        <div className="lg:hidden mb-8">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-orange-700 mb-2 group">
                <ArrowLeftIcon className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm">Terug</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Mentale Gezondheid</h1>
              <p className="text-slate-500 mt-1">Volg je welzijn en ontwikkel vaardigheden</p>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block mb-12">
          <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-orange-700 mb-6 group">
            <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
            Terug naar Mijn Gezondheid
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mentale Gezondheid & Vaardigheden</h1>
              <p className="text-slate-500 mt-2">Een uitgebreide toolkit voor je mentale welzijn</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-slate-200">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overzicht', label: 'Overzicht', icon: ChartBarIcon },
              { id: 'tracking', label: 'Uitgebreide Tracking', icon: ClockIcon },
              { id: 'screening', label: 'Welzijn Check', icon: ExclamationTriangleIcon },
              { id: 'vaardigheden', label: 'Sociale Vaardigheden', icon: UserGroupIcon },
              { id: 'stress', label: 'Stress Management', icon: SparklesIcon },
              { id: 'educatie', label: 'Leren', icon: BookOpenIcon }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActieveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    actieveTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-orange-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          
          {/* Overzicht Tab */}
          {actieveTab === 'overzicht' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Linker kolom - 2/3 breedte */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Mentale Geschiedenis */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <ChartBarIcon className="w-6 h-6 text-orange-500" />
                    Mentale Geschiedenis
                  </h2>
                  {mentaleGeschiedenis.length > 0 ? (
                    <MentaalGrafiek data={mentaleGeschiedenis} />
                  ) : (
                    <div className="text-center py-8 text-slate-500">Nog geen data beschikbaar voor de grafiek.</div>
                  )}
                </div>

                {/* Positieve Focus */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6">Positieve Focus</h2>
                  <form onSubmit={handleNotitieSave} className="space-y-4">
                    <div>
                      <label htmlFor="positive-note" className="block text-slate-600 mb-2">
                        Noteer één klein ding dat vandaag goed ging:
                      </label>
                      <textarea 
                        id="positive-note"
                        rows="3"
                        value={positieveNotitie}
                        onChange={(e) => setPositieveNotitie(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-orange-500 focus:border-orange-500"
                        placeholder="bv. Een vriend(in) hielp me met mijn huiswerk..."
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      Bewaar Notitie
                    </button>
                  </form>
                  
                  {recenteNotities.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-slate-700 mb-3">Recente notities:</h3>
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
                
                {/* Stress Niveau */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-4">Stressniveau</h2>
                  <p className="text-slate-600 mb-4 text-sm">Hoeveel stress ervaar je op dit moment?</p>
                  <div className="text-center text-4xl font-bold text-orange-500 mb-4">{stressNiveau}</div>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={stressNiveau}
                    onChange={(e) => setStressNiveau(Number(e.target.value))}
                    className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer slider-orange"
                  />
                  <div className="flex justify-between text-xs text-slate-500 px-1 mt-2">
                    <span>Weinig</span>
                    <span>Veel</span>
                  </div>
                  <button 
                    onClick={handleStressSave} 
                    className="w-full mt-6 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all duration-200"
                  >
                    Log Stressniveau
                  </button>
                </div>
                
                {/* Snelle Reset */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-orange-500"/>
                    Snelle Reset
                  </h2>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-slate-200 mb-4">
                    <button 
                      onClick={() => setActieveOefening('ademhaling')}
                      className={`py-2 px-4 text-sm font-semibold transition-colors ${
                        actieveOefening === 'ademhaling' 
                          ? 'border-b-2 border-orange-500 text-orange-600' 
                          : 'text-slate-500 hover:text-orange-500'
                      }`}
                    >
                      Ademhaling
                    </button>
                    <button 
                      onClick={() => setActieveOefening('zintuigen')}
                      className={`py-2 px-4 text-sm font-semibold transition-colors ${
                        actieveOefening === 'zintuigen' 
                          ? 'border-b-2 border-orange-500 text-orange-600' 
                          : 'text-slate-500 hover:text-orange-500'
                      }`}
                    >
                      5 Zintuigen
                    </button>
                  </div>
                  
                  {/* Oefening content */}
                  <div>
                    {actieveOefening === 'ademhaling' && <AdemhalingOefening />}
                    {actieveOefening === 'zintuigen' && <VijfZintuigenOefening />}
                  </div>
                </div>

                {/* Hulpbronnen */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-4">Hulp nodig?</h2>
                  <p className="text-sm text-slate-600 mb-4">Praten helpt. Hier zijn enkele betrouwbare bronnen:</p>
                  <div className="space-y-3">
                    <a 
                      href="https://www.awel.be" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-600 hover:bg-orange-100 transition-colors"
                    >
                      <PhoneIcon className="w-5 h-5 flex-shrink-0"/>
                      <div>
                        <div className="font-semibold">Awel luistert</div>
                        <div className="text-sm">Bel 102</div>
                      </div>
                    </a>
                    <a 
                      href="https://www.jac.be" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-600 hover:bg-orange-100 transition-colors"
                    >
                      <LightBulbIcon className="w-5 h-5 flex-shrink-0"/>
                      <div>
                        <div className="font-semibold">JAC</div>
                        <div className="text-sm">Info & advies</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Uitgebreide Tracking Tab */}
          {actieveTab === 'tracking' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Mood Dimensies */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Uitgebreide Mood Tracking</h2>
                <p className="text-slate-600 mb-6 text-sm">Evalueer verschillende aspecten van je mentale staat vandaag (1 = laag, 5 = hoog):</p>
                
                <div className="space-y-4">
                  {moodDimensies.map(dimensie => (
                    <div key={dimensie.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{dimensie.emoji}</span>
                        <span className="font-medium text-slate-700">{dimensie.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min="1" 
                          max="5" 
                          value={moodDimensieWaarden[dimensie.id] || 3}
                          onChange={(e) => setMoodDimensieWaarden(prev => ({
                            ...prev,
                            [dimensie.id]: Number(e.target.value)
                          }))}
                          className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-lg font-bold text-orange-500 w-6 text-center">
                          {moodDimensieWaarden[dimensie.id] || 3}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={handleMoodDimensieSave} 
                  className="w-full mt-6 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all duration-200"
                >
                  Bewaar Mood Tracking
                </button>
              </div>

              {/* Radar Chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Je Mentale Balans</h2>
                <MoodRadarChart data={moodDimensieWaarden} />
                <p className="text-sm text-slate-600 mt-4 text-center">
                  Deze radar toont je huidige balans tussen verschillende aspecten van je mentale welzijn.
                </p>
              </div>
            </div>
          )}

          {/* Welzijn Check Tab */}
          {actieveTab === 'screening' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Welzijn Check</h2>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Let op:</strong> Dit is geen medische diagnose, maar een hulpmiddel om je welzijn te monitoren. 
                      Bij zorgen over je mentale gezondheid, praat altijd met een vertrouwenspersoon of professional.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {screeningVragen.map(vraag => (
                    <div key={vraag.id} className="border border-slate-200 rounded-xl p-6">
                      <div className="mb-4">
                        <h3 className="font-semibold text-slate-800 mb-2">{vraag.vraag}</h3>
                        <p className="text-sm text-slate-600">{vraag.beschrijving}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {screeningOpties.map(optie => (
                          <button
                            key={optie.waarde}
                            onClick={() => setScreeningAntwoorden(prev => ({
                              ...prev,
                              [vraag.id]: optie.waarde
                            }))}
                            className={`p-3 text-sm font-medium rounded-xl border-2 transition-all ${
                              screeningAntwoorden[vraag.id] === optie.waarde
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'
                            }`}
                          >
                            {optie.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <button 
                    onClick={handleScreeningSave} 
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-4 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all duration-200"
                  >
                    Bewaar Welzijn Check
                  </button>
                </div>

                {/* Resultaten */}
                {Object.keys(screeningAntwoorden).length > 0 && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['depressie', 'angst'].map(categorie => {
                      const score = getScreeningScore(categorie);
                      const interpretatie = getScreeningInterpretatie(score, categorie);
                      
                      return (
                        <div key={categorie} className={`p-6 rounded-xl border-2 ${interpretatie.achtergrond}`}>
                          <h3 className="font-bold text-lg mb-2 capitalize">{categorie} Screening</h3>
                          <div className={`text-2xl font-bold mb-2 ${interpretatie.kleur}`}>
                            Score: {score}/6
                          </div>
                          <div className={`font-semibold mb-3 ${interpretatie.kleur}`}>
                            {interpretatie.niveau}
                          </div>
                          <p className="text-sm text-slate-700">
                            {interpretatie.advies}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sociale Vaardigheden Tab */}
          {actieveTab === 'vaardigheden' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {relationeleVaardigheden.map(vaardigheid => (
                <div key={vaardigheid.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{vaardigheid.titel}</h3>
                  <p className="text-slate-600 mb-4">{vaardigheid.beschrijving}</p>
                  
                  <button
                    onClick={() => setActieveRelationeleVaardigheid(
                      actieveRelationeleVaardigheid === vaardigheid.id ? null : vaardigheid.id
                    )}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 mb-4"
                  >
                    {actieveRelationeleVaardigheid === vaardigheid.id ? 'Verberg Oefeningen' : 'Toon Oefeningen'}
                  </button>

                  {actieveRelationeleVaardigheid === vaardigheid.id && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700">Praktische oefeningen:</h4>
                      <ul className="space-y-2">
                        {vaardigheid.oefeningen.map((oefening, index) => (
                          <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-sm text-slate-700">{oefening}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stress Management Tab */}
          {actieveTab === 'stress' && (
            <div className="space-y-6">
              
              {/* Geavanceerde Ontspanningsoefeningen */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Ademhalingstechnieken</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setActieveOefening('ademhaling')}
                      className={`w-full p-3 rounded-xl border-2 font-medium transition-all ${
                        actieveOefening === 'ademhaling'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'
                      }`}
                    >
                      Basis Ademhaling
                    </button>
                    <div className="text-sm text-slate-600">
                      <strong>4-7-8 Techniek:</strong> Adem 4 sec in, houd 7 sec vast, adem 8 sec uit. Herhaal 4x.
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Lichamelijke Ontspanning</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setActieveOefening('progressief')}
                      className={`w-full p-3 rounded-xl border-2 font-medium transition-all ${
                        actieveOefening === 'progressief'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'
                      }`}
                    >
                      Progressieve Ontspanning
                    </button>
                    <div className="text-sm text-slate-600">
                      Span bewust spiergroepen aan en ontspan ze systematisch voor diepe ontspanning.
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Mindfulness</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setActieveOefening('zintuigen')}
                      className={`w-full p-3 rounded-xl border-2 font-medium transition-all ${
                        actieveOefening === 'zintuigen'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'
                      }`}
                    >
                      5-4-3-2-1 Techniek
                    </button>
                    <div className="text-sm text-slate-600">
                      Focus op je zintuigen om je aandacht terug naar het hier en nu te brengen.
                    </div>
                  </div>
                </div>
              </div>

              {/* Actieve Oefening Display */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Actieve Oefening</h2>
                
                <div>
                  {actieveOefening === 'ademhaling' && <AdemhalingOefening />}
                  {actieveOefening === 'zintuigen' && <VijfZintuigenOefening />}
                  {actieveOefening === 'progressief' && <ProgressieveOntspanning />}
                </div>
              </div>

              {/* Stress Management Technieken */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {stressManagementTechnieken.map(techniek => (
                  <div key={techniek.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">{techniek.titel}</h3>
                    <p className="text-slate-600 mb-4 text-sm">{techniek.beschrijving}</p>
                    
                    <button
                      onClick={() => setActieveStressTechniek(
                        actieveStressTechniek === techniek.id ? null : techniek.id
                      )}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 mb-4"
                    >
                      {actieveStressTechniek === techniek.id ? 'Verberg Tips' : 'Toon Tips'}
                    </button>

                    {actieveStressTechniek === techniek.id && (
                      <ul className="space-y-2">
                        {techniek.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="flex-shrink-0 w-4 h-4 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                              ✓
                            </span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Educatie Tab */}
          {actieveTab === 'educatie' && (
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Mentale Gezondheid Basiskennis */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Mentale Gezondheid: De Basis</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Wat is mentale gezondheid?</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Mentale gezondheid gaat over hoe je denkt, voelt en je gedraagt. Het beïnvloedt hoe je 
                      omgaat met stress, relaties aangaat en keuzes maakt. Het is net zo belangrijk als je 
                      lichamelijke gezondheid.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Waarom is het belangrijk?</h3>
                    <ul className="text-slate-600 text-sm space-y-2">
                      <li>• Helpt je beter presteren op school</li>
                      <li>• Verbetert je relaties</li>
                      <li>• Vergroot je veerkracht</li>
                      <li>• Zorgt voor meer levensgeluk</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Wanneer Hulp Zoeken */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Wanneer Professionele Hulp Zoeken?</h2>
                
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-amber-800 mb-3">Zoek hulp als je:</h3>
                  <ul className="space-y-2 text-amber-700 text-sm">
                    <li>• Al meer dan 2 weken constant verdrietig of angstig bent</li>
                    <li>• Je niet meer kunt genieten van dingen die je vroeger leuk vond</li>
                    <li>• Je schoolprestaties duidelijk achteruitgaan</li>
                    <li>• Je je terugtrekt van vrienden en familie</li>
                    <li>• Je gedachten hebt over jezelf pijn doen</li>
                    <li>• Je veel alcohol of drugs gebruikt</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-3">Bij wie kun je terecht?</h3>
                    <ul className="space-y-2 text-slate-600 text-sm">
                      <li>• Schoolpsycholoog of -maatschappelijk werker</li>
                      <li>• Huisarts</li>
                      <li>• Vertrouwenspersoon op school</li>
                      <li>• Ouders of verzorgers</li>
                      <li>• JAC (Jongerenadviescentrum)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-3">Directe hulplijnen:</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="font-semibold text-red-800">Zelfmoordlijn 1813</div>
                        <div className="text-sm text-red-600">24/7 bereikbaar bij acute nood</div>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="font-semibold text-blue-800">Awel 102</div>
                        <div className="text-sm text-blue-600">Voor alle vragen en problemen</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* CSS voor animaties en styling */}
      <style>{`
        @keyframes ademhaling {
          0% { transform: scale(0.7); opacity: 0.7; }
          40% { transform: scale(1); opacity: 1; }
          60% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.7); opacity: 0.7; }
        }
        .animate-ademhaling {
          animation: ademhaling 8s infinite ease-in-out;
        }
        .slider-orange::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ea580c;
          cursor: pointer;
        }
        .slider-orange::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ea580c;
          cursor: pointer;
          border: none;
        }
        
        /* Custom range slider styling voor mood dimensies */
        .mood-slider {
          -webkit-appearance: none;
          appearance: none;
          background: linear-gradient(to right, #e2e8f0 0%, #e2e8f0 100%);
          cursor: pointer;
          height: 8px;
          border-radius: 4px;
          outline: none;
        }

        .mood-slider::-webkit-slider-track {
          background: #e2e8f0;
          height: 8px;
          border-radius: 4px;
          border: none;
        }

        .mood-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #f97316;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mood-slider::-webkit-slider-thumb:hover {
          background: #ea580c;
          transform: scale(1.1);
        }

        .mood-slider::-moz-range-track {
          background: #e2e8f0;
          height: 8px;
          border-radius: 4px;
          border: none;
        }

        .mood-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #f97316;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .mood-slider::-moz-range-thumb:hover {
          background: #ea580c;
          transform: scale(1.1);
        }
        
        /* General range slider styling */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          height: 6px;
        }

        input[type="range"]::-webkit-slider-track {
          background: #e2e8f0;
          height: 6px;
          border-radius: 3px;
          border: none;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #f97316;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
        }

        input[type="range"]::-moz-range-track {
          background: #e2e8f0;
          height: 6px;
          border-radius: 3px;
          border: none;
        }

        input[type="range"]::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #f97316;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
          border: none;
        }
        }

        input[type="range"]::-moz-range-track {
          background: #e2e8f0;
          height: 6px;
          border-radius: 3px;
          border: none;
        }

        input[type="range"]::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #f97316;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default MentaalDetail;