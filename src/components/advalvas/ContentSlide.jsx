// src/components/advalvas/ContentSlide.jsx
// MARKER_CONTENTSLIDE
// Rendert één contentitem uit de rotatie. Puur presentatie: alle data komt
// via props, er wordt hier niets opgehaald of berekend.
//
// LET OP: externe RSS-titels (LIVE_SPORTS_NEWS) worden als tekstnode
// gerenderd — React escapet die. Nooit dangerouslySetInnerHTML gebruiken.

import { Trophy, Calendar, Clock, Activity, Quote, BookOpen, Users, BarChart3 } from 'lucide-react';
import PodiumCard from './PodiumCard.jsx';
import { CONTENT_TYPES } from '../../data/adValvasConfig.js';
import { getRelativeTime } from '../../utils/adValvasHelpers.js';

export default function ContentSlide({ item }) {
  if (!item) return null;
    switch (item.type) {
     case CONTENT_TYPES.HIGHSCORES:
  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-10 max-w-7xl mx-auto overflow-hidden relative">
      {/* ... decoratieve elementen ... */}
      <div className="relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-6xl font-black text-gray-800 mb-4 tracking-tight bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {item.data.test.naam}
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {item.data.scores.map((score, index) => (
            <PodiumCard 
              key={score.id} 
              score={score} 
              position={index + 1} 
              eenheid={item.data.test.eenheid}
            />
          ))}
        </div>
      </div>
    </div>
  );
  case 'mededeling':
        const MededelingIcoon = item.data.icoon;
        return (
          <div className={`relative bg-gradient-to-br ${item.data.kleur} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
            <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <MededelingIcoon className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">
                {item.data.type === 'prestatie' ? 'Prestatie in de Kijker' : 'Mededeling'}
              </span>
            </div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-full mb-8">
                <MededelingIcoon className="h-12 w-12 opacity-90" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight drop-shadow-lg mb-4">
                {item.data.tekst}
              </h2>
             
            </div>
          </div>
        );
    case 'placeholder':
        const PlaceholderIcon = item.data.icon;
        return (
          <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-lg p-12 max-w-6xl mx-auto text-white`}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full mb-8">
                <PlaceholderIcon className="h-12 w-12 opacity-90 animate-spin" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold">
                {item.data.text}
              </h2>
            </div>
          </div>
        );

      case CONTENT_TYPES.LIVE_SPORTS_NEWS:
        return (
          <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-pink-800 rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden">
            {/* Live indicator */}
            <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold uppercase tracking-wider">Live News</span>
            </div>
            
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
              <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-1000"></div>
              <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping delay-2000"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
                <Activity className="h-10 w-10 opacity-80" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight drop-shadow-lg mb-6">
                {item.data.title}
              </h2>
              <div className="flex items-center justify-center space-x-4 text-red-100">
                <span className="text-sm font-medium">{item.data.source}</span>
                <div className="w-1 h-1 bg-red-200 rounded-full"></div>
                <span className="text-sm">{getRelativeTime(item.data.publishedAt)}</span>
              </div>
            </div>
          </div>
        );
case CONTENT_TYPES.BREAKING_NEWS:
      return (
        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-pink-800 rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden animate-pulse">
          {/* BREAKING NEWS indicator */}
          <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 animate-bounce">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            <span className="text-sm font-bold uppercase tracking-wider">BREAKING NEWS</span>
          </div>
          
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
            <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping delay-2000"></div>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <Trophy className="h-10 w-10 opacity-80 animate-spin" style={{animationDuration: '3s'}} />
            </div>
            <h2 className="text-4xl lg:text-6xl font-bold leading-tight drop-shadow-lg mb-4">
              {item.data.title}
            </h2>
            <p className="text-2xl lg:text-4xl mb-6 opacity-90">
              {item.data.subtitle}
            </p>
            <div className="flex items-center justify-center space-x-4 text-red-100">
              <span className="text-sm font-medium bg-white/20 rounded-full px-3 py-1">
                {getRelativeTime(item.data.timestamp)}
              </span>
            </div>
          </div>
        </div>
      );
      
    case CONTENT_TYPES.ACTIVE_TEST:
      return (
        <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
          {/* LIVE indicator */}
          <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold uppercase tracking-wider">VANDAAG ACTIEF</span>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <BookOpen className="h-10 w-10 opacity-80" />
            </div>
            <h2 className="text-4xl lg:text-6xl font-bold leading-tight drop-shadow-lg mb-4">
              {item.data.text}
            </h2>
            <p className="text-xl opacity-80 mb-6">
              {item.data.subtitle}
            </p>
            <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
              <Activity className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Live updates</span>
            </div>
          </div>
        </div>
      );
      
    case CONTENT_TYPES.UPCOMING_EVENT:
      return (
        <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <Calendar className="h-10 w-10 opacity-80" />
            </div>
            <h2 className="text-4xl lg:text-6xl font-bold leading-tight drop-shadow-lg mb-6">
              {item.data.text}
            </h2>
            <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{item.data.date}</span>
            </div>
          </div>
        </div>
      );
      case CONTENT_TYPES.QUOTE:
        return (
          <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
              <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-1000"></div>
              <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping delay-2000"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
                <Quote className="h-10 w-10 opacity-80" />
              </div>
              <blockquote className="text-4xl lg:text-6xl font-medium leading-relaxed mb-8 italic relative">
                <span className="text-6xl text-white/20 absolute -top-4 -left-2">"</span>
                {item.data.text}
                <span className="text-6xl text-white/20 absolute -bottom-8 -right-2">"</span>
              </blockquote>
              <cite className="text-xl opacity-90 font-semibold bg-white/10 rounded-full px-6 py-2 inline-block">
                — {item.data.author}
              </cite>
            </div>
          </div>
        );

      // "3A liep de Cooper-test — 22 leerlingen". Bewust groot gezet: dit
      // moet vanaf de overkant van de sporthal leesbaar zijn.
      case CONTENT_TYPES.DAILY_ACTIVITY:
        return (
          <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
            <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold uppercase tracking-wider">Vandaag</span>
            </div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full mb-8">
                <Users className="h-12 w-12 opacity-90" />
              </div>
              <div className="text-7xl lg:text-9xl font-black tracking-tight mb-4 drop-shadow-lg">
                {item.data.klas}
              </div>
              <h2 className="text-3xl lg:text-5xl font-bold leading-tight mb-6">
                {item.data.testNaam}
              </h2>
              <div className="inline-flex items-center space-x-3 bg-white/20 rounded-full px-6 py-3">
                <span className="text-2xl lg:text-3xl font-black">{item.data.aantalLeerlingen}</span>
                <span className="text-lg lg:text-xl font-medium opacity-90">leerlingen namen deel</span>
              </div>
            </div>
          </div>
        );

      // Weekcijfers: schaal tonen, nooit individuele prestaties.
      case CONTENT_TYPES.WEEKLY_STATS:
        return (
          <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
            <div className="absolute top-6 right-6 flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Deze week</span>
            </div>
            <div className="relative z-10 text-center">
              <h2 className="text-3xl lg:text-5xl font-bold mb-10">Zo actief was de sportweek</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {[
                  { waarde: item.data.aantalScores, label: 'scores' },
                  { waarde: item.data.aantalLeerlingen, label: 'sporters' },
                  { waarde: item.data.aantalKlassen, label: 'klassen' },
                  { waarde: item.data.aantalTesten, label: 'testsoorten' }
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/15 backdrop-blur-sm rounded-2xl py-6 px-4">
                    <div className="text-5xl lg:text-7xl font-black tracking-tight drop-shadow-sm">
                      {stat.waarde}
                    </div>
                    <div className="text-base lg:text-lg font-medium opacity-90 mt-2">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case CONTENT_TYPES.SEASON_STATS:
      case CONTENT_TYPES.SPORT_FACT:
        const IconComponent = item.data.icon;
        return (
          <div className={`relative bg-gradient-to-br ${item.data.color} rounded-3xl shadow-2xl p-12 max-w-6xl mx-auto text-white overflow-hidden`}>
            {/* Subtle animated background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-8 hover:scale-110 transition-transform duration-300">
                <IconComponent className="h-12 w-12 opacity-90" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight drop-shadow-sm">
                {item.data.text}
              </h2>
              
              {/* Add type indicator */}
              <div className="mt-6 inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium opacity-90 uppercase tracking-wider">
                  {item.type === CONTENT_TYPES.SPORT_FACT ? 'Wist je dat...' : 
                   item.type === CONTENT_TYPES.WEEKLY_STATS ? 'Deze week' :
                   item.type === CONTENT_TYPES.SEASON_STATS ? 'Seizoen update' : 'Vandaag'}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
}
