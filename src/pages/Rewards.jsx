import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Star, TrendingUp, Zap } from 'lucide-react';

const Rewards = () => {
  const { profile } = useOutletContext();
  const [studentData, setStudentData] = useState({ xp: 0, xp_current_period: 0, streak_days: 0, personal_records_count: 0 });
  const [classTarget, setClassTarget] = useState({ doel_sparks: 200, period_name: "Huidige Periode" }); // Default target

  useEffect(() => {
    if (!profile?.id) return;
    const userRef = doc(db, 'users', profile.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) setStudentData(docSnap.data());
    });
    return () => unsubscribe();
  }, [profile?.id]);

  useEffect(() => {
    const fetchClassTarget = async () => {
      if (!profile?.groepen || profile.groepen.length === 0) return;
      const classRef = doc(db, 'groepen', profile.groepen[0]); // Neem de eerste groep
      const classSnap = await getDoc(classRef);
      if (classSnap.exists() && classSnap.data().doel_sparks_current_period) {
        setClassTarget(classSnap.data().doel_sparks_current_period);
      }
    };
    fetchClassTarget();
  }, [profile?.groepen]);

  if (profile?.rol !== 'leerling') {
    return <div>Rewards zijn alleen voor leerlingen.</div>;
  }

  const currentSparks = Math.floor((studentData.xp_current_period || 0) / 100);
  const targetSparks = classTarget.doel_sparks || 200;
  const progressPercentage = Math.min((currentSparks / targetSparks) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Jouw Voortgang</h1>
        <p className="text-gray-600">Volg je prestaties en zie hoe je groeit.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Periode Score Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-500">
          <h3 className="text-lg font-semibold mb-2 text-purple-700">Jouw Inzet deze Periode</h3>
          <p className="text-sm text-gray-500 mb-4">Dit is de score die telt voor je rapport. Blijf consistent werken!</p>
          <div className="text-center mb-4">
            <span className="text-5xl font-bold text-purple-600">{currentSparks}</span>
            <span className="text-xl text-gray-500"> / {targetSparks} Sparks</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-purple-400 to-purple-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">{classTarget.period_name}</p>
        </div>

        {/* Lifetime Stats Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border">
  <h3 className="text-lg font-semibold mb-4 text-gray-700">Jouw Statistieken</h3>
  <p className="text-sm text-gray-500 mb-4">Volg je prestaties van dit schooljaar en je hele carrière.</p>
  
  {/* OPTIMALISATIE: 2x2 grid voor betere weergave */}
  <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-center">
    
    {/* NIEUW: Jaarscore */}
    <div>
      <Zap className="w-8 h-8 mx-auto text-orange-500 mb-2" />
      <p className="text-2xl font-bold">{studentData.xp_current_school_year || 0}</p>
      <p className="text-xs text-gray-500">XP dit Schooljaar</p>
    </div>

    <div>
      <Star className="w-8 h-8 mx-auto text-blue-500 mb-2" />
      <p className="text-2xl font-bold">{studentData.xp || 0}</p>
      <p className="text-xs text-gray-500">Carrièrescore (XP)</p>
    </div>
    
    <div>
      <TrendingUp className="w-8 h-8 mx-auto text-green-500 mb-2" />
      <p className="text-2xl font-bold">{studentData.streak_days || 0}</p>
      <p className="text-xs text-gray-500">Dagen Streak</p>
    </div>
    
    <div>
      <Trophy className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
      <p className="text-2xl font-bold">{studentData.personal_records_count || 0}</p>
      <p className="text-xs text-gray-500">PR's Verbroken</p>
    </div>
    
  </div>
</div>
      </div>

      {/* Uitleg Sectie */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6 border">
        <h3 className="text-lg font-semibold mb-2">Hoe Werkt Het?</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>- Je **Periodescore** in Sparks meet je inzet voor je rapport en reset elke periode.</li>
          <li>- Je **Carrièrescore** in XP is je levenslange erelijst en telt al je inspanningen en prestaties op.</li>
          <li>- Records verbreken geeft een grote bonus aan je **Carrièrescore**, maar niet aan je Periodescore.</li>
        </ul>
      </div>
    </div>
  );
};

export default Rewards;