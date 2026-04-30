// src/components/EvolutionChart.jsx - Optimized for Tighter Layout
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { formatDate, formatScoreWithUnit } from '../utils/formatters.js';
Chart.register(...registerables);

// Custom plugin voor gekleurde zones (geen wijzigingen)
const coloredZonesPlugin = {
  id: 'coloredZones',
  beforeDraw(chart, args, options) {
    const { ctx, chartArea: { top, bottom, left, right, width }, scales: { y } } = chart;
    const { norm_10, norm_14, score_richting } = options;

    if (norm_10 === undefined || norm_14 === undefined) return;

    ctx.save();
    
    const y10 = y.getPixelForValue(norm_10);
    const y14 = y.getPixelForValue(norm_14);
    const zoneOpacity = 0.25;

    if (score_richting === 'omlaag' || score_richting === 'laag') {
      // Laag is beter + reverse: true → lage waarden staan bovenaan
      // Boven norm_14: waarden beter dan norm_14 → groen
      // Tussen norm_14 en norm_10: oranje
      // Onder norm_10: waarden slechter dan norm_10 → rood
      ctx.fillStyle = `rgba(34, 197, 94, ${zoneOpacity})`;   // groen bovenaan (beste tijden)
      ctx.fillRect(left, top, width, y14 - top);
      ctx.fillStyle = `rgba(249, 115, 22, ${zoneOpacity})`;  // oranje midden
      ctx.fillRect(left, y14, width, y10 - y14);
      ctx.fillStyle = `rgba(239, 68, 68, ${zoneOpacity})`;   // rood onderaan (slechtste tijden)
      ctx.fillRect(left, y10, width, bottom - y10);
    } else {
      ctx.fillStyle = `rgba(239, 68, 68, ${zoneOpacity})`;
      ctx.fillRect(left, y10, width, bottom - y10);
      ctx.fillStyle = `rgba(249, 115, 22, ${zoneOpacity})`;
      ctx.fillRect(left, y10, width, y14 - y10);
      ctx.fillStyle = `rgba(34, 197, 94, ${zoneOpacity})`;
      ctx.fillRect(left, y14, width, top - y14);
    }

    ctx.restore();
  }
};

// Custom plugin voor drempel lijnen (geen wijzigingen)
const thresholdLinesPlugin = {
  id: 'thresholdLines',
  afterDatasetsDraw(chart, args, options) {
    const { ctx, chartArea: { left, right }, scales: { y } } = chart;
    const { norm_10, norm_14 } = options;

    if (norm_10 === undefined || norm_14 === undefined) return;

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;

    const y10 = y.getPixelForValue(norm_10);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
    ctx.beginPath();
    ctx.moveTo(left, y10);
    ctx.lineTo(right, y10);
    ctx.stroke();

    const y14 = y.getPixelForValue(norm_14);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.beginPath();
    ctx.moveTo(left, y14);
    ctx.lineTo(right, y14);
    ctx.stroke();

    ctx.restore();
  }
};

// Y-as schaling — werkt voor zowel hoog-is-beter als laag-is-beter
const calculateOptimalYRange = (scoreValues, scoreNorms) => {
  // Fallback als normen niet beschikbaar zijn
  if (!scoreNorms || scoreNorms['1'] === undefined || scoreNorms['20'] === undefined) {
    if (!scoreValues || scoreValues.length === 0) return { minValue: 0, maxValue: 100 };
    const minScore = Math.min(...scoreValues);
    const maxScore = Math.max(...scoreValues);
    const range = maxScore - minScore;
    const padding = range === 0 ? Math.max(minScore * 0.1, 30) : range * 0.2;
    return { minValue: minScore - padding, maxValue: maxScore + padding };
  }

  // ✅ Gebruik altijd numerisch min/max — werkt voor beide richtingen
  const allNormValues = [scoreNorms['1'], scoreNorms['10'], scoreNorms['14'], scoreNorms['20']].filter(v => v !== undefined);
  const normMin = Math.min(...allNormValues);
  const normMax = Math.max(...allNormValues);
  const normRange = normMax - normMin;
  const padding = normRange * 0.15;

  let finalMin = normMin - padding;
  let finalMax = normMax + padding;

  // Zorg dat scores altijd zichtbaar zijn
  if (scoreValues && scoreValues.length > 0) {
    const actualMin = Math.min(...scoreValues);
    const actualMax = Math.max(...scoreValues);
    if (actualMin < finalMin) finalMin = actualMin - padding * 0.5;
    if (actualMax > finalMax) finalMax = actualMax + padding * 0.5;
  }

  return { minValue: finalMin, maxValue: finalMax };
};

export default function EvolutionChart({ scores, eenheid, onPointClick, scoreNorms, scoreRichting }) {
  const sortedScores = [...scores].sort((a, b) => new Date(a.datum) - new Date(b.datum));
  const isMobile = window.innerWidth < 640;
  const isSinglePoint = sortedScores.length === 1;
  
  const data = {
    labels: sortedScores.map(s => new Date(s.datum).toLocaleDateString('nl-BE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: isMobile ? '2-digit' : '2-digit' 
    })),
    datasets: [{
        label: 'Evolutie',
        data: sortedScores.map(s => s.score),
        borderColor: 'rgb(126, 34, 206)',
        backgroundColor: 'rgba(126, 34, 206, 0.1)',
        pointBackgroundColor: 'rgb(126, 34, 206)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        // ✅ Fix: groter punt bij 1 datapunt zodat het zichtbaar is
        pointRadius: isSinglePoint ? 8 : (isMobile ? 5 : 6),
        pointHoverRadius: isSinglePoint ? 10 : (isMobile ? 7 : 8),
        tension: 0.3,
        fill: true,
        borderWidth: isMobile ? 2 : 3,
        // ✅ Fix: geen lijn trekken bij 1 punt
        showLine: !isSinglePoint,
    }],
  };
  
  const scoreValues = sortedScores.map(s => s.score);
  const { minValue, maxValue } = calculateOptimalYRange(scoreValues, scoreNorms);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5
      }
    },
    plugins: {
      legend: { display: false },
      coloredZones: { ...(scoreNorms || {}), score_richting: scoreRichting },
      thresholdLines: { ...(scoreNorms || {}) }
    },
    scales: {
      y: {
        min: minValue,
        max: maxValue,
        reverse: scoreRichting === 'laag' || scoreRichting === 'omlaag',
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: { size: isMobile ? 10 : 11 },
          padding: 6,
          maxTicksLimit: 8,
          // ✅ Formateer tijdwaarden naar M'SS" formaat
          callback: function(value) {
            const eenheidLower = (eenheid || '').toLowerCase();
            const isTime = ['min', 'sec', 'seconden', 'minuten en seconden'].some(u => eenheidLower.includes(u));
            if (isTime && value >= 60) {
              const minutes = Math.floor(value / 60);
              const seconds = Math.round(value % 60);
              return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
            }
            return value;
          }
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: isMobile ? 9 : 10
          },
          maxRotation: isMobile ? 45 : 0,
          minRotation: isMobile ? 45 : 0,
          padding: 6,
          maxTicksLimit: isMobile ? 4 : 8
        },
        border: {
          display: false
        }
      }
    },
    elements: {
      point: {
        radius: isMobile ? 5 : 6,
        hoverRadius: isMobile ? 7 : 8,
        borderWidth: 2
      },
      line: {
        borderWidth: isMobile ? 2 : 3
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
    <div className="flex flex-col h-full w-full">
      <div className="relative flex-grow">
        <Line 
          options={options} 
          data={data} 
          plugins={[coloredZonesPlugin, thresholdLinesPlugin]} 
        />

      </div>
      
      {scoreNorms && (
        <div className="mt-2 flex justify-center items-center">
          <div className="flex items-center gap-x-3 sm:gap-x-5 text-xs text-gray-600">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 sm:w-4 h-0.5" style={{borderTop: '2px dashed rgba(34, 197, 94, 0.8)'}}></div>
              <span className="whitespace-nowrap font-medium">{formatScoreWithUnit(scoreNorms['14'], eenheid)}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 sm:w-4 h-0.5" style={{borderTop: '2px dashed rgba(249, 115, 22, 0.8)'}}></div>
              <span className="whitespace-nowrap font-medium">{formatScoreWithUnit(scoreNorms['10'], eenheid)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}