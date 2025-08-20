// src/pages/adValvas.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trophy, Quote, Flame, BookOpen, BarChart3, Clock } from 'lucide-react';

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

// --- Fallback Data ---
const FALLBACK_QUOTES = [
  { text: "De enige slechte training is de training die je niet doet.", author: "Onbekend" },
  { text: "Succes is geen toeval. Het is hard werk, doorzettingsvermogen en liefde voor wat je doet.", author: "Pelé" }
];
const FALLBACK_FACTS = [
  "Wist je dat 30 minuten sporten per dag je risico op hartziekte met 40% vermindert?"
];

// --- Live Data Functies ---
async function fetchLiveQuote() {
    try {
        const response = await fetch('https://api.quotable.io/random?tags=sports|motivation');
        if (!response.ok) throw new Error('API response not OK');
        const data = await response.json();
        return { text: data.content, author: data.author };
    } catch (error) {
        console.warn("Live quote API mislukt, fallback wordt gebruikt.", error);
        return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    }
}

async function fetchLiveFact() {
    try {
        const response = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
        if (!response.ok) throw new Error('API response not OK');
        const data = await response.json();
        return `Wist je dat: ${data.text}`;
    } catch (error) {
        console.warn("Live fact API mislukt, fallback wordt gebruikt.", error);
        return FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
    }
}

// AANGEPAST: Functie om live sportnieuws op te halen
async function fetchSportsNews() {
    const rssFeeds = [
        'https://www.sporza.be/nl/feeds/rss.xml',
        'https://www.hln.be/sport/rss.xml',
        'https://nos.nl/rss/sport.xml'
    ];
    
    const promises = rssFeeds.map(feedUrl => 
        fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`)
            .then(response => {
                if (!response.ok) throw new Error(`Feed error: ${response.status}`);
                return response.json();
            })
    );
    
    const results = await Promise.allSettled(promises);
    
    let allItems = [];
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.status === 'ok') {
            allItems.push(...result.value.items);
        } else {
            console.warn('Kon een RSS feed niet laden:', result.reason || result.value?.message);
        }
    });

    // Shuffle en limiteer het aantal items
    return allItems.sort(() => 0.5 - Math.random()).slice(0, 15);
}

// --- Hoofdcomponent ---
export default function AdValvas() {
  const { profile, school } = useOutletContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [contentItems, setContentItems] = useState([]);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [tickerText, setTickerText] = useState('Recente sportprestaties worden geladen...'); // State voor de live feed

  // Data ophalen en content genereren
  useEffect(() => {
    const fetchDataAndGenerateContent = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const recentScoresQuery = query(
          collection(db, 'scores'),
          where('school_id', '==', profile.school_id),
          orderBy('datum', 'desc'),
          limit(10)
        );
        const recentScoresSnap = await getDocs(recentScoresQuery);
        const recentScores = recentScoresSnap.docs.map(d => ({ ...d.data(), id: d.id, datum: d.data().datum.toDate() }));
        const items = await generateContentItems(recentScores);
        setContentItems(items);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDataAndGenerateContent();
  }, [profile?.school_id]);
  
  // AANGEPAST: Aparte useEffect om de live nieuwsfeed te laden
  useEffect(() => {
    const loadNews = async () => {
      const newsItems = await fetchSportsNews();
      if (newsItems.length > 0) {
        const tickerString = newsItems.map(item => item.title).join(' • ');
        setTickerText(tickerString);
      } else {
        setTickerText('Geen recent sportnieuws gevonden.');
      }
    };
    loadNews();
  }, []);

  // Functie om de content voor de carrousel te genereren
  const generateContentItems = async (recentScores) => {
    const items = [];
    const today = new Date().toDateString();
    const todaysScores = recentScores.filter(s => s.datum.toDateString() === today);
    if (todaysScores.length > 0) {
        const groupCount = new Set(todaysScores.map(s => s.groep_id)).size;
        const groupText = groupCount === 1 ? '1 klas' : `${groupCount} klassen`;
        items.push({ type: 'daily_activity', data: { text: `Vandaag waren er sporttesten in ${groupText}! 💪` }, priority: 4 });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const veryRecentScores = recentScores.filter(s => s.datum >= yesterday);
    for (const score of veryRecentScores) {
        const testDoc = await getDoc(doc(db, 'testen', score.test_id));
        if (!testDoc.exists()) continue;
        const testData = testDoc.data();
        const direction = testData.score_richting === 'laag' ? 'asc' : 'desc';
        const recordQuery = query(collection(db, 'scores'), where('test_id', '==', score.test_id), orderBy('score', direction), limit(1));
        const recordSnap = await getDocs(recordQuery);
        if (!recordSnap.empty && recordSnap.docs[0].id === score.id) {
            items.push({
                type: 'breaking_news',
                data: { text: `🔥 NIEUW RECORD! ${formatNameForDisplay(score.leerling_naam)} verbeterde het schoolrecord ${testData.naam} met ${formatScoreWithUnit(score.score, testData.eenheid)}!` },
                priority: 5
            });
        }
    }

    items.push({ type: 'quote', data: await fetchLiveQuote(), priority: 2 });
    items.push({ type: 'sport_fact', data: { text: await fetchLiveFact() }, priority: 1 });
    return items.sort((a, b) => b.priority - a.priority);
  };
  
  // Tijd en slide-rotatie
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (contentItems.length < 2) return;
    const slideTimer = setInterval(() => {
      setAnimationClass('animate-pulse');
      setTimeout(() => {
        setCurrentContentIndex((prev) => (prev + 1) % contentItems.length);
        setAnimationClass('');
      }, 300);
    }, 8000);
    return () => clearInterval(slideTimer);
  }, [contentItems.length]);
  
  const formatTime = (date) => date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Render Functies
  const renderContentItem = (item) => {
    switch (item.type) {
        case 'quote':
            return (
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-10 max-w-6xl mx-auto text-white">
                    <div className="text-center">
                        <Quote className="h-12 w-12 mx-auto mb-6 opacity-80" />
                        <blockquote className="text-2xl lg:text-3xl font-medium leading-relaxed mb-6 italic">"{item.data.text}"</blockquote>
                        <cite className="text-lg opacity-90 font-semibold">— {item.data.author}</cite>
                    </div>
                </div>
            );
        case 'breaking_news':
            return (
                <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg p-10 max-w-6xl mx-auto text-white">
                    <div className="text-center">
                        <div className="inline-flex items-center space-x-3 bg-white/20 rounded-full px-6 py-3 mb-6">
                            <Flame className="h-6 w-6 animate-pulse" />
                            <span className="font-bold uppercase tracking-wider">Breaking News</span>
                        </div>
                        <h2 className="text-2xl lg:text-4xl font-bold leading-tight">{item.data.text}</h2>
                    </div>
                </div>
            );
        case 'daily_activity':
        case 'sport_fact':
            // Variabele hernoemd naar 'Icon' met een hoofdletter
            const Icon = item.type === 'daily_activity' ? BookOpen : BarChart3; 
            const color = item.type === 'daily_activity' ? "from-green-500 to-emerald-600" : "from-blue-500 to-cyan-600";
            return (
                <div className={`bg-gradient-to-br ${color} rounded-2xl shadow-lg p-10 max-w-6xl mx-auto text-white`}>
                    <div className="text-center">
                        {/* Correcte JSX-syntax gebruikt om het icoon te renderen */}
                        <Icon className="h-16 w-16 mx-auto mb-6 opacity-90" />
                        <h2 className="text-2xl lg:text-4xl font-bold leading-tight">{item.data.text}</h2>
                    </div>
                </div>
            );
        default: return null;
    }
};

  if (loading) {
      return (
          <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
              <div className="bg-white p-8 rounded-2xl shadow-sm">
                  <div className="flex items-center space-x-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      <span className="text-gray-700 font-medium">Sport dashboard laden...</span>
                  </div>
              </div>
          </div>
      );
  }
  
  const currentItem = contentItems[currentContentIndex];

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="max-w-7xl mx-auto px-4 pt-20 pb-6 lg:px-8 lg:pt-16 lg:pb-8">
          <div className="hidden lg:block mb-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <img src={school?.logo_url || "/logo.png"} alt="School Logo" className="h-16 w-auto object-contain rounded-lg shadow-sm" onError={(e) => { e.target.src = '/logo.png'; }} />
                <div>
                  <h1 className="text-3xl font-black text-gray-800 font-mono tracking-wider">Sport Dashboard</h1>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-gray-800 font-mono tracking-wider">{formatTime(currentTime)}</div>
                <div className="text-gray-600 text-lg">{formatDate(currentTime)}</div>
              </div>
            </div>
          </div>

          {contentItems.length > 0 && currentItem ? (
            <div className={`transition-all duration-500 ${animationClass} mb-8`}>
              {renderContentItem(currentItem)}
              <div className="flex justify-center space-x-2 mt-8">
                {contentItems.map((_, index) => (
                  <button key={index} onClick={() => setCurrentContentIndex(index)} className={`w-3 h-3 rounded-full transition-all duration-300 ${currentContentIndex === index ? 'bg-purple-600 scale-110' : 'bg-gray-300 hover:bg-gray-400'}`} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 text-center p-12 max-w-2xl mx-auto mb-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Dashboard wordt voorbereid</h3>
                <p className="text-gray-600 leading-relaxed">Zodra er sportscores worden ingevoerd, komt het dashboard tot leven!</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* AANGEPAST: Live Ticker onderaan */}
      <div className="bg-gray-900 text-white p-4 overflow-hidden mt-auto">
          <div className="flex items-center space-x-4 mb-2">
            <div className="bg-red-500 px-3 py-1 rounded-full text-sm font-semibold">
              LIVE
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Recent Sportnieuws</span>
            </div>
          </div>
          <div className="text-lg">
            <div className="animate-marquee whitespace-nowrap">
              {tickerText}
            </div>
          </div>
      </div>
      
       <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
      `}</style>
    </div>
  );
}