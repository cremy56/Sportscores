// src/pages/adValvas.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trophy, Star, TrendingUp, Calendar, RefreshCw, Award, Zap, Target, Users, Clock, Medal, Activity, Quote, Flame, BookOpen, BarChart3, TrendingDown } from 'lucide-react';

// --- Helper functies ---
const formatNameForDisplay = (fullName) => {
  if (!fullName) return 'Onbekend';
  const nameParts = fullName.split(' ');
  if (nameParts.length < 2) return fullName;
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  return `${firstName} ${lastName.charAt(0)}.`;
};

function formatScoreWithUnit(score, eenheid) {
  if (score === null || score === undefined) return '-';
  const eenheidLower = eenheid?.toLowerCase();
  if (eenheidLower === 'aantal') return `${score}x`;
  if (['min', 'sec', 'seconden'].includes(eenheidLower)) {
    const mins = Math.floor(score / 60);
    const secs = Math.floor(score % 60);
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  }
  return `${score} ${eenheid}`;
}
// Utility function voor shuffling arrays
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
// --- Content Types ---
const CONTENT_TYPES = {
  HIGHSCORES: 'highscores',
  QUOTE: 'quote',
  BREAKING_NEWS: 'breaking_news',
  DAILY_ACTIVITY: 'daily_activity',
  WEEKLY_STATS: 'weekly_stats',
  MONTHLY_MILESTONE: 'monthly_milestone',
  SEASON_STATS: 'season_stats',
  SPORT_FACT: 'sport_fact',
  UPCOMING_EVENT: 'upcoming_event'
};

// --- Motiverende Sportquotes ---
const SPORT_QUOTES = [
  {
    text: "Champions worden niet gemaakt in de gymzaal. Champions worden gemaakt van iets diep in hen: een verlangen, een droom, een visie.",
    author: "Muhammad Ali"
  },
  {
    text: "Succes is geen toeval. Het is hard werk, doorzettingsvermogen, leren, studeren, opoffering en vooral liefde voor wat je doet.",
    author: "Pelé"
  },
  {
    text: "Het gaat er niet om hoe sterk je bent, maar hoe sterk je kunt worden.",
    author: "Onbekend"
  },
  {
    text: "Elke expert was ooit een beginner. Elke professional was ooit een amateur.",
    author: "Robin Sharma"
  },
  {
    text: "Je lichaam kan het. Het is je geest die je moet overtuigen.",
    author: "Onbekend"
  },
  {
    text: "Sport doet niet alleen goed voor je lichaam, maar ook voor je geest.",
    author: "Onbekend"
  },
  {
    text: "Winnen betekent niet altijd eerste zijn. Winnen betekent beter worden dan je gisteren was.",
    author: "Onbekend"
  },
  {
    text: "De enige slechte training is de training die je niet doet.",
    author: "Onbekend"
  },
  {
    text: "Dromen worden werkelijkheid als je je inzet en hard werkt.",
    author: "Serena Williams"
  },
  {
    text: "Sport leert je dat falen niet het einde is, maar het begin van iets beters.",
    author: "Onbekend"
  }
];

// --- Sport Feiten ---
const SPORT_FACTS = [
  "Wist je dat 30 minuten sporten per dag je risico op hartziekte met 40% vermindert?",
  "Sport verbetert je geheugen en concentratie door meer zuurstof naar je hersenen te sturen.",
  "Regelmatig bewegen kan je levensverwachting met gemiddeld 7 jaar verlengen.",
  "Sport helpt bij het produceren van endorfines, de natuurlijke 'gelukshormonen' van je lichaam.",
  "Je spieren hebben 48-72 uur nodig om volledig te herstellen na intensieve training.",
  "Sport kan je slaapkwaliteit met tot 65% verbeteren.",
  "10.000 stappen per dag kan je risico op diabetes type 2 halveren.",
  "Sport verhoogt je zelfvertrouwen en vermindert stress en angst.",
  "Kinderen die sporten presteren gemiddeld 15% beter op school.",
  "Sport in teamverband verbetert je sociale vaardigheden en samenwerking."
];

// --- Sport Nieuws API Functies (unchanged from original) ---
class LiveSportsFeedAPI {
  constructor() {
    this.newsCache = [];
    this.lastFetch = 0;
    this.cacheExpiry = 10 * 60 * 1000; // 10 minuten cache
    this.fallbackMessage = "Geen recent sportnieuws beschikbaar";
  }

  async fetchFromRSS(feedUrl) {
    try {
      const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
      if (!response.ok) throw new Error(`Feed error: ${response.status}`);
      const data = await response.json();
      if (data.status === 'ok') {
        return data.items.map(item => ({ title: item.title })) || [];
      }
      return [];
    } catch (error) {
      console.warn(`Kon RSS feed niet laden: ${feedUrl}`, error.message);
      return [];
    }
  }

  async fetchLiveSportsData() {
    if (this.newsCache.length > 0 && (Date.now() - this.lastFetch) < this.cacheExpiry) {
      return this.newsCache;
    }
    
    console.log('Live sportnieuws ophalen...');
    const rssFeeds = [
     'https://www.hln.be/sport/rss.xml',
  'https://www.nieuwsblad.be/sport/rss.xml' // Stabiel alternatief
    ];

    const promises = rssFeeds.map(url => this.fetchFromRSS(url));
    const results = await Promise.all(promises);
    const allNews = results.flat();

    if (allNews.length > 0) {
      this.newsCache = [...new Set(allNews.map(item => item.title))].map(title => ({ title }));
    } else {
      this.newsCache = [{ title: this.fallbackMessage }];
    }
    
    this.lastFetch = Date.now();
    return this.newsCache;
  }
}

const liveFeedAPI = new LiveSportsFeedAPI();

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
  
  const [feedLoading, setFeedLoading] = useState(true);
  const [lastFeedRefresh, setLastFeedRefresh] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Seizoensgebonden content helper (uitgebreid)
  const getSeasonalContent = (month) => {
    const seasonalData = {
      // Lente (maart, april, mei)
      2: { text: "Lente is begonnen! Perfect weer om buiten te sporten 🌸", icon: Calendar, color: "from-green-400 to-blue-500" },
      3: { text: "April: Ideale maand voor atletiek en buitenactiviteiten! 🏃‍♂️", icon: Activity, color: "from-blue-400 to-green-500" },
      4: { text: "Mei: Sportdag voorbereidingen zijn in volle gang! 🏆", icon: Trophy, color: "from-yellow-400 to-green-500" },
      
      // Zomer (juni, juli, augustus)
      5: { text: "Zomersport seizoen geopend! Zwemmen en watersport! 🏊‍♀️", icon: Activity, color: "from-blue-500 to-cyan-500" },
      6: { text: "Juli: Zomerkampen en buitenactiviteiten! ☀️", icon: Calendar, color: "from-orange-400 to-red-500" },
      7: { text: "Augustus: Tijd om de laatste zomerrecords te verbreken!", icon: Zap, color: "from-red-500 to-yellow-500" },

      // Herfst (september, oktober, november)
      8: { text: "September: Terug naar school, vol nieuwe sportieve doelen!", icon: BookOpen, color: "from-orange-500 to-yellow-600" },
      9: { text: "Oktober: Het indoor sportseizoen start nu!", icon: BarChart3, color: "from-indigo-500 to-purple-600" },
      10: { text: "November: Focus op kracht en uithouding voor de winter.", icon: TrendingUp, color: "from-gray-500 to-gray-700" },

      // Winter (december, januari, februari)
      11: { text: "December: Blijf warm en actief tijdens de koude dagen!", icon: Flame, color: "from-red-600 to-orange-500" },
      0: { text: "Januari: Nieuw jaar, nieuwe records! Wat zijn jouw doelen?", icon: Star, color: "from-blue-600 to-cyan-400" },
      1: { text: "Februari: De eindsprint van het winterseizoen!", icon: TrendingDown, color: "from-cyan-400 to-teal-500" }
    };
    return seasonalData[month];
  };

  // Enhanced content genereren met meer variatie
  const generateContentItems = async () => {
    const items = [];
    
    testHighscores.forEach(testData => {
      items.push({
        type: CONTENT_TYPES.HIGHSCORES,
        data: testData,
        priority: 5,
        id: `highscore-${testData.test.id}`
      });
    });

    if (liveNewsData.length > 0) {
      const shuffledNews = shuffleArray([...liveNewsData]);
      const selectedNews = shuffledNews.slice(0, 3 + Math.floor(Math.random() * 3));
      selectedNews.forEach((news, index) => {
        items.push({
          type: CONTENT_TYPES.LIVE_SPORTS_NEWS,
          data: news,
          priority: 4,
          id: `live-news-${index}-${Date.now()}`
        });
      });
    }

    const dailyActivities = [
      { text: "Vandaag legde klas 4B de coopertest af - super resultaten! 💪", icon: BookOpen, color: "from-green-500 to-emerald-600" },
      { text: "Atletiekdag: Leerlingen braken persoonlijke records! 🏃‍♂️", icon: Target, color: "from-blue-500 to-cyan-600" },
    ];
    const randomDaily = dailyActivities[Math.floor(Math.random() * dailyActivities.length)];
    items.push({
      type: CONTENT_TYPES.DAILY_ACTIVITY,
      data: randomDaily,
      priority: 3,
      id: `daily-${Date.now()}`
    });

    const numQuotes = 5 + Math.floor(Math.random() * 4);
    const shuffledQuotes = shuffleArray([...SPORT_QUOTES]);
    for (let i = 0; i < numQuotes && i < shuffledQuotes.length; i++) {
      items.push({
        type: CONTENT_TYPES.QUOTE,
        data: shuffledQuotes[i],
        priority: 2,
        id: `quote-${i}-${Date.now()}`
      });
    }

    const numFacts = 8 + Math.floor(Math.random() * 5);
    const shuffledFacts = shuffleArray([...SPORT_FACTS]);
    for (let i = 0; i < numFacts && i < shuffledFacts.length; i++) {
      items.push({
        type: CONTENT_TYPES.SPORT_FACT,
        data: { text: shuffledFacts[i], icon: Target, color: "from-purple-500 to-indigo-600" },
        priority: 2,
        id: `fact-${i}-${Date.now()}`
      });
    }

    const currentMonth = new Date().getMonth();
    const seasonalContent = getSeasonalContent(currentMonth);
    if (seasonalContent) {
      items.push({
        type: CONTENT_TYPES.SEASON_STATS,
        data: seasonalContent,
        priority: 3,
        id: `seasonal-${currentMonth}`
      });
    }

    const shuffledItems = shuffleArray(items);
    return shuffledItems.sort((a, b) => b.priority - a.priority);
  };
  
  // Intelligente content selectie
  const getNextContentIndex = (currentItems) => {
      if (currentItems.length <= 1) return 0;
      let nextIndex = (currentContentIndex + 1) % currentItems.length;
      return nextIndex;
  };
  
  // Live sport feed ophalen
  useEffect(() => {
    const loadLiveSportsFeed = async () => {
      setFeedLoading(true);
      try {
        const feedData = await liveFeedAPI.fetchLiveSportsData();
        setLiveNewsData(feedData.news || []);
        setLiveScoresData(feedData.scores || []);
        setLastFeedRefresh(new Date());
      } catch (error) {
        console.error('❌ Fout bij laden live feed:', error);
      } finally {
        setFeedLoading(false);
      }
    };
    loadLiveSportsFeed();
    const feedRefreshInterval = setInterval(loadLiveSportsFeed, 5 * 60 * 1000);
    return () => clearInterval(feedRefreshInterval);
  }, []); // Lege array, want liveFeedAPI is nu een constante.

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

  // Test highscores ophalen
  useEffect(() => {
    const fetchTestHighscores = async () => {
      if (!profile?.school_id) { setLoading(false); return; }
      setLoading(true);
      try {
        const testenQuery = query(collection(db, 'testen'), where('school_id', '==', profile.school_id), where('is_actief', '==', true));
        const testenSnap = await getDocs(testenQuery);
        const allTests = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const testHighscorePromises = allTests.map(async (test) => {
          const direction = test.score_richting === 'laag' ? 'asc' : 'desc';
          const scoreQuery = query(collection(db, 'scores'), where('test_id', '==', test.id), orderBy('score', direction), limit(3));
          const scoreSnap = await getDocs(scoreQuery);
          const scores = scoreSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, datum: doc.data().datum?.toDate ? doc.data().datum.toDate() : new Date(doc.data().datum) }));
          return scores.length > 0 ? { test, scores } : null;
        });
        const results = await Promise.all(testHighscorePromises);
        setTestHighscores(results.filter(Boolean));
      } catch (error) {
        console.error('Error fetching test highscores:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTestHighscores();
  }, [profile?.school_id]);

  // Update content items
  useEffect(() => {
    const updateContent = async () => {
      if (loading) return;
      const items = await generateContentItems();
      setContentItems(items);
    };
    updateContent();
  }, [testHighscores, liveNewsData, liveScoresData, loading]);

  // Tijd & slide timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const slideTimer = setInterval(() => {
      if (contentItems.length > 0) {
        setAnimationClass('animate-pulse');
        setTimeout(() => {
          setCurrentContentIndex(getNextContentIndex(contentItems));
          setAnimationClass('');
        }, 300);
      }
    }, 8000);
    return () => { clearInterval(timer); clearInterval(slideTimer); };
  }, [contentItems, currentContentIndex]);

  // Nieuws ticker timer
  useEffect(() => {
    if (liveNewsData.length === 0) return;
    const newsTimer = setInterval(() => setNewsIndex((prev) => (prev + 1) % liveNewsData.length), 15000);
    return () => clearInterval(newsTimer);
  }, [liveNewsData.length]);
  
  // Andere helpers
  const formatTime = (date) => date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  const getRelativeTime = (date) => {
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Vandaag';
    if (days === 1) return 'Gisteren';
    if (days < 7) return `${days} dagen geleden`;
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weken'} geleden`;
  };
  
  // Render sub-componenten
  const PodiumCard = ({ score, position }) => {
    const podiumColors = {
      1: { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', text: 'text-yellow-900', icon: '🥇' },
      2: { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', text: 'text-gray-900', icon: '🥈' },
      3: { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', text: 'text-orange-900', icon: '🥉' }
    };
    const style = podiumColors[position];
    return (
      <div className={`${style.bg} rounded-2xl p-6 text-center shadow-lg transform hover:scale-105 transition-all duration-300 ${position === 1 ? 'scale-105' : ''}`}>
        <div className="text-5xl mb-4">{style.icon}</div>
        <div className={`${style.text} font-bold text-lg mb-2`}>{formatNameForDisplay(score.leerling_naam)}</div>
        <div className={`${style.text} text-2xl font-black mb-2`}>{formatScoreWithUnit(score.score, score.eenheid || '')}</div>
        <div className={`${style.text} opacity-80 text-sm`}>{getRelativeTime(score.datum)}</div>
      </div>
    );
  };
  
  const renderContentItem = (item) => {
    if (!item) return null; // Veiligheidscontrole
    switch (item.type) {
      case CONTENT_TYPES.HIGHSCORES:
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-6xl mx-auto">
            <div className="text-center mb-10"><h2 className="text-3xl lg:text-5xl font-bold text-gray-800 tracking-tight">{item.data.test.naam}</h2></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">{item.data.scores.map((score, index) => <PodiumCard key={score.id} score={score} position={index + 1} />)}</div>
          </div>
        );
      case CONTENT_TYPES.QUOTE:
        return (
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-10 max-w-6xl mx-auto text-white">
            <div className="text-center"><Quote className="h-12 w-12 mx-auto mb-6 opacity-80" /><blockquote className="text-2xl lg:text-3xl font-medium leading-relaxed mb-6 italic">"{item.data.text}"</blockquote><cite className="text-lg opacity-90 font-semibold">— {item.data.author}</cite></div>
          </div>
        );
      case CONTENT_TYPES.BREAKING_NEWS:
        return (
          <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg p-10 max-w-6xl mx-auto text-white">
            <div className="text-center"><div className="inline-flex items-center space-x-3 bg-white/20 rounded-full px-6 py-3 mb-6"><Flame className="h-6 w-6 animate-pulse" /><span className="font-bold uppercase tracking-wider">Breaking News</span></div><h2 className="text-2xl lg:text-4xl font-bold leading-tight">{item.data.text}</h2></div>
          </div>
        );
      case CONTENT_TYPES.DAILY_ACTIVITY:
      case CONTENT_TYPES.WEEKLY_STATS:
      case CONTENT_TYPES.SPORT_FACT:
      case CONTENT_TYPES.SEASON_STATS:
        const IconComponent = item.data.icon;
        return (
          <div className={`bg-gradient-to-br ${item.data.color} rounded-2xl shadow-lg p-10 max-w-6xl mx-auto text-white`}>
            <div className="text-center"><IconComponent className="h-16 w-16 mx-auto mb-6 opacity-90" /><h2 className="text-2xl lg:text-4xl font-bold leading-tight">{item.data.text}</h2></div>
          </div>
        );
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm"><div className="flex items-center space-x-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div><span className="text-gray-700 font-medium">Sport dashboard laden...</span></div></div>
      </div>
    );
  }

  const currentItem = contentItems[currentContentIndex];

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-7xl mx-auto px-4 pt-8 pb-6 lg:px-8 lg:pt-8 lg:pb-8">
          <div className="hidden lg:block mb-8">
            <div className="flex justify-between items-center"><div className="flex items-center space-x-6"><img src={school?.logo_url || "/logo.png"} alt="School Logo" className="h-16 w-auto object-contain rounded-lg shadow-sm" onError={(e) => { e.target.src = '/logo.png'; }} /><div><h1 className="text-3xl font-black text-gray-800 font-mono tracking-wider">Sport Dashboard</h1></div></div><div className="text-right"><div className="text-4xl font-black text-gray-800 font-mono tracking-wider">{formatTime(currentTime)}</div><div className="text-gray-600 text-lg">{formatDate(currentTime)}</div></div></div>
          </div>
          {contentItems.length > 0 && currentItem ? (
            <div className={`transition-all duration-500 ${animationClass} mb-8`}>
              {renderContentItem(currentItem)}
              <div className="flex justify-center space-x-2 mt-8">{contentItems.map((_, index) => (<button key={index} onClick={() => setCurrentContentIndex(index)} className={`w-3 h-3 rounded-full transition-all duration-300 ${currentContentIndex === index ? 'bg-purple-600 scale-110' : 'bg-gray-300 hover:bg-gray-400'}`} />))}</div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 text-center p-12 max-w-2xl mx-auto mb-8"><div className="mb-6"><div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trophy className="w-8 h-8 text-purple-600" /></div><h3 className="text-2xl font-bold text-gray-800 mb-2">Dashboard wordt voorbereid</h3><p className="text-gray-600 leading-relaxed">Zodra er sportscores worden ingevoerd, komt het dashboard tot leven!</p></div></div>
          )}
        </div>
      </div>
      <div className="bg-slate-900 border-t border-slate-700 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex items-center h-16 overflow-hidden"><div className="flex items-center bg-red-600 px-4 h-full"><div className="flex items-center space-x-2"><div className={`w-2 h-2 rounded-full ${feedLoading ? 'bg-yellow-400 animate-ping' : isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div><span className="text-white font-bold text-sm uppercase tracking-wider">{feedLoading ? 'Laden' : isOnline ? 'Live' : 'Offline'}</span></div></div><div className="flex-1 overflow-hidden"><div className="animate-marquee whitespace-nowrap text-white text-lg font-medium py-5">{(liveNewsData.length > 0 ? liveNewsData : [{title: liveFeedAPI.fallbackMessage}]).map(news => news.title).join(' • ')}</div></div><div className="flex items-center space-x-4 px-4 text-white/60"><div className="flex items-center space-x-1 text-xs"><Clock className="h-3 w-3" /><span>{lastFeedRefresh ? `Update: ${formatTime(lastFeedRefresh)}` : 'Wachten...'}</span></div><button onClick={() => liveFeedAPI.refreshData()} disabled={feedLoading} className="flex items-center space-x-1 text-xs hover:text-white transition-colors disabled:opacity-50" title="Vernieuw sport nieuws"><RefreshCw className={`h-4 w-4 ${feedLoading ? 'animate-spin' : ''}`} /><span>Refresh</span></button></div></div>
      </div>
      <style jsx>{`@keyframes marquee { 0% { transform: translateX(50%); } 100% { transform: translateX(-100%); } } .animate-marquee { display: inline-block; padding-left: 100%; animation: marquee 60s linear infinite; }`}</style>
    </div>
  );
}