// src/components/sportbuddy/ModuleTiles.jsx
// Grid van module-tiles onder de buddy. Elke beschikbare tile linkt naar de
// eigen modulepagina (/sportbuddy/module/:id) met voortgangsring.
// Vervangt de kamer-indeling: platte tiles, één tik = één module.

import { useNavigate } from 'react-router-dom';
import { MODULES, modulesVoorGraad } from '../../data/sportbuddy/kennis';

function Ring({ percent }) {
  const r = 15, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="w-9 h-9 shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
      <circle cx="18" cy="18" r={r} fill="none" stroke="#7c3aed" strokeWidth="3.5"
        strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)}
        strokeLinecap="round" transform="rotate(-90 18 18)" />
      <text x="18" y="19" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill="#7c3aed">{percent}</text>
    </svg>
  );
}

function voortgang(module, kennis) {
  const k = kennis?.[module.id];
  if (!module.beschikbaar) return 0;
  if (k?.afgerond) return 100;
  if (k?.beste) return Math.round((k.beste / (module.quiz.length || 1)) * 100);
  return 0;
}

export default function ModuleTiles({ buddy }) {
  const graad = buddy.weergave?.graad ?? 2;
  const navigate = useNavigate();
  const kennis = buddy.kennis || {};

  return (
    <div>
      <h3 className="font-bold text-gray-800 mb-1">Ontdek & leer</h3>
      <p className="text-xs text-gray-500 mb-4">Elke module heeft interactieve oefeningen en een quiz. Geslaagd = XP.</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {modulesVoorGraad(MODULES, graad).map((module) => {
          const percent = voortgang(module, kennis);
          const klikbaar = module.beschikbaar;
          return (
            <button
              key={module.id}
              type="button"
              disabled={!klikbaar}
              onClick={() => navigate(`/sportbuddy/module/${module.id}`)}
              className={`relative text-left rounded-2xl border-2 p-4 transition-all ${
                klikbaar ? 'border-gray-200 bg-white hover:border-purple-400 hover:shadow-lg' : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{module.emoji}</span>
                {klikbaar && <Ring percent={percent} />}
              </div>
              <div className="font-bold text-gray-800 mt-2">{module.naam}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {klikbaar ? `Leerplandoel ${module.eindterm}` : 'Binnenkort'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
