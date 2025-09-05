import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ChartBarIcon, PlusIcon, SparklesIcon, LightBulbIcon, PhoneIcon, LinkIcon, HeartIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';



const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// Helper functie voor effectieve gebruiker ID (zelfde logica als Gezondheid.jsx)
const getEffectiveUserId = (profile) => {
  if (profile?.originalProfile?.rol === 'super-administrator' && profile?.rol === 'leerling') {
    return profile?.uid;
  }
  return profile?.uid || profile?.id;
};

const moodOptions = [
  { mood: 'Zeer goed', emoji: '😄', color: 'bg-green-400' },
  { mood: 'Goed', emoji: '🙂', color: 'bg-lime-400' },
  { mood: 'Neutraal', emoji: '😐', color: 'bg-yellow-400' },
  { mood: 'Minder goed', emoji: '😕', color: 'bg-orange-400' },
  { mood: 'Slecht', emoji: '😞', color: 'bg-red-400' },
];
const getMoodProps = (mood) => moodOptions.find(m => m.mood === mood) || { score: 0, color: '#9ca3af' };

// --- GRAFIEK COMPONENT ---
const HumeurGrafiek = ({ data }) => {
  const chartData = data.map(item => ({
    // Formatteer datum naar 'DD/MM' voor de x-as
    datum: new Date(item.id).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' }),
    humeur: item.humeur,
    score: getMoodProps(item.humeur).score,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-bold">{label}</p>
          <p className="text-sm text-orange-600">{`Humeur: ${payload[0].payload.humeur}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <XAxis dataKey="datum" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249, 115, 22, 0.1)' }} />
        <Bar dataKey="score">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getMoodProps(entry.humeur).color} />
          ))}
        </Bar>
      </BarChart>
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

const MentaalDetail = () => {
  const { profile } = useOutletContext();
  const effectiveUserId = getEffectiveUserId(profile);
  const [dagelijkseData, setDagelijkseData] = useState({});
  const [humeurGeschiedenis, setHumeurGeschiedenis] = useState([]); // Nieuwe state voor grafiek
  const [stressNiveau, setStressNiveau] = useState(3);
  const [positieveNotitie, setPositieveNotitie] = useState('');
  const [recenteNotities, setRecenteNotities] = useState([]);
  const [actieveOefening, setActieveOefening] = useState('ademhaling');

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

  // NIEUW: Data ophalen voor de humeur grafiek (laatste 30 dagen)
    const fetchHumeurGeschiedenis = async () => {
      const dertigDagenGeleden = new Date();
      dertigDagenGeleden.setDate(dertigDagenGeleden.getDate() - 30);
      const startTimestamp = Timestamp.fromDate(dertigDagenGeleden);

      const q = query(
        collection(db, `welzijn/${effectiveUserId}/dagelijkse_data`),
        where('humeur', '!=', null) // Alleen dagen met een humeur-log
      );

      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHumeurGeschiedenis(history.sort((a, b) => new Date(a.id) - new Date(b.id)));
    };

    fetchHumeurGeschiedenis();

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
              <h1 className="text-2xl font-bold text-gray-800">Mijn Mentale Balans</h1>
              <p className="text-slate-500 mt-1">Volg je humeur en beheer stress</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mijn Mentale Balans</h1>
              <p className="text-slate-500 mt-2">Volg je humeur, beheer stress en vind hulpmiddelen</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Linker kolom - 2/3 breedte */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* NIEUW: Humeur Geschiedenis ipv Humeur Vandaag */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <ChartBarIcon className="w-6 h-6 text-orange-500" />
                  Humeur Geschiedenis
                </h2>
                {humeurGeschiedenis.length > 0 ? (
                  <HumeurGrafiek data={humeurGeschiedenis} />
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
      
      {/* CSS voor ademhalingsanimatie */}
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
      `}</style>
    </div>
  );
};

export default MentaalDetail;