import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Star, TrendingUp, Zap, HelpCircle, ListChecks } from 'lucide-react';

const Rewards = () => {
  const { profile } = useOutletContext();
  const [studentData, setStudentData] = useState({ xp: 0, xp_current_period: 0, xp_current_school_year: 0, streak_days: 0, personal_records_count: 0 });
const [classTarget, setClassTarget] = useState({ doel_xp: 20000, period_name: "Huidige Periode" });
  const [activeTab, setActiveTab] = useState('overzicht');

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
      const classRef = doc(db, 'groepen', profile.groepen[0]);
      const classSnap = await getDoc(classRef);
      // OPMERKING: Zorg ervoor dat de leerkracht-tool 'doel_xp' opslaat ipv 'doel_sparks'
     if (classSnap.exists() && classSnap.data().doel_xp_current_period) { // Was doel_sparks...
      setClassTarget(classSnap.data().doel_xp_current_period);
      }
    };
    fetchClassTarget();
  }, [profile?.groepen]);

  if (profile?.rol !== 'leerling') {
    return <div>Rewards zijn alleen voor leerlingen.</div>;
  }

  const OverviewTab = () => {
   const currentPeriodXP = studentData.xp_current_period || 0;
  const targetXP = classTarget.doel_xp || 20000; // Was targetSparks
  const progressPercentage = Math.min((currentPeriodXP / targetXP) * 100, 100);


    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Period Score Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-500">
          <h3 className="text-lg font-semibold mb-2 text-purple-700">Jouw Inzet deze Periode</h3>
          <p className="text-sm text-gray-500 mb-4">Dit is de score die telt voor je rapport. Blijf consistent werken!</p>
          <div className="text-center mb-4">
           <span className="text-5xl font-bold text-purple-600">{currentPeriodXP.toLocaleString('nl-BE')}</span>
      <span className="text-xl text-gray-500"> / {targetXP.toLocaleString('nl-BE')} XP</span>

          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-purple-400 to-purple-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-center mt-3">
            <p className="text-xs text-gray-500">{classTarget.period_name}</p>
            <p className="font-bold text-purple-600 text-lg mt-1">{currentSparks} Sparks Verdiend</p>
          </div>
        </div>

        {/* Lifetime Stats Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Jouw Statistieken</h3>
          <p className="text-sm text-gray-500 mb-4">Volg je prestaties van dit schooljaar en je hele carrière.</p>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-center">
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
    );
  };

 const EarningsTab = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 border">
      <h3 className="text-lg font-semibold mb-4">Hoe Verdien Ik Punten?</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Kolom 1: Inzet & Attitude */}
        <div>
          <h4 className="font-bold text-emerald-700 mb-3 border-b-2 border-emerald-200 pb-2">Inzet & Attitude</h4>
          <p className="text-xs text-gray-500 mb-4">Deze acties verhogen je Periodescore, Jaarscore en Carrièrescore.</p>
          
          <div className="space-y-4">
            <div>
              <p className="font-semibold">EHBO Scenario's</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>1e keer voltooid: <span className="font-bold">+30 XP</span></li>
                <li>2e keer voltooid: <span className="font-bold">+10 XP</span></li>
                <li>3e keer voltooid: <span className="font-bold">+5 XP</span></li>
                <li>4e+ keer voltooid: <span className="font-bold">+1 XP</span></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold">Consistentie Bonussen (Streaks)</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>7 Dagen Streak: <span className="font-bold">+300 XP</span></li>
                <li>30 Dagen Streak: <span className="font-bold">+1200 XP</span></li>
                <li>100 Dagen Streak: <span className="font-bold">+4000 XP</span></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold">Wekelijkse "Perfect Week"</p>
              <p className="text-sm text-gray-600 mt-1">
                Verdien <span className="font-bold">+500 XP</span> door in één week minstens 5x je Kompas te voltooien én 2 trainingen te loggen.
              </p>
            </div>
            
            <div>
              <p className="font-semibold">Dagelijkse Inzet</p>
               <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>Welzijn Kompas Voltooid: <span className="font-bold">+100 XP</span></li>
                <li>Training Loggen: <span className="font-bold">+25 XP</span></li>
                <li>Deelname Sporttest: <span className="font-bold">+50 XP</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Kolom 2: Sportprestaties & Teamwork */}
        <div>
          <h4 className="font-bold text-blue-700 mb-3 border-b-2 border-blue-200 pb-2">Sportprestaties & Teamwork</h4>
          <p className="text-xs text-gray-500 mb-4">Deze bonussen tellen mee voor je Jaarscore en Carrièrescore, maar niet voor je Periodescore.</p>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">School- & Leeftijdsrecords (Top 5)</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>1e Plaats: <span className="font-bold">+1000 XP</span></li>
                <li>2e Plaats: <span className="font-bold">+750 XP</span></li>
                <li>3e Plaats: <span className="font-bold">+500 XP</span></li>
                <li>4e Plaats: <span className="font-bold">+250 XP</span></li>
                <li>5e Plaats: <span className="font-bold">+100 XP</span></li>
              </ul>
            </div>
            
            <div>
              <p className="font-semibold">Persoonlijk Record (PR) Verbreken</p>
              <p className="text-sm text-gray-600 mt-1">
                Verdien een bonus van <span className="font-bold">+500 XP</span> elke keer dat je je eigen beste score op een test verbetert.
              </p>
            </div>

            <div className="mt-6">
              <h4 className="font-bold text-green-700 mb-3 border-b-2 border-green-200 pb-2">Teamwork</h4>
              <p className="text-xs text-gray-500 mb-3">Deze bonus telt mee voor alle scores (Periode, Jaar en Carrière).</p>
               <p className="font-semibold">Klas Challenge Behalen</p>
              <p className="text-sm text-gray-600 mt-1">
                Werk samen met je klas om wekelijkse doelen te behalen en verdien een teambonus van <span className="font-bold">+500 tot +1000 XP</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    // OPTIMALISATIE: Layout wrapper toegevoegd voor consistentie met de rest van de app
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Jouw Voortgang</h1>
          <p className="text-gray-600">Volg je prestaties en zie hoe je groeit.</p>
        </div>

        {/* OPTIMALISATIE: Tabs toegevoegd voor betere navigatie */}
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <button onClick={() => setActiveTab('overzicht')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'overzicht' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}>Overzicht</button>
          <button onClick={() => setActiveTab('verdienen')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'verdienen' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}>Hoe Verdien Ik Punten?</button>
        </div>

        {/* Conditionele weergave van de tab-inhoud */}
        {activeTab === 'overzicht' && <OverviewTab />}
        {activeTab === 'verdienen' && <EarningsTab />}
      </div>
    </div>
  );
};

export default Rewards;