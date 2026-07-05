// src/components/sportbuddy/KennisModule.jsx
// Kennisflow van één module: intro → uitlegkaartjes (next) → mini-quiz → uitslag.
// De correcte antwoorden komen pas ná inzending terug van de server (geen
// spieken). XP: 15/quiz (cap 3/dag) + 50 bij eerste afronding — server-side.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { sportbuddyApi } from '../../data/sportbuddy/api';

export default function KennisModule({ module, profile, onAfgerond, onClose }) {
  const [fase, setFase] = useState('intro'); // intro | kaart | quiz | uitslag
  const [kaartIndex, setKaartIndex] = useState(0);
  const [antwoorden, setAntwoorden] = useState(Array(module.quiz.length).fill(null));
  const [vraagIndex, setVraagIndex] = useState(0);
  const [uitslag, setUitslag] = useState(null);
  const [bezig, setBezig] = useState(false);

  const kies = (optieIndex) => {
    const nieuw = [...antwoorden];
    nieuw[vraagIndex] = optieIndex;
    setAntwoorden(nieuw);
  };

  const verstuur = async () => {
    setBezig(true);
    try {
      const result = await sportbuddyApi({ action: 'complete_kennis', module_id: module.id, antwoorden });
      setUitslag(result);
      setFase('uitslag');
      if (result.beloning.xp > 0) toast.success(`+${result.beloning.xp} XP!`);
      else if (result.dagcap_bereikt) toast('Dagcap XP bereikt — je voortgang telt wel mee!', { icon: 'ℹ️' });
      onAfgerond(result);
    } catch (error) {
      console.error('complete_kennis mislukt:', error.message);
      toast.error(error.message);
    } finally {
      setBezig(false);
    }
  };

  const kaart = module.kaarten[kaartIndex];
  const vraag = module.quiz[vraagIndex];
  const alleBeantwoord = antwoorden.every((a) => a !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[88vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{module.emoji} {module.naam}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* INTRO */}
        {fase === 'intro' && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">{module.emoji}</div>
            <p className="text-gray-600 mb-2">{module.intro}</p>
            <p className="text-xs text-gray-400 mb-6">{module.kaarten.length} kaartjes · quiz van {module.quiz.length} vragen · leerplandoel {module.eindterm}</p>
            <button type="button" onClick={() => setFase('kaart')} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-bold">Start</button>
          </div>
        )}

        {/* KENNISKAARTEN */}
        {fase === 'kaart' && (
          <div>
            <div className="flex gap-1 mb-4">
              {module.kaarten.map((_, i) => (
                <div key={i} className={`h-1.5 flex-grow rounded-full ${i <= kaartIndex ? 'bg-purple-500' : 'bg-gray-200'}`} />
              ))}
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 min-h-40">
              <h4 className="font-bold text-purple-800 mb-2">{kaart.titel}</h4>
              <p className="text-sm text-gray-700">{kaart.tekst}</p>
              {kaart.bron && <p className="text-xs text-gray-400 mt-3">Bron: {kaart.bron}</p>}
            </div>
            <div className="flex justify-between mt-5">
              <button type="button" onClick={() => kaartIndex > 0 ? setKaartIndex(kaartIndex - 1) : setFase('intro')} className="text-gray-500 font-semibold px-4 py-2">Terug</button>
              {kaartIndex < module.kaarten.length - 1 ? (
                <button type="button" onClick={() => setKaartIndex(kaartIndex + 1)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Volgende</button>
              ) : (
                <button type="button" onClick={() => setFase('quiz')} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Naar de quiz</button>
              )}
            </div>
          </div>
        )}

        {/* QUIZ */}
        {fase === 'quiz' && (
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Vraag {vraagIndex + 1} van {module.quiz.length}</p>
            <p className="font-semibold text-gray-800 mb-4">{vraag.vraag}</p>
            <div className="space-y-2">
              {vraag.opties.map((optie, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => kies(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    antwoorden[vraagIndex] === i ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-700 hover:border-purple-300'
                  }`}
                >
                  {optie}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-5">
              <button type="button" onClick={() => vraagIndex > 0 ? setVraagIndex(vraagIndex - 1) : setFase('kaart')} className="text-gray-500 font-semibold px-4 py-2">Terug</button>
              {vraagIndex < module.quiz.length - 1 ? (
                <button type="button" disabled={antwoorden[vraagIndex] === null} onClick={() => setVraagIndex(vraagIndex + 1)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold disabled:opacity-40">Volgende</button>
              ) : (
                <button type="button" disabled={!alleBeantwoord || bezig} onClick={verstuur} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold disabled:opacity-40">{bezig ? 'Bezig...' : 'Verzend'}</button>
              )}
            </div>
          </div>
        )}

        {/* UITSLAG */}
        {fase === 'uitslag' && uitslag && (
          <div className="text-center py-4">
            <div className="text-5xl mb-3">{uitslag.uitslag.geslaagd ? '🎉' : '💪'}</div>
            <p className="text-lg font-bold text-gray-800 mb-1">{uitslag.uitslag.correct} / {uitslag.uitslag.totaal} juist</p>
            <p className="text-sm text-gray-500 mb-4">
              {uitslag.uitslag.geslaagd ? 'Geslaagd! Je buddy is trots op je.' : 'Bijna! Bekijk de kaartjes nog eens en probeer opnieuw.'}
            </p>
            {uitslag.beloning.xp > 0 && <p className="text-sm font-semibold text-purple-600 mb-4">+{uitslag.beloning.xp} XP verdiend</p>}
            <div className="space-y-2 text-left mb-5">
              {module.quiz.map((v, i) => {
                const goed = antwoorden[i] === uitslag.uitslag.juist[i];
                return (
                  <div key={i} className={`text-sm rounded-lg px-3 py-2 ${goed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {goed ? '✅' : '❌'} {v.vraag}
                    {!goed && <span className="block text-xs mt-0.5">Juist: {v.opties[uitslag.uitslag.juist[i]]}</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-3">
              {!uitslag.uitslag.geslaagd && (
                <button type="button" onClick={() => { setFase('kaart'); setKaartIndex(0); setVraagIndex(0); setAntwoorden(Array(module.quiz.length).fill(null)); setUitslag(null); }} className="text-purple-600 font-semibold px-4 py-2">Opnieuw</button>
              )}
              <button type="button" onClick={onClose} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold">Klaar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
