// src/pages/AdValvas.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trophy, Star, TrendingUp, Calendar, Award, Zap, Target, Users, Clock } from 'lucide-react';

// Helper functie voor GDPR-conforme naamweergave
const formatNameForDisplay = (fullName) => {
  if (!fullName) return 'Onbekend';
  const nameParts = fullName.split(' ');
  if (nameParts.length < 2) return fullName;
  
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  return `${firstName} ${lastName.charAt(0)}.`;
};

// Helper functie voor schooljaar berekening
function getSchoolYear(date) {
  if (!date || isNaN(new Date(date).getTime())) {
    return 'Onbekend';
  }
  const year = date.getFullYear();
  const month = date.getMonth();
  
  if (month >= 7) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

// Helper functie voor score formattering
function formatScoreWithUnit(score, eenheid) {
  if (score === null || score === undefined) return '-';
  
  const eenheidLower = eenheid?.toLowerCase();

  if (eenheidLower === 'aantal') {
    return `${score}x`;
  }
  if (eenheidLower === 'min' || eenheidLower === 'sec' || eenheidLower === 'seconden') {
    const mins = Math.floor(score / 60);
    const secs = Math.floor(score % 60);
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  }
  return `${score} ${eenheid}`;
}

export default function AdValvas() {
  const { profile, school } = useOutletContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [highscores, setHighscores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTests: 0,
    activeStudents: 0,
    recordsThisWeek: 0,
    totalRecords: 0
  });

  // Update tijd elke seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotate slides elke 8 seconden
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setAnimationClass('animate-pulse');
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % 4);
        setAnimationClass('');
      }, 300);
    }, 8000);
    return () => clearInterval(slideTimer);
  }, []);

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch recent highscores
        const scoresRef = collection(db, 'scores');
        const scoresQuery = query(
          scoresRef,
          where('school_id', '==', profile.school_id),
          orderBy('datum', 'desc'),
          limit(10)
        );
        
        const scoresSnapshot = await getDocs(scoresQuery);
        const scoresData = scoresSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            datum: data.datum?.toDate ? data.datum.toDate() : new Date(data.datum)
          };
        });

        // Fetch test data for each score to get test names and units
        const enrichedScores = await Promise.all(
          scoresData.map(async (score) => {
            try {
              const testDoc = await getDoc(doc(db, 'testen', score.test_id));
              const testData = testDoc.exists() ? testDoc.data() : {};
              return {
                ...score,
                test: testData.naam || 'Onbekende test',
                eenheid: testData.eenheid || '',
                score_richting: testData.score_richting || 'hoog'
              };
            } catch (error) {
              console.error('Error fetching test data:', error);
              return {
                ...score,
                test: 'Onbekende test',
                eenheid: '',
                score_richting: 'hoog'
              };
            }
          })
        );

        setHighscores(enrichedScores);

        // Calculate basic stats
        setStats({
          totalTests: enrichedScores.length > 0 ? 12 : 0, // Mock value
          activeStudents: enrichedScores.length > 0 ? 247 : 0, // Mock value
          recordsThisWeek: enrichedScores.filter(score => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return score.datum > weekAgo;
          }).length,
          totalRecords: enrichedScores.length
        });

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.school_id]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('nl-NL', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Vandaag';
    if (days === 1) return 'Gisteren';
    return `${days} dagen geleden`;
  };

  const RecordBreakingCard = ({ record }) => (
    <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-3xl p-8 text-white shadow-2xl transform hover:scale-105 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-3 rounded-full">
            <Trophy className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">TOP PRESTATIE!</h3>
            <p className="text-yellow-100">🔥 Uitstekende score</p>
          </div>
        </div>
        <div className="text-right">
          <Star className="h-12 w-12 mx-auto mb-2 animate-spin" style={{animationDuration: '3s'}} />
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-xl font-semibold">{record.test}</h4>
          <p className="text-yellow-100">door {formatNameForDisplay(record.leerling_naam)}</p>
        </div>
        
        <div className="flex items-center justify-center bg-white/20 rounded-2xl p-4">
          <div className="text-center">
            <p className="text-sm text-yellow-100">Score</p>
            <p className="text-3xl font-bold">{formatScoreWithUnit(record.score, record.eenheid)}</p>
          </div>
        </div>
        
        <p className="text-yellow-100 text-sm text-center">{getRelativeTime(record.datum)}</p>
      </div>
    </div>
  );

  const HighscoreCard = ({ score, rank }) => (
    <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${
      rank === 1 ? 'border-yellow-500' : 
      rank === 2 ? 'border-gray-400' : 
      rank === 3 ? 'border-orange-500' : 'border-purple-500'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
            rank === 1 ? 'bg-yellow-500' : 
            rank === 2 ? 'bg-gray-400' : 
            rank === 3 ? 'bg-orange-500' : 'bg-purple-500'
          }`}>
            {rank}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{formatNameForDisplay(score.leerling_naam)}</h4>
            <p className="text-sm text-gray-500">{score.test}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-700">{formatScoreWithUnit(score.score, score.eenheid)}</p>
          <p className="text-xs text-gray-500">{getRelativeTime(score.datum)}</p>
        </div>
      </div>
    </div>
  );

  const StatsCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const renderCurrentSlide = () => {
    const recentScores = highscores.slice(0, 6);
    
    switch (currentSlide) {
      case 0: // Recente prestaties
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">🏆 Recente Prestaties</h2>
              <p className="text-gray-600">De nieuwste topscores van onze school!</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recentScores.slice(0, 2).map((record) => (
                <RecordBreakingCard key={record.id} record={record} />
              ))}
            </div>
          </div>
        );
        
      case 1: // Top performers
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">⭐ Top Prestaties</h2>
              <p className="text-gray-600">De beste scores van deze periode</p>
            </div>
            <div className="space-y-4">
              {recentScores.slice(0, 5).map((score, index) => (
                <HighscoreCard key={score.id} score={score} rank={index + 1} />
              ))}
            </div>
          </div>
        );
        
      case 2: // School statistieken
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">📊 School Statistieken</h2>
              <p className="text-gray-600">Onze prestaties in cijfers</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard 
                icon={Target} 
                title="Actieve Testen" 
                value={stats.totalTests} 
                color="bg-purple-500"
              />
              <StatsCard 
                icon={Users} 
                title="Deelnemers" 
                value={stats.activeStudents} 
                color="bg-blue-500"
              />
              <StatsCard 
                icon={Trophy} 
                title="Deze week" 
                value={stats.recordsThisWeek} 
                color="bg-yellow-500"
              />
              <StatsCard 
                icon={Award} 
                title="Totaal Scores" 
                value={stats.totalRecords} 
                color="bg-green-500"
              />
            </div>
          </div>
        );
        
      case 3: // Motivatie slide
        return (
          <div className="text-center space-y-8">
            <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 rounded-3xl p-12 text-white shadow-2xl">
              <Zap className="h-16 w-16 mx-auto mb-6 animate-bounce" />
              <h2 className="text-4xl font-bold mb-4">Blijf in beweging!</h2>
              <p className="text-xl text-purple-100 mb-6">
                Elke dag een nieuwe kans om je persoonlijk record te verbeteren
              </p>
              <div className="bg-white/20 rounded-2xl p-6">
                <p className="text-2xl font-semibold">
                  "De enige wedstrijd die ertoe doet, is die tegen jezelf van gisteren"
                </p>
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
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="text-gray-700 font-medium">Ad Valvas laden...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header met tijd en datum */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <img
                src={school?.logo_url || "/logo.png"}
                alt="School Logo"
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  e.target.src = '/logo.png';
                }}
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ad Valvas</h1>
                <p className="text-gray-600">Digitaal Prikbord - {school?.naam}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-700 font-mono">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-gray-600">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className={`transition-all duration-300 ${animationClass}`}>
          {highscores.length > 0 ? renderCurrentSlide() : (
            <div className="text-center py-16">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Welkom bij Ad Valvas</h3>
                <p className="text-slate-600 leading-relaxed">
                  Zodra er scores worden ingevoerd, verschijnen hier de nieuwste prestaties en records!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Slide indicator */}
        {highscores.length > 0 && (
          <div className="flex justify-center mt-8 space-x-2">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index 
                    ? 'bg-purple-600 scale-110' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}

        {/* Live ticker onderaan */}
        {highscores.length > 0 && (
          <div className="mt-8 bg-gray-900 text-white rounded-2xl p-4 overflow-hidden">
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 px-3 py-1 rounded-full text-sm font-semibold">
                LIVE
              </div>
              <div className="animate-pulse flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Updates elke 8 seconden</span>
              </div>
            </div>
            <div className="mt-2 text-lg">
              <div className="animate-marquee whitespace-nowrap">
                {highscores.slice(0, 3).map((score, index) => 
                  `🏆 ${formatNameForDisplay(score.leerling_naam)} behaalt ${formatScoreWithUnit(score.score, score.eenheid)} op ${score.test}!`
                ).join(' • ')} • 🎯 Bekijk alle prestaties op onze Ad Valvas • 
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}