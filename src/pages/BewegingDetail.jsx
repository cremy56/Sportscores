import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/formatters';

const BewegingDetail = () => {
  const { profile } = useOutletContext();

  // State voor data uit Firestore
  const [dailyGoal, setDailyGoal] = useState(10000);
  const [currentSteps, setCurrentSteps] = useState(0);
  const [activityHistory, setActivityHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // State voor het formulier
  const [activityType, setActivityType] = useState('Wandelen');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;
    setLoading(true);

    // 1. Listener voor doelen en dagelijkse stappen
    const welzijnDocRef = doc(db, 'welzijn', profile.uid);
    const unsubscribeGoals = onSnapshot(welzijnDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().doelen) {
        setDailyGoal(docSnap.data().doelen.stappen || 10000);
      }
    });

    const todayString = new Date().toISOString().slice(0, 10);
    const todayDocRef = doc(db, 'welzijn', profile.uid, 'dagelijkse_data', todayString);
    const unsubscribeToday = onSnapshot(todayDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentSteps(docSnap.data().stappen || 0);
      } else {
        setCurrentSteps(0);
      }
    });

    // 2. Listener voor activiteitengeschiedenis
    const activiteitenRef = collection(db, 'welzijn', profile.uid, 'activiteiten');
    const q = query(activiteitenRef, orderBy('datum', 'desc'));
    const unsubscribeActivities = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivityHistory(history);
      setLoading(false);
    });

    return () => {
      unsubscribeGoals();
      unsubscribeToday();
      unsubscribeActivities();
    };
  }, [profile?.uid]);
  
  const handleLogActivity = async (e) => {
    e.preventDefault();
    if (!profile?.uid || !duration) {
      toast.error('Vul tenminste de duur van de activiteit in.');
      return;
    }

    const newActivity = {
      type: activityType,
      duur_minuten: Number(duration),
      afstand_km: distance ? Number(distance) : null,
      datum: serverTimestamp() // Gebruik de servertijd voor consistentie
    };

    try {
      const activiteitenRef = collection(db, 'welzijn', profile.uid, 'activiteiten');
      await addDoc(activiteitenRef, newActivity);
      toast.success(`${activityType} succesvol gelogd!`);
      // Reset formulier
      setActivityType('Wandelen');
      setDuration('');
      setDistance('');
    } catch (error) {
      console.error("Fout bij het loggen van activiteit:", error);
      toast.error('Kon activiteit niet loggen.');
    }
  };

  const progress = dailyGoal > 0 ? Math.min((currentSteps / dailyGoal) * 100, 100) : 0;
  
  const getActivityIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'wandelen': return '🚶';
      case 'fietsen': return '🚴';
      case 'hardlopen': return '🏃';
      case 'zwemmen': return '🏊';
      case 'krachttraining': return '🏋️';
      default: return '💪';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mijn Beweging</h1>
          <p className="text-slate-500 mt-1">Volg je doelen, log activiteiten en bekijk je geschiedenis.</p>
        </div>
        <Link to="/gezondheid" className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors">
          <ArrowUturnLeftIcon className="w-5 h-5" />
          <span>Terug naar kompas</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Linker kolom */}
        <div className="lg:col-span-2 space-y-8">
          {/* Dagelijks Doel */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Dagelijks Stappendoel</h2>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-600">Voortgang</span>
              <span className="font-bold text-purple-600">{currentSteps.toLocaleString()} / {dailyGoal.toLocaleString()} stappen</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4">
              <div
                className="bg-purple-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-right text-sm text-slate-500 mt-2">{Math.round(progress)}% voltooid</p>
          </div>

          {/* Activiteit Geschiedenis */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Recente Activiteiten</h2>
            {loading ? (
              <p className="text-slate-500">Geschiedenis laden...</p>
            ) : activityHistory.length > 0 ? (
              <ul className="space-y-4">
                {activityHistory.map(activity => (
                  <li key={activity.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                      <div>
                        <p className="font-semibold text-slate-800">{activity.type}</p>
                        <p className="text-sm text-slate-500">
                          {activity.duur_minuten} min
                          {activity.afstand_km && ` / ${activity.afstand_km} km`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-slate-400">{formatDate(activity.datum)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-center py-4">Je hebt nog geen activiteiten gelogd.</p>
            )}
          </div>
        </div>

        {/* Rechter kolom */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 h-fit">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Activiteit Loggen</h2>
          <form onSubmit={handleLogActivity} className="space-y-4">
            <div>
              <label htmlFor="activityType" className="block text-sm font-medium text-slate-700 mb-1">Type activiteit</label>
              <select 
                id="activityType" 
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              >
                <option>Wandelen</option>
                <option>Fietsen</option>
                <option>Hardlopen</option>
                <option>Zwemmen</option>
                <option>Krachttraining</option>
              </select>
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1">Duur (minuten)</label>
              <input 
                type="number" 
                id="duration" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md" 
                placeholder="bv. 30" 
                required
              />
            </div>
            <div>
              <label htmlFor="distance" className="block text-sm font-medium text-slate-700 mb-1">Afstand (km, optioneel)</label>
              <input 
                type="number" 
                id="distance" 
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md" 
                placeholder="bv. 5" 
              />
            </div>
            <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors">
              Log Activiteit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BewegingDetail;

