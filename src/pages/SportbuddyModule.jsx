// src/pages/SportbuddyModule.jsx
// Modulepagina op eigen route: /sportbuddy/module/:moduleId
// Bevat de interactieve tool (indien aanwezig) + de kennisflow met quiz (XP).
// Veilig: onbekende of niet-beschikbare module → terug naar /sportbuddy.
// Datavrij: alle interactie gaat over de buddy/oefeningen, nooit over de leerling.

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import KennisModule from '../components/sportbuddy/KennisModule';
import ModuleTool from '../components/sportbuddy/ModuleTool';
import { getModule, MODULES_MET_TOOL } from '../data/sportbuddy/kennis';
import { sportbuddyApi } from '../data/sportbuddy/api';

export default function SportbuddyModule() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { profile } = useOutletContext();

  const module = getModule(moduleId);
  const [kennisOpen, setKennisOpen] = useState(false);
  const [voortgang, setVoortgang] = useState(null);
  const [graad, setGraad] = useState(2);
  const [laden, setLaden] = useState(true);

  // Voortgang van deze module ophalen (via get_buddy)
  const haalVoortgang = useCallback(async () => {
    if (!module) { setLaden(false); return; }
    try {
      const result = await sportbuddyApi({ action: 'get_buddy' });
      if (result.buddy) {
        setVoortgang(result.buddy.kennis?.[moduleId] || null);
        if (result.buddy.weergave?.graad) setGraad(result.buddy.weergave.graad);
      }
    } catch (error) {
      console.error('get_buddy (module) mislukt:', error.message);
    } finally {
      setLaden(false);
    }
  }, [module, moduleId]);

  useEffect(() => { haalVoortgang(); }, [haalVoortgang]);

  // Bij navigatie naar een module altijd bovenaan de pagina starten
  // (React Router behoudt standaard de scrollpositie van de vorige pagina)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [moduleId]);

  // Onbekende of niet-beschikbare module → veilig terug
  useEffect(() => {
    if (!module || !module.beschikbaar) {
      navigate('/sportbuddy', { replace: true });
    } else if ((module.minGraad || 1) > graad) {
      // Module niet bestemd voor deze graad → veilig terug
      navigate('/sportbuddy', { replace: true });
    }
  }, [module, graad, navigate]);

  if (!module || !module.beschikbaar) return null;
  if ((module.minGraad || 1) > graad) return null;

  const heeftTool = MODULES_MET_TOOL.includes(moduleId);
  const afgerond = voortgang?.afgerond;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/sportbuddy')}
        className="text-sm font-semibold text-purple-600 mb-4 hover:text-purple-800"
      >
        ← Terug naar je buddy
      </button>

      <PageHeader
        title={`${module.emoji} ${module.naam}`}
        subtitle={`${module.intro} · Leerplandoel ${module.eindterm}`}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Interactieve tool */}
        {heeftTool && <ModuleTool moduleId={moduleId} graad={graad} />}

        {/* Kennis + quiz */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800">Kennis & quiz</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {laden ? 'Voortgang laden…'
                  : afgerond ? '✅ Module afgerond — je kunt de quiz herhalen.'
                  : 'Doorloop de kaartjes en test je kennis. Geslaagd = XP.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setKennisOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shrink-0"
            >
              {afgerond ? 'Opnieuw' : 'Start'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          🔒 Alle oefeningen gaan over je buddy of over voorbeelden — nooit over jouw eigen gezondheid.
        </p>
      </div>

      {kennisOpen && (
        <KennisModule
          module={module}
          profile={profile}
          graad={graad}
          onAfgerond={(result) => setVoortgang(result.kennis)}
          onClose={() => setKennisOpen(false)}
        />
      )}
    </div>
  );
}
