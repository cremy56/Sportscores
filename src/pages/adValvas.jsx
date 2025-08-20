// src/pages/adValvas.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trophy, Star, TrendingUp, Calendar, Award, Zap, Target, Users, Clock } from 'lucide-react';

// --- Helper functies (blijven ongewijzigd) ---
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

// --- Hoofdcomponent ---
export default function AdValvas() {
  const { profile, school } = useOutletContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animationClass, setAnimationClass] = useState('');
  const [scores, setScores] = useState([]); // Aangepast: generieke naam
  const [displayMode, setDisplayMode] = useState('recent'); // Nieuwe state: 'recent' of 'highscore'
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalTests: 0, activeStudents: 0 });

  // AANGEPAST: De data-ophaling is nu veel slimmer
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // STAP 1: Probeer eerst recente scores op te halen
        const recentScoresQuery = query(
          collection(db, 'scores'),
          where('school_id', '==', profile.school_id),
          orderBy('datum', 'desc'),
          limit(10)
        );
        const recentScoresSnap = await getDocs(recentScoresQuery);

        if (!recentScoresSnap.empty) {
            // Als er recente scores zijn, toon die
            setDisplayMode('recent');
            const scoresData = recentScoresSnap.docs.map(d => ({ ...d.data(), id: d.id, datum: d.data().datum.toDate() }));
            const enrichedScores = await enrichScoresWithTestData(scoresData);
            setScores(enrichedScores);
        } else {
            // STAP 2: Geen recente scores? Haal all-time highscores op
            setDisplayMode('highscore');
            const highscores = await fetchAllTimeHighscores(profile.school_id);
            setScores(highscores);
        }

        // Haal algemene statistieken op
        const testenQuery = query(collection(db, 'testen'), where('school_id', '==', profile.school_id));
        const leerlingenQuery = query(collection(db, 'toegestane_gebruikers'), where('school_id', '==', profile.school_id), where('rol', '==', 'leerling'));
        const [testenSnap, leerlingenSnap] = await Promise.all([getDocs(testenQuery), getDocs(leerlingenQuery)]);
        setStats({ totalTests: testenSnap.size, activeStudents: leerlingenSnap.size });

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.school_id]);

  // Helper om score-objecten te verrijken met testinformatie
  const enrichScoresWithTestData = async (scoresArray) => {
    const enriched = await Promise.all(
      scoresArray.map(async (score) => {
        const testDoc = await getDoc(doc(db, 'testen', score.test_id));
        const testData = testDoc.exists() ? testDoc.data() : {};
        return {
          ...score,
          test: testData.naam || 'Onbekende test',
          eenheid: testData.eenheid || '',
        };
      })
    );
    return enriched;
  };

  // Helper om all-time highscores op te halen
  const fetchAllTimeHighscores = async (schoolId) => {
    // 1. Haal alle testen op
    const testenQuery = query(collection(db, 'testen'), where('school_id', '==', schoolId));
    const testenSnap = await getDocs(testenQuery);
    const allTests = testenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Voor elke test, haal de beste score op
    const highscorePromises = allTests.map(async (test) => {
      const direction = test.score_richting === 'laag' ? 'asc' : 'desc';
      const scoreQuery = query(
        collection(db, 'scores'),
        where('test_id', '==', test.id),
        orderBy('score', direction),
        limit(1)
      );
      const scoreSnap = await getDocs(scoreQuery);
      if (!scoreSnap.empty) {
        const doc = scoreSnap.docs[0];
        return { ...doc.data(), id: doc.id, datum: doc.data().datum.toDate(), test: test.naam, eenheid: test.eenheid };
      }
      return null;
    });

    const results = await Promise.all(highscorePromises);
    return results.filter(Boolean); // Filter null-waarden (testen zonder scores) eruit
  };


  // Andere useEffects en functies (tijd, slides, etc.) blijven ongewijzigd
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setAnimationClass('animate-pulse');
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % 4);
        setAnimationClass('');
      }, 8000);
    }, 8000);
    return () => clearInterval(slideTimer);
  }, []);
  
  const formatTime = (date) => date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit'});
  const formatDate = (date) => date.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const getRelativeTime = (date) => {
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Vandaag';
    if (days === 1) return 'Gisteren';
    return `${days} dagen geleden`;
  };

  // --- Kaart-componenten ---
  const HighscoreCard = ({ score, rank }) => (
     <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${rank === 1 ? 'border-yellow-500' : rank === 2 ? 'border-gray-400' : rank === 3 ? 'border-orange-500' : 'border-purple-500'}`}>
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : rank === 3 ? 'bg-orange-500' : 'bg-purple-500'}`}>{rank}</div>
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

  const StatsCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}><Icon className="h-6 w-6 text-white" /></div>
      </div>
    </div>
  );

  // AANGEPAST: De slide-weergave past de titels aan op basis van de displayMode
  const renderCurrentSlide = () => {
    switch (currentSlide) {
      case 0: case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {displayMode === 'recent' ? '⭐ Recente Prestaties' : '🏆 All-Time Highscores'}
              </h2>
              <p className="text-gray-600">
                {displayMode === 'recent' ? 'De laatste topscores van onze school!' : 'De schoolrecords voor elke test.'}
              </p>
            </div>
            <div className="space-y-4">
              {scores.slice(0, 5).map((score, index) => (
                <HighscoreCard key={score.id} score={score} rank={index + 1} />
              ))}
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">📊 School Statistieken</h2>
              <p className="text-gray-600">Onze prestaties in cijfers</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-6">
              <StatsCard icon={Target} title="Actieve Testen" value={stats.totalTests} color="bg-purple-500" />
              <StatsCard icon={Users} title="Deelnemers" value={stats.activeStudents} color="bg-blue-500" />
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="text-center space-y-8">
            <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 rounded-3xl p-12 text-white shadow-2xl">
              <Zap className="h-16 w-16 mx-auto mb-6 animate-bounce" />
              <h2 className="text-4xl font-bold mb-4">Blijf in beweging!</h2>
              <p className="text-xl text-purple-100">"De enige wedstrijd die ertoe doet, is die tegen jezelf van gisteren"</p>
            </div>
          </div>
        );
        
      default: return null;
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
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
             <div className="flex items-center space-x-4">
                <img src={school?.logo_url || "/logo.png"} alt="School Logo" className="h-12 w-auto object-contain" onError={(e) => { e.target.src = '/logo.png'; }} />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ad Valvas</h1>
                    <p className="text-gray-600">Digitaal Prikbord - {school?.naam}</p>
                </div>
             </div>
             <div className="text-right">
                <div className="text-3xl font-bold text-purple-700 font-mono">{formatTime(currentTime)}</div>
                <div className="text-sm text-gray-600">{formatDate(currentTime)}</div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className={`transition-all duration-300 ${animationClass}`}>
          {scores.length > 0 ? renderCurrentSlide() : (
            <div className="text-center py-16">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Welkom bij Ad Valvas</h3>
                <p className="text-slate-600 leading-relaxed">Zodra er scores worden ingevoerd, verschijnen hier de nieuwste prestaties en records!</p>
              </div>
            </div>
          )}
        </div>

        {scores.length > 0 && (
          <div className="flex justify-center mt-8 space-x-2">
            {[0, 1, 2, 3].map((index) => (
              <button key={index} onClick={() => setCurrentSlide(index)} className={`w-3 h-3 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-purple-600 scale-110' : 'bg-gray-300 hover:bg-gray-400'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}