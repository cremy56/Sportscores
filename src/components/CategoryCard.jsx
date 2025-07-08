// src/components/CategoryCard.jsx
import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import Leaderboard from './Leaderboard';

export default function CategoryCard({ categoryName, tests }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    const newIndex = currentIndex === 0 ? tests.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex === tests.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  if (tests.length === 0) {
    return (
      <div className="bg-white/60 p-4 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg flex flex-col h-full">
        <h2 className="text-xl font-bold text-gray-800">{categoryName}</h2>
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-600 text-center mt-2">
            Geen testen gevonden in deze categorie.
          </p>
        </div>
      </div>
    );
  }
  
  const currentTest = tests[currentIndex];

  return (
    // We gaan terug naar p-6 voor meer ademruimte binnen de kaart
    <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg transform hover:scale-105 transition-all duration-300 flex flex-col h-full">
      
      {/* Terug naar de grotere, krachtigere titel */}
      <h2 className="text-2xl font-bold text-gray-800">
        {categoryName}
      </h2>
      
      <div className="flex justify-between items-center mt-2 border-t border-gray-200 pt-3">
        <button onClick={handlePrev} className="p-2 rounded-full hover:bg-white/50 transition-colors">
          <ChevronLeftIcon className="h-6 w-6 text-purple-700" />
        </button>
        {/* Terug naar een grotere letter voor de testnaam */}
        <h3 className="font-semibold text-lg text-green-700 text-center">{currentTest.naam}</h3>
        <button onClick={handleNext} className="p-2 rounded-full hover:bg-white/50 transition-colors">
          <ChevronRightIcon className="h-6 w-6 text-purple-700" />
        </button>
      </div>
      
      <div className="mt-4 flex-grow">
        <Leaderboard key={currentTest.id} testId={currentTest.id} />
      </div>
    </div>
  );
}