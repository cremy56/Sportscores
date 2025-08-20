// src/pages/adValvas.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trophy, TrendingUp, Calendar, Award, Zap, Target, Users, Clock, Medal, Activity, Star, ChevronRight, Newspaper, Flame, ArrowUp, ArrowDown, Crown } from 'lucide-react';

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

// --- Sport Nieuws API (Vereenvoudigd voor dashboard) ---
class SportNewsAPI {
  constructor() {
    this.newsCache = [];
    this.lastFetch = 0;
    this.cacheExpiry = 15 * 60 * 1000; // 15 minuten cache
    
    this.fallbackNews = [
      { title: "🏃‍♂️ Nieuwe sportscores worden dagelijks toegevoegd aan het systeem", category: "Info" },
      { title: "⚽ Bekijk je persoonlijke prestaties in het dashboard", category: "Tip" },
      { title: "🏆 Top 3 klassementen worden real-time bijgewerkt", category: "Feature" },
      { title: "🥇 Stel doelen en track je vooruitgang over tijd", category: "Motivatie" },
      { title: "🚴‍♂️ Vergelijk je scores met klasgenoten", category: "Social" }
    ];
  }

  async fetchSportsNews() {
    const now = Date.now();
    if (this.newsCache.length > 0 && (now - this.lastFetch) < this.cacheExpiry) {
      return this.newsCache;
    }

    try {
      // Probeer RSS feeds voor Belgisch sportneuws
      const rssFeeds = [
        'https://www.sporza.be/nl/feeds/rss.xml',
        'https://www.hln.be/sport/rss.xml'
      ];

      const feedPromises = rssFeeds.slice(0, 1).map(async (feedUrl) => {
        try {
          const rssToJsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=5`;
          const response = await fetch(rssToJsonUrl);
          if (!response.ok) throw new Error(`RSS feed error: ${response.status}`);
          
          const data = await response.json();
          return data.items?.slice(0, 5).map(item => ({
            title: this.formatNewsTitle(item.title),
            category: "Sport Nieuws",
            publishedAt: new Date(item.pubDate),
            url: item.link
          })) || [];
        } catch (error) {
          return [];
        }
      });

      const results = await Promise.all(feedPromises);
      const allNews = results.flat();

      if (allNews.length > 0) {
        this.newsCache = allNews.slice(0, 5);
      } else {
        this.newsCache = this.fallbackNews;
      }
      
      this.lastFetch = now;
      return this.newsCache;
    } catch (error) {
      this.newsCache = this.fallbackNews;
      return this.newsCache;
    }
  }

  formatNewsTitle(title) {
    if (!title) return '';
    let formatted = title.replace(/\s*-\s*(Sporza|HLN|NOS|RTL|VTM).*$/, '');
    
    const sportEmojis = {
      'voetbal|football': '⚽',
      'tennis': '🎾',
      'basketbal': '🏀',
      'wielrennen|cycling': '🚴‍♂️',
      'atletiek|athletics': '🏃‍♂️',
      'zwemmen|swimming': '🏊‍♀️',
      'olympisch|olympic': '🏅'
    };

    for (const [keywords, emoji] of Object.entries(sportEmojis)) {
      if (new RegExp(keywords, 'i').test(formatted)) {
        formatted = `${emoji} ${formatted}`;
        break;
      }
    }
    return formatted.trim();
  }
}

export default function AdValvas() {
  const { profile, school } = useOutletContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [testHighscores, setTestHighscores] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [records, setRecords] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportNews, setSportNews] = useState([]);
  const [newsAPI] = useState(() => new SportNewsAPI());
  const [dashboardStats, setDashboardStats] = useState({
    totalTests: 0,
    totalScores: 0,
    activeGroups: 0,
    todayScores: 0
  });

  // Data ophalen
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // 1. Haal alle actieve testen op
        const testenQuery = query(
          collection(db, 'testen'),
          where('school_id', '==', profile.school_id),
          where('is_actief', '==', true)
        );
        const testenSnap = await getDocs(testenQuery);
        const allTests = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. Top scores per test
        const testHighscorePromises = allTests.slice(0, 6).map(async (test) => {
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

        const highscoreResults = await Promise.all(testHighscorePromises);
        setTestHighscores(highscoreResults.filter(Boolean));

        // 3. Recente activiteit (laatste scores)
        const recentScoresQuery = query(
          collection(db, 'scores'),
          orderBy('datum', 'desc'),
          limit(10)
        );
        const recentScoresSnap = await getDocs(recentScoresQuery);
        const recentActivities = await Promise.all(
          recentScoresSnap.docs.map(async (scoreDoc) => {
            const scoreData = scoreDoc.data();
            const testDoc = await getDoc(doc(db, 'testen', scoreData.test_id));
            return {
              id: scoreDoc.id,
              ...scoreData,
              datum: scoreData.datum?.toDate ? scoreData.datum.toDate() : new Date(scoreData.datum),
              testNaam: testDoc.exists() ? testDoc.data().naam : 'Onbekende test'
            };
          })
        );
        setRecentActivity(recentActivities);

        // 4. Dashboard statistieken
        const totalScoresQuery = query(collection(db, 'scores'));
        const totalScoresSnap = await getDocs(totalScoresQuery);
        
        const groepenQuery = query(
          collection(db, 'groepen'),
          where('school_id', '==', profile.school_id)
        );
        const groepenSnap = await getDocs(groepenQuery);

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayScores = totalScoresSnap.docs.filter(doc => {
          const scoreDate = doc.data().datum?.toDate ? doc.data().datum.toDate() : new Date(doc.data().datum);
          return scoreDate >= todayStart;
        });

        setDashboardStats({
          totalTests: allTests.length,
          totalScores: totalScoresSnap.size,
          activeGroups: groepenSnap.size,
          todayScores: todayScores.length
        });

        // 5. Mock records en verbeteringen (in productie uit database)
        setRecords([
          { leerling: "Emma V.", test: "100m sprint", score: "12.34s", type: "School Record", datum: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { leerling: "Lucas M.", test: "Verspringen", score: "4.82m", type: "Jaargroep Record", datum: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { leerling: "Sophie D.", test: "800m", score: "2'45\"", type: "Persoonlijk Record", datum: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
        ]);

        setImprovements([
          { leerling: "Thomas K.", test: "Sit-ups", verbetering: "+15", percentage: 25, datum: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          { leerling: "Anna R.", test: "Cooper test", verbetering: "+180m", percentage: 12, datum: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
          { leerling: "Milan B.", test: "Flexibiliteit", verbetering: "+8cm", percentage: 32, datum: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }
        ]);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile?.school_id]);

  // Sport nieuws ophalen
  useEffect(() => {
    const loadSportsNews = async () => {
      try {
        const news = await newsAPI.fetchSportsNews();
        setSportNews(news);
      } catch (error) {
        console.error('Fout bij laden sport nieuws:', error);
        setSportNews(newsAPI.fallbackNews);
      }
    };
    loadSportsNews();
  }, [newsAPI]);

  // Tijd updaten
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  
  const getRelativeTime = (date) => {
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Vandaag';
    if (days === 1) return 'Gisteren';
    return `${days} dagen geleden`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="text-gray-700 font-medium">Dashboard laden...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-24 lg:pb-8">
          
          {/* Header met tijd */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                  Sport Dashboard
                </h1>
                <p className="text-gray-600">
                  {school?.naam || 'Welkom bij'} - Live overzicht van alle sportprestaties
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono">
                  {formatTime(currentTime)}
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(currentTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Statistieken */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-xl">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalTests}</p>
                  <p className="text-sm text-gray-600">Actieve Testen</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-xl">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalScores}</p>
                  <p className="text-sm text-gray-600">Totaal Scores</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-xl">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeGroups}</p>
                  <p className="text-sm text-gray-600">Groepen</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-2 rounded-xl">
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.todayScores}</p>
                  <p className="text-sm text-gray-600">Vandaag</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Linker kolom - Top Prestaties */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Records en Highlights */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Crown className="h-6 w-6 text-yellow-600" />
                  <h2 className="text-xl font-bold text-gray-900">🏆 Records & Highlights</h2>
                </div>
                
                <div className="space-y-4">
                  {records.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {record.type === 'School Record' ? '🥇' : record.type === 'Jaargroep Record' ? '🥈' : '⭐'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{record.leerling}</p>
                          <p className="text-sm text-gray-600">{record.test}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{record.score}</p>
                        <p className="text-xs text-gray-500">{getRelativeTime(record.datum)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 3 per Test */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Trophy className="h-6 w-6 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900">🏆 Top Prestaties</h2>
                </div>
                
                <div className="space-y-6">
                  {testHighscores.slice(0, 3).map((testData, testIndex) => (
                    <div key={testIndex} className="border border-slate-200 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 mb-4">{testData.test.naam}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {testData.scores.map((score, index) => {
                          const positions = ['🥇', '🥈', '🥉'];
                          const bgColors = ['bg-yellow-100 border-yellow-300', 'bg-gray-100 border-gray-300', 'bg-orange-100 border-orange-300'];
                          return (
                            <div key={score.id} className={`${bgColors[index]} border rounded-lg p-3 text-center`}>
                              <div className="text-2xl mb-2">{positions[index]}</div>
                              <p className="font-bold text-gray-900">{formatNameForDisplay(score.leerling_naam)}</p>
                              <p className="text-lg font-bold text-gray-800">{formatScoreWithUnit(score.score, score.eenheid)}</p>
                              <p className="text-xs text-gray-500">{getRelativeTime(score.datum)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grootste Verbeteringen */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <h2 className="text-xl font-bold text-gray-900">🔥 Grootste Verbeteringen</h2>
                </div>
                
                <div className="space-y-4">
                  {improvements.map((improvement, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                      <div className="flex items-center space-x-4">
                        <div className="bg-green-100 p-2 rounded-full">
                          <ArrowUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{improvement.leerling}</p>
                          <p className="text-sm text-gray-600">{improvement.test}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{improvement.verbetering}</p>
                        <p className="text-sm text-green-500">+{improvement.percentage}%</p>
                        <p className="text-xs text-gray-500">{getRelativeTime(improvement.datum)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rechter kolom - Activiteit en Nieuws */}
            <div className="space-y-8">
              
              {/* Recente Activiteit */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Clock className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">📊 Recente Activiteit</h2>
                </div>
                
                <div className="space-y-3">
                  {recentActivity.slice(0, 8).map((activity, index) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{formatNameForDisplay(activity.leerling_naam)}</p>
                        <p className="text-xs text-gray-600">{activity.testNaam}</p>
                        <p className="text-xs text-gray-500">{getRelativeTime(activity.datum)}</p>
                      </div>
                      <div className="text-sm font-bold text-gray-800">
                        {formatScoreWithUnit(activity.score, activity.eenheid)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sport Nieuws */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Newspaper className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-900">📰 Sport Nieuws</h2>
                </div>
                
                <div className="space-y-4">
                  {sportNews.slice(0, 5).map((news, index) => (
                    <div key={index} className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-start space-x-3">
                        <div className="bg-indigo-100 p-1 rounded">
                          <Star className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 leading-relaxed">{news.title}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                              {news.category}
                            </span>
                            {news.url && (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Komende Tests/Evenementen */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Calendar className="h-6 w-6 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900">📅 Komende Evenementen</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="font-medium text-gray-900">Atletiek Championships</p>
                    <p className="text-sm text-gray-600">15 maart 2024</p>
                    <p className="text-xs text-purple-600">Inschrijvingen open</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-medium text-gray-900">Cooper Test Week</p>
                    <p className="text-sm text-gray-600">22-26 maart 2024</p>
                    <p className="text-xs text-blue-600">Voor alle groepen</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-medium text-gray-900">Sport Gala</p>
                    <p className="text-sm text-gray-600">5 april 2024</p>
                    <p className="text-xs text-green-600">Prijsuitreiking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}