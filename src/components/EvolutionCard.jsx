// src/components/EvolutionCard.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, TrophyIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import EvolutionChart from './EvolutionChart';
import { formatDate } from '../utils/formatters';
import { getScoreThresholds } from '../utils/firebaseUtils';

export default function EvolutionCard({ categoryName, tests, student }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cardRef = useRef(null);

  const currentTest = tests[currentIndex];

  // Memoized leeftijd berekening
  const calculateAge = useCallback((birthDate, testDate) => {
    return Math.floor((new Date(testDate) - new Date(birthDate)) / 31557600000);
  }, []);

  // Memoized scores analyse
  const scoresAnalysis = useMemo(() => {
    const scores = currentTest?.all_scores || [];
    if (scores.length === 0) return null;

    const sortedScores = [...scores].sort((a, b) => new Date(a.datum) - new Date(b.datum));
    const firstScore = sortedScores[0];
    const lastScore = sortedScores[sortedScores.length - 1];
    
    const improvement = firstScore && lastScore && firstScore !== lastScore 
      ? lastScore.score - firstScore.score 
      : 0;

    const isImprovement = currentTest.score_richting === 'hoog' 
      ? improvement > 0 
      : improvement < 0;

    // Berek gemiddelde en trend
    const average = scores.reduce((sum, score) => sum + score.score, 0) / scores.length;
    
    // Trend analyse (laatste 3 vs eerste 3)
    const recentScores = sortedScores.slice(-3).map(s => s.score);
    const oldScores = sortedScores.slice(0, 3).map(s => s.score);
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const oldAvg = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;
    
    const trendDirection = currentTest.score_richting === 'hoog' 
      ? (recentAvg > oldAvg ? 'up' : recentAvg < oldAvg ? 'down' : 'stable')
      : (recentAvg < oldAvg ? 'up' : recentAvg > oldAvg ? 'down' : 'stable');

    return {
      scores: sortedScores,
      firstScore,
      lastScore,
      improvement,
      isImprovement,
      average,
      trendDirection,
      totalScores: scores.length
    };
  }, [currentTest]);

  // Performance indicator gebaseerd op drempelwaarden
  const performanceIndicator = useMemo(() => {
    if (!thresholds || !currentTest?.personal_best_score) return null;

    const { threshold_50, threshold_65, score_richting } = thresholds;
    const score = currentTest.personal_best_score;

    let level, color, icon;
    
    if (score_richting === 'omlaag') {
      if (score <= threshold_65) {
        level = 'Excellent';
        color = 'text-green-600 bg-green-100';
        icon = '🏆';
      } else if (score <= threshold_50) {
        level = 'Goed';
        color = 'text-orange-600 bg-orange-100';
        icon = '👍';
      } else {
        level = 'Kan beter';
        color = 'text-red-600 bg-red-100';
        icon = '💪';
      }
    } else {
      if (score >= threshold_65) {
        level = 'Excellent';
        color = 'text-green-600 bg-green-100';
        icon = '🏆';
      } else if (score >= threshold_50) {
        level = 'Goed';
        color = 'text-orange-600 bg-orange-100';
        icon = '👍';
      } else {
        level = 'Kan beter';
        color = 'text-red-600 bg-red-100';
        icon = '💪';
      }
    }

    return { level, color, icon };
  }, [thresholds, currentTest?.personal_best_score]);

  // Haal de drempelwaarden op als de test of de student verandert
  useEffect(() => {
    const fetchThresholds = async () => {
      if (!currentTest || !student?.geboortedatum || !student?.geslacht) {
        setThresholds(null);
        setError(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const testDate = currentTest.personal_best_datum || new Date();
        const leeftijd = calculateAge(student.geboortedatum, testDate);

        const thresholdData = await getScoreThresholds(
          currentTest.test_id,
          leeftijd,
          student.geslacht
        );
        
        setThresholds(thresholdData);
      } catch (error) {
        console.error("Fout bij ophalen drempels:", error);
        setError("Kon drempelwaarden niet laden");
        setThresholds(null);
      } finally {
        setLoading(false);
      }
    };

    fetchThresholds();
  }, [currentTest, student, calculateAge]);

  // Keyboard navigatie
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!cardRef.current?.contains(document.activeElement)) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, tests.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => prev === 0 ? tests.length - 1 : prev - 1);
    setSelectedDataPoint(null);
  }, [tests.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => prev === tests.length - 1 ? 0 : prev + 1);
    setSelectedDataPoint(null);
  }, [tests.length]);

  const handlePointClick = useCallback((data) => {
    setSelectedDataPoint(data);
  }, []);

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  if (!scoresAnalysis) {
    return (
      <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 border-b border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <TrophyIcon className="h-6 w-6 text-purple-600" />
              {categoryName}
            </h2>
          </div>
          <h3 className="font-semibold text-lg text-green-700 text-center">
            {currentTest?.test_naam || 'Geen test'}
          </h3>
        </div>
        
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-500">Geen scoregeschiedenis</p>
            <p className="text-xs text-gray-400 mt-1">voor deze test beschikbaar</p>
          </div>
        </div>
      </div>
    );
  }

  const { scores, firstScore, lastScore, improvement, isImprovement, average, trendDirection, totalScores } = scoresAnalysis;

  return (
    <div 
      ref={cardRef}
      tabIndex={0}
      className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full focus:outline-none focus:ring-2 focus:ring-purple-500/50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 border-b border-white/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrophyIcon className="h-6 w-6 text-purple-600" />
            {categoryName}
          </h2>
          <div className="flex items-center gap-2">
            {/* Performance Indicator */}
            {performanceIndicator && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${performanceIndicator.color}`}>
                {performanceIndicator.icon} {performanceIndicator.level}
              </div>
            )}
            <div className="flex items-center gap-1 bg-white/50 rounded-full px-2 py-1">
              <span className="text-xs text-gray-600">{currentIndex + 1}/{tests.length}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <button 
            onClick={handlePrev} 
            className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={tests.length <= 1}
            title="Vorige test (←)"
          >
            <ChevronLeftIcon className="h-5 w-5 text-purple-700" />
          </button>
          
          <h3 className="font-semibold text-lg text-green-700 text-center flex-1 mx-4">
            {currentTest.test_naam}
          </h3>
          
          <button 
            onClick={handleNext} 
            className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={tests.length <= 1}
            title="Volgende test (→)"
          >
            <ChevronRightIcon className="h-5 w-5 text-purple-700" />
          </button>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-4 gap-3 p-6 bg-white/30">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Eerste</p>
          <p className="font-bold text-gray-800 text-sm">
            {firstScore ? `${firstScore.score} ${currentTest.eenheid}` : '-'}
          </p>
          {firstScore && (
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(firstScore.datum)}
            </p>
          )}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Record</p>
          <p className="text-xl font-bold text-purple-700 mb-1">
            {currentTest.personal_best_score} {currentTest.eenheid}
          </p>
          {currentTest.personal_best_datum && (
            <p className="text-xs text-gray-500">
              {formatDate(currentTest.personal_best_datum)}
            </p>
          )}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Laatste</p>
          <p className="font-bold text-gray-800 text-sm">
            {lastScore ? `${lastScore.score} ${currentTest.eenheid}` : '-'}
          </p>
          {lastScore && (
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(lastScore.datum)}
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Trend</p>
          <p className="font-bold text-gray-800 text-sm">
            {getTrendIcon(trendDirection)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {totalScores} scores
          </p>
        </div>
      </div>

      {/* Improvement Indicator */}
      {improvement !== 0 && (
        <div className={`px-6 py-2 text-center text-sm font-medium ${
          isImprovement 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isImprovement ? '📈' : '📉'} 
          {isImprovement ? 'Verbetering' : 'Verslechtering'}: 
          {Math.abs(improvement).toFixed(2)} {currentTest.eenheid}
          <span className="ml-2 text-xs opacity-75">
            (Gemiddelde: {average.toFixed(2)} {currentTest.eenheid})
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="px-6 py-2 bg-yellow-100 text-yellow-800 text-sm text-center flex items-center justify-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4" />
          {error}
        </div>
      )}
      
      {/* Chart */}
      <div className="flex-grow p-6 min-h-[200px]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Drempelwaarden laden...</p>
            </div>
          </div>
        )}
        
        {!loading && scores.length > 0 ? (
          <EvolutionChart 
            scores={scores} 
            eenheid={currentTest.eenheid}
            onPointClick={handlePointClick}
            thresholds={thresholds}
          />
        ) : !loading && (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-500">Geen scoregeschiedenis</p>
              <p className="text-xs text-gray-400 mt-1">voor deze test beschikbaar</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Data Point */}
      {selectedDataPoint && (
        <div className="mx-6 mb-6 p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl border border-purple-200">
          <p className="text-sm text-purple-800 text-center">
            <span className="font-bold">{selectedDataPoint.score} {currentTest.eenheid}</span>
            <span className="mx-2">•</span>
            <span>{formatDate(selectedDataPoint.datum)}</span>
            {thresholds && (
              <span className="ml-2 text-xs opacity-75">
                {(() => {
                  const score = selectedDataPoint.score;
                  const { threshold_50, threshold_65, score_richting } = thresholds;
                  
                  if (score_richting === 'omlaag') {
                    if (score <= threshold_65) return '🟢 Excellent';
                    else if (score <= threshold_50) return '🟠 Goed';
                    else return '🔴 Kan beter';
                  } else {
                    if (score >= threshold_65) return '🟢 Excellent';
                    else if (score >= threshold_50) return '🟠 Goed';
                    else return '🔴 Kan beter';
                  }
                })()}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Keyboard Navigation Hint */}
      {tests.length > 1 && (
        <div className="px-6 pb-2">
          <p className="text-xs text-gray-400 text-center">
            💡 Gebruik ← → pijltjestoetsen om te navigeren
          </p>
        </div>
      )}
    </div>
  );
}