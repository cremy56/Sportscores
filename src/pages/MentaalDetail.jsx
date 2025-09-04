import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowUturnLeftIcon, LightBulbIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../utils/formatters';

const moodOptions = [
  { mood: 'Zeer goed', emoji: '😄', color: 'bg-green-400' },
  { mood: 'Goed', emoji: '🙂', color: 'bg-lime-400' },
  { mood: 'Neutraal', emoji: '😐', color: 'bg-yellow-400' },
  { mood: 'Minder goed', emoji: '😕', color: 'bg-orange-400' },
  { mood: 'Slecht', emoji: '😞', color: 'bg-red-400' },
];

// Helper om de datum van vandaag in JJJJ-MM-DD formaat te krijgen
const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const MentaalDetail = () => {
  const { profile } = useOutletContext();
  const [dagelijkseData, setDagelijkseData] = useState({});
  const [stressNiveau, setStressNiveau] = useState(3);
  const [positieveNotitie, setPositieveNotitie] = useState('');
  const [recenteNotities, setRecenteNotities] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;

    // Listener voor de data van vandaag
    const todayDocRef = doc(db, 'welzijn', profile.id, 'dagelijkse_data', getTodayString());
    const unsubscribeVandaag = onSnapshot(todayDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDagelijkseData(data);
        if (data.stress_niveau) {
          setStressNiveau(data.stress_niveau);
        }
      }
    });

    // Listener voor recente positieve notities
    const notitiesQuery = query(
      collection(db, `welzijn/${profile.id}/mentale_notities`),
      orderBy('datum', 'desc'),
      limit(3)
    );
    const unsubscribeNotities = onSnapshot(notitiesQuery, (snapshot) => {
        setRecenteNotities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeVandaag();
      unsubscribeNotities();
    };
  }, [profile?.id]);

  const handleStressSave = async () => {
    if (!profile?.id) return;
    const todayDocRef = doc(db, 'welzijn', profile.id, 'dagelijkse_data', getTodayString());
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
    if (!profile?.id || !positieveNotitie.trim()) return;

    const notitiesColRef = collection(db, `welzijn/${profile.id}/mentale_notities`);
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
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mijn Mentale Balans</h1>
          <p className="text-slate-500 mt-1">Volg je humeur, beheer stress en vind hulpmiddelen.</p>
        </div>
        <Link to="/gezondheid" className="flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-800 transition-colors">
          <ArrowUturnLeftIcon className="w-5 h-5" />
          <span>Terug naar kompas</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Linker kolom */}
        <div className="lg:col-span-2 space-y-8">
            {/* Humeur Vandaag */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Humeur Vandaag</h2>
                {dagelijkseData.humeur ? (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <span className="text-5xl">{moodOptions.find(m => m.mood === dagelijkseData.humeur)?.emoji}</span>
                        <div>
                            <p className="text-slate-600">Je hebt vandaag ingecheckt als:</p>
                            <p className="text-xl font-bold text-slate-800">{dagelijkseData.humeur}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-500">Je hebt je humeur vandaag nog niet gelogd. Klik op het kompas op de vorige pagina om in te checken!</p>
                )}
            </div>

            {/* Positieve Focus */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Positieve Focus</h2>
                <form onSubmit={handleNotitieSave} className="space-y-3">
                    <label htmlFor="positive-note" className="block text-slate-600">Noteer één klein ding dat vandaag goed ging:</label>
                    <textarea 
                        id="positive-note"
                        rows="3"
                        value={positieveNotitie}
                        onChange={(e) => setPositieveNotitie(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        placeholder="bv. Een vriend(in) hielp me met mijn huiswerk..."
                    />
                    <button type="submit" className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors">
                        Bewaar Notitie
                    </button>
                </form>
                 {recenteNotities.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-semibold text-slate-700 mb-2">Recente notities:</h3>
                        <ul className="space-y-2">
                           {recenteNotities.map(note => (
                               <li key={note.id} className="text-sm text-slate-600 p-2 bg-gray-50 rounded-md">
                                   <span className="font-medium text-gray-400">{formatDate(note.datum)}:</span> {note.tekst}
                               </li>
                           ))}
                        </ul>
                    </div>
                 )}
            </div>
        </div>

        {/* Rechter kolom */}
        <div className="space-y-8">
            {/* Stress Niveau */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 h-fit">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Stressniveau</h2>
                <p className="text-slate-600 mb-4 text-sm">Hoeveel stress ervaar je op dit moment?</p>
                <div className="text-center text-4xl font-bold text-orange-500 mb-4">{stressNiveau}</div>
                <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={stressNiveau}
                    onChange={(e) => setStressNiveau(Number(e.target.value))}
                    className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 px-1 mt-2">
                    <span>Weinig</span>
                    <span>Veel</span>
                </div>
                <button onClick={handleStressSave} className="w-full mt-6 bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors">
                    Log Stressniveau
                </button>
            </div>
            
             {/* Hulpbronnen */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 h-fit">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Hulp nodig?</h2>
                <p className="text-sm text-slate-600 mb-4">Praten helpt. Hier zijn enkele betrouwbare bronnen:</p>
                <ul className="space-y-3">
                    <li><a href="https://www.awel.be" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-orange-600 hover:underline"><PhoneIcon className="w-5 h-5"/> Awel luistert (bel 102)</a></li>
                    <li><a href="https://www.jac.be" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-orange-600 hover:underline"><LightBulbIcon className="w-5 h-5"/> JAC - Info & advies</a></li>
                    {/* Voeg hier eventueel interne schoolcontacten toe */}
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MentaalDetail;
