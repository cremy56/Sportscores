// src/components/advalvas/NewsTicker.jsx
// MARKER_NEWSTICKER
// Onderste nieuwsbalk met de live sportfeed (desktop only).
//
// LET OP: de titels komen van de publieke getSportNews-endpoint en zijn dus
// onvertrouwde externe data. Ze worden als tekstnode gerenderd (React
// escapet automatisch) — nooit via dangerouslySetInnerHTML.

import { WifiOff, RefreshCw, Clock } from 'lucide-react';
import { formatTime } from '../../utils/adValvasHelpers.js';

export default function NewsTicker({
  liveNewsData,
  newsIndex,
  feedStatus,
  feedLoading,
  isOnline,
  lastFeedRefresh,
  onRefresh
}) {
  return (
    <>
      <div className="hidden lg:block bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t border-slate-700 fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <div className="flex items-center h-18 overflow-hidden">
          {/* Status indicator */}
          <div className={`flex items-center px-6 h-full shadow-lg ${
            feedStatus === 'online' ? 'bg-gradient-to-r from-green-600 to-green-700' :
            feedStatus === 'offline' ? 'bg-gradient-to-r from-red-600 to-red-700' :
            'bg-gradient-to-r from-yellow-600 to-yellow-700'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full border-2 border-white ${
                feedStatus === 'online' ? 'bg-green-400 animate-pulse' :
                feedStatus === 'offline' ? 'bg-red-400' :
                'bg-yellow-400 animate-ping'
              }`}></div>
              <div className="text-white font-bold text-sm uppercase tracking-wider">
                {feedStatus === 'online' ? 'Live Sport' :
                 feedStatus === 'offline' ? 'Offline' :
                 feedStatus === 'connecting' ? 'Connecting' :
                 feedStatus === 'refreshing' ? 'Refreshing' :
                 'Error'}
              </div>
            </div>
          </div>
          
          {/* News ticker */}
          <div className="flex-1 overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900">
            <div className="animate-marquee whitespace-nowrap text-white text-xl font-medium py-6 px-6">
              {liveNewsData.length > 0 ? (
                <>
                  {liveNewsData.slice(newsIndex, newsIndex + 3).map(news => news.title).join(' • ')} • 
                  {liveNewsData.slice(0, Math.max(0, 3 - (liveNewsData.length - newsIndex))).map(news => news.title).join(' • ')} •
                </>
              ) : feedStatus === 'offline' ? (
                "Geen live sportinfo op dit ogenblik • Offline modus actief • Probeer internet verbinding te herstellen •"
              ) : (
                "🏃‍♂️ Sport nieuws wordt geladen... • ⚽ Live updates komen eraan... • 🏆 Belgische sport in de spotlight... •"
              )}
            </div>
          </div>

          {/* Control panel */}
          <div className="flex items-center space-x-6 px-6 text-white/70">
            {lastFeedRefresh && (
              <div className="flex items-center space-x-2 text-xs">
                <Clock className="h-4 w-4" />
                <span>Update: {formatTime(lastFeedRefresh)}</span>
              </div>
            )}
            
            <div className="text-xs bg-white/10 rounded-full px-3 py-1">
              {liveNewsData.length} berichten
            </div>
            
            <button
              onClick={onRefresh}
              disabled={feedLoading}
              className="flex items-center space-x-2 text-xs hover:text-white transition-colors disabled:opacity-50 bg-white/10 hover:bg-white/20 rounded-full px-3 py-2"
              title="Vernieuw live sport feed"
            >
              {isOnline ? (
                <>
                  <RefreshCw className={`h-4 w-4 ${feedLoading ? 'animate-spin' : ''}`} />
                  <span>{feedLoading ? 'Loading...' : 'Refresh'}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Offline</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}
