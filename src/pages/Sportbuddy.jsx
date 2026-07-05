// src/pages/Sportbuddy.jsx
// Hoofdpagina Sportbuddy (Gezondheid 2.0 — datavrij by design).
// Sessie 1: buddy ophalen of aanmaken. Dashboard (dagstaat + kamers) volgt in sessie 2.
// Alle spelvoortgang gaat over een FICTIEF personage; er wordt geen enkel
// persoonlijk gezondheidsgegeven verwerkt.

import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import AanmaakWizard from '../components/sportbuddy/AanmaakWizard';
import BuddyAvatar from '../components/sportbuddy/BuddyAvatar';
import { getSport, STATS } from '../data/sportbuddy/sporten';

function StatBalk({ label, waarde }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
        <span>{label}</span>
        <span>{waarde}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${Math.max(2, Math.min(100, waarde))}%` }}
        />
      </div>
    </div>
  );
}

export default function Sportbuddy() {
  const { profile } = useOutletContext();
  const [buddy, setBuddy] = useState(null);
  const [laden, setLaden] = useState(true);
  const [apiFout, setApiFout] = useState(null);

  const haalBuddy = useCallback(async () => {
    if (!profile?._token) return;
    setLaden(true);
    setApiFout(null);
    try {
      const response = await fetch('/api/sportbuddy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile._token}`,
        },
        body: JSON.stringify({ action: 'get_buddy' }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Kon je Sportbuddy niet ophalen');
      }
      setBuddy(result.buddy || null);
    } catch (error) {
      console.error('get_buddy mislukt:', error.message);
      setApiFout(error.message);
    } finally {
      setLaden(false);
    }
  }, [profile?._token]);

  useEffect(() => {
    haalBuddy();
  }, [haalBuddy]);

  if (laden) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (apiFout) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-gray-700 font-semibold mb-2">Sportbuddy is even niet bereikbaar.</p>
        <p className="text-sm text-gray-500 mb-6">{apiFout}</p>
        <button
          type="button"
          onClick={haalBuddy}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (!buddy) {
    return (
      <div>
        <PageHeader
          title="Sportbuddy"
          subtitle="Bouw een fictieve atleet op tot topsporter — en leer alles over training, voeding, herstel en mentale kracht."
        />
        <AanmaakWizard profile={profile} onAangemaakt={(nieuweBuddy) => setBuddy(nieuweBuddy)} />
        <p className="max-w-3xl mx-auto text-center text-xs text-gray-400 mt-6">
          🔒 Je Sportbuddy is een fictief personage. We bewaren alleen de spelvoortgang van je buddy — nooit iets over jouw eigen gezondheid.
        </p>
      </div>
    );
  }

  const sport = getSport(buddy.sport);
  const buddyNaam = profile?.nickname || 'Jouw buddy';

  return (
    <div>
      <PageHeader
        title="Sportbuddy"
        subtitle={`${buddyNaam} · ${sport ? `${sport.emoji} ${sport.naam}` : ''} · dag ${buddy.seizoen?.dag ?? 1} van het seizoen`}
      />
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Buddy-kaart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
          <div className="w-36">
            <BuddyAvatar
              gezicht={buddy.avatar?.gezicht}
              huid={buddy.avatar?.huid}
              haar={buddy.avatar?.haar}
              haarkleur={buddy.avatar?.haarkleur}
              className="w-full"
            />
          </div>
          <div className="text-lg font-bold text-purple-700 mt-2">{buddyNaam}</div>
          {sport && <div className="text-sm text-gray-500">{sport.emoji} {sport.naam}</div>}
        </div>

        {/* KLUSCE-stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:col-span-2">
          <h3 className="font-bold text-gray-800 mb-4">Fysieke kenmerken (KLUSCE)</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {STATS.map((s) => (
              <StatBalk key={s.key} label={s.label} waarde={buddy.stats?.[s.key] ?? 0} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            De dagstaat (vorm, vermoeidheid, stress, rustpols) en de vier kamers komen in de volgende update.
          </p>
        </div>
      </div>
    </div>
  );
}
