// src/hooks/useAdValvasContent.js
// MARKER_USE_ADVALVAS_CONTENT
// Bouwt de afwisselende contentlijst (highscores ↔ overige content) en
// verzorgt de rotatie op het scherm.

import { useState, useEffect, useCallback, useRef } from 'react';
import { Award, Megaphone, BookOpen, Target, RefreshCw } from 'lucide-react';
import { SPORT_QUOTES } from '../data/sportQuotes.js';
import { SPORT_FACTS } from '../data/sportFacts.js';
import {
  CONTENT_TYPES,
  SLIDE_INTERVAL_MS,
  getSeasonalContent
} from '../data/adValvasConfig.js';
import { shuffleArray } from '../utils/adValvasHelpers.js';

export function useAdValvasContent({
  testHighscores,
  breakingNewsItems,
  activeTests,
  mededelingenData,
  loading
}) {
  const [contentItems, setContentItems] = useState([]);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState('');

  // Teller die per contentgeneratie ophoogt: geeft stabiele React-keys binnen
  // één generatie (Date.now() per item forceerde een volledige remount).
  const generatieRef = useRef(0);

  const generateContentItems = useCallback(() => {
    const generatie = generatieRef.current;

    const highscoreItems = testHighscores.map((testData) => ({
      type: CONTENT_TYPES.HIGHSCORES,
      data: testData,
      priority: 10,
      id: `highscore-${testData.test.id}`,
      lastShown: 0
    }));

    // breakingNewsItems komt al correct geformatteerd uit de API
    const breakingItems = breakingNewsItems.map((item) => ({
      ...item,
      priority: 15,
      showFrequency: 3
    }));

    const activeTestItems = activeTests.map((test) => ({
      type: CONTENT_TYPES.ACTIVE_TEST,
      data: {
        text: `📝 Test afgenomen: ${test.naam}`,
        subtitle: 'Resultaten worden live bijgewerkt',
        test: test,
        icon: BookOpen,
        color: 'from-blue-500 to-indigo-600'
      },
      priority: 12,
      id: `active-test-${test.id}`,
      lastShown: 0
    }));

    const otherContent = [];

    try {
      const shuffledQuotes = shuffleArray(SPORT_QUOTES);
      for (let i = 0; i < 2; i++) {
        otherContent.push({
          type: CONTENT_TYPES.QUOTE,
          data: shuffledQuotes[i],
          priority: 3,
          id: `quote-${generatie}-${i}`
        });
      }

      const shuffledFacts = shuffleArray(SPORT_FACTS);
      for (let i = 0; i < 3; i++) {
        otherContent.push({
          type: CONTENT_TYPES.SPORT_FACT,
          data: {
            text: shuffledFacts[i],
            icon: Target,
            color: 'from-indigo-500 to-purple-600'
          },
          priority: 3,
          id: `fact-${generatie}-${i}`
        });
      }

      const currentMonth = new Date().getMonth();
      const seasonalContent = getSeasonalContent(currentMonth);
      if (seasonalContent) {
        otherContent.push({
          type: CONTENT_TYPES.SEASON_STATS,
          data: seasonalContent,
          priority: 4,
          id: `seasonal-${currentMonth}`
        });
      }
    } catch (error) {
      console.error('Fout bij het aanmaken van statische content:', error);
    }

    const mededelingItems = mededelingenData.map((item) => ({
      type: 'mededeling',
      priority: 20,
      data: {
        tekst: item.tekst,
        type: item.type,
        icoon: item.type === 'prestatie' ? Award : Megaphone,
        kleur:
          item.type === 'prestatie'
            ? 'from-amber-400 to-yellow-500'
            : 'from-cyan-500 to-blue-500',
        auteur: `Ingegeven door ${item.auteurNaam}`
      },
      id: `mededeling-${item.id}`
    }));

    // Bouw het alternerende patroon: highscore ↔ overige content
    const diverseContent = [];
    diverseContent.push(...mededelingItems);
    breakingItems.forEach((item) => {
      for (let i = 0; i < (item.showFrequency || 1); i++) diverseContent.push(item);
    });
    diverseContent.push(...activeTestItems);
    diverseContent.push(...otherContent);

    const diverseItemsForLoop = shuffleArray(diverseContent);
    const highscoreCount = highscoreItems.length;

    if (highscoreCount > 0 && diverseItemsForLoop.length === 0) {
      diverseItemsForLoop.push({
        type: 'placeholder',
        data: {
          text: 'Geen ander nieuws gevonden, resultaten worden wel getoond!',
          icon: RefreshCw,
          color: 'from-gray-400 to-gray-500'
        },
        id: 'placeholder-item'
      });
    }
    const diverseCount = diverseItemsForLoop.length;

    // Lege lijsten afhandelen (voorkomt ook deling door nul hieronder)
    if (highscoreCount === 0) return diverseItemsForLoop;
    if (diverseCount === 0) return highscoreItems;

    const finalPattern = [];
    const loopLength = Math.max(highscoreCount, diverseCount);
    for (let i = 0; i < loopLength; i++) {
      finalPattern.push(highscoreItems[i % highscoreCount]);
      finalPattern.push(diverseItemsForLoop[i % diverseCount]);
    }
    return finalPattern;
  }, [testHighscores, breakingNewsItems, activeTests, mededelingenData]);

  // Contentlijst (her)opbouwen zodra de data verandert.
  // liveNewsData stond hier ooit als dependency maar wordt niet gebruikt:
  // elke feed-refresh regenereerde daardoor onnodig de volledige lijst.
  useEffect(() => {
    if (loading) return;
    generatieRef.current += 1;
    setContentItems(generateContentItems());
    setCurrentContentIndex(0);
  }, [loading, generateContentItems]);

  // Rotatie: elk item krijgt SLIDE_INTERVAL_MS op het scherm.
  useEffect(() => {
    if (contentItems.length === 0) return;

    const slideTimer = setInterval(() => {
      setAnimationClass('animate-pulse');
      setTimeout(() => {
        setCurrentContentIndex((prev) => (prev + 1) % contentItems.length);
        setAnimationClass('');
      }, 300);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(slideTimer);
  }, [contentItems]);

  return {
    contentItems,
    currentContentIndex,
    setCurrentContentIndex,
    animationClass,
    currentItem: contentItems[currentContentIndex] || null
  };
}
