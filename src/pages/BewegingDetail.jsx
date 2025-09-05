import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy, getDocs, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, LightBulbIcon, PhoneIcon, SparklesIcon, ChartBarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- HULPFUNCTIES ---
const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const getEffectiveUserId = (profile) => {
  // Deze logica zorgt ervoor dat een admin die een leerling imiteert, de data van die leerling ziet.
  if (profile?.originalProfile && profile.rol === 'leerling') {
    return profile.id; 
  }
  return profile?.id;
};


// --- GRAFIEK COMPONENT ---
const StappenGrafiek = ({ data }) => {
  const chartData = data.map(item => ({
    datum: new Date(item.id).toLocaleString('nl-BE', { day: '2-digit', month: '2-digit' }),
    stappen: item.stappen || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <XAxis dataKey="datum" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 'dataMax + 2000']} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
        <Bar dataKey="stappen" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// --- LOGBOEK COMPONENT ---
const ActiviteitenLog = ({ activiteiten, onAdd }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Activiteitenlog</h2>
            <button onClick={onAdd} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm">
                <PlusIcon className="w-5 h-5" />
                <span>Voeg toe</span>
            </button>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {activiteiten.length > 0 ? (
                activiteiten.map(act => (
                    <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800">{act.type}</span>
                            <span className="text-sm text-slate-500">{act.duur_minuten} min</span>
                        </div>
                        {act.notities && <p className="text-sm text-slate-600 mt-1 italic">"{act.notities}"</p>}
                    </div>
                ))
            ) : (
                <p className="text-center py-8 text-slate-500">Nog geen activiteiten gelogd.</p>
            )}
        </div>
    </div>
);

// --- NIEUWE COMPONENTEN (GEADAPTEERD VAN MENTAAL) ---
const HerstelTips = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-blue-500"/>
            Hersteltips
        </h2>
        <div className="p-4 space-y-3 text-sm text-slate-600 bg-blue-50 rounded-xl border border-blue-200">
            <p className="font-semibold">Vergeet je cooling-down niet!</p>
            <ul className="list-disc list-inside space-y-1">
                <li>Lichte stretching helpt spierpijn te verminderen.</li>
                <li>Drink voldoende water om te rehydrateren.</li>
                <li>Een goede nachtrust is cruciaal voor spierherstel.</li>
            </ul>
        </div>
    </div>
);

const BewegingBronnen = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Handige Links</h2>
        <div className="space-y-3">
            <a href="https://www.gezondsporten.be" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 hover:bg-blue-100 transition-colors">
                <LinkIcon className="w-5 h-5 flex-shrink-0"/>
                <div className="font-semibold">Gezond Sporten Vlaanderen</div>
            </a>
        </div>
    </div>
);


const BewegingDetail = () => {
    const { profile } = useOutletContext();
    const effectiveUserId = getEffectiveUserId(profile);

    // States
    const [stappenGeschiedenis, setStappenGeschiedenis] = useState([]);
    const [activiteiten, setActiviteiten] = useState([]);
    const [recenteNotities, setRecenteNotities] = useState([]);
    const [trainingsNotitie, setTrainingsNotitie] = useState('');
    const [showActiviteitModal, setShowActiviteitModal] = useState(false);
    const [nieuweActiviteit, setNieuweActiviteit] = useState({ type: 'Wandelen', duur_minuten: 30, notities: '' });

    useEffect(() => {
        if (!effectiveUserId) return;

        // Data voor stappengrafiek
        const fetchStappenGeschiedenis = async () => {
             const q = query(collection(db, `welzijn/${effectiveUserId}/dagelijkse_data`));
             const querySnapshot = await getDocs(q);
             const history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             setStappenGeschiedenis(history.sort((a, b) => new Date(a.id) - new Date(b.id)));
        };

        // Data voor activiteitenlogboek
        const activiteitenQuery = query(collection(db, `welzijn/${effectiveUserId}/activiteiten`), orderBy('datum', 'desc'));
        const unsubscribeActiviteiten = onSnapshot(activiteitenQuery, snapshot => {
            setActiviteiten(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Data voor trainingsnotities
        const notitiesQuery = query(collection(db, `welzijn/${effectiveUserId}/beweging_notities`), orderBy('datum', 'desc'), limit(3));
        const unsubscribeNotities = onSnapshot(notitiesQuery, snapshot => {
            setRecenteNotities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        fetchStappenGeschiedenis();
        return () => {
            unsubscribeActiviteiten();
            unsubscribeNotities();
        };
    }, [effectiveUserId]);

    const handleAddActiviteit = async (e) => {
        e.preventDefault();
        if (!nieuweActiviteit.type || !nieuweActiviteit.duur_minuten) return;
        await addDoc(collection(db, `welzijn/${effectiveUserId}/activiteiten`), {
            ...nieuweActiviteit, datum: serverTimestamp(),
        });
        toast.success('Activiteit toegevoegd!');
        setShowActiviteitModal(false);
        setNieuweActiviteit({ type: 'Wandelen', duur_minuten: 30, notities: '' });
    };

    const handleNotitieSave = async (e) => {
        e.preventDefault();
        if (!trainingsNotitie.trim()) return;
        await addDoc(collection(db, `welzijn/${effectiveUserId}/beweging_notities`), {
            tekst: trainingsNotitie, datum: serverTimestamp(),
        });
        toast.success('Notitie opgeslagen!');
        setTrainingsNotitie('');
    };

    return (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
                {/* Headers */}
                <div className="hidden lg:block mb-12">
                    <Link to="/gezondheid" className="inline-flex items-center text-gray-600 hover:text-blue-700 mb-6 group">
                        <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
                        Terug naar Mijn Gezondheid
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mijn Beweging</h1>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Linker kolom */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <ChartBarIcon className="w-6 h-6 text-blue-500" />
                                Stappen Geschiedenis
                            </h2>
                            {stappenGeschiedenis.length > 0 ? (
                                <StappenGrafiek data={stappenGeschiedenis} />
                            ) : (
                                <div className="text-center py-8 text-slate-500">Nog geen data voor de grafiek.</div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6">Trainingsnotities</h2>
                            <form onSubmit={handleNotitieSave} className="space-y-4">
                                <div>
                                    <label htmlFor="training-note" className="block text-slate-600 mb-2">Noteer hier hoe je training ging, wat je voelde, of wat je volgende doel is:</label>
                                    <textarea id="training-note" rows="3" value={trainingsNotitie} onChange={(e) => setTrainingsNotitie(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="bv. Vandaag 5km gelopen, ging vlot! Volgende keer focus op tempo..."
                                    />
                                </div>
                                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 rounded-xl">Bewaar Notitie</button>
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

                    {/* Rechter kolom */}
                    <div className="space-y-6">
                        <ActiviteitenLog activiteiten={activiteiten} onAdd={() => setShowActiviteitModal(true)} />
                        <HerstelTips />
                        <BewegingBronnen />
                    </div>
                </div>
            </div>

            {/* Modal voor nieuwe activiteit */}
            {showActiviteitModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Nieuwe Activiteit</h3>
                        <form onSubmit={handleAddActiviteit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type Activiteit</label>
                                <input type="text" value={nieuweActiviteit.type} onChange={e => setNieuweActiviteit({...nieuweActiviteit, type: e.target.value})} className="w-full p-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duur (minuten)</label>
                                <input type="number" value={nieuweActiviteit.duur_minuten} onChange={e => setNieuweActiviteit({...nieuweActiviteit, duur_minuten: Number(e.target.value)})} className="w-full p-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notities (optioneel)</label>
                                <textarea rows="2" value={nieuweActiviteit.notities} onChange={e => setNieuweActiviteit({...nieuweActiviteit, notities: e.target.value})} className="w-full p-2 border rounded-md" />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowActiviteitModal(false)} className="flex-1 py-3 px-4 bg-gray-100 rounded-xl">Annuleren</button>
                                <button type="submit" className="flex-1 py-3 px-4 bg-blue-500 text-white font-bold rounded-xl">Opslaan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BewegingDetail;