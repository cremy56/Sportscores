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

// Mock sport nieuws data - in productie zou dit van een API komen
const sportNews = [
  "🥇 Nafi Thiam wint goud op Diamond League meeting in Brussel!",
  "🏃‍♂️ Belgian Tornados lopen nieuw nationaal record op 4x400m",
  "⚽ Rode Duivels kwalificeren zich voor EK 2024 finale",
  "🏊‍♀️ Valentine Dumont plaatst zich voor Olympische Spelen",
  "🚴‍♂️ Remco Evenepoel wint etappe in Tour de France",
  "🏀 Belgian Lions bereiken kwartfinale op EuroBasket",
  "🎾 Elise Mertens bereikt halve finale op Wimbledon",
  "🏐 Yellow Tigers winnen Nations League wedstrijd"
];

export default function AdValvas() {
  const { profile, school } = useOutletContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [testHighscores, setTestHighscores] = useState([]); // Array van {test: testInfo, scores: top3Scores}
  const [loading, setLoading] = useState(true);
  const [newsIndex, setNewsIndex] = useState(0);

  // Data ophalen
  useEffect(() => {
    const fetchTestHighscores = async () => {
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

        // 2. Voor elke test, haal de top 3 scores op
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
    const newsTimer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % sportNews.length);
    }, 8000);
    return () => clearInterval(newsTimer);
  }, []);
  
  const formatTime = (date) => date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  
  const getRelativeTime = (date) => {
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Vandaag';
    if (days === 1) return 'Gisteren';
    return `${days} dagen geleden`;
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

      {/* Sport News Ticker */}
      <div className="relative z-10 bg-black border-t border-white/10">
        <div className="flex items-center h-16 overflow-hidden">
          <div className="flex items-center bg-red-600 px-4 h-full">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white font-bold text-sm uppercase tracking-wider">Live Sport</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee whitespace-nowrap text-white text-lg font-medium py-5">
              {sportNews[newsIndex]} • {sportNews[(newsIndex + 1) % sportNews.length]} • {sportNews[(newsIndex + 2) % sportNews.length]} • 
            </div>
          </div>

          <div className="flex items-center space-x-2 px-4 text-white/60">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Updates elke 8s</span>
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