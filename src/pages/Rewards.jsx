import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trophy, Star, TrendingUp, Zap } from 'lucide-react';

const XP = {
  WELZIJN_SEGMENT: 4,
  KOMPAS_VOLLEDIG: 100,
  PERFECT_WEEK_WELZIJN: 500,
  PERFECT_WEEK_TRAINING: 300,
  WEEKLY_TRAINING_BONUS: 150,
  TRAINING_PROGRAMMA: 800,
  STREAK_7: 300,
  STREAK_30: 1200,
  STREAK_100: 4000,
  KLAS_CHALLENGE: 500,
  EHBO: [30, 10, 5, 1],
  LEADERBOARD: [1000, 750, 500, 250, 100],
  PR: 500,
  SPORTTEST: 50,
  SPORTLAB_DEELNAME: 10,
  SPORTLAB_REFLECTIE: 20,
  SPORTLAB_OEFENINGEN: 25,
  SPORTLAB_LEVEL_UP: 100,
};

const Rewards = () => {
  const { profile } = useOutletContext();
  const [classTarget, setClassTarget] = useState({ doel_xp: 20000, period_name: 'Huidige Periode' });
  const [activeTab, setActiveTab] = useState('overzicht');

  useEffect(() => {
    if (!profile?.school_id || !profile?._token || !profile?.groepen?.length) return;
    const fetchClassTarget = async () => {
      try {
        const response = await fetch('/api/tests', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${profile._token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_groep_detail', schoolId: profile.school_id, groepId: profile.groepen[0] })
        });
        const data = await response.json();
        if (data.groep?.doel_xp_current_period) setClassTarget(data.groep.doel_xp_current_period);
      } catch (error) {
        console.error('Fout bij laden klassendoel:', error);
      }
    };
    fetchClassTarget();
  }, [profile?.groepen, profile?._token]);

  if (profile?.rol !== 'leerling') {
    return <div className="p-8 text-gray-500">Rewards zijn alleen voor leerlingen.</div>;
  }

  const einddatum = profile?.vrijstelling_einddatum ? new Date(profile.vrijstelling_einddatum) : null;
  const isVrijgesteld = profile?.vrijgesteld_van_testen === true && einddatum && einddatum > new Date();

  const OverviewTab = () => {
    const currentPeriodXP = profile?.xp_current_period || 0;
    const targetXP = classTarget.doel_xp || 20000;
    const progressPercentage = Math.min((currentPeriodXP / targetXP) * 100, 100);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-500">
            <h3 className="text-lg font-semibold mb-2 text-purple-700">Jouw Inzet deze Periode</h3>
            <p className="text-sm text-gray-500 mb-4">Dit is de score die telt voor je rapport. Blijf consistent werken!</p>
            <div className="text-center mb-4">
              <span className="text-5xl font-bold text-purple-600">{currentPeriodXP.toLocaleString('nl-BE')}</span>
              <span className="text-xl text-gray-500"> / {targetXP.toLocaleString('nl-BE')} XP</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-4 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
            </div>
            <div className="text-center mt-3"><p className="text-xs text-gray-500">{classTarget.period_name}</p></div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Jouw Statistieken</h3>
            <p className="text-sm text-gray-500 mb-4">Volg je prestaties van dit schooljaar en je hele carrière.</p>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-center">
              <div><Zap className="w-8 h-8 mx-auto text-orange-500 mb-2" /><p className="text-2xl font-bold">{(profile?.xp_current_school_year || 0).toLocaleString('nl-BE')}</p><p className="text-xs text-gray-500">XP dit Schooljaar</p></div>
              <div><Star className="w-8 h-8 mx-auto text-blue-500 mb-2" /><p className="text-2xl font-bold">{(profile?.xp || 0).toLocaleString('nl-BE')}</p><p className="text-xs text-gray-500">Carrièrescore (XP)</p></div>
              <div><TrendingUp className="w-8 h-8 mx-auto text-green-500 mb-2" /><p className="text-2xl font-bold">{profile?.streak_days || 0}</p><p className="text-xs text-gray-500">Dagen Streak</p></div>
              <div><Trophy className="w-8 h-8 mx-auto text-yellow-500 mb-2" /><p className="text-2xl font-bold">{profile?.personal_records_count || 0}</p><p className="text-xs text-gray-500">PR's Verbroken</p></div>
            </div>
          </div>
        </div>
        {isVrijgesteld && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🩺</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Je bent vrijgesteld van sporttesten</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Je XP-score wordt niet extra bestraft. Via het Sport Lab kan je punten blijven verdienen.
                {einddatum && <span className="ml-1">Vrijstelling geldig tot {einddatum.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}.</span>}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const EarningsTab = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 border">
      <h3 className="text-lg font-semibold mb-4">Hoe Verdien Ik Punten?</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Kolom 1 */}
        <div>
          <h4 className="font-bold text-emerald-700 mb-3 border-b-2 border-emerald-200 pb-2">Inzet & Attitude</h4>
          <p className="text-xs text-gray-500 mb-4">Deze acties verhogen je Periodescore, Jaarscore en Carrièrescore.</p>
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Welzijn Kompas</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>Per segment ingevuld: <span className="font-bold">+{XP.WELZIJN_SEGMENT} XP</span></li>
                <li>Kompas volledig (alle 5): <span className="font-bold">+{XP.KOMPAS_VOLLEDIG} XP</span> <span className="text-xs text-gray-400">incl. bonus</span></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Trainingen</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>Training gelogd: <span className="font-bold">XP via schema</span></li>
                <li>Trainingsprogramma voltooid (90%): <span className="font-bold">+{XP.TRAINING_PROGRAMMA} XP</span></li>
                <li>3+ trainingen in de week: <span className="font-bold">+{XP.WEEKLY_TRAINING_BONUS} XP</span></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Streaks</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>7 Dagen: <span className="font-bold">+{XP.STREAK_7} XP</span></li>
                <li>30 Dagen: <span className="font-bold">+{XP.STREAK_30} XP</span></li>
                <li>100 Dagen: <span className="font-bold">+{XP.STREAK_100} XP</span></li>
              </ul>
              <p className="text-xs text-gray-400 mt-1">Streak telt als je elke dag welzijn invult of een training logt.</p>
            </div>
            <div>
              <p className="font-semibold">Perfect Week</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>5× kompas + 2× training: <span className="font-bold">+{XP.PERFECT_WEEK_WELZIJN} XP</span></li>
                <li>3× training (zonder welzijn): <span className="font-bold">+{XP.PERFECT_WEEK_TRAINING} XP</span></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">EHBO</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>1e keer: <span className="font-bold">+{XP.EHBO[0]} XP</span></li>
                <li>2e keer: <span className="font-bold">+{XP.EHBO[1]} XP</span></li>
                <li>3e keer: <span className="font-bold">+{XP.EHBO[2]} XP</span></li>
                <li>4e+: <span className="font-bold">+{XP.EHBO[3]} XP</span></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Deelname Sporttest</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-bold">+{XP.SPORTTEST} XP</span> per officiële sporttest.</p>
            </div>
            <div>
              <p className="font-semibold">Sport Lab</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                <li>Rol kiezen & joinen: <span className="font-bold">+{XP.SPORTLAB_DEELNAME} XP</span></li>
                <li>Zelfreflectie invullen: <span className="font-bold">+{XP.SPORTLAB_REFLECTIE} XP</span></li>
                <li>Oefeningen afgevinkt: <span className="font-bold">+{XP.SPORTLAB_OEFENINGEN} XP</span></li>
                <li>Level-up (leerkracht goedkeuring): <span className="font-bold">+{XP.SPORTLAB_LEVEL_UP} XP</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Kolom 2 */}
        <div>
          <h4 className="font-bold text-blue-700 mb-3 border-b-2 border-blue-200 pb-2">Sportprestaties & Teamwork</h4>
          <p className="text-xs text-gray-500 mb-4">Tellen mee voor Jaarscore en Carrièrescore, niet voor Periodescore.</p>
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Top 5 Records</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                {XP.LEADERBOARD.map((xp, i) => (
                  <li key={i}>{i + 1}e Plaats: <span className="font-bold">+{xp} XP</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Persoonlijk Record Verbreken</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-bold">+{XP.PR} XP</span> bij elke PR.</p>
            </div>
            <div className="mt-6">
              <h4 className="font-bold text-green-700 mb-3 border-b-2 border-green-200 pb-2">Teamwork</h4>
              <p className="text-xs text-gray-500 mb-3">Telt mee voor alle scores (Periode, Jaar en Carrière).</p>
              <p className="font-semibold">Klas Challenge</p>
              <p className="text-sm text-gray-600 mt-1">Teambonus van <span className="font-bold">+{XP.KLAS_CHALLENGE} XP</span> bij behalen.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Jouw Voortgang</h1>
          <p className="text-gray-600">Volg je prestaties en zie hoe je groeit.</p>
        </div>
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          {[
            { id: 'overzicht', label: 'Overzicht' },
            { id: 'verdienen', label: 'Hoe Verdien Ik Punten?' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm ${activeTab === tab.id ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'overzicht' && <OverviewTab />}
        {activeTab === 'verdienen' && <EarningsTab />}
      </div>
    </div>
  );
};

export default Rewards;