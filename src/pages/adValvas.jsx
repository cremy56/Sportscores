// src/pages/adValvas.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trophy, Star, TrendingUp, Calendar, Award, Zap, Target, Users, Clock, Medal, Activity } from 'lucide-react';

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

// --- Sport Nieuws API Functies ---
class SportNewsAPI {
  constructor() {
    this.newsCache = [];
    this.lastFetch = 0;
    this.cacheExpiry = 10 * 60 * 1000; // 10 minuten cache
    
    // API configuratie - voeg hier je eigen API keys toe
    this.apis = {
      newsapi: {
        key: process.env.REACT_APP_NEWSAPI_KEY || 'YOUR_NEWSAPI_KEY_HERE',
        baseUrl: 'https://newsapi.org/v2/everything'
      },
      mediastack: {
        key: process.env.REACT_APP_MEDIASTACK_KEY || 'YOUR_MEDIASTACK_KEY_HERE',
        baseUrl: 'https://api.mediastack.com/v1/news'
      },
      thenewsapi: {
        key: process.env.REACT_APP_THENEWSAPI_KEY || 'YOUR_THENEWSAPI_KEY_HERE',
        baseUrl: 'https://api.thenewsapi.com/v1/news/top'
      }
    };
    
    // Fallback nieuws voor als APIs niet beschikbaar zijn
    this.fallbackNews = [
      "🏃‍♂️ Laatste sportuitslagen worden geladen...",
      "⚽ Belgische sport nieuws wordt opgehaald...",
      "🏆 Live sport updates komen eraan...",
      "🥇 Actueel sport nieuws wordt verzameld...",
      "🚴‍♂️ Sport headlines worden geüpdatet...",
      "🏊‍♀️ Verse sportuitslagen onderweg...",
      "🎾 Sport nieuws feed wordt gesynchroniseerd...",
      "🏀 Belgische sport updates in voorbereiding..."
    ];
  }

  // Nieuws ophalen van NewsAPI (gratis tier: 1000 requests/maand)
  async fetchFromNewsAPI() {
    try {
      const url = new URL(this.apis.newsapi.baseUrl);
      url.searchParams.append('q', 'sport OR voetbal OR atletiek OR tennis OR basketbal OR wielrennen');
      url.searchParams.append('language', 'nl');
      url.searchParams.append('sortBy', 'publishedAt');
      url.searchParams.append('pageSize', '20');
      url.searchParams.append('apiKey', this.apis.newsapi.key);

      const response = await fetch(url);
      if (!response.ok) throw new Error(`NewsAPI error: ${response.status}`);
      
      const data = await response.json();
      
      return data.articles?.map(article => ({
        title: this.formatNewsTitle(article.title),
        source: article.source.name,
        publishedAt: new Date(article.publishedAt),
        url: article.url
      })) || [];
    } catch (error) {
      console.log('NewsAPI niet beschikbaar:', error.message);
      return [];
    }
  }

  // Nieuws ophalen van MediaStack (gratis tier: 1000 requests/maand)
  async fetchFromMediaStack() {
    try {
      const url = new URL(this.apis.mediastack.baseUrl);
      url.searchParams.append('access_key', this.apis.mediastack.key);
      url.searchParams.append('categories', 'sports');
      url.searchParams.append('countries', 'be,nl');
      url.searchParams.append('languages', 'nl,en');
      url.searchParams.append('limit', '20');

      const response = await fetch(url);
      if (!response.ok) throw new Error(`MediaStack error: ${response.status}`);
      
      const data = await response.json();
      
      return data.data?.map(article => ({
        title: this.formatNewsTitle(article.title),
        source: article.source,
        publishedAt: new Date(article.published_at),
        url: article.url
      })) || [];
    } catch (error) {
      console.log('MediaStack niet beschikbaar:', error.message);
      return [];
    }
  }

  // Nieuws ophalen van TheNewsAPI (gratis tier: 1000 requests/maand)
  async fetchFromTheNewsAPI() {
    try {
      const url = new URL(this.apis.thenewsapi.baseUrl);
      url.searchParams.append('api_token', this.apis.thenewsapi.key);
      url.searchParams.append('categories', 'sports');
      url.searchParams.append('locale', 'be,nl');
      url.searchParams.append('limit', '20');

      const response = await fetch(url);
      if (!response.ok) throw new Error(`TheNewsAPI error: ${response.status}`);
      
      const data = await response.json();
      
      return data.data?.map(article => ({
        title: this.formatNewsTitle(article.title),
        source: article.source,
        publishedAt: new Date(article.published_at),
        url: article.url
      })) || [];
    } catch (error) {
      console.log('TheNewsAPI niet beschikbaar:', error.message);
      return [];
    }
  }

  // Open source sport nieuws via RSS feeds
  async fetchFromRSSFeeds() {
    try {
      // Gebruik RSS2JSON service voor gratis RSS parsing
      const rssFeeds = [
        'https://www.sporza.be/nl/feeds/rss.xml',
        'https://www.hln.be/sport/rss.xml',
        'https://nos.nl/rss/sport.xml'
      ];

      const feedPromises = rssFeeds.map(async (feedUrl) => {
        try {
          const rssToJsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=10`;
          const response = await fetch(rssToJsonUrl);
          if (!response.ok) throw new Error(`RSS feed error: ${response.status}`);
          
          const data = await response.json();
          
          return data.items?.map(item => ({
            title: this.formatNewsTitle(item.title),
            source: data.feed?.title || 'Sport Nieuws',
            publishedAt: new Date(item.pubDate),
            url: item.link
          })) || [];
        } catch (error) {
          console.log(`RSS feed ${feedUrl} niet beschikbaar:`, error.message);
          return [];
        }
      });

      const results = await Promise.all(feedPromises);
      return results.flat();
    } catch (error) {
      console.log('RSS feeds niet beschikbaar:', error.message);
      return [];
    }
  }

  // Nieuws titel formatteren voor ticker
  formatNewsTitle(title) {
    if (!title) return '';
    
    // Verwijder site namen en overbodige info
    let formatted = title.replace(/\s*-\s*(Sporza|HLN|NOS|RTL|VTM).*$/, '');
    
    // Voeg sport emoji toe op basis van inhoud
    const sportEmojis = {
      'voetbal|football|soccer': '⚽',
      'tennis': '🎾',
      'basketbal|basket': '🏀',
      'wielrennen|cycling': '🚴‍♂️',
      'atletiek|athletics': '🏃‍♂️',
      'zwemmen|swimming': '🏊‍♀️',
      'hockey': '🏑',
      'volleyball|volley': '🏐',
      'formule|f1': '🏎️',
      'olympisch|olympic': '🏅',
      'goud|gold': '🥇',
      'zilver|silver': '🥈',
      'brons|bronze': '🥉'
    };

    for (const [keywords, emoji] of Object.entries(sportEmojis)) {
      if (new RegExp(keywords, 'i').test(formatted)) {
        formatted = `${emoji} ${formatted}`;
        break;
      }
    }

    return formatted.trim();
  }

  // Hoofd functie om nieuws op te halen
  async fetchSportsNews() {
    const now = Date.now();
    
    // Gebruik cache als nog geldig
    if (this.newsCache.length > 0 && (now - this.lastFetch) < this.cacheExpiry) {
      return this.newsCache;
    }

    console.log('Sport nieuws ophalen van APIs...');
    
    try {
      // Probeer alle APIs parallel
      const [newsApiResults, mediaStackResults, theNewsApiResults, rssResults] = await Promise.allSettled([
        this.fetchFromNewsAPI(),
        this.fetchFromMediaStack(),
        this.fetchFromTheNewsAPI(),
        this.fetchFromRSSFeeds()
      ]);

      // Verzamel alle succesvolle resultaten
      let allNews = [];
      
      [newsApiResults, mediaStackResults, theNewsApiResults, rssResults].forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allNews = [...allNews, ...result.value];
        }
      });

      // Sorteer op publicatiedatum (nieuwste eerst)
      allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      
      // Verwijder duplicaten op basis van titel
      const uniqueNews = allNews.filter((article, index, self) => 
        index === self.findIndex(t => t.title.toLowerCase() === article.title.toLowerCase())
      );

      // Gebruik de eerste 15 nieuwsberichten
      this.newsCache = uniqueNews.slice(0, 15);
      this.lastFetch = now;
      
      console.log(`${this.newsCache.length} sport nieuwsberichten geladen`);
      
      // Als er geen nieuws is, gebruik fallback
      if (this.newsCache.length === 0) {
        this.newsCache = this.fallbackNews.map(title => ({ title }));
      }
      
      return this.newsCache;
      
    } catch (error) {
      console.error('Fout bij ophalen sport nieuws:', error);
      
      // Gebruik fallback nieuws bij fout
      this.newsCache = this.fallbackNews.map(title => ({ title }));
      return this.newsCache;
    }
  }

  // Force refresh van nieuws
  async refreshNews() {
    this.newsCache = [];
    this.lastFetch = 0;
    return this.fetchSportsNews();
  }
}

export default function AdValvas() {
  const { profile, school } = useOutletContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [testHighscores, setTestHighscores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsIndex, setNewsIndex] = useState(0);
  const [sportNews, setSportNews] = useState([]);
  const [newsAPI] = useState(() => new SportNewsAPI());
  const [newsLoading, setNewsLoading] = useState(true);
  const [lastNewsRefresh, setLastNewsRefresh] = useState(null);

  // Sport nieuws ophalen
  useEffect(() => {
    const loadSportsNews = async () => {
      setNewsLoading(true);
      try {
        const news = await newsAPI.fetchSportsNews();
        setSportNews(news.map(article => article.title));
        setLastNewsRefresh(new Date());
      } catch (error) {
        console.error('Fout bij laden sport nieuws:', error);
        // Gebruik fallback bij fout
        setSportNews([
          "🏃‍♂️ Sport nieuws wordt geladen...",
          "⚽ Belgische sport updates komen eraan...",
          "🏆 Live sportuitslagen onderweg..."
        ]);
      } finally {
        setNewsLoading(false);
      }
    };

    loadSportsNews();

    // Herlaad nieuws elke 10 minuten
    const newsRefreshInterval = setInterval(loadSportsNews, 10 * 60 * 1000);
    
    return () => clearInterval(newsRefreshInterval);
  }, [newsAPI]);

  // Test scores ophalen
  useEffect(() => {
    const fetchTestHighscores = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const testenQuery = query(
          collection(db, 'testen'),
          where('school_id', '==', profile.school_id),
          where('is_actief', '==', true)
        );
        const testenSnap = await getDocs(testenQuery);
        const allTests = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const testHighscorePromises = allTests.map(async (test) => {
          const direction = test.score_richting === 'laag' ? 'asc' : 'desc';
          const scoreQuery = query(
            collection(db, 'scores'),
            where('test_id', '==', test.id),
            orderBy('score', direction),
            limit(3)
          );
          const scoreSnap = await getDocs(scoreQuery);
          
          const scores = scoreSnap.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            datum: doc.data().datum?.toDate ? doc.data().datum.toDate() : new Date(doc.data().datum)
          }));

          return scores.length > 0 ? { test, scores } : null;
        });

        const results = await Promise.all(testHighscorePromises);
        const validResults = results.filter(Boolean);
        setTestHighscores(validResults);

      } catch (error) {
        console.error('Error fetching test highscores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestHighscores();
  }, [profile?.school_id]);

  // Tijd updaten
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Test wisselen elke 5 seconden
  useEffect(() => {
    if (testHighscores.length === 0) return;
    
    const slideTimer = setInterval(() => {
      setAnimationClass('animate-pulse');
      setTimeout(() => {
        setCurrentTestIndex((prev) => (prev + 1) % testHighscores.length);
        setAnimationClass('');
      }, 300);
    }, 5000);
    return () => clearInterval(slideTimer);
  }, [testHighscores.length]);

  // Nieuws wisselen elke 8 seconden
  useEffect(() => {
    if (sportNews.length === 0) return;
    
    const newsTimer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % sportNews.length);
    }, 8000);
    return () => clearInterval(newsTimer);
  }, [sportNews.length]);
  
  const formatTime = (date) => date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  
  const getRelativeTime = (date) => {
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Vandaag';
    if (days === 1) return 'Gisteren';
    return `${days} dagen geleden`;
  };

  // Manual news refresh functie
  const handleNewsRefresh = async () => {
    setNewsLoading(true);
    try {
      const news = await newsAPI.refreshNews();
      setSportNews(news.map(article => article.title));
      setLastNewsRefresh(new Date());
    } catch (error) {
      console.error('Fout bij handmatig vernieuwen nieuws:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  const PodiumCard = ({ score, position }) => {
    const podiumColors = {
      1: { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', text: 'text-yellow-900', icon: '🥇' },
      2: { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', text: 'text-gray-900', icon: '🥈' },
      3: { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', text: 'text-orange-900', icon: '🥉' }
    };
    
    const style = podiumColors[position];
    
    return (
      <div className={`${style.bg} rounded-3xl p-6 text-center shadow-2xl transform hover:scale-105 transition-all duration-300 ${position === 1 ? 'scale-110' : ''}`}>
        <div className="text-4xl mb-3">{style.icon}</div>
        <div className={`${style.text} font-bold text-xl mb-2`}>
          {formatNameForDisplay(score.leerling_naam)}
        </div>
        <div className={`${style.text} text-3xl font-black mb-2`}>
          {formatScoreWithUnit(score.score, score.eenheid || '')}
        </div>
        <div className={`${style.text} opacity-80 text-sm`}>
          {getRelativeTime(score.datum)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/20">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white"></div>
            <span className="text-white text-xl font-medium">Laden...</span>
          </div>
        </div>
      </div>
    );
  }

  const currentTestData = testHighscores[currentTestIndex];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <img 
                src={school?.logo_url || "/logo.png"} 
                alt="School Logo" 
                className="h-12 sm:h-16 w-auto object-contain rounded-lg shadow-lg" 
                onError={(e) => { e.target.src = '/logo.png'; }} 
              />
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {school?.naam || 'Sportscores'}
                </h1>
                <p className="text-blue-200 text-sm sm:text-base font-medium">Sport Dashboard</p>
              </div>
            </div>
            
            <div className="text-center sm:text-right">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider">
                {formatTime(currentTime)}
              </div>
              <div className="text-blue-200 text-sm sm:text-base font-medium">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {testHighscores.length > 0 && currentTestData ? (
            <div className={`transition-all duration-500 ${animationClass}`}>
              {/* Test Title */}
              <div className="text-center mb-8 sm:mb-12">
                <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 mb-4">
                  <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
                  <span className="text-white text-xs sm:text-sm font-medium uppercase tracking-wider">Top 3</span>
                </div>
                <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-4 tracking-tight">
                  {currentTestData.test.naam}
                </h2>
                <p className="text-blue-200 text-lg sm:text-xl font-medium">
                  {currentTestData.test.categorie || 'Sporttest'}
                </p>
              </div>

              {/* Podium */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-8">
                {currentTestData.scores.map((score, index) => (
                  <PodiumCard key={score.id} score={score} position={index + 1} />
                ))}
              </div>

              {/* Test Indicator */}
              <div className="flex justify-center space-x-2 mb-8">
                {testHighscores.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentTestIndex === index 
                        ? 'bg-white scale-110' 
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-white/60" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Nog geen scores</h3>
                <p className="text-blue-200 max-w-md">
                  Zodra er sportscores worden ingevoerd, verschijnen hier de toppers!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Sport News Ticker */}
      <div className="relative z-10 bg-black border-t border-white/10">
        <div className="flex items-center h-16 overflow-hidden">
          <div className="flex items-center bg-red-600 px-4 h-full">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${newsLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400 animate-pulse'}`}></div>
              <span className="text-white font-bold text-sm uppercase tracking-wider">
                {newsLoading ? 'Loading' : 'Live Sport'}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee whitespace-nowrap text-white text-lg font-medium py-5">
              {sportNews.length > 0 ? (
                <>
                  {sportNews[newsIndex]} • {sportNews[(newsIndex + 1) % sportNews.length]} • {sportNews[(newsIndex + 2) % sportNews.length]} • 
                </>
              ) : (
                "🏃‍♂️ Sport nieuws wordt geladen... • ⚽ Live updates komen eraan... • "
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 px-4 text-white/60">
            {lastNewsRefresh && (
              <div className="hidden sm:flex items-center space-x-1 text-xs">
                <Clock className="h-3 w-3" />
                <span>Laatste update: {formatTime(lastNewsRefresh)}</span>
              </div>
            )}
            <button
              onClick={handleNewsRefresh}
              disabled={newsLoading}
              className="flex items-center space-x-1 text-xs hover:text-white transition-colors disabled:opacity-50"
              title="Vernieuw sport nieuws"
            >
              <Activity className={`h-4 w-4 ${newsLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .animate-marquee {
            animation: marquee 20s linear infinite;
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}