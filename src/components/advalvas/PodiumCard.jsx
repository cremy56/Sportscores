// src/components/advalvas/PodiumCard.jsx
// MARKER_PODIUMCARD
// Eén podiumplaats (goud/zilver/brons) op het ad valvas-scherm.

import { Star } from 'lucide-react';
import { formatScoreWithUnit } from '../../utils/formatters.js';
import { formatNameForDisplay, getRelativeTime } from '../../utils/adValvasHelpers.js';

const PODIUM_STYLES = {
  1: {
    bg: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
    text: 'text-yellow-900',
    icon: '🥇',
    shadow: 'shadow-yellow-500/30'
  },
  2: {
    bg: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500',
    text: 'text-gray-900',
    icon: '🥈',
    shadow: 'shadow-gray-500/30'
  },
  3: {
    bg: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600',
    text: 'text-orange-900',
    icon: '🥉',
    shadow: 'shadow-orange-500/30'
  }
};

export default function PodiumCard({ score, position, eenheid }) {
  const style = PODIUM_STYLES[position];
  if (!style) return null;

  return (
    <div
      className={`${style.bg} ${style.shadow} rounded-2xl p-6 text-center shadow-xl transform hover:scale-105 hover:rotate-1 transition-all duration-500 ${
        position === 1 ? 'scale-105 animate-pulse' : ''
      }`}
    >
      <div className="text-6xl mb-4 animate-bounce">{style.icon}</div>
      <div className={`${style.text} font-bold text-xl mb-3 tracking-wide`}>
        {formatNameForDisplay(score.leerling_naam)}
      </div>
      <div className={`${style.text} text-3xl font-black mb-3 drop-shadow-sm`}>
        {formatScoreWithUnit(score.score, eenheid)}
      </div>
      <div className={`${style.text} opacity-80 text-sm font-medium`}>
        {getRelativeTime(score.datum ? new Date(score.datum) : new Date())}
      </div>
      {position === 1 && (
        <div className="mt-3">
          <div className="inline-flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
            <Star className="h-4 w-4" />
            <span className="text-sm font-bold">RECORD</span>
          </div>
        </div>
      )}
    </div>
  );
}
