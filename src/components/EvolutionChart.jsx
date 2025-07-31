// src/components/EvolutionChart.jsx
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// Custom plugin voor gekleurde zones
const coloredZonesPlugin = {
  id: 'coloredZones',
  beforeDraw(chart, args, options) {
    const { ctx, chartArea: { top, bottom, left, right, width }, scales: { y } } = chart;
    const { threshold_50, threshold_65, score_richting } = options;

    if (threshold_50 === undefined || threshold_65 === undefined) return;

    ctx.save();
    
    const y50 = y.getPixelForValue(threshold_50);
    const y65 = y.getPixelForValue(threshold_65);

    // Teken zones op basis van score richting
    if (score_richting === 'omlaag') { // Lager is beter
      // Groen (excellent): van top tot y65
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
      ctx.fillRect(left, top, width, y65 - top);
      
      // Oranje (goed): van y65 tot y50  
      ctx.fillStyle = 'rgba(249, 115, 22, 0.1)';
      ctx.fillRect(left, y65, width, y50 - y65);
      
      // Rood (verbetering nodig): van y50 tot bottom
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(left, y50, width, bottom - y50);
    } else { // Hoger is beter
      // Rood (verbetering nodig): van y50 tot bottom
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(left, y50, width, bottom - y50);
      
      // Oranje (goed): van y65 tot y50
      ctx.fillStyle = 'rgba(249, 115, 22, 0.1)';
      ctx.fillRect(left, y65, width, y50 - y65);
      
      // Groen (excellent): van top tot y65
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
      ctx.fillRect(left, top, width, y65 - top);
    }

    ctx.restore();
  }
};

// Custom plugin voor drempel lijnen
const thresholdLinesPlugin = {
  id: 'thresholdLines',
  afterDatasetsDraw(chart, args, options) {
    const { ctx, chartArea: { left, right }, scales: { y } } = chart;
    const { threshold_50, threshold_65 } = options;

    if (threshold_50 === undefined || threshold_65 === undefined) return;

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;

    // 50e percentiel lijn (oranje)
    const y50 = y.getPixelForValue(threshold_50);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
    ctx.beginPath();
    ctx.moveTo(left, y50);
    ctx.lineTo(right, y50);
    ctx.stroke();

    // 65e percentiel lijn (groen)
    const y65 = y.getPixelForValue(threshold_65);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.beginPath();
    ctx.moveTo(left, y65);
    ctx.lineTo(right, y65);
    ctx.stroke();

    ctx.restore();
  }
};

export default function EvolutionChart({ scores, eenheid, onPointClick, thresholds }) {
  // Sorteer scores op datum voor correcte lijn weergave
  const sortedScores = [...scores].sort((a, b) => new Date(a.datum) - new Date(b.datum));

  const data = {
    labels: sortedScores.map(s => new Date(s.datum).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })),
    datasets: [
      {
        label: 'Evolutie',
        data: sortedScores.map(s => s.score),
        borderColor: 'rgb(126, 34, 206)',
        backgroundColor: 'rgba(126, 34, 206, 0.1)',
        pointBackgroundColor: 'rgb(126, 34, 206)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.3,
        fill: true,
        borderWidth: 3,
      },
    ],
  };

  // Bereken Y-as bereik met padding
  const allValues = sortedScores.map(s => s.score);
  if (thresholds) {
    allValues.push(thresholds.threshold_50, thresholds.threshold_65);
  }
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const padding = (maxValue - minValue) * 0.1 || 1;

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
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            const scoreData = sortedScores[index];
            return new Date(scoreData.datum).toLocaleDateString('nl-BE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
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
            size: 11
          }
        }
      },
      y: {
        min: minValue - padding,
        max: maxValue + padding,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 11
          },
          callback: function(value) {
            return `${value} ${eenheid || ''}`;
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
      
      {/* Threshold Legend */}
      {thresholds && (
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs border border-gray-200/50 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-500"></div>
              <span className="text-gray-600">P65 (Excellent)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500"></div>
              <span className="text-gray-600">P50 (Goed)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}