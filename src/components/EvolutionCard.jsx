// src/components/EvolutionCard.jsx - Mobile Optimized - FIXED AGE CALCULATION
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

  // FIXED: Enhanced age calculation with proper validation
  const calculateAge = useCallback((birthDate, testDate) => {
    // Validate inputs
    if (!birthDate || !testDate) {
      console.warn('calculateAge: Missing birthDate or testDate', { birthDate, testDate });
      return null;
    }

    let birthDateObj, testDateObj;

    // Parse birthDate
    try {
      if (typeof birthDate === 'string') {
        birthDateObj = new Date(birthDate);
      } else if (birthDate.toDate && typeof birthDate.toDate === 'function') {
        // Firestore Timestamp
        birthDateObj = birthDate.toDate();
      } else if (birthDate instanceof Date) {
        birthDateObj = birthDate;
      } else {
        console.warn('calculateAge: Invalid birthDate format', birthDate);
        return null;
      }
    } catch (error) {
      console.warn('calculateAge: Error parsing birthDate', error);
      return null;
    }

    // Parse testDate
    try {
      if (typeof testDate === 'string') {
        testDateObj = new Date(testDate);
      } else if (testDate.toDate && typeof testDate.toDate === 'function') {
        // Firestore Timestamp
        testDateObj = testDate.toDate();
      } else if (testDate instanceof Date) {
        testDateObj = testDate;
      } else {
        console.warn('calculateAge: Invalid testDate format', testDate);
        return null;
      }
    } catch (error) {
      console.warn('calculateAge: Error parsing testDate', error);
      return null;
    }

    // Validate parsed dates
    if (isNaN(birthDateObj.getTime()) || isNaN(testDateObj.getTime())) {
      console.warn('calculateAge: Invalid date objects', {
        birthDateObj,
        testDateObj,
        birthDateValid: !isNaN(birthDateObj.getTime()),
        testDateValid: !isNaN(testDateObj.getTime())
      });
      return null;
    }

    // Calculate age using more precise method
    const birthYear = birthDateObj.getFullYear();
    const birthMonth = birthDateObj.getMonth();
    const birthDay = birthDateObj.getDate();
    
    const testYear = testDateObj.getFullYear();
    const testMonth = testDateObj.getMonth();
    const testDay = testDateObj.getDate();

    let age = testYear - birthYear;

    // Adjust age if birthday hasn't occurred yet this year
    if (testMonth < birthMonth || (testMonth === birthMonth && testDay < birthDay)) {
      age--;
    }

    // Validate calculated age
    if (age < 0 || age > 100) {
      console.warn('calculateAge: Unrealistic age calculated', {
        age,
        birthDate: birthDateObj,
        testDate: testDateObj
      });
      return null;
    }

    console.log('calculateAge: Successfully calculated age', {
      age,
      birthDate: birthDateObj.toISOString(),
      testDate: testDateObj.toISOString()
    });

    return age;
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

  // FIXED: Enhanced threshold fetching with better error handling
  useEffect(() => {
    const fetchThresholds = async () => {
      if (!currentTest || !student?.geboortedatum || !student?.geslacht) {
        console.log('fetchThresholds: Missing required data', {
          hasCurrentTest: !!currentTest,
          hasGeboortedatum: !!student?.geboortedatum,
          hasGeslacht: !!student?.geslacht
        });
        setThresholds(null);
        setError(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const testDate = currentTest.personal_best_datum || new Date();
        console.log('fetchThresholds: Calculating age', {
          geboortedatum: student.geboortedatum,
          testDate,
          geslacht: student.geslacht
        });

        const leeftijd = calculateAge(student.geboortedatum, testDate);
        
        if (leeftijd === null || isNaN(leeftijd)) {
          console.warn('fetchThresholds: Could not calculate valid age', {
            leeftijd,
            geboortedatum: student.geboortedatum,
            testDate
          });
          setError("Kon leeftijd niet berekenen voor drempelwaarden");
          setThresholds(null);
          return;
        }

        console.log('fetchThresholds: Fetching thresholds', {
          testId: currentTest.test_id,
          leeftijd,
          geslacht: student.geslacht
        });

        const thresholdData = await getScoreThresholds(
          currentTest.test_id,
          leeftijd,
          student.geslacht
        );
        
        if (thresholdData) {
          console.log('fetchThresholds: Successfully fetched thresholds', thresholdData);
        } else {
          console.log('fetchThresholds: No thresholds found for this age/gender combination');
        }
        
        setThresholds(thresholdData);
      } catch (error) {
        console.error("fetchThresholds: Error fetching thresholds:", error);
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
      <div className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-lg border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-3 sm:p-6 border-b border-white/20">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
              <TrophyIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              <span className="text-sm sm:text-xl">{categoryName}</span>
            </h2>
          </div>
          <h3 className="font-semibold text-base sm:text-lg text-green-700 text-center">
            {currentTest?.test_naam || 'Geen test'}
          </h3>
        </div>
        
        <div className="flex-grow flex items-center justify-center p-4 sm:p-6">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl mb-2">📊</div>
            <p className="text-gray-500 text-sm sm:text-base">Geen scoregeschiedenis</p>
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
      className="bg-white/70 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-lg border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full focus:outline-none focus:ring-2 focus:ring-purple-500/50"
    >
      {/* Header - Mobile Optimized */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-3 sm:p-6 border-b border-white/20">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h2 className="text-base sm:text-xl font-bold text-gray-800 flex items-center gap-1 sm:gap-2">
            <TrophyIcon className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
            <span className="text-sm sm:text-xl truncate">{categoryName}</span>
          </h2>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Performance Indicator - Smaller on mobile */}
            {performanceIndicator && (
              <div className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium ${performanceIndicator.color}`}>
                <span className="hidden sm:inline">{performanceIndicator.icon} {performanceIndicator.level}</span>
                <span className="sm:hidden">{performanceIndicator.icon}</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-white/50 rounded-full px-1.5 py-0.5 sm:px-2 sm:py-1">
              <span className="text-xs text-gray-600">{currentIndex + 1}/{tests.length}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <button 
            onClick={handlePrev} 
            className="p-1.5 sm:p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={tests.length <= 1}
            title="Vorige test (←)"
          >
            <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700" />
          </button>
          
          <h3 className="font-semibold text-sm sm:text-lg text-green-700 text-center flex-1 mx-2 sm:mx-4 truncate">
            {currentTest.test_naam}
          </h3>
          
          <button 
            onClick={handleNext} 
            className="p-1.5 sm:p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={tests.length <= 1}
            title="Volgende test (→)"
          >
            <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700" />
          </button>
        </div>
      </div>

      {/* Enhanced Stats Grid - Mobile Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-6 bg-white/30">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-medium">Eerste</p>
          <p className="font-bold text-gray-800 text-xs sm:text-sm">
            {firstScore ? `${firstScore.score} ${currentTest.eenheid}` : '-'}
          </p>
          {firstScore && (
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">
              {formatDate(firstScore.datum)}
            </p>
          )}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Record</p>
          <p className="text-lg sm:text-xl font-bold text-purple-700 mb-1">
            {currentTest.personal_best_score} {currentTest.eenheid}
          </p>
          {currentTest.personal_best_datum && (
            <p className="text-xs text-gray-500 hidden sm:block">
              {formatDate(currentTest.personal_best_datum)}
            </p>
          )}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-medium">Laatste</p>
          <p className="font-bold text-gray-800 text-xs sm:text-sm">
            {lastScore ? `${lastScore.score} ${currentTest.eenheid}` : '-'}
          </p>
          {lastScore && (
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">
              {formatDate(lastScore.datum)}
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-medium">Trend</p>
          <p className="font-bold text-gray-800 text-xs sm:text-sm">
            {getTrendIcon(trendDirection)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {totalScores} scores
          </p>
        </div>
      </div>

      {/* Improvement Indicator - Mobile */}
      {improvement !== 0 && (
        <div className={`px-3 sm:px-6 py-2 text-center text-xs sm:text-sm font-medium ${
          isImprovement 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isImprovement ? '📈' : '📉'} 
          {isImprovement ? 'Verbetering' : 'Verslechtering'}: 
          {Math.abs(improvement).toFixed(2)} {currentTest.eenheid}
          <span className="ml-2 text-xs opacity-75 hidden sm:inline">
            (Gemiddelde: {average.toFixed(2)} {currentTest.eenheid})
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="px-3 sm:px-6 py-2 bg-yellow-100 text-yellow-800 text-xs sm:text-sm text-center flex items-center justify-center gap-2">
          <ExclamationTriangleIcon className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="truncate">{error}</span>
        </div>
      )}
      
      {/* Chart - Mobile Height */}
      <div className="flex-grow p-3 sm:p-6 min-h-[250px] sm:min-h-[300px]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-xs sm:text-sm text-gray-500">Drempelwaarden laden...</p>
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
              <div className="text-3xl sm:text-4xl mb-2">📊</div>
              <p className="text-gray-500 text-sm sm:text-base">Geen scoregeschiedenis</p>
              <p className="text-xs text-gray-400 mt-1">voor deze test beschikbaar</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Data Point - Mobile */}
      {selectedDataPoint && (
        <div className="mx-3 sm:mx-6 mb-3 sm:mb-6 p-2 sm:p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl border border-purple-200">
          <p className="text-xs sm:text-sm text-purple-800 text-center">
            <span className="font-bold">{selectedDataPoint.score} {currentTest.eenheid}</span>
            <span className="mx-2">•</span>
            <span className="text-xs">{formatDate(selectedDataPoint.datum)}</span>
            {thresholds && (
              <span className="ml-2 text-xs opacity-75 block sm:inline mt-1 sm:mt-0">
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

      {/* Keyboard Navigation Hint - Hide on mobile */}
      {tests.length > 1 && (
        <div className="px-3 sm:px-6 pb-2 hidden sm:block">
          <p className="text-xs text-gray-400 text-center">
            💡 Gebruik ← → pijltjestoetsten om te navigeren
          </p>
        </div>
      )}
    </div>
  );
}