import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

// Voorbeelddata, later kan dit uit Firebase komen
const activityHistory = [
  { id: 1, type: 'Wandelen', value: '5.2 km', date: 'Vandaag', icon: '🚶' },
  { id: 2, type: 'Fietsen', value: '10 km', date: 'Gisteren', icon: '🚴' },
  { id: 3, type: 'Krachttraining', value: '45 min', date: '2 dagen geleden', icon: '🏋️' },
];

const BewegingDetail = () => {
  const [dailyGoal, setDailyGoal] = useState(10000);
  const [currentSteps, setCurrentSteps] = useState(8500);

  const progress = Math.min((currentSteps / dailyGoal) * 100, 100);

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
            <h2 className="text-xl font-bold text-slate-800 mb-4">Dagelijks Doel</h2>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-600">Stappen</span>
              <span className="font-bold text-purple-600">{currentSteps.toLocaleString()} / {dailyGoal.toLocaleString()}</span>
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
            <ul className="space-y-4">
              {activityHistory.map(activity => (
                <li key={activity.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{activity.icon}</span>
                    <div>
                      <p className="font-semibold text-slate-800">{activity.type}</p>
                      <p className="text-sm text-slate-500">{activity.value}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-400">{activity.date}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rechter kolom */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 h-fit">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Activiteit Loggen</h2>
          <form className="space-y-4">
            <div>
              <label htmlFor="activityType" className="block text-sm font-medium text-slate-700 mb-1">Type activiteit</label>
              <select id="activityType" className="w-full p-2 border border-slate-300 rounded-md focus:ring-purple-500 focus:border-purple-500">
                <option>Wandelen</option>
                <option>Fietsen</option>
                <option>Hardlopen</option>
                <option>Zwemmen</option>
                <option>Krachttraining</option>
              </select>
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1">Duur (minuten)</label>
              <input type="number" id="duration" className="w-full p-2 border border-slate-300 rounded-md" placeholder="bv. 30" />
            </div>
            <div>
              <label htmlFor="distance" className="block text-sm font-medium text-slate-700 mb-1">Afstand (km, optioneel)</label>
              <input type="number" id="distance" className="w-full p-2 border border-slate-300 rounded-md" placeholder="bv. 5" />
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
