import React, { useState, useEffect } from 'react';
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

// Mock data - in echte implementatie zou dit van Firebase komen
const mockHighscores = [
  { id: 1, test: "100m Sprint", naam: "Emma Janssen", score: "12.3", eenheid: "sec", datum: new Date(), isRecord: true, previousRecord: "12.8" },
  { id: 2, test: "Verspringen", naam: "Luca Van Houten", score: "4.85", eenheid: "m", datum: new Date(Date.now() - 86400000), isRecord: false },
  { id: 3, test: "1500m Loop", naam: "Sophie Martens", score: "5'24\"", eenheid: "min", datum: new Date(Date.now() - 172800000), isRecord: true, previousRecord: "5'31\"" },
  { id: 4, test: "Sit-ups", naam: "Noah Peeters", score: "45", eenheid: "aantal", datum: new Date(Date.now() - 259200000), isRecord: false },
  { id: 5, test: "Kogelslingeren", naam: "Lisa De Vries", score: "8.92", eenheid: "m", datum: new Date(Date.now() - 345600000), isRecord: true, previousRecord: "8.12" },
];

const mockStats = {
  totalTests: 12,
  activeStudents: 247,
  recordsThisWeek: 3,
  totalRecords: 28
};

const AdValvasDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animationClass, setAnimationClass] = useState('');

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
        setCurrentSlide((prev) => (prev + 1) % 4); // 4 verschillende slides
        setAnimationClass('');
      }, 300);
    }, 8000);
    return () => clearInterval(slideTimer);
  }, []);

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
            <h3 className="text-2xl font-bold">NIEUW RECORD!</h3>
            <p className="text-yellow-100">🔥 Record gebroken</p>
          </div>
        </div>
        <div className="text-right">
          <Star className="h-12 w-12 mx-auto mb-2 animate-spin" style={{animationDuration: '3s'}} />
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-xl font-semibold">{record.test}</h4>
          <p className="text-yellow-100">door {record.naam} uit klas {record.klas}</p>
        </div>
        
        <div className="flex items-center justify-between bg-white/20 rounded-2xl p-4">
          <div>
            <p className="text-sm text-yellow-100">Nieuwe score</p>
            <p className="text-3xl font-bold">{record.score} {record.eenheid}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-yellow-100">Vorig record</p>
            <p className="text-xl font-medium line-through">{record.previousRecord} {record.eenheid}</p>
          </div>
        </div>
        
        <p className="text-yellow-100 text-sm">{getRelativeTime(record.datum)}</p>
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
            <h4 className="font-semibold text-gray-900">{formatNameForDisplay(score.naam)}</h4>
            <p className="text-sm text-gray-500">{score.test}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-700">{score.score} {score.eenheid}</p>
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
    const recentRecords = mockHighscores.filter(score => score.isRecord);
    
    switch (currentSlide) {
      case 0: // Records van vandaag
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">🏆 Nieuwe Records</h2>
              <p className="text-gray-600">De nieuwste recordhouders van onze school!</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recentRecords.slice(0, 2).map((record) => (
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
              <p className="text-gray-600">De beste scores van deze week</p>
            </div>
            <div className="space-y-4">
              {mockHighscores.slice(0, 5).map((score, index) => (
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
                value={mockStats.totalTests} 
                color="bg-purple-500"
              />
              <StatsCard 
                icon={Users} 
                title="Deelnemers" 
                value={mockStats.activeStudents} 
                color="bg-blue-500"
              />
              <StatsCard 
                icon={Trophy} 
                title="Records deze week" 
                value={mockStats.recordsThisWeek} 
                color="bg-yellow-500"
              />
              <StatsCard 
                icon={Award} 
                title="Totaal Records" 
                value={mockStats.totalRecords} 
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header met tijd en datum */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <img
                src="/logo.png"
                alt="Sportscores Logo"
                className="h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ad Valvas</h1>
                <p className="text-gray-600">Digitaal Prikbord</p>
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`transition-all duration-300 ${animationClass}`}>
          {renderCurrentSlide()}
        </div>

        {/* Slide indicator */}
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

        {/* Live ticker onderaan */}
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
              🏆 Emma J. breekt het 100m record met 12.3 sec! • 
              ⭐ Sophie M. zet nieuwe tijd neer op 1500m: 5'24" • 
              🔥 Lisa D. gooit 8.92m met kogelslingeren! • 
              🎯 Bekijk alle records op onze Ad Valvas • 
            </div>
          </div>
        </div>
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
};

export default AdValvasDashboard;