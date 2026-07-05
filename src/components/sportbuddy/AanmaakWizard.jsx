// src/components/sportbuddy/AanmaakWizard.jsx
// Aanmaakflow Sportbuddy (sessie 1): sportkeuze → uiterlijk → bevestigen.
// Alle input is een GESLOTEN keuze (indices) — geen vrije tekst (GDD §8).
// De buddy draagt de nickname van de leerling (bestaat al in het profiel;
// we slaan géén naam op in het buddy-document).

import { useState } from 'react';
import toast from 'react-hot-toast';
import BuddyAvatar, { HUID_TINTEN, HAAR_KLEUREN, HAAR_STIJLEN, GEZICHTEN } from './BuddyAvatar';
import { SPORTEN } from '../../data/sportbuddy/sporten';

const STAPPEN = ['Sport', 'Uiterlijk'];

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
  const [stap, setStap] = useState(0);
  const [sport, setSport] = useState(null);
  const [gezicht, setGezicht] = useState(0);
  const [huid, setHuid] = useState(0);
  const [haar, setHaar] = useState(0);
  const [haarkleur, setHaarkleur] = useState(0);
  const [bezig, setBezig] = useState(false);

  const naam = profile?.nickname || 'Jouw buddy';

  const handleAanmaken = async () => {
    if (!sport) return;
    setBezig(true);
    try {
      const response = await fetch('/api/sportbuddy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile?._token}`,
        },
        body: JSON.stringify({
          action: 'create_buddy',
          sport,
          avatar: { gezicht, huid, haar, haarkleur },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Buddy aanmaken mislukt');
      }
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
      {/* Stappenindicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STAPPEN.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i === stap
                  ? 'bg-purple-600 text-white'
                  : i < stap
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i === stap ? 'font-bold text-gray-800' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < STAPPEN.length - 1 && <div className="w-6 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* STAP 1 — Sportkeuze */}
      {stap === 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Kies de sport van je buddy</h2>
          <p className="text-sm text-gray-500 mb-6">
            De sport bepaalt welke trainingen, voeding en events je te zien krijgt. Je kiest opnieuw bij de start van elk schooljaar.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SPORTEN.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={!s.beschikbaar}
                onClick={() => setSport(s.id)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  sport === s.id
                    ? 'border-purple-600 bg-purple-50'
                    : s.beschikbaar
                      ? 'border-gray-200 hover:border-purple-300'
                      : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="text-3xl mb-2">{s.emoji}</div>
                <div className="font-bold text-gray-800">{s.naam}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {s.beschikbaar ? s.tagline : 'Binnenkort beschikbaar'}
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <button
              type="button"
              disabled={!sport}
              onClick={() => setStap(1)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold disabled:opacity-40"
            >
              Volgende
            </button>
          </div>
        </div>
      )}

      {/* STAP 2 — Uiterlijk */}
      {stap === 1 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Kies het uiterlijk</h2>
          <p className="text-sm text-gray-500 mb-6">
            Puur cosmetisch — elke buddy start met exact hetzelfde lichaam. Wat hij wordt, bepaal jij met training.
          </p>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-40 mx-auto md:mx-0 flex-shrink-0">
              <BuddyAvatar gezicht={gezicht} huid={huid} haar={haar} haarkleur={haarkleur} className="w-full" />
              <div className="text-center text-lg font-bold text-purple-700 mt-2">{naam}</div>
              <p className="text-center text-xs text-gray-400">Je buddy draagt jouw nickname</p>
            </div>
            <div className="flex-grow">
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
          <div className="flex justify-between mt-6">
            <button type="button" onClick={() => setStap(0)} className="text-gray-500 font-semibold px-4 py-2">
              Terug
            </button>
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
      )}
    </div>
  );
}
