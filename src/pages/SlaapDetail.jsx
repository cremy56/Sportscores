import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, SparklesIcon, LinkIcon, MoonIcon, SunIcon, ClockIcon } from '@heroicons/react/24/outline';
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

const calculateSleepHours = (bedtime, wakeup) => {
  if (!bedtime || !wakeup) return 0;
  
  const [bedHour, bedMin] = bedtime.split(':').map(Number);
  const [wakeHour, wakeMin] = wakeup.split(':').map(Number);
  
  let bedMinutes = bedHour * 60 + bedMin;
  let wakeMinutes = wakeHour * 60 + wakeMin;
  
  // Als wakker worden voor bedtijd is, is het de volgende dag
  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60;
  }
  
  return Math.round((wakeMinutes - bedMinutes) / 60 * 10) / 10;
};

// --- SLAAPHYGIENE CHECKLIST ---
const slaapHygieneItems = [
  { id: 'screens', tekst: 'Schermen uit 1 uur voor bedtijd', emoji: '📱' },
  { id: 'caffeine', tekst: 'Geen cafeïne na 16:00', emoji: '☕' },
  { id: 'room', tekst: 'Kamer donker en koel (16-19°C)', emoji: '🌡️' },
  { id: 'food', tekst: 'Geen zware maaltijd 3u voor bedtijd', emoji: '🍽️' },
  { id: 'routine', tekst: 'Ontspanningsroutine gevolgd', emoji: '🧘' }
];

// --- SLAAPKWALITEIT STERREN ---
const SlaapKwaliteitTracker = ({ kwaliteit, onKwaliteitChange }) => (
  <div className="mb-4">
    <label className="block text-slate-600 mb-2">Hoe voelde je slaap vannacht?</label>
    <div className="flex justify-center gap-1">
      {[1, 2, 3, 4, 5].map(ster => (
        <button
          key={ster}
          onClick={() => onKwaliteitChange(ster)}
          className={`text-4xl transition-all duration-200 hover:scale-110 ${
            ster <= kwaliteit 
              ? 'text-yellow-400 drop-shadow-lg' 
              : 'text-gray-300 hover:text-yellow-300'
          }`}
          style={{
            filter: ster <= kwaliteit ? 'brightness(1.2)' : 'brightness(0.7)',
            textShadow: ster <= kwaliteit ? '0 0 8px rgba(251, 191, 36, 0.5)' : 'none'
          }}
        >
          ★
        </button>
      ))}
    </div>
    <div className="text-center text-sm text-slate-500 mt-2">
      {kwaliteit === 0 ? 'Klik om te beoordelen' : 
       kwaliteit === 1 ? 'Heel slecht' :
       kwaliteit === 2 ? 'Slecht' :
       kwaliteit === 3 ? 'Gemiddeld' :
       kwaliteit === 4 ? 'Goed' : 'Uitstekend'}
    </div>
  </div>
);

// --- SLAAPTIPS COMPONENT ---
const SlaapTips = ({ actieveTip, setActieveTip }) => {
  const tips = [
    {
      id: 'breathing',
      naam: '4-7-8 Ademhaling',
      instructies: [
        'Adem 4 tellen in door je neus',
        'Houd 7 tellen je adem vast',
        'Adem 8 tellen uit door je mond',
        'Herhaal 3-4 keer'
      ]
    },
    {
      id: 'muscle',
      naam: 'Spierontspanning',
      instructies: [
        'Span je tenen 5 seconden aan, ontspan',
        'Span je kuiten aan, ontspan',
        'Ga zo verder naar boven tot je hoofd',
        'Focus op het verschil tussen spanning en ontspanning'
      ]
    },
    {
      id: 'mental',
      naam: 'Mentale Rust',
      instructies: [
        'Tel langzaam terug van 100',
        'Visualiseer een rustige plek',
        'Focus op je ademhaling',
        'Laat gedachten voorbijgaan zonder ze vast te houden'
      ]
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <SparklesIcon className="w-6 h-6 text-purple-500"/>
        Inslaapoefeningen
      </h2>
      
      <div className="flex gap-2 mb-4">
        {tips.map(tip => (
          <button
            key={tip.id}
            onClick={() => setActieveTip(actieveTip === tip.id ? null : tip.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              actieveTip === tip.id 
                ? 'bg-purple-500 text-white' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {tip.naam}
          </button>
        ))}
      </div>
      
      {actieveTip && (
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-2">
            {tips.find(t => t.id === actieveTip)?.naam}
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-purple-700">
            {tips.find(t => t.id === actieveTip)?.instructies.map((instructie, index) => (
              <li key={index}>{instructie}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

// --- SLAAPEDUCATIE COMPONENT ---
const SlaapEducatie = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-xl font-bold text-slate-800 mb-4">Waarom is slaap belangrijk?</h2>
    <div className="space-y-4 text-sm text-slate-600">
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">🧠 Voor je hersenen</h3>
        <p>Tijdens slaap verwerken je hersenen informatie en maken ze herinneringen vast. Tieners hebben 8-10 uur slaap nodig.</p>
      </div>
      <div className="p-3 bg-green-50 rounded-xl border border-green-200">
        <h3 className="font-semibold text-green-800 mb-2">💪 Voor je lichaam</h3>
        <p>Je lichaam herstelt en groeit tijdens diepe slaap. Groeihormonen worden vooral 's nachts aangemaakt.</p>
      </div>
      <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
        <h3 className="font-semibold text-orange-800 mb-2">📱 Over schermen</h3>
        <p>Blauw licht van schermen remt melatonine (slaaphormoon). Probeer 1 uur voor bedtijd schermen weg te leggen.</p>
      </div>
    </div>
  </div>
);

// --- SLAAPBRONNEN COMPONENT ---
const SlaapBronnen = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-xl font-bold text-slate-800 mb-4">Handige Links</h2>
    <div className="space-y-3">
      <a href="https://www.thuisarts.nl/slecht-slapen" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-600 hover:bg-purple-100 transition-colors">
        <LinkIcon className="w-5 h-5 flex-shrink-0"/>
        <div>
          <div className="font-semibold">Thuisarts - Slecht slapen</div>
          <div className="text-sm">Betrouwbare medische info</div>
        </div>
      </a>
      <a href="https://www.slaapfonds.be" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-600 hover:bg-purple-100 transition-colors">
        <LinkIcon className="w-5 h-5 flex-shrink-0"/>
        <div>
          <div className="font-semibold">Slaapfonds België</div>
          <div className="text-sm">Tips en onderzoek</div>
        </div>
      </a>
    </div>
  </div>
);

const SlaapDetail = () => {
  const { profile } = useOutletContext();
  const effectiveUserId = getEffectiveUserId(profile);
  
  // State variabelen
  const [dagelijkseData, setDagelijkseData] = useState({});
  const [slaapGeschiedenis, setSlaapGeschiedenis] = useState([]);
  const [recenteNotities, setRecenteNotities] = useState([]);
  const [slaapNotitie, setSlaapNotitie] = useState('');
  const [actieveTip, setActieveTip] = useState(null);
  const [showEditSlaap, setShowEditSlaap] = useState(false);
  
  // Slaaptracking state
  const [bedtijd, setBedtijd] = useState('');
  const [opstaan, setOpstaan] = useState('');
  const [slaapKwaliteit, setSlaapKwaliteit] = useState(0);
  const [slaapUren, setSlaapUren] = useState('');
  const [hygieneChecklist, setHygieneChecklist] = useState({});

  useEffect(() => {
    if (!effectiveUserId) return;

    // Luister naar dagelijkse data
    const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
    const unsubscribeVandaag = onSnapshot(todayDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDagelijkseData(data);
        setBedtijd(data.bedtijd || '');
        setOpstaan(data.opstaan || '');
        setSlaapKwaliteit(data.slaap_kwaliteit || 0);
        setSlaapUren(data.slaap_uren || '');
        setHygieneChecklist(data.slaap_hygiene || {});
      }
    });

    // Luister naar slaapnotities
    const notitiesQuery = query(
      collection(db, `welzijn/${effectiveUserId}/slaap_notities`),
      orderBy('datum', 'desc'),
      limit(3)
    );
    const unsubscribeNotities = onSnapshot(notitiesQuery, (snapshot) => {
      setRecenteNotities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Haal slaapgeschiedenis op voor grafiek
    const fetchSlaapGeschiedenis = async () => {
      const q = query(collection(db, `welzijn/${effectiveUserId}/dagelijkse_data`));
      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(day => day.bedtijd && day.opstaan)
        .sort((a, b) => new Date(a.id) - new Date(b.id))
        .slice(-7); // Laatste 7 dagen
      setSlaapGeschiedenis(history);
    };

    fetchSlaapGeschiedenis();

    return () => {
      unsubscribeVandaag();
      unsubscribeNotities();
    };
  }, [effectiveUserId]);

  const handleSlaapSave = async () => {
  if (!effectiveUserId) return;
  
  // Gebruik directe input of berekende uren
  const finalSlaapUren = slaapUren || calculateSleepHours(bedtijd, opstaan);
  const todayDocRef = doc(db, 'welzijn', effectiveUserId, 'dagelijkse_data', getTodayString());
  
  try {
    await setDoc(todayDocRef, { 
      bedtijd,
      opstaan,
      slaap_uren: finalSlaapUren,
      slaap_kwaliteit: slaapKwaliteit,
      slaap_hygiene: hygieneChecklist
    }, { merge: true });
    toast.success('Slaapdata opgeslagen!');
  } catch (error) {
    toast.error('Kon slaapdata niet opslaan.');
    console.error(error);
  }
};

  const handleHygieneChange = (id, checked) => {
    const newChecklist = { ...hygieneChecklist, [id]: checked };
    setHygieneChecklist(newChecklist);
  };

  const handleNotitieSave = async (e) => {
    e.preventDefault();
    if (!effectiveUserId || !slaapNotitie.trim()) return;

    try {
      await addDoc(collection(db, `welzijn/${effectiveUserId}/slaap_notities`), {
        tekst: slaapNotitie,
        datum: serverTimestamp(),
      });
      toast.success('Notitie opgeslagen!');
      setSlaapNotitie('');
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
              <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-2 group">
                <ArrowLeftIcon className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm">Terug</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Mijn Slaap</h1>
              <p className="text-slate-500 mt-1">Volg je slaappatroon en kwaliteit</p>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block mb-12">
          <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6 group">
            <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
            Terug naar Mijn Gezondheid
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mijn Slaap</h1>
              <p className="text-slate-500 mt-2">Volg je slaappatroon, kwaliteit en gewoonten</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Linker kolom - 2/3 breedte */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Slaaptracker */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <MoonIcon className="w-6 h-6 text-purple-500" />
                  Slaaptracker
                </h2>
                
                {/* Al ingevoerde data via snelle actie */}
                {dagelijkseData.slaap_uren ? (
                  <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">{dagelijkseData.slaap_uren}u</div>
                      <div className="text-sm text-purple-700 mb-3">Al ingevoerd via snelle actie</div>
                      
                      {/* Toon kwaliteit sterren */}
                      {dagelijkseData.slaap_kwaliteit && (
                        <div className="flex justify-center gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map(ster => (
                            <span key={ster} className={`text-lg ${ster <= (dagelijkseData.slaap_kwaliteit || 0) ? 'text-yellow-400' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                          <span className="text-sm text-purple-600 ml-2">({dagelijkseData.slaap_kwaliteit}/5)</span>
                        </div>
                      )}
                      
                      <div className="text-xs text-purple-600 mt-1">
                        {dagelijkseData.slaap_uren >= 8 ? 'Uitstekend! 🌟' : 
                         dagelijkseData.slaap_uren >= 7 ? 'Goed 👍' : 
                         dagelijkseData.slaap_uren >= 6 ? 'Kan beter 💤' : 'Te weinig ⚠️'}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setShowEditSlaap(!showEditSlaap)}
                      className="w-full mt-4 text-sm text-purple-600 hover:text-purple-800 font-medium"
                    >
                      {showEditSlaap ? 'Verberg uitgebreide opties' : 'Aanpassen of meer details toevoegen'}
                    </button>
                  </div>
                ) : (
                  <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-blue-700 text-sm text-center">
                      Nog geen slaapdata voor vandaag. Vul hieronder in of gebruik de snelle actie op het hoofdscherm.
                    </p>
                  </div>
                )}

                {/* Uitgebreide tracking (toon als er nog geen data is, of als gebruiker wil bewerken) */}
                <div className={dagelijkseData.slaap_uren && !showEditSlaap ? 'hidden' : ''}>
                  
                  {/* Directe uren invoer (alternatief voor bedtijd/opstaan) */}
                  {!dagelijkseData.slaap_uren && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-700 mb-4">Snelle invoer</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-600 mb-2">Aantal uur geslapen</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="12"
                            value={slaapUren}
                            onChange={(e) => setSlaapUren(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                            placeholder="8.5"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-2">Kwaliteit</label>
                          <SlaapKwaliteitTracker 
                            kwaliteit={slaapKwaliteit} 
                            onKwaliteitChange={setSlaapKwaliteit} 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gedetailleerde bedtijd/opstaan tracking */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-700 mb-4">
                      {dagelijkseData.slaap_uren ? 'Precieze tijden (optioneel)' : 'Of vul precieze tijden in'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-slate-600 mb-2">Bedtijd gisteren</label>
                        <input
                          type="time"
                          value={bedtijd}
                          onChange={(e) => setBedtijd(e.target.value)}
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-2">Opstaan vanmorgen</label>
                        <input
                          type="time"
                          value={opstaan}
                          onChange={(e) => setOpstaan(e.target.value)}
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                    
                    {slaapUren > 0 && (bedtijd && opstaan) && (
                        <div className="text-center mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
                            <div className="text-2xl font-bold text-purple-600">{calculateSleepHours(bedtijd, opstaan)}u</div>
                            <div className="text-sm text-purple-700">berekend uit tijden</div>
                        </div>
                        )}
                  </div>

                  {/* Kwaliteitsrating (alleen als nog niet ingevuld) */}
                  {!dagelijkseData.slaap_kwaliteit && (
                    <SlaapKwaliteitTracker 
                      kwaliteit={slaapKwaliteit} 
                      onKwaliteitChange={setSlaapKwaliteit} 
                    />
                  )}

                  <button 
                    onClick={handleSlaapSave}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Slaapdata Opslaan
                  </button>
                </div>
              </div>

              {/* Slaaphygiene Checklist */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6">Slaaphygiene Checklist</h2>
                <p className="text-slate-600 mb-6">Vink af wat je gisteren hebt gedaan voor een betere slaap:</p>
                
                <div className="space-y-4">
                  {slaapHygieneItems.map(item => (
                    <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hygieneChecklist[item.id] || false}
                        onChange={(e) => handleHygieneChange(item.id, e.target.checked)}
                        className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-xl">{item.emoji}</span>
                      <span className="text-slate-700">{item.tekst}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <div className="text-sm text-slate-600">
                    {Object.values(hygieneChecklist).filter(Boolean).length} van {slaapHygieneItems.length} afgevinkt
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(Object.values(hygieneChecklist).filter(Boolean).length / slaapHygieneItems.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Slaapnotities */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6">Slaapjournal</h2>
                <form onSubmit={handleNotitieSave} className="space-y-4">
                  <div>
                    <label htmlFor="slaap-note" className="block text-slate-600 mb-2">
                      Hoe sliep je? Wat viel op?
                    </label>
                    <textarea 
                      id="slaap-note"
                      rows="3"
                      value={slaapNotitie}
                      onChange={(e) => setSlaapNotitie(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                      placeholder="bv. Moeilijk ingeslapen door stress, wel diep geslapen..."
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all duration-200 transform hover:scale-[1.02]"
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
              
              {/* Slaaptips */}
              <SlaapTips actieveTip={actieveTip} setActieveTip={setActieveTip} />
              
              {/* Educatie */}
              <SlaapEducatie />
              
              {/* Bronnen */}
              <SlaapBronnen />
            </div>
          </div>
        </div>

       
      </div>
    </div>
  );
};

export default SlaapDetail;