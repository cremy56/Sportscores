// src/components/sportbuddy/Kamers.jsx
// De vier kamers rond de buddy. Tik een kamer open → de modules van die kamer
// als kaartjes met voortgangsring. Tik een beschikbare module → KennisModule.
// Zo voelt het als "rondkijken in de kamers van je buddy", geen los leerplatform.

import { useState } from 'react';
import { KAMERS, MODULES, modulesVanKamer } from '../../data/sportbuddy/kennis';
import KennisModule from './KennisModule';

function Ring({ percent }) {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10 shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="#7c3aed" strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)}
        strokeLinecap="round" transform="rotate(-90 20 20)" />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="#7c3aed">
        {percent}%
      </text>
    </svg>
  );
}

function moduleVoortgang(module, kennis) {
  const k = kennis?.[module.id];
  if (!module.beschikbaar) return 0;
  if (k?.afgerond) return 100;
  if (k?.beste) return Math.round((k.beste / (module.quiz.length || 1)) * 100);
  return 0;
}

export default function Kamers({ buddy, profile, onKennisAfgerond }) {
  const [openKamer, setOpenKamer] = useState(null);
  const [actieveModule, setActieveModule] = useState(null);
  const kennis = buddy.kennis || {};

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="font-bold text-gray-800 mb-1">De kamers van je buddy</h3>
      <p className="text-xs text-gray-500 mb-4">Ontdek, leer en verdien XP. Elke kamer bundelt een stuk van de leerstof.</p>

      <div className="grid grid-cols-2 gap-3">
        {KAMERS.map((kamer) => {
          const modules = modulesVanKamer(kamer.id);
          const beschikbaar = modules.filter((m) => m.beschikbaar).length;
          const afgerond = modules.filter((m) => kennis[m.id]?.afgerond).length;
          return (
            <button
              key={kamer.id}
              type="button"
              onClick={() => setOpenKamer(openKamer === kamer.id ? null : kamer.id)}
              className={`text-left rounded-2xl p-4 bg-gradient-to-br ${kamer.kleur} text-white transition-all hover:shadow-lg ${openKamer === kamer.id ? 'ring-2 ring-offset-2 ring-purple-400' : ''}`}
            >
              <div className="text-3xl mb-1">{kamer.emoji}</div>
              <div className="font-bold">{kamer.naam}</div>
              <div className="text-xs opacity-90 mt-0.5">{afgerond}/{beschikbaar || modules.length} afgerond</div>
            </button>
          );
        })}
      </div>

      {openKamer && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500 mb-3">{KAMERS.find((k) => k.id === openKamer)?.omschrijving}</p>
          <div className="space-y-2">
            {modulesVanKamer(openKamer).map((module) => {
              const percent = moduleVoortgang(module, kennis);
              return (
                <button
                  key={module.id}
                  type="button"
                  disabled={!module.beschikbaar}
                  onClick={() => setActieveModule(module)}
                  className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                    module.beschikbaar ? 'border-gray-200 hover:border-purple-400' : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl shrink-0">{module.emoji}</span>
                  <div className="flex-grow min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{module.naam}</div>
                    <div className="text-xs text-gray-400">
                      {module.beschikbaar ? `Leerplandoel ${module.eindterm}` : 'Binnenkort beschikbaar'}
                    </div>
                  </div>
                  {module.beschikbaar && <Ring percent={percent} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {actieveModule && (
        <KennisModule
          module={actieveModule}
          profile={profile}
          onAfgerond={(result) => onKennisAfgerond(actieveModule.id, result)}
          onClose={() => setActieveModule(null)}
        />
      )}
    </div>
  );
}
