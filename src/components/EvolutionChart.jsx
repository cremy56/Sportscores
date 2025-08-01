// src/components/EvolutionChart.jsx - Mobile Optimized - FIXED SCALING
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// Custom plugin voor gekleurde zones - Verbeterd voor betere zichtbaarheid
const coloredZonesPlugin = {
  id: 'coloredZones',
  beforeDraw(chart, args, options) {
    const { ctx, chartArea: { top, bottom, left, right, width }, scales: { y } } = chart;
    const { threshold_50, threshold_65, score_richting } = options;

    if (threshold_50 === undefined || threshold_65 === undefined) return;

    // Controleer of thresholds binnen zichtbaar bereik vallen
    const yMin = y.min;
    const yMax = y.max;
    
    if ((threshold_50 < yMin || threshold_50 > yMax) && 
        (threshold_65 < yMin || threshold_65 > yMax)) {
      return; // Geen zones tekenen als thresholds buiten bereik zijn
    }

    ctx.save();
    
    const y50 = y.getPixelForValue(Math.max(Math.min(threshold_50, yMax), yMin));
    const y65 = y.getPixelForValue(Math.max(Math.min(threshold_65, yMax), yMin));

    // Gebruik lagere opacity voor zones
    const lowOpacity = 0.05; // Nog lagere opacity
    
    // Teken zones op basis van score richting
    if (score_richting === 'omlaag') { // Lager is beter
      // Groen (excellent): van top tot y65 - alleen als y65 zichtbaar is
      if (threshold_65 >= yMin && threshold_65 <= yMax) {
        ctx.fillStyle = `rgba(34, 197, 94, ${lowOpacity})`;
        ctx.fillRect(left, top, width, y65 - top);
      }
      
      // Oranje (goed): van y65 tot y50 - alleen als beide zichtbaar zijn
      if (threshold_65 >= yMin && threshold_50 <= yMax) {
        ctx.fillStyle = `rgba(249, 115, 22, ${lowOpacity})`;
        const zoneTop = Math.max(y65, top);
        const zoneBottom = Math.min(y50, bottom);
        if (zoneBottom > zoneTop) {
          ctx.fillRect(left, zoneTop, width, zoneBottom - zoneTop);
        }
      }
      
      // Rood (verbetering nodig): van y50 tot bottom - alleen als y50 zichtbaar is
      if (threshold_50 >= yMin && threshold_50 <= yMax) {
        ctx.fillStyle = `rgba(239, 68, 68, ${lowOpacity})`;
        ctx.fillRect(left, y50, width, bottom - y50);
      }
    } else { // Hoger is beter
      // Rood (verbetering nodig): van bottom tot y50
      if (threshold_50 >= yMin && threshold_50 <= yMax) {
        ctx.fillStyle = `rgba(239, 68, 68, ${lowOpacity})`;
        ctx.fillRect(left, y50, width, bottom - y50);
      }
      
      // Oranje (goed): van y50 tot y65
      if (threshold_50 >= yMin && threshold_65 <= yMax) {
        ctx.fillStyle = `rgba(249, 115, 22, ${lowOpacity})`;
        const zoneTop = Math.max(y65, top);
        const zoneBottom = Math.min(y50, bottom);
        if (zoneBottom > zoneTop) {
          ctx.fillRect(left, zoneTop, width, zoneBottom - zoneTop);
        }
      }
      
      // Groen (excellent): van y65 tot top
      if (threshold_65 >= yMin && threshold_65 <= yMax) {
        ctx.fillStyle = `rgba(34, 197, 94, ${lowOpacity})`;
        ctx.fillRect(left, top, width, y65 - top);
      }
    }

    ctx.restore();
  }
};

// Custom plugin voor drempel lijnen - Verbeterd voor betere zichtbaarheid
const thresholdLinesPlugin = {
  id: 'thresholdLines',
  afterDatasetsDraw(chart, args, options) {
    const { ctx, chartArea: { left, right }, scales: { y } } = chart;
    const { threshold_50, threshold_65 } = options;

    if (threshold_50 === undefined || threshold_65 === undefined) return;

    // Controleer of thresholds binnen zichtbaar bereik vallen
    const yMin = y.min;
    const yMax = y.max;
    
    if ((threshold_50 < yMin || threshold_50 > yMax) && 
        (threshold_65 < yMin || threshold_65 > yMax)) {
      return; // Geen thresholds tekenen als ze buiten bereik zijn
    }

    ctx.save();
    ctx.setLineDash([3, 3]); // Kortere streepjes
    ctx.lineWidth = 1;

    // 50e percentiel lijn (oranje) - alleen als binnen bereik
    if (threshold_50 >= yMin && threshold_50 <= yMax) {
      const y50 = y.getPixelForValue(threshold_50);
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)'; // Lagere opacity
      ctx.beginPath();
      ctx.moveTo(left + 10, y50); // Start iets naar rechts
      ctx.lineTo(right - 10, y50); // Stop iets voor het einde
      ctx.stroke();
    }

    // 65e percentiel lijn (groen) - alleen als binnen bereik
    if (threshold_65 >= yMin && threshold_65 <= yMax) {
      const y65 = y.getPixelForValue(threshold_65);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)'; // Lagere opacity
      ctx.beginPath();
      ctx.moveTo(left + 10, y65); // Start iets naar rechts
      ctx.lineTo(right - 10, y65); // Stop iets voor het einde
      ctx.stroke();
    }

    ctx.restore();
  }
};

export default function EvolutionChart({ scores, eenheid, onPointClick, thresholds }) {
  // Sorteer scores op datum voor correcte lijn weergave
  const sortedScores = [...scores].sort((a, b) => new Date(a.datum) - new Date(b.datum));

  // Detect mobile screen
  const isMobile = window.innerWidth < 640;

  const data = {
    labels: sortedScores.map(s => {
      const date = new Date(s.datum);
      // Shorter date format for mobile
      return isMobile 
        ? date.toLocaleDateString('nl-BE', {
            day: '2-digit',
            month: '2-digit'
          })
        : date.toLocaleDateString('nl-BE', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          });
    }),
    datasets: [
      {
        label: 'Evolutie',
        data: sortedScores.map(s => s.score),
        borderColor: 'rgb(126, 34, 206)',
        backgroundColor: 'rgba(126, 34, 206, 0.1)',
        pointBackgroundColor: 'rgb(126, 34, 206)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: isMobile ? 4 : 6,
        pointHoverRadius: isMobile ? 6 : 8,
        tension: 0.3,
        fill: true,
        borderWidth: isMobile ? 2 : 3,
      },
    ],
  };

  // Bereken Y-as bereik met intelligente padding
  const scoreValues = sortedScores.map(s => s.score);
  const scoreMin = Math.min(...scoreValues);
  const scoreMax = Math.max(...scoreValues);
  
  // Voor scores range: gebruik 25% padding onder minimum, 15% boven maximum
  const scoreRange = scoreMax - scoreMin;
  const baseRange = Math.max(scoreRange, scoreMax * 0.1); // Minimum 10% van de hoogste score
  
  let minValue = scoreMin - (baseRange * 0.25);
  let maxValue = scoreMax + (baseRange * 0.15);
  
  // Als er thresholds zijn, controleer of ze binnen bereik vallen
  if (thresholds) {
    const thresholdMin = Math.min(thresholds.threshold_50, thresholds.threshold_65);
    const thresholdMax = Math.max(thresholds.threshold_50, thresholds.threshold_65);
    
    // Alleen thresholds includeren als ze dicht bij de scores liggen
    const scoreCenter = (scoreMin + scoreMax) / 2;
    const thresholdCenter = (thresholdMin + thresholdMax) / 2;
    const centerDistance = Math.abs(scoreCenter - thresholdCenter);
    
    // Als thresholds ver van scores zijn, negeer ze voor schaling
    if (centerDistance < baseRange * 2) {
      minValue = Math.min(minValue, thresholdMin - (baseRange * 0.1));
      maxValue = Math.max(maxValue, thresholdMax + (baseRange * 0.1));
    }
  }
  
  // Zorg voor een minimum bereik voor zichtbaarheid
  const finalRange = maxValue - minValue;
  const minimumRange = scoreMax * 0.2; // Minimum 20% van hoogste score
  
  if (finalRange < minimumRange) {
    const center = (minValue + maxValue) / 2;
    minValue = center - (minimumRange / 2);
    maxValue = center + (minimumRange / 2);
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: { 
        display: false 
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: 'rgb(55, 65, 81)',
        bodyColor: 'rgb(55, 65, 81)',
        borderColor: 'rgba(126, 34, 206, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: isMobile ? 12 : 14
        },
        bodyFont: {
          size: isMobile ? 11 : 13
        },
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            const scoreData = sortedScores[index];
            return new Date(scoreData.datum).toLocaleDateString('nl-BE', {
              weekday: isMobile ? 'short' : 'long',
              day: 'numeric',
              month: isMobile ? 'short' : 'long',
              year: 'numeric'
            });
          },
          label: function(context) {
            return `Score: ${context.parsed.y} ${eenheid || ''}`;
          },
          afterLabel: function(context) {
            if (!thresholds) return '';
            
            const score = context.parsed.y;
            const { threshold_50, threshold_65, score_richting } = thresholds;
            
            let level = '';
            if (score_richting === 'omlaag') {
              if (score <= threshold_65) level = '🟢 Excellent';
              else if (score <= threshold_50) level = '🟠 Goed';
              else level = '🔴 Verbetering nodig';
            } else {
              if (score >= threshold_65) level = '🟢 Excellent';
              else if (score >= threshold_50) level = '🟠 Goed';
              else level = '🔴 Verbetering nodig';
            }
            
            return level;
          }
        }
      },
      // Voeg threshold plugins toe
      coloredZones: thresholds,
      thresholdLines: thresholds
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: isMobile ? 9 : 11
          },
          maxRotation: isMobile ? 45 : 0,
          minRotation: isMobile ? 45 : 0
        }
      },
      y: {
        min: minValue,
        max: maxValue,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: isMobile ? 9 : 11
          },
          callback: function(value) {
            // Shorter format on mobile
            if (isMobile) {
              return `${Math.round(value)}`;
            }
            return `${Math.round(value)} ${eenheid || ''}`;
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onPointClick) {
        const elementIndex = elements[0].index;
        const scoreData = sortedScores[elementIndex];
        onPointClick(scoreData);
      }
    },
    onHover: (event, elements) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    }
  };

  return (
    <div className="relative h-full">
      <Line 
        options={options} 
        data={data} 
        plugins={[coloredZonesPlugin, thresholdLinesPlugin]} 
      />
      
      {/* Threshold Legend - Mobile Optimized - alleen tonen als thresholds binnen bereik */}
      {thresholds && (() => {
        const scoreValues = sortedScores.map(s => s.score);
        const scoreMin = Math.min(...scoreValues);
        const scoreMax = Math.max(...scoreValues);
        const scoreRange = scoreMax - scoreMin;
        const baseRange = Math.max(scoreRange, scoreMax * 0.1);
        
        let chartMin = scoreMin - (baseRange * 0.25);
        let chartMax = scoreMax + (baseRange * 0.15);
        
        // Controleer of thresholds binnen chart bereik vallen
        const thresholdInRange = 
          (thresholds.threshold_50 >= chartMin && thresholds.threshold_50 <= chartMax) ||
          (thresholds.threshold_65 >= chartMin && thresholds.threshold_65 <= chartMax);
          
        return thresholdInRange;
      })() && (
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white/90 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 text-xs border border-gray-200/50 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-0.5 sm:w-3 sm:h-0.5 bg-green-500 opacity-60"></div>
              <span className="text-gray-600 text-xs sm:text-xs">
                {isMobile ? 'P65' : 'P65 (Excellent)'}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-0.5 sm:w-3 sm:h-0.5 bg-orange-500 opacity-60"></div>
              <span className="text-gray-600 text-xs sm:text-xs">
                {isMobile ? 'P50' : 'P50 (Goed)'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Unit Display */}
      {isMobile && eenheid && (
        <div className="absolute bottom-1 left-1 bg-white/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-600">
          {eenheid}
        </div>
      )}
    </div>
  );
}