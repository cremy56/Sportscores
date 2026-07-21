// src/pages/adValvas.jsx
// MARKER_ADVALVAS_PAGE
// Ad valvas-dashboard: publiek scherm in de gang met highscores, mededelingen
// en sportnieuws. Data en contentrotatie zitten in hooks; de slides en de
// nieuwsbalk zijn losse componenten. Dit bestand is enkel nog de pagina-shell.

import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlusCircle, Trophy, WifiOff, RefreshCw } from 'lucide-react';
import MededelingModal from '../components/MededelingModal';
import ContentSlide from '../components/advalvas/ContentSlide.jsx';
import NewsTicker from '../components/advalvas/NewsTicker.jsx';
import { useAdValvasData } from '../hooks/useAdValvasData.js';
import { useAdValvasContent } from '../hooks/useAdValvasContent.js';
import { NEWS_TICKER_MS } from '../data/adValvasConfig.js';
import { formatTime, formatDate, canPostMessages } from '../utils/adValvasHelpers.js';

export default function AdValvas() {
  const { profile, school } = useOutletContext();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [newsIndex, setNewsIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    testHighscores,
    mededelingenData,
    breakingNewsItems,
    activeTests,
    loading,
    dataError,
    liveNewsData,
    feedLoading,
    feedStatus,
    lastFeedRefresh,
    refreshData,
    refreshFeed
  } = useAdValvasData(profile);

  const {
    contentItems,
    currentContentIndex,
    setCurrentContentIndex,
    currentItem,
    animationClass
  } = useAdValvasContent({
    testHighscores,
    breakingNewsItems,
    activeTests,
    mededelingenData,
    loading
  });

  // Klok
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Nieuwsticker doorschuiven
  useEffect(() => {
    if (liveNewsData.length === 0) return;
    const newsTimer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % liveNewsData.length);
    }, NEWS_TICKER_MS);
    return () => clearInterval(newsTimer);
  }, [liveNewsData.length]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200 max-w-md mx-auto text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Sport Dashboard Laden</h3>
          <p className="text-gray-600 mb-4">Highscores en live sportfeed worden opgehaald...</p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${feedLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span>Live Feed: {feedStatus}</span>
          </div>
          <div className="mt-4 flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse delay-200"></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse delay-400"></div>
          </div>
        </div>
      </div>
    );
  }
    return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* --- POPUP FORMULIER --- */}
      {isModalOpen && (
        <MededelingModal 
          isOpen={isModalOpen} // <-- DEZE REGEL ONTBRAK
          profile={profile}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            refreshData(); // Vernieuw de content na succes
          }}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 pt-16 pb-8 lg:px-8 lg:pt-20 lg:pb-10">
          
          {/* --- OUDE KNOP HIER VERWIJDERD --- */}

          {/* MOBILE HEADER */}
          <div className="lg:hidden flex justify-between items-center mb-6 px-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-lg font-black text-gray-800">
                Sport Dashboard
              </h1>
            </div>
            
            {/* --- KNOP HIER TOEGEVOEGD (MOBIELE VERSIE) --- */}
            {canPostMessages(profile, school) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:scale-105 transition-transform text-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Bericht</span>
          </button>
        )}

            <div className="text-right">
              <div className="text-xl font-bold text-gray-800 font-mono">
                {formatTime(currentTime)}
              </div>
              <div className="text-xs text-gray-500">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>

          {/* DESKTOP HEADER */}
          <div className="hidden lg:flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-black text-gray-800">
                  Sport Dashboard
                </h1>
                <div className="text-gray-500 text-sm font-medium">
                  {school?.naam || 'Live resultaten en nieuws'}
                </div>
              </div>
            </div>

            {/* --- KNOP HIER TOEGEVOEGD (DESKTOP VERSIE) --- */}
            {canPostMessages(profile, school) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:scale-105 transition-transform"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Bericht maken</span>
          </button>
        )}

            <div className="text-right">
              <div className="text-4xl font-bold text-gray-800 font-mono">
                {formatTime(currentTime)}
              </div>
              <div className="text-gray-600">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>

          {/* Main Content */}
          {contentItems.length > 0 && currentItem ? (
            <div className={`transition-all duration-700 ${animationClass} mb-10`}>
              <ContentSlide item={currentItem} />
              
              {/* Enhanced Content Indicators */}
              <div className="flex justify-center items-center space-x-3 mt-10">
                <div className="flex space-x-2">
                  {contentItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentContentIndex(index)}
                      className={`transition-all duration-300 rounded-full ${
                        currentContentIndex === index 
                          ? 'w-8 h-4 bg-gradient-to-r from-purple-600 to-blue-600 scale-110' 
                          : 'w-4 h-4 bg-gray-300 hover:bg-gray-400 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
                <div className="ml-4 text-sm text-gray-500 font-medium">
                  {currentContentIndex + 1} / {contentItems.length}
                </div>
              </div>
            </div>
          ) : (
            // Enhanced Empty State
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 text-center p-16 max-w-3xl mx-auto mb-10">
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <Trophy className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-3xl font-black text-gray-800 mb-4">Dashboard wordt voorbereid</h3>
                <p className="text-gray-600 leading-relaxed text-lg mb-6">
                  Zodra er sportscores worden ingevoerd, komt het dashboard tot leven met live updates en prestatie-overzichten!
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                  <span>Wachtend op data...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Foutmelding dashboarddata: voorkomt een stil leeg scherm */}
      {dataError && (
        <div className="mx-4 mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Dashboardgegevens konden niet vernieuwd worden</p>
              <p className="text-xs text-amber-700">Het scherm toont de laatst geladen gegevens en probeert het automatisch opnieuw.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshData}
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
          >
            <RefreshCw className="h-4 w-4" />
            Opnieuw
          </button>
        </div>
      )}

      <NewsTicker
        liveNewsData={liveNewsData}
        newsIndex={newsIndex}
        feedStatus={feedStatus}
        feedLoading={feedLoading}
        isOnline={isOnline}
        lastFeedRefresh={lastFeedRefresh}
        onRefresh={refreshFeed}
      />
    </div>
  );
}
