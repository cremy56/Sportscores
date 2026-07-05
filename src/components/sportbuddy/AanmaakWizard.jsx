// src/components/sportbuddy/AanmaakWizard.jsx
// Aanmaakflow Sportbuddy: uiterlijk kiezen → bevestigen.
// Fase 1: de sport ligt vast (voetbal) — sportkeuze komt als latere uitbreiding.
// Alle input is een GESLOTEN keuze (indices) — geen vrije tekst (GDD §8).
// De buddy draagt de nickname van de leerling (bestaat al in het profiel;
// we slaan géén naam op in het buddy-document).

import { useState } from 'react';
import toast from 'react-hot-toast';
import { sportbuddyApi } from '../../data/sportbuddy/api';
import BuddyAvatar, { HUID_TINTEN, HAAR_KLEUREN, HAAR_STIJLEN, GEZICHTEN, LICHAMEN } from './BuddyAvatar';
import { graadVanKlas, weergaveGeslacht } from '../../data/sportbuddy/sporten';

const LICHAAM_LABELS = { m: 'Jongen', v: 'Meisje', neutraal: 'Neutraal' };

function KeuzeRij({ label, aantal, waarde, onKies, renderOptie }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-gray-600 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: aantal }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onKies(i)}
            className={`rounded-xl border-2 p-1 transition-all ${
              waarde === i ? 'border-purple-600 scale-105' : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            {renderOptie(i)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AanmaakWizard({ profile, onAangemaakt }) {
  const [gezicht, setGezicht] = useState(0);
  const [huid, setHuid] = useState(0);
  const [haar, setHaar] = useState(0);
  const [haarkleur, setHaarkleur] = useState(0);
  const [lichaam, setLichaam] = useState('neutraal');
  const [bezig, setBezig] = useState(false);

  const naam = profile?.nickname || 'Jouw buddy';
  // Graad + geslacht komen uit het profiel (avatar groeit mee met de leerling).
  // Alleen bij geslacht 'X'/onbekend kiest de leerling zelf een lichaam.
  const graad = graadVanKlas(profile?.klas);
  const profielGeslacht = weergaveGeslacht(profile?.geslacht);
  const toonLichaamKeuze = !profielGeslacht;
  const previewLichaam = profielGeslacht || lichaam;

  const handleAanmaken = async () => {
    setBezig(true);
    try {
      const avatar = { gezicht, huid, haar, haarkleur };
      if (toonLichaamKeuze) avatar.lichaam = lichaam;
      const result = await sportbuddyApi({ action: 'create_buddy', avatar });
      toast.success(`${naam} staat klaar!`);
      onAangemaakt(result.buddy);
    } catch (error) {
      console.error('create_buddy mislukt:', error.message);
      toast.error(error.message);
    } finally {
      setBezig(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Stel je buddy samen</h2>
      <p className="text-sm text-gray-500 mb-6">
        Puur cosmetisch — elke buddy start met exact hetzelfde lichaam. Wat hij wordt, bepaal jij met training, voeding en rust.
      </p>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-48 mx-auto md:mx-0 flex-shrink-0">
          <BuddyAvatar gezicht={gezicht} huid={huid} haar={haar} haarkleur={haarkleur} graad={graad} lichaam={previewLichaam} className="w-full" />
          <div className="text-center text-lg font-bold text-purple-700 mt-2">{naam}</div>
          <p className="text-center text-xs text-gray-400">Je buddy draagt jouw nickname</p>
        </div>
        <div className="flex-grow">
          {toonLichaamKeuze && (
            <KeuzeRij
              label="Lichaam"
              aantal={LICHAMEN.length}
              waarde={LICHAMEN.indexOf(lichaam)}
              onKies={(i) => setLichaam(LICHAMEN[i])}
              renderOptie={(i) => <span className="block px-2 py-1 text-xs font-medium text-gray-700">{LICHAAM_LABELS[LICHAMEN[i]]}</span>}
            />
          )}
          <KeuzeRij
            label="Huidtint"
            aantal={HUID_TINTEN.length}
            waarde={huid}
            onKies={setHuid}
            renderOptie={(i) => <span className="block w-8 h-8 rounded-lg" style={{ backgroundColor: HUID_TINTEN[i] }} />}
          />
          <KeuzeRij
            label="Haarstijl"
            aantal={HAAR_STIJLEN.length}
            waarde={haar}
            onKies={setHaar}
            renderOptie={(i) => <span className="block px-2 py-1 text-xs font-medium text-gray-700">{HAAR_STIJLEN[i]}</span>}
          />
          <KeuzeRij
            label="Haarkleur"
            aantal={HAAR_KLEUREN.length}
            waarde={haarkleur}
            onKies={setHaarkleur}
            renderOptie={(i) => <span className="block w-8 h-8 rounded-lg" style={{ backgroundColor: HAAR_KLEUREN[i] }} />}
          />
          <KeuzeRij
            label="Uitdrukking"
            aantal={GEZICHTEN.length}
            waarde={gezicht}
            onKies={setGezicht}
            renderOptie={(i) => <span className="block px-2 py-1 text-xs font-medium text-gray-700">{GEZICHTEN[i]}</span>}
          />
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button
          type="button"
          disabled={bezig}
          onClick={handleAanmaken}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-40"
        >
          {bezig ? 'Bezig...' : 'Start het seizoen!'}
        </button>
      </div>
    </div>
  );
}
