// src/pages/adValvas.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trophy, Star, TrendingUp, Calendar, Award, Zap, Target, Users, Clock, Medal, Activity, Quote, Flame, BookOpen, BarChart3, TrendingDown, Wifi, WifiOff, RefreshCw, Megaphone, PlusCircle, X } from 'lucide-react';
import { formatScoreWithUnit } from '../utils/formatters.js';
import { auth } from '../firebase';
import MededelingModal from '../components/MededelingModal';
import { SPORT_QUOTES } from '../data/sportQuotes.js';
import { SPORT_FACTS } from '../data/sportFacts.js';

// --- Helper functies ---
const formatNameForDisplay = (fullName) => {
  if (!fullName) return 'Onbekend';
  const nameParts = fullName.split(' ');
  if (nameParts.length < 2) return fullName;
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  return `${firstName} ${lastName.charAt(0)}.`;
};


// Utility function voor shuffling arrays
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// --- NIEUWE CONTENT TYPES ---
const CONTENT_TYPES = {
  HIGHSCORES: 'highscores',
  QUOTE: 'quote',
  BREAKING_NEWS: 'breaking_news',
  DAILY_ACTIVITY: 'daily_activity',
  WEEKLY_STATS: 'weekly_stats',
  MONTHLY_MILESTONE: 'monthly_milestone',
  SEASON_STATS: 'season_stats',
  SPORT_FACT: 'sport_fact',
  UPCOMING_EVENT: 'upcoming_event',
  LIVE_SPORTS_NEWS: 'live_sports_news',
  ACTIVE_TEST: 'active_test' // NIEUW
};
// Sportquotes & sportfeiten staan sinds 21 jul 2026 in aparte databestanden
// (src/data/) om de bundelgrootte van deze route te beperken.

// Seizoensgebonden content helper (uitgebreid)
const getSeasonalContent = (month) => {
  const seasonalData = {
    // Lente (maart, april, mei)
    2: { text: "Lente is begonnen! Perfect weer om buiten te sporten 🌸", icon: Calendar, color: "from-green-400 to-blue-500" },
    3: { text: "April: Ideale maand voor atletiek en buitenactiviteiten! 🏃‍♂️", icon: Activity, color: "from-blue-400 to-green-500" },
    4: { text: "Mei: Sportdag voorbereidingen zijn in volle gang! 🏆", icon: Trophy, color: "from-yellow-400 to-green-500" },
    
    // Zomer (juni, juli, augustus)
    5: { text: "Zomersport seizoen geopend! Zwemmen en watersport! 🏊‍♀️", icon: Activity, color: "from-blue-500 to-cyan-500" },
    6: { text: "Juli: Zomerkampen en buitenactiviteiten! ☀️", icon: Users, color: "from-orange-400 to-yellow-500" },
    7: { text: "Augustus: Laatste kans voor zomerse sportbeoefening! 🌞", icon: Target, color: "from-red-400 to-orange-500" },
    
    // Herfst (september, oktober, november) 
    8: { text: "Schoolsport herstart! Nieuwe kansen, nieuwe records! 📚", icon: BookOpen, color: "from-orange-500 to-red-500" },
    9: { text: "Oktober: Herfstcrosslopen en teambuilding activiteiten! 🍂", icon: Users, color: "from-yellow-500 to-orange-600" },
    10: { text: "November: Indoor sporten nemen de overhand! 🏀", icon: Target, color: "from-purple-500 to-blue-600" },
    
    // Winter (december, januari, februari)
    11: { text: "December: Winterse uitdagingen en conditieopbouw! ❄️", icon: Zap, color: "from-blue-600 to-purple-600" },
    0: { text: "Januari: Nieuwe jaar, nieuwe sportdoelen! 🎯", icon: Target, color: "from-indigo-500 to-purple-600" },
    1: { text: "Februari: Opbouw naar lente sportactiviteiten! 💪", icon: TrendingUp, color: "from-purple-600 to-pink-600" }
  };
  
  return seasonalData[month] || null;
};

// --- Interval-instellingen (in ms) ---
// Comment en code liepen hier uiteen; nu één bron van waarheid.
const DATA_REFRESH_MS = 15 * 60 * 1000;   // dashboarddata: elke 15 minuten
const FEED_REFRESH_MS = 60 * 60 * 1000;   // sportnieuwsfeed: elk uur
const SLIDE_INTERVAL_MS = 8 * 1000;       // content wisselt elke 8 seconden
const NEWS_TICKER_MS = 40 * 1000;         // nieuwsticker: elke 40 seconden

// --- GEAVANCEERDE Live Sport News & Feed API ---
class LiveSportsFeedAPI {
  async fetchLiveSportsData() {
    try {
      // DIT IS DE CORRECTE URL VAN JOUW FUNCTIE
      const proxyUrl = 'https://europe-west1-sportscore-6774d.cloudfunctions.net/getSportNews';
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        console.error('Proxy Error:', response.statusText);
        return { news: [], scores: [], offline: true };
      }
      
      const data = await response.json();
      
      if (data.success) {
        return { news: data.news, scores: [], offline: false };
      } else {
        return { news: [], scores: [], offline: true };
      }
      
    } catch (error) {
      console.error('Fout bij ophalen live feed via proxy:', error);
      return { news: [], scores: [], offline: true };
    }
  }

  async refreshData() {
    return this.fetchLiveSportsData();
  }
}


export default function AdValvas() {
  const { profile, school } = useOutletContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [contentItems, setContentItems] = useState([]);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [testHighscores, setTestHighscores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsIndex, setNewsIndex] = useState(0);
  const [liveNewsData, setLiveNewsData] = useState([]);
  const [liveScoresData, setLiveScoresData] = useState([]);
  const [liveFeedAPI] = useState(() => new LiveSportsFeedAPI());
  const [feedLoading, setFeedLoading] = useState(true);
  const [lastFeedRefresh, setLastFeedRefresh] = useState(null);
  const [feedStatus, setFeedStatus] = useState('connecting');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [breakingNewsItems, setBreakingNewsItems] = useState([]);
const [activeTests, setActiveTests] = useState([]);
const [contentPattern, setContentPattern] = useState([]); // Alternerend patroon
const [patternIndex, setPatternIndex] = useState(0);
const [isModalOpen, setIsModalOpen] = useState(false); // State voor de popup
  const [mededelingenData, setMededelingenData] = useState([]);
  const [dataError, setDataError] = useState(null);
  // Teller die per contentgeneratie ophoogt: geeft stabiele React-keys binnen
  // één generatie (Date.now() per item forceerde een volledige remount).
  const generatieRef = useRef(0);

  // Haalt de dashboarddata op met een VERSE Firebase ID-token.
  // Firebase-tokens verlopen na ~1 uur; een ad valvas-scherm draait dagen aan
  // een stuk. profile._token (1x gelezen bij mount) liep daardoor af.
  // getIdToken() ververst automatisch wanneer nodig.
  const fetchAllAdValvasData = useCallback(async (signal) => {
    if (!profile?.school_id) {
      setLoading(false);
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Geen gebruiker ingelogd.");
      const token = await user.getIdToken();

      const response = await fetch('/api/content', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        signal
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kon dashboard data niet laden');
      }

      setTestHighscores(data.testHighscores || []);
      setMededelingenData(data.mededelingen || []);
      setBreakingNewsItems(data.breakingNews || []);
      setActiveTests(data.activeTests || []);
      setDataError(null);
    } catch (error) {
      if (error.name === 'AbortError') return;
      // Technisch detail blijft in de console; het ad valvas-scherm hangt
      // publiek in de gang, dus GEEN servermeldingen/stacktraces in de UI.
      console.error('Error fetching AdValvas data:', error);
      setDataError(true);
    } finally {
      setLoading(false);
    }
  }, [profile?.school_id]);

  useEffect(() => {
    if (!profile?.school_id) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchAllAdValvasData(controller.signal);

    // Periodiek verversen (15 min) zodat een permanent scherm bij blijft
    // zonder handmatige refresh.
    const dataInterval = setInterval(() => {
      fetchAllAdValvasData(controller.signal);
    }, DATA_REFRESH_MS);

    return () => {
      controller.abort();
      clearInterval(dataInterval);
    };
  }, [profile?.school_id, fetchAllAdValvasData]);

  // Functie om de content te vernieuwen (belangrijk voor na het toevoegen)
  const refreshContent = useCallback(() => {
    if (loading) return;
    fetchAllAdValvasData();
  }, [loading, fetchAllAdValvasData]);

  // Enhanced content genereren met meer variatie
// src/pages/adValvas.jsx

  const generateContentItems = useCallback(() => {

  // Data komt nu uit de state, geen fetch meer nodig.
  // We gebruiken de states die door de nieuwe useEffect zijn gevuld:
  // testHighscores, breakingNewsItems, mededelingenData, activeTests

  const highscoreItems = testHighscores.map((testData) => ({
    type: CONTENT_TYPES.HIGHSCORES,
    data: testData,
    priority: 10,
    id: `highscore-${testData.test.id}`,
    lastShown: 0
  }));

  // breakingNewsItems komt al correct geformatteerd uit de API
  const breakingItems = breakingNewsItems.map((item) => ({
    ...item,
    priority: 15,
    showFrequency: 3
  }));

  const activeTestItems = activeTests.map((test) => ({
    type: CONTENT_TYPES.ACTIVE_TEST,
    data: {
      text: `📝 Test afgenomen: ${test.naam}`,
      subtitle: "Resultaten worden live bijgewerkt",
      test: test,
      icon: BookOpen,
      color: "from-blue-500 to-indigo-600"
    },
    priority: 12,
    id: `active-test-${test.id}`,
    lastShown: 0
  }));

  const otherContent = [];

  try {
    const shuffledQuotes = shuffleArray([...SPORT_QUOTES]);
    for (let i = 0; i < 2; i++) otherContent.push({
      type: CONTENT_TYPES.QUOTE,
      data: shuffledQuotes[i],
      priority: 3,
      id: `quote-${shuffledQuotes[i]?.author || i}-${i}`
    });

    const shuffledFacts = shuffleArray([...SPORT_FACTS]);
    for (let i = 0; i < 3; i++) otherContent.push({
      type: CONTENT_TYPES.SPORT_FACT,
      data: { text: shuffledFacts[i], icon: Target, color: "from-indigo-500 to-purple-600" },
      priority: 3,
      id: `fact-${generatieRef.current}-${i}`
    });

    const currentMonth = new Date().getMonth();
    const seasonalContent = getSeasonalContent(currentMonth);
    if (seasonalContent) otherContent.push({
      type: CONTENT_TYPES.SEASON_STATS,
      data: seasonalContent,
      priority: 4,
      id: `seasonal-${currentMonth}`
    });
  } catch (error) {
    console.error("Fout bij het aanmaken van statische content:", error);
  }

  // Gebruik mededelingenData uit de state
  const mededelingItems = mededelingenData.map(item => ({
    type: 'mededeling',
    priority: 20,
    data: {
      tekst: item.tekst,
      type: item.type,
      icoon: item.type === 'prestatie' ? Award : Megaphone,
      kleur: item.type === 'prestatie' ? 'from-amber-400 to-yellow-500' : 'from-cyan-500 to-blue-500',
      auteur: `Ingegeven door ${item.auteurNaam}`
    },
    id: `mededeling-${item.id}`
  }));

  // BUILD ALTERNATING PATTERN (deze logica blijft hetzelfde)
  let diverseContent = [];
  diverseContent.push(...mededelingItems);
  breakingItems.forEach(item => {
    for (let i = 0; i < (item.showFrequency || 1); i++) diverseContent.push(item);
  });
  diverseContent.push(...activeTestItems);
  diverseContent.push(...otherContent);

  const shuffledDiverseContent = shuffleArray(diverseContent);
  const finalPattern = [];

  const highscoreCount = highscoreItems.length;
  let diverseItemsForLoop = [...shuffledDiverseContent];
  if (highscoreCount > 0 && diverseItemsForLoop.length === 0) {
    console.warn('GEEN DIVERSE CONTENT GEVONDEN. Voeg een placeholder toe om de shuffle te testen.');
    diverseItemsForLoop.push({
      type: 'placeholder',
      data: { text: "Geen ander nieuws gevonden, resultaten worden wel getoond!", icon: RefreshCw, color: "from-gray-400 to-gray-500" },
      id: 'placeholder-item'
    });
  }
  const diverseCount = diverseItemsForLoop.length;

  // Handel lege lijsten af
  if (highscoreCount === 0 && diverseCount > 0) {
    return diverseItemsForLoop;
  }
  if (diverseCount === 0 && highscoreCount > 0) {
    return highscoreItems;
  }
  if (highscoreCount === 0 && diverseCount === 0) {
    return [];
  }

  // Bepaal de lengte van de langste lijst
  const loopLength = Math.max(highscoreCount, diverseCount);

  // Creëer de eindeloze, afwisselende lus
  for (let i = 0; i < loopLength; i++) {
    finalPattern.push(highscoreItems[i % highscoreCount]);
    finalPattern.push(diverseItemsForLoop[i % diverseCount]);
  }

  return finalPattern;
}, [testHighscores, breakingNewsItems, activeTests, mededelingenData]);


  // Live sport feed ophalen (interval: FEED_REFRESH_MS)
  useEffect(() => {
    const loadLiveSportsFeed = async () => {
      setFeedLoading(true);
      setFeedStatus('connecting');
      
      try {
        const feedData = await liveFeedAPI.fetchLiveSportsData();
        
        if (feedData.offline) {
          setFeedStatus('offline');
          setLiveNewsData([]);
          setLiveScoresData([]);
        } else {
          setFeedStatus('online');
          setLiveNewsData(feedData.news || []);
          setLiveScoresData(feedData.scores || []);
          setLastFeedRefresh(new Date());
          
        }
        
      } catch (error) {
        console.error('❌ Fout bij laden live feed:', error);
        setFeedStatus('error');
        setLiveNewsData([]);
        setLiveScoresData([]);
      } finally {
        setFeedLoading(false);
      }
    };

    // Initial load
    loadLiveSportsFeed();
    
    // Auto refresh elke 5 minuten
    const feedRefreshInterval = setInterval(loadLiveSportsFeed, FEED_REFRESH_MS);
    
    return () => clearInterval(feedRefreshInterval);
  }, [liveFeedAPI]);

  // Online/offline status monitoring
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

  useEffect(() => {
    // Alleen uitvoeren als de hoofd-data geladen is
    if (loading) return;

    // liveNewsData/liveScoresData stonden hier als dependency maar worden in
    // generateContentItems niet gebruikt: elke feed-refresh regenereerde
    // daardoor onnodig de volledige contentlijst.
    generatieRef.current += 1;
    const items = generateContentItems();
    setContentItems(items);
    setCurrentContentIndex(0);
  }, [loading, generateContentItems]);

  // Tijd updaten
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Content wisselen in de correcte volgorde (interval: SLIDE_INTERVAL_MS)
  useEffect(() => {
    if (contentItems.length === 0) return;
    
    const slideTimer = setInterval(() => {
      setAnimationClass('animate-pulse');
      
      setTimeout(() => {
        // Ga simpelweg naar het volgende item in de lijst.
        // De modulo (%) zorgt ervoor dat het terugspringt naar 0 aan het einde.
        setCurrentContentIndex((prevIndex) => (prevIndex + 1) % contentItems.length);
        setAnimationClass('');
      }, 300);
    }, SLIDE_INTERVAL_MS);
    
    return () => clearInterval(slideTimer);
  }, [contentItems]); // De afhankelijkheid van currentContentIndex is niet meer nodig

  // Live nieuws ticker (interval: NEWS_TICKER_MS)
  useEffect(() => {
    if (liveNewsData.length === 0) return;
    
    const newsTimer = setInterval(() => {
    setNewsIndex((prev) => (prev + 1) % liveNewsData.length);
  }, NEWS_TICKER_MS);
    
    return () => clearInterval(newsTimer);
  }, [liveNewsData.length]);
  
  // Helper functies
  const formatTime = (date) => date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  
  const getRelativeTime = (date) => {
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Vandaag';
    if (days === 1) return 'Gisteren';
    if (days === 2) return 'Eergisteren';
    if (days < 7) return `${days} dagen geleden`;
    if (days < 14) return '1 week geleden';
    if (days < 30) return `${Math.floor(days / 7)} weken geleden`;
    return `${Math.floor(days / 30)} maanden geleden`;
  };



const canPostMessages = () => {
    // Administrators en super-administrators mogen altijd posten
    if (profile?.rol === 'administrator' || profile?.rol === 'super-administrator') {
      return true;
    }
    
    // Leerkrachten mogen alleen posten als de school policy dit toestaat
    if (profile?.rol === 'leerkracht') {
      return school?.instellingen?.teachersCanPostAnnouncements === true;
    }
    
    // Andere rollen mogen niet posten
    return false;
  };

// Functie om breaking news te detecteren (nieuwe highscores vandaag)

  // Manual feed refresh functie
  const handleFeedRefresh = async () => {
    setFeedLoading(true);
    setFeedStatus('refreshing');
    
    try {
      const feedData = await liveFeedAPI.refreshData();
      
      if (feedData.offline) {
        setFeedStatus('offline');
        setLiveNewsData([]);
        setLiveScoresData([]);
      } else {
        setFeedStatus('online');
        setLiveNewsData(feedData.news || []);
        setLiveScoresData(feedData.scores || []);
        setLastFeedRefresh(new Date());
      }
      
    } catch (error) {
      console.error('Fout bij handmatig vernieuwen feed:', error);
      setFeedStatus('error');
    } finally {
      setFeedLoading(false);
    }
  };

  // Enhanced Podium Card met meer animaties
  // src/pages/adValvas.jsx

const PodiumCard = ({ score, position, eenheid }) => {
  const podiumColors = {
    1: { 
      bg: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600', 
      text: 'text-yellow-900', 
      icon: '🥇',
      shadow: 'shadow-yellow-500/30'
    },
    2: { 
      bg: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500', 
      text: 'text-gray-900', 
      icon: '🥈',
      shadow: 'shadow-gray-500/30'
    },
    3: { 
      bg: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600', 
      text: 'text-orange-900', 
      icon: '🥉',
      shadow: 'shadow-orange-500/30'
    }
  };
  
  const style = podiumColors[position];
  
  return (
    <div className={`${style.bg} ${style.shadow} rounded-2xl p-6 text-center shadow-xl transform hover:scale-105 hover:rotate-1 transition-all duration-500 ${position === 1 ? 'scale-105 animate-pulse' : ''}`}>
      <div className="text-6xl mb-4 animate-bounce">{style.icon}</div>
      <div className={`${style.text} font-bold text-xl mb-3 tracking-wide`}>
        {formatNameForDisplay(score.leerling_naam)}
      </div>
      <div className={`${style.text} text-3xl font-black mb-3 drop-shadow-sm`}>
        {formatScoreWithUnit(score.score, eenheid)}
      </div>
      <div className={`${style.text} opacity-80 text-sm font-medium`}>
        {getRelativeTime(score.datum ? new Date(score.datum) : new Date())}
      </div>
      {position === 1 && (
        <div className="mt-3">
          <div className="inline-flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
            <Star className="h-4 w-4" />
            <span className="text-sm font-bold">RECORD</span>
          </div>
        </div>
      )}
    </div>
  );
};

  const renderContentItem = (item) => {
    switch (item.type) {
     case CONTENT_TYPES.HIGHSCORES:
  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-10 max-w-7xl mx-auto overflow-hidden relative">
      {/* ... decoratieve elementen ... */}
      <div className="relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-black text-gray-800 mb-4 tracking-tight bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {item.data.test.naam}
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {item.data.scores.map((score, index) => (
            <PodiumCard 
              key={score.id} 
              score={score} 
              position={index + 1} 
              eenheid={item.data.test.eenheid}
            />
          ))}
        </div>
      </div>
    </div>
  );
  case 'mededeling':
        const MededelingIcoon = item.data.icoon;
        return (
          <div className={`relative bg-gradient-to-br ${item.data.kleur} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
            <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <MededelingIcoon className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">
                {item.data.type === 'prestatie' ? 'Prestatie in de Kijker' : 'Mededeling'}
              </span>
            </div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-full mb-8">
                <MededelingIcoon className="h-12 w-12 opacity-90" />
              </div>
              <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg mb-4">
                {item.data.tekst}
              </h2>
             
            </div>
          </div>
        );
    case 'placeholder':
        const PlaceholderIcon = item.data.icon;
        return (
          <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-lg p-12 max-w-6xl mx-auto text-white`}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full mb-8">
                <PlaceholderIcon className="h-12 w-12 opacity-90 animate-spin" />
              </div>
              <h2 className="text-2xl lg:text-4xl font-bold">
                {item.data.text}
              </h2>
            </div>
          </div>
        );

      case CONTENT_TYPES.LIVE_SPORTS_NEWS:
        return (
          <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-pink-800 rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden">
            {/* Live indicator */}
            <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold uppercase tracking-wider">Live News</span>
            </div>
            
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
              <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-1000"></div>
              <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping delay-2000"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
                <Activity className="h-10 w-10 opacity-80" />
              </div>
              <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg mb-6">
                {item.data.title}
              </h2>
              <div className="flex items-center justify-center space-x-4 text-red-100">
                <span className="text-sm font-medium">{item.data.source}</span>
                <div className="w-1 h-1 bg-red-200 rounded-full"></div>
                <span className="text-sm">{getRelativeTime(item.data.publishedAt)}</span>
              </div>
            </div>
          </div>
        );
case CONTENT_TYPES.BREAKING_NEWS:
      return (
        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-pink-800 rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden animate-pulse">
          {/* BREAKING NEWS indicator */}
          <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 animate-bounce">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            <span className="text-sm font-bold uppercase tracking-wider">BREAKING NEWS</span>
          </div>
          
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
            <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping delay-2000"></div>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <Trophy className="h-10 w-10 opacity-80 animate-spin" style={{animationDuration: '3s'}} />
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg mb-4">
              {item.data.title}
            </h2>
            <p className="text-xl lg:text-2xl mb-6 opacity-90">
              {item.data.subtitle}
            </p>
            <div className="flex items-center justify-center space-x-4 text-red-100">
              <span className="text-sm font-medium bg-white/20 rounded-full px-3 py-1">
                {getRelativeTime(item.data.timestamp)}
              </span>
            </div>
          </div>
        </div>
      );
      
    case CONTENT_TYPES.ACTIVE_TEST:
      return (
        <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
          {/* LIVE indicator */}
          <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold uppercase tracking-wider">VANDAAG ACTIEF</span>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <BookOpen className="h-10 w-10 opacity-80" />
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg mb-4">
              {item.data.text}
            </h2>
            <p className="text-xl opacity-80 mb-6">
              {item.data.subtitle}
            </p>
            <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
              <Activity className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Live updates</span>
            </div>
          </div>
        </div>
      );
      
    case CONTENT_TYPES.UPCOMING_EVENT:
      return (
        <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <Calendar className="h-10 w-10 opacity-80" />
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg mb-6">
              {item.data.text}
            </h2>
            <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{item.data.date}</span>
            </div>
          </div>
        </div>
      );
      case CONTENT_TYPES.QUOTE:
        return (
          <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
              <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-1000"></div>
              <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping delay-2000"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
                <Quote className="h-10 w-10 opacity-80" />
              </div>
              <blockquote className="text-2xl lg:text-4xl font-medium leading-relaxed mb-8 italic relative">
                <span className="text-6xl text-white/20 absolute -top-4 -left-2">"</span>
                {item.data.text}
                <span className="text-6xl text-white/20 absolute -bottom-8 -right-2">"</span>
              </blockquote>
              <cite className="text-xl opacity-90 font-semibold bg-white/10 rounded-full px-6 py-2 inline-block">
                — {item.data.author}
              </cite>
            </div>
          </div>
        );

      case CONTENT_TYPES.DAILY_ACTIVITY:
      case CONTENT_TYPES.WEEKLY_STATS:
      case CONTENT_TYPES.SEASON_STATS:
      case CONTENT_TYPES.SPORT_FACT:
        const IconComponent = item.data.icon;
        return (
          <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
            {/* Subtle animated background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-8 hover:scale-110 transition-transform duration-300">
                <IconComponent className="h-12 w-12 opacity-90" />
              </div>
              <h2 className="text-2xl lg:text-4xl font-bold leading-tight drop-shadow-sm">
                {item.data.text}
              </h2>
              
              {/* Add type indicator */}
              <div className="mt-6 inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium opacity-90 uppercase tracking-wider">
                  {item.type === CONTENT_TYPES.SPORT_FACT ? 'Wist je dat...' : 
                   item.type === CONTENT_TYPES.WEEKLY_STATS ? 'Deze week' :
                   item.type === CONTENT_TYPES.SEASON_STATS ? 'Seizoen update' : 'Vandaag'}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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

  const currentItem = contentItems[currentContentIndex];

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
            refreshContent(); // Vernieuw de content na succes
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
            {canPostMessages() && (
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
            {canPostMessages() && (
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
              {renderContentItem(currentItem)}
              
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
            onClick={() => fetchAllAdValvasData()}
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
          >
            <RefreshCw className="h-4 w-4" />
            Opnieuw
          </button>
        </div>
      )}

      {/* Enhanced Live Sport News Ticker - Desktop only */}
      {!school?.instellingen?.disableSportLiveFeed && (
      <div className="hidden lg:block bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t border-slate-700 fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <div className="flex items-center h-18 overflow-hidden">
          {/* Status indicator */}
          <div className={`flex items-center px-6 h-full shadow-lg ${
            feedStatus === 'online' ? 'bg-gradient-to-r from-green-600 to-green-700' :
            feedStatus === 'offline' ? 'bg-gradient-to-r from-red-600 to-red-700' :
            'bg-gradient-to-r from-yellow-600 to-yellow-700'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full border-2 border-white ${
                feedStatus === 'online' ? 'bg-green-400 animate-pulse' :
                feedStatus === 'offline' ? 'bg-red-400' :
                'bg-yellow-400 animate-ping'
              }`}></div>
              <div className="text-white font-bold text-sm uppercase tracking-wider">
                {feedStatus === 'online' ? 'Live Sport' :
                 feedStatus === 'offline' ? 'Offline' :
                 feedStatus === 'connecting' ? 'Connecting' :
                 feedStatus === 'refreshing' ? 'Refreshing' :
                 'Error'}
              </div>
            </div>
          </div>
          
          {/* News ticker */}
          <div className="flex-1 overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900">
            <div className="animate-marquee whitespace-nowrap text-white text-xl font-medium py-6 px-6">
              {liveNewsData.length > 0 ? (
                <>
                  {liveNewsData.slice(newsIndex, newsIndex + 3).map(news => news.title).join(' • ')} • 
                  {liveNewsData.slice(0, Math.max(0, 3 - (liveNewsData.length - newsIndex))).map(news => news.title).join(' • ')} •
                </>
              ) : feedStatus === 'offline' ? (
                "Geen live sportinfo op dit ogenblik • Offline modus actief • Probeer internet verbinding te herstellen •"
              ) : (
                "🏃‍♂️ Sport nieuws wordt geladen... • ⚽ Live updates komen eraan... • 🏆 Belgische sport in de spotlight... •"
              )}
            </div>
          </div>

          {/* Control panel */}
          <div className="flex items-center space-x-6 px-6 text-white/70">
            {lastFeedRefresh && (
              <div className="flex items-center space-x-2 text-xs">
                <Clock className="h-4 w-4" />
                <span>Update: {formatTime(lastFeedRefresh)}</span>
              </div>
            )}
            
            <div className="text-xs bg-white/10 rounded-full px-3 py-1">
              {liveNewsData.length} berichten
            </div>
            
            <button
              onClick={handleFeedRefresh}
              disabled={feedLoading}
              className="flex items-center space-x-2 text-xs hover:text-white transition-colors disabled:opacity-50 bg-white/10 hover:bg-white/20 rounded-full px-3 py-2"
              title="Vernieuw live sport feed"
            >
              {isOnline ? (
                <>
                  <RefreshCw className={`h-4 w-4 ${feedLoading ? 'animate-spin' : ''}`} />
                  <span>{feedLoading ? 'Loading...' : 'Refresh'}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Offline</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}