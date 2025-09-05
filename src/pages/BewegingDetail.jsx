import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- HULPFUNCTIES ---
const getTodayString = () => { /* ... (onveranderd) */ };
const getEffectiveUserId = (profile) => { /* ... (onveranderd) */ };

// --- GRAFIEK COMPONENT ---
const StappenGrafiek = ({ data, doel }) => {
  const chartData = data.map(item => ({
    datum: new Date(item.id).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' }),
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Activiteitenlog</h2>
            <button onClick={onAdd} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                <span>Voeg toe</span>
            </button>
        </div>
        <div className="space-y-3">
            {activiteiten.length > 0 ? (
                activiteiten.map(act => (
                    <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800">{act.type}</span>
                            <span className="text-sm text-slate-500">{act.duur_minuten} min</span>
                        </div>
                        {act.notities && <p className="text-sm text-slate-600 mt-1">{act.notities}</p>}
                    </div>
                ))
            ) : (
                <p className="text-center py-8 text-slate-500">Nog geen activiteiten gelogd.</p>
            )}
        </div>
    </div>
);

const BewegingDetail = () => {
    const { profile } = useOutletContext();
    const effectiveUserId = getEffectiveUserId(profile);

    // States
    const [stappenGeschiedenis, setStappenGeschiedenis] = useState([]);
    const [stappenDoel, setStappenDoel] = useState(10000);
    const [activiteiten, setActiviteiten] = useState([]);
    const [showActiviteitModal, setShowActiviteitModal] = useState(false);
    const [nieuweActiviteit, setNieuweActiviteit] = useState({ type: 'Wandelen', duur_minuten: 30, notities: '' });

    useEffect(() => {
        if (!effectiveUserId) return;

        // Data voor stappengrafiek
        const fetchStappenGeschiedenis = async () => {
             const dertigDagenGeleden = new Date();
             dertigDagenGeleden.setDate(dertigDagenGeleden.getDate() - 30);
             
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

        fetchStappenGeschiedenis();
        return () => unsubscribeActiviteiten();
    }, [effectiveUserId]);

    const handleAddActiviteit = async (e) => {
        e.preventDefault();
        if (!nieuweActiviteit.type || !nieuweActiviteit.duur_minuten) return;

        await addDoc(collection(db, `welzijn/${effectiveUserId}/activiteiten`), {
            ...nieuweActiviteit,
            datum: serverTimestamp(),
        });
        toast.success('Activiteit toegevoegd!');
        setShowActiviteitModal(false);
        setNieuweActiviteit({ type: 'Wandelen', duur_minuten: 30, notities: '' });
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

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Linker kolom */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <ChartBarIcon className="w-6 h-6 text-blue-500" />
                                Stappen Geschiedenis
                            </h2>
                            <StappenGrafiek data={stappenGeschiedenis} doel={stappenDoel} />
                        </div>
                    </div>
                    {/* Rechter kolom */}
                    <div className="space-y-6">
                        <ActiviteitenLog activiteiten={activiteiten} onAdd={() => setShowActiviteitModal(true)} />
                    </div>
                </div>
            </div>

            {/* Modal voor nieuwe activiteit */}
            {showActiviteitModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Nieuwe Activiteit</h3>
                        <form onSubmit={handleAddActiviteit} className="space-y-4">
                            {/* Formulier velden */}
                            <button type="submit" className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl">Opslaan</button>
                            <button type="button" onClick={() => setShowActiviteitModal(false)} className="w-full py-2">Annuleren</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BewegingDetail;