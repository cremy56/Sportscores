// src/components/EvolutionCard.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import EvolutionChart from './EvolutionChart';
import { formatDate } from '../utils/formatters'; // <-- Importeer de nieuwe functie

export default function EvolutionCard({ categoryName, tests, student }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const [thresholds, setThresholds] = useState(null);

const currentTest = tests[currentIndex];

  // Haal de drempelwaarden op als de test of de student verandert
  useEffect(() => {
    // Functie om de leeftijd te berekenen op basis van de testdatum
    const calculateAge = (birthDate, testDate) => {
        return Math.floor((new Date(testDate) - new Date(birthDate)) / 31557600000);
    };

    const fetchThresholds = async () => {
        if (!currentTest || !student?.geboortedatum || !student?.geslacht) return;
                // Gebruik de datum van het persoonlijk record voor de leeftijdsberekening
        const testDate = currentTest.personal_best_datum || new Date();
        const leeftijd = calculateAge(student.geboortedatum, testDate);

        const { data, error } = await supabase.rpc('get_score_thresholds', {
            p_test_id: currentTest.test_id,
            p_leeftijd: leeftijd,
            p_geslacht: student.geslacht
        });

        if (error) console.error("Fout bij ophalen drempels:", error);
        else setThresholds(data);
    };

    fetchThresholds();

  }, [currentTest, student]); // <-- Stap 3: Correcte dependencies

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

  return (
    <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg flex flex-col h-full">
      <h2 className="text-2xl font-bold text-gray-800">{categoryName}</h2>
      <div className="flex justify-between items-center mt-2 border-b border-gray-200 pb-3">
        <button onClick={handlePrev} className="p-2 rounded-full bg-transparent hover:bg-white/50 transition-colors"><ChevronLeftIcon className="h-6 w-6 text-purple-700" /></button>
        <h3 className="font-semibold text-lg text-green-700 text-center">{currentTest.test_naam}</h3>
        <button onClick={handleNext} className="p-2 rounded-full bg-transparent hover:bg-white/50 transition-colors"><ChevronRightIcon className="h-6 w-6 text-purple-700" /></button>
      </div>

      <div className="grid grid-cols-3 text-center my-4">
        <div>
          <p className="text-xs text-gray-500">Eerste Score</p>
          <p className="font-bold">{firstScore ? `${firstScore.score} ${currentTest.eenheid}` : '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold">Record</p>
          <p className="text-2xl font-bold text-purple-700">
            {currentTest.personal_best_score} {currentTest.eenheid}
            
          </p>
                 </div>
        <div>
          <p className="text-xs text-gray-500">Laatste Score</p>
          <p className="font-bold">{lastScore ? `${lastScore.score} ${currentTest.eenheid}` : '-'}</p>
        </div>
      </div>
      
     <div className="mt-4 flex-grow h-48">
      {scores.length > 0 ? (
        <EvolutionChart 
          scores={scores} 
          eenheid={currentTest.eenheid}
          onPointClick={handlePointClick}
          thresholds={thresholds} // <-- Geef drempels door aan de grafiek
        />
        ) : (
          <p className="text-center text-gray-500 pt-4">Geen scoregeschiedenis voor deze test.</p>
        )}
      </div>

      {selectedDataPoint && (
        <div className="mt-4 text-center p-2 bg-purple-100 rounded-lg">
          <p className="text-sm text-purple-800">
            Geselecteerd: <span className="font-bold">{selectedDataPoint.score} {currentTest.eenheid}</span> op {formatDate(selectedDataPoint.datum)}
          </p>
        </div>
      )}
    </div>
  );
}
