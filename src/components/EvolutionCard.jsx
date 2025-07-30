// src/components/EvolutionCard.jsx
import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, TrophyIcon } from '@heroicons/react/24/solid';
import EvolutionChart from './EvolutionChart';
import { formatDate } from '../utils/formatters';
import { getScoreThresholds } from '../utils/firebaseUtils';

export default function EvolutionCard({ categoryName, tests, student }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentTest = tests[currentIndex];

  // Haal de drempelwaarden op als de test of de student verandert
  useEffect(() => {
    const calculateAge = (birthDate, testDate) => {
      return Math.floor((new Date(testDate) - new Date(birthDate)) / 31557600000);
    };

    const fetchThresholds = async () => {
      if (!currentTest || !student?.geboortedatum || !student?.geslacht) {
        setThresholds(null);
        return;
      }
      
      setLoading(true);
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
        setThresholds(null);
      } finally {
        setLoading(false);
      }
    };

    fetchThresholds();
  }, [currentTest, student]);

  const handlePrev = () => {
    setCurrentIndex(currentIndex === 0 ? tests.length - 1 : currentIndex - 1);
    setSelectedDataPoint(null);
  };

  const handleNext = () => {
    setCurrentIndex(currentIndex === tests.length - 1 ? 0 : currentIndex + 1);
    setSelectedDataPoint(null);
  };

  const handlePointClick = (data) => {
    setSelectedDataPoint(data);
  };

  const scores = currentTest.all_scores || [];
  const firstScore = scores.length > 0 ? scores[0] : null;
  const lastScore = scores.length > 1 ? scores[scores.length - 1] : firstScore;

  // Bereken verbetering
  const improvement = firstScore && lastScore && firstScore !== lastScore 
    ? lastScore.score - firstScore.score 
    : 0;

  const isImprovement = currentTest.score_richting === 'hoog' 
    ? improvement > 0 
    : improvement < 0;

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 border-b border-white/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrophyIcon className="h-6 w-6 text-purple-600" />
            {categoryName}
          </h2>
          <div className="flex items-center gap-1 bg-white/50 rounded-full px-2 py-1">
            <span className="text-xs text-gray-600">{currentIndex + 1}/{tests.length}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <button 
            onClick={handlePrev} 
            className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm"
            disabled={tests.length <= 1}
          >
            <ChevronLeftIcon className="h-5 w-5 text-purple-700" />
          </button>
          
          <h3 className="font-semibold text-lg text-green-700 text-center flex-1 mx-4">
            {currentTest.test_naam}
          </h3>
          
          <button 
            onClick={handleNext} 
            className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors shadow-sm"
            disabled={tests.length <= 1}
          >
            <ChevronRightIcon className="h-5 w-5 text-purple-700" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 p-6 bg-white/30">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Eerste</p>
          <p className="font-bold text-gray-800">
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
          <p className="text-2xl font-bold text-purple-700 mb-1">
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
          <p className="font-bold text-gray-800">
            {lastScore ? `${lastScore.score} ${currentTest.eenheid}` : '-'}
          </p>
          {lastScore && (
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(lastScore.datum)}
            </p>
          )}
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
        </div>
      )}
      
      {/* Chart */}
      <div className="flex-grow p-6 min-h-[200px]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
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
          </p>
        </div>
      )}
    </div>
  );
}