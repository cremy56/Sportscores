// src/pages/Sportbuddy.jsx
// Hoofdpagina Sportbuddy (Gezondheid 2.0 — datavrij by design).
// Sessie 2: dagstaat (vorm/vermoeidheid/fitheid/stress/rustpols/gezondheid),
// dagelijkse verzorging (5 XP + 1 coin), rustperiode-knop, meldingen.
// Alle spelvoortgang gaat over een FICTIEF personage; er wordt geen enkel
// persoonlijk gezondheidsgegeven verwerkt. De kamers (tiles) volgen in sessie 3+.

import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import AanmaakWizard from '../components/sportbuddy/AanmaakWizard';
import BuddyAvatar from '../components/sportbuddy/BuddyAvatar';
import VerzorgPaneel from '../components/sportbuddy/VerzorgPaneel';
import EventModal from '../components/sportbuddy/EventModal';
import { DagstaatBalken, KlusceHexagon } from '../components/sportbuddy/StatWidgets';
import ModuleTiles from '../components/sportbuddy/ModuleTiles';
import SuperadminTestpaneel from '../components/sportbuddy/SuperadminTestpaneel';
import { getSport } from '../data/sportbuddy/sporten';
import { sportbuddyApi } from '../data/sportbuddy/api';

const RISICO_BADGE = {
  laag: { tekst: 'Blessurerisico: laag', stijl: 'bg-green-50 text-green-700 border-green-200' },
  verhoogd: { tekst: 'Blessurerisico: verhoogd', stijl: 'bg-amber-50 text-amber-700 border-amber-200' },
  hoog: { tekst: 'Blessurerisico: hoog', stijl: 'bg-red-50 text-red-700 border-red-200' },
};

export default function Sportbuddy() {
  const { profile } = useOutletContext();
  const navigate = useNavigate();
  const [echteBuddy, setBuddy] = useState(null);
  const [vandaagVerzorgd, setVandaagVerzorgd] = useState(false);
  const [meldingen, setMeldingen] = useState([]);
  const [context, setContext] = useState(null);
  const [statusbericht, setStatusbericht] = useState(null);
  const [event, setEvent] = useState(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [testOverride, setTestOverride] = useState(null);
  const [laden, setLaden] = useState(true);
  const [apiFout, setApiFout] = useState(null);
  const [rustBezig, setRustBezig] = useState(false);

  const haalBuddy = useCallback(async () => {
    setLaden(true);
    setApiFout(null);
    try {
      const result = await sportbuddyApi({ action: 'get_buddy' });
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
  }, []);

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

  const wisselRustperiode = async () => {
    setRustBezig(true);
    try {
      const result = await sportbuddyApi({ action: 'zet_rustperiode', actief: !buddy?.seizoen?.rustperiode });
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

  if (!echteBuddy) {
    return (
      <div className="relative">
      <div className="fixed inset-0 bg-slate-50 -z-10" />
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

  // Superadmin-testoverride: puur visuele preview bovenop de echte buddy
  const buddy = testOverride ? { ...echteBuddy, ...testOverride } : echteBuddy;
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
    <div className="relative">
      <div className="fixed inset-0 bg-slate-50 -z-10" />
      <button
        type="button"
        onClick={() => navigate('/sportbuddy/gameday')}
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm font-bold rounded-full px-4 py-2 shadow-lg hover:shadow-xl hover:brightness-110 transition-all"
      >
        🥊 Gameday
      </button>
      <PageHeader
        title="Sportbuddy"
        subtitle={`${buddyNaam} · ${sport ? `${sport.emoji} ${sport.naam}` : ''} · dag ${buddy.seizoen?.dag ?? 1} van het seizoen · 🪙 ${buddy.coins ?? 0}`}
      />

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

      {/* PC: 3 kolommen (fysiek | buddy | dagstaat) · smartphone: gestapeld op
          dagprioriteit — buddy → dagstaat → verzorging → fysiek → tiles */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">

        {/* Kolom 1 (PC links · mobiel als 3de): fysieke kenmerken + badges */}
        <div className="order-3 md:order-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col items-center">
            <h3 className="font-bold text-gray-800 self-start mb-2">Fysieke kenmerken</h3>
            <KlusceHexagon stats={buddy.stats} size={180} />
            <p className="text-[11px] text-gray-400 mt-2 text-center">Kracht · Lenigheid · Uithouding · Snelheid · Coördinatie · Evenwicht</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={`text-xs font-semibold border rounded-full px-3 py-1.5 bg-white ${risico.stijl}`}>{risico.tekst}</span>
            <button
              type="button"
              disabled={rustBezig}
              onClick={wisselRustperiode}
              className="text-xs font-semibold text-gray-500 bg-white border border-gray-300 rounded-full px-3 py-1.5 hover:border-purple-400 disabled:opacity-40"
            >
              {opRust ? 'Rustperiode beëindigen' : 'Rustperiode starten'}
            </button>
          </div>
        </div>

        {/* Kolom 2 (PC midden · mobiel bovenaan): de buddy als held, zonder kader */}
        <div className="order-1 md:order-2 flex flex-col items-center">
          <div className="text-2xl font-bold text-purple-700 mb-1">{buddyNaam}</div>
          {opRust && <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-1">🏝️ Op rustperiode</span>}
          <div className={`w-48 sm:w-56 transition-opacity ${opRust ? 'opacity-60' : ''}`}>
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
        </div>

        {/* Kolom 3 (PC rechts · mobiel als 2de): dagstaat met weer, wedstrijd eronder */}
        <div className="order-2 md:order-3 space-y-4">
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Dagstaat</h3>
              {context?.weer && (
                <span className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                  {context.weer.emoji} {context.weer.tempMax}°C · {context.weer.label}
                </span>
              )}
            </div>
            <DagstaatBalken buddy={buddy} dagstaat={dagstaat} />
          </div>
          {context?.kalender && (
            <div className="flex justify-center">
              <span className="text-xs font-semibold text-gray-600 bg-white shadow rounded-full px-4 py-2">
                {context.kalender.matchdag
                  ? '🏟️ Vandaag: WEDSTRIJDDAG'
                  : `⚽ Wedstrijd over ${context.kalender.dagenTotMatch} ${context.kalender.dagenTotMatch === 1 ? 'dag' : 'dagen'} (zaterdag)`}
              </span>
            </div>
          )}
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

      {/* Module-tiles */}
      <div className="max-w-5xl mx-auto mt-6">
        <ModuleTiles buddy={buddy} />
        <p className="text-center text-xs text-gray-400 mt-6">
          🔒 Alles hier gaat over je fictieve buddy — nooit over jouw eigen gezondheid.
        </p>
      </div>

      {profile?.rol === 'super-administrator' && (
        <SuperadminTestpaneel buddy={echteBuddy} onOverride={setTestOverride} />
      )}

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
