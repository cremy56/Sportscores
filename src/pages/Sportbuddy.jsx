// src/pages/Sportbuddy.jsx
// Hoofdpagina Sportbuddy (Gezondheid 2.0 — datavrij by design).
// Sessie 2: dagstaat (vorm/vermoeidheid/fitheid/stress/rustpols/gezondheid),
// dagelijkse verzorging (5 XP + 1 coin), rustperiode-knop, meldingen.
// Alle spelvoortgang gaat over een FICTIEF personage; er wordt geen enkel
// persoonlijk gezondheidsgegeven verwerkt. De kamers (tiles) volgen in sessie 3+.

import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import AanmaakWizard from '../components/sportbuddy/AanmaakWizard';
import BuddyAvatar from '../components/sportbuddy/BuddyAvatar';
import VerzorgPaneel from '../components/sportbuddy/VerzorgPaneel';
import EventModal from '../components/sportbuddy/EventModal';
import StatusBalk from '../components/sportbuddy/StatusBalk';
import Kamers from '../components/sportbuddy/Kamers';
import { getSport } from '../data/sportbuddy/sporten';

const RISICO_BADGE = {
  laag: { tekst: 'Blessurerisico: laag', stijl: 'bg-green-50 text-green-700 border-green-200' },
  verhoogd: { tekst: 'Blessurerisico: verhoogd', stijl: 'bg-amber-50 text-amber-700 border-amber-200' },
  hoog: { tekst: 'Blessurerisico: hoog', stijl: 'bg-red-50 text-red-700 border-red-200' },
};

export default function Sportbuddy() {
  const { profile } = useOutletContext();
  const [buddy, setBuddy] = useState(null);
  const [vandaagVerzorgd, setVandaagVerzorgd] = useState(false);
  const [meldingen, setMeldingen] = useState([]);
  const [context, setContext] = useState(null);
  const [statusbericht, setStatusbericht] = useState(null);
  const [event, setEvent] = useState(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [laden, setLaden] = useState(true);
  const [apiFout, setApiFout] = useState(null);
  const [rustBezig, setRustBezig] = useState(false);

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
      setVandaagVerzorgd(!!result.vandaag_verzorgd);
      setMeldingen(result.meldingen || []);
      setContext(result.context || null);
      setStatusbericht(result.statusbericht || null);
      setEvent(result.event || null);
      setEventOpen(!!result.event);
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

  const handleVerzorgd = (result) => {
    setBuddy(result.buddy);
    setVandaagVerzorgd(true);
    setMeldingen(result.meldingen || []);
  };

  const handleEventResolved = (result) => {
    setBuddy(result.buddy);
  };

  const handleKennisAfgerond = (moduleId, result) => {
    setBuddy((b) => (b ? { ...b, kennis: { ...(b.kennis || {}), [moduleId]: result.kennis } } : b));
  };

  const wisselRustperiode = async () => {
    setRustBezig(true);
    try {
      const response = await fetch('/api/sportbuddy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile._token}`,
        },
        body: JSON.stringify({ action: 'zet_rustperiode', actief: !buddy?.seizoen?.rustperiode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Rustperiode wijzigen mislukt');
      setBuddy(result.buddy);
      setMeldingen(result.meldingen || []);
      toast.success(result.buddy?.seizoen?.rustperiode ? 'Rustperiode gestart 🏝️' : 'Rustperiode beëindigd');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRustBezig(false);
    }
  };

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
  const dagstaat = buddy.dagstaat || { vorm: 0, rustpols: 52, blessurerisico: 'laag' };
  const risico = RISICO_BADGE[dagstaat.blessurerisico] || RISICO_BADGE.laag;
  const opRust = !!buddy.seizoen?.rustperiode;

  // Conditie voor de avatar: je ZIET overtraining, vermoeidheid en topvorm
  let conditie = 'fris';
  if ((buddy.vermoeidheid ?? 0) > 70 || dagstaat.vorm < -20) conditie = 'uitgeput';
  else if ((buddy.vermoeidheid ?? 0) > 45 || dagstaat.vorm < -8) conditie = 'moe';
  else if (dagstaat.vorm >= 25) conditie = 'top';

  return (
    <div>
      <PageHeader
        title="Sportbuddy"
        subtitle={`${buddyNaam} · ${sport ? `${sport.emoji} ${sport.naam}` : ''} · dag ${buddy.seizoen?.dag ?? 1} van het seizoen · 🪙 ${buddy.coins ?? 0}`}
      />

      {context && (
        <div className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="bg-white shadow rounded-full px-4 py-2 font-semibold text-gray-700">
            {context.weer?.emoji} {context.weer?.tempMax}°C · {context.weer?.label}
          </span>
          <span className="bg-white shadow rounded-full px-4 py-2 font-semibold text-gray-700">
            {context.kalender?.matchdag
              ? '🏟️ Vandaag: WEDSTRIJDDAG'
              : `⚽ Wedstrijd over ${context.kalender?.dagenTotMatch} ${context.kalender?.dagenTotMatch === 1 ? 'dag' : 'dagen'} (zaterdag)`}
          </span>
        </div>
      )}

      {statusbericht && (
        <div className="max-w-5xl mx-auto mb-4 bg-white border-l-4 border-purple-500 shadow rounded-xl px-4 py-3">
          <p className="text-sm text-gray-800">{statusbericht.tekst}</p>
          {statusbericht.hint && <p className="text-xs text-purple-600 mt-1">💡 {statusbericht.hint}</p>}
        </div>
      )}

      {event && !eventOpen && (
        <div className="max-w-5xl mx-auto mb-4">
          <button
            type="button"
            onClick={() => setEventOpen(true)}
            className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl px-4 py-3 font-bold shadow hover:shadow-lg transition-all text-left"
          >
            {event.emoji} {event.titel} — er wacht een beslissing op je buddy! (+10 XP)
          </button>
        </div>
      )}

      {meldingen.length > 0 && (
        <div className="max-w-5xl mx-auto mb-6 space-y-2">
          {meldingen.map((m, i) => (
            <div key={i} className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl px-4 py-3">
              💡 {m}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Buddy-kaart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
          <div className={`w-36 transition-opacity ${opRust ? 'opacity-60' : ''}`}>
            <BuddyAvatar
              gezicht={buddy.avatar?.gezicht}
              huid={buddy.avatar?.huid}
              haar={buddy.avatar?.haar}
              haarkleur={buddy.avatar?.haarkleur}
              graad={buddy.weergave?.graad ?? 1}
              lichaam={buddy.weergave?.lichaam ?? 'neutraal'}
              kracht={buddy.stats?.K ?? 10}
              conditie={conditie}
              blessure={!!buddy.gezondheid?.blessure}
              className="w-full"
            />
          </div>
          <div className="text-lg font-bold text-purple-700 mt-2">{buddyNaam}</div>
          {sport && <div className="text-sm text-gray-500">{sport.emoji} {sport.naam}</div>}
          {opRust && <div className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">🏝️ Op rustperiode</div>}
          <span className={`mt-3 text-xs font-semibold border rounded-full px-3 py-1 ${risico.stijl}`}>{risico.tekst}</span>
          <button
            type="button"
            disabled={rustBezig}
            onClick={wisselRustperiode}
            className="mt-4 text-xs font-semibold text-gray-500 border border-gray-300 rounded-xl px-3 py-1.5 hover:border-purple-400 disabled:opacity-40"
          >
            {opRust ? 'Rustperiode beëindigen' : 'Rustperiode starten (vakantie)'}
          </button>
        </div>

        {/* Compacte statusbalk (hexagon + tikbare chips) */}
        <div className="md:col-span-2">
          <StatusBalk buddy={buddy} dagstaat={dagstaat} />
        </div>
      </div>

      {/* Dagelijkse verzorging */}
      <div className="max-w-5xl mx-auto mt-6">
        {opRust ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center text-sm text-gray-500">
            🏝️ Je buddy is op rustperiode — de klok staat stil. Beëindig de rustperiode om verder te spelen.
          </div>
        ) : (
          <VerzorgPaneel
            profile={profile}
            vandaagVerzorgd={vandaagVerzorgd}
            laatsteKeuzes={buddy.laatste_keuzes}
            onVerzorgd={handleVerzorgd}
          />
        )}
      </div>

      {/* Kamers (kennismodules) */}
      <div className="max-w-5xl mx-auto mt-6">
        <Kamers buddy={buddy} profile={profile} onKennisAfgerond={handleKennisAfgerond} />
        <p className="text-center text-xs text-gray-400 mt-6">
          🔒 Alles hier gaat over je fictieve buddy — nooit over jouw eigen gezondheid.
        </p>
      </div>

      {event && eventOpen && (
        <EventModal
          event={event}
          profile={profile}
          onResolved={handleEventResolved}
          onClose={() => { setEventOpen(false); setEvent(null); }}
        />
      )}
    </div>
  );
}
