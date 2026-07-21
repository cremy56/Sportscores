// src/data/adValvasConfig.js
// MARKER_ADVALVAS_CONFIG
// Contenttypes, intervalinstellingen en seizoensgebonden berichten.

import { Calendar, Activity, Trophy, Users, Target, BookOpen, Zap, TrendingUp } from 'lucide-react';

export const CONTENT_TYPES = {
  HIGHSCORES: 'highscores',
  QUOTE: 'quote',
  BREAKING_NEWS: 'breaking_news',
  DAILY_ACTIVITY: 'daily_activity',
  WEEKLY_STATS: 'weekly_stats',
  MONTHLY_MILESTONE: 'monthly_milestone',
  SEASON_STATS: 'season_stats',
  SPORT_FACT: 'sport_fact',
  UPCOMING_EVENT: 'upcoming_event',
  LIVE_SPORTS_NEWS: 'live_sports_news',
  ACTIVE_TEST: 'active_test' // NIEUW
};

// --- Interval-instellingen (in ms) ---
// Comment en code liepen hier ooit uiteen; nu één bron van waarheid.
export const DATA_REFRESH_MS = 15 * 60 * 1000;   // dashboarddata: elke 15 minuten
export const FEED_REFRESH_MS = 60 * 60 * 1000;   // sportnieuwsfeed: elk uur
export const SLIDE_INTERVAL_MS = 8 * 1000;       // content wisselt elke 8 seconden
export const NEWS_TICKER_MS = 40 * 1000;         // nieuwsticker: elke 40 seconden

// Seizoensgebonden content helper (uitgebreid)
export const getSeasonalContent = (month) => {
  const seasonalData = {
    // Lente (maart, april, mei)
    2: { text: "Lente is begonnen! Perfect weer om buiten te sporten 🌸", icon: Calendar, color: "from-green-400 to-blue-500" },
    3: { text: "April: Ideale maand voor atletiek en buitenactiviteiten! 🏃‍♂️", icon: Activity, color: "from-blue-400 to-green-500" },
    4: { text: "Mei: Sportdag voorbereidingen zijn in volle gang! 🏆", icon: Trophy, color: "from-yellow-400 to-green-500" },
    
    // Zomer (juni, juli, augustus)
    5: { text: "Zomersport seizoen geopend! Zwemmen en watersport! 🏊‍♀️", icon: Activity, color: "from-blue-500 to-cyan-500" },
    6: { text: "Juli: Zomerkampen en buitenactiviteiten! ☀️", icon: Users, color: "from-orange-400 to-yellow-500" },
    7: { text: "Augustus: Laatste kans voor zomerse sportbeoefening! 🌞", icon: Target, color: "from-red-400 to-orange-500" },
    
    // Herfst (september, oktober, november) 
    8: { text: "Schoolsport herstart! Nieuwe kansen, nieuwe records! 📚", icon: BookOpen, color: "from-orange-500 to-red-500" },
    9: { text: "Oktober: Herfstcrosslopen en teambuilding activiteiten! 🍂", icon: Users, color: "from-yellow-500 to-orange-600" },
    10: { text: "November: Indoor sporten nemen de overhand! 🏀", icon: Target, color: "from-purple-500 to-blue-600" },
    
    // Winter (december, januari, februari)
    11: { text: "December: Winterse uitdagingen en conditieopbouw! ❄️", icon: Zap, color: "from-blue-600 to-purple-600" },
    0: { text: "Januari: Nieuwe jaar, nieuwe sportdoelen! 🎯", icon: Target, color: "from-indigo-500 to-purple-600" },
    1: { text: "Februari: Opbouw naar lente sportactiviteiten! 💪", icon: TrendingUp, color: "from-purple-600 to-pink-600" }
  };

  return seasonalData[month] || null;
};
