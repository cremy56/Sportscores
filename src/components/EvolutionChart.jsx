// src/components/EvolutionChart.jsx - Mobile Optimized - IMPROVED SCALING & LAYOUT
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// Custom plugin voor gekleurde zones (geen wijzigingen hier)
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

    // Teken zones op basis van score richting
    if (score_richting === 'omlaag') { // Lager is beter
      // Groen: top -> y14
      ctx.fillStyle = `rgba(34, 197, 94, ${zoneOpacity})`;
      ctx.fillRect(left, top, width, y14 - top);
      // Oranje: y14 -> y10
      ctx.fillStyle = `rgba(249, 115, 22, ${zoneOpacity})`;
      ctx.fillRect(left, y14, width, y10 - y14);
      // Rood: y10 -> bottom
      ctx.fillStyle = `rgba(239, 68, 68, ${zoneOpacity})`;
      ctx.fillRect(left, y10, width, bottom - y10);
    } else { // Hoger is beter
      // Rood: bottom -> y10
      ctx.fillStyle = `rgba(239, 68, 68, ${zoneOpacity})`;
      ctx.fillRect(left, y10, width, bottom - y10);
      // Oranje: y10 -> y14
      ctx.fillStyle = `rgba(249, 115, 22, ${zoneOpacity})`;
      ctx.fillRect(left, y10, width, y14 - y10);
      // Groen: y14 -> top
      ctx.fillStyle = `rgba(34, 197, 94, ${zoneOpacity})`;
      ctx.fillRect(left, y14, width, top - y14);
    }

    ctx.restore();
  }
};
// Custom plugin voor drempel lijnen (geen wijzigingen hier)
// **HERBOUWD** Plugin voor drempellijnen op basis van 10/20 en 14/20 normen
const thresholdLinesPlugin = {
  id: 'thresholdLines',
  afterDatasetsDraw(chart, args, options) {
    const { ctx, chartArea: { left, right }, scales: { y } } = chart;
    const { norm_10, norm_14 } = options;

    if (norm_10 === undefined || norm_14 === undefined) return;

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;

    // Lijn voor 10/20 (oranje)
    const y10 = y.getPixelForValue(norm_10);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
    ctx.beginPath();
    ctx.moveTo(left, y10);
    ctx.lineTo(right, y10);
    ctx.stroke();

    // Lijn voor 14/20 (groen)
    const y14 = y.getPixelForValue(norm_14);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.beginPath();
    ctx.moveTo(left, y14);
    ctx.lineTo(right, y14);
    ctx.stroke();

    ctx.restore();
  }
};

// **HERBOUWD** Y-as schaling functie op basis van 1/20 en 20/20 normen
const calculateOptimalYRange = (scoreValues, scoreNorms) => {
  if (!scoreNorms || scoreNorms['1'] === undefined || scoreNorms['20'] === undefined) {
    // Fallback als normen niet beschikbaar zijn
    const scoreMin = scoreValues.length > 0 ? Math.min(...scoreValues) : 0;
    const scoreMax = scoreValues.length > 0 ? Math.max(...scoreValues) : 100;
    const padding = (scoreMax - scoreMin) * 0.2;
    return { minValue: scoreMin - padding, maxValue: scoreMax + padding };
  }

  // Bereken min/max op basis van 1/20 en 20/20 normen met 15% padding
  let minValue = scoreNorms['1'] * 0.85;
  let maxValue = scoreNorms['20'] * 1.15;

  // Zorg dat de scores van de leerling altijd zichtbaar zijn
  if (scoreValues.length > 0) {
      const actualMin = Math.min(...scoreValues);
      const actualMax = Math.max(...scoreValues);
      minValue = Math.min(minValue, actualMin - (actualMax - actualMin) * 0.1);
      maxValue = Math.max(maxValue, actualMax + (actualMax - actualMin) * 0.1);
  }

  return { minValue, maxValue };
};


export default function EvolutionChart({ scores, eenheid, onPointClick, scoreNorms, scoreRichting }) {
  const sortedScores = [...scores].sort((a, b) => new Date(a.datum) - new Date(b.datum));

  const data = {
    labels: sortedScores.map(s => new Date(s.datum).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: '2-digit' })),
    datasets: [{
        label: 'Evolutie',
        data: sortedScores.map(s => s.score),
        borderColor: 'rgb(126, 34, 206)',
        backgroundColor: 'rgba(126, 34, 206, 0.1)',
        pointBackgroundColor: 'rgb(126, 34, 206)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 7,
        pointHoverRadius: 9,
        tension: 0.3,
        fill: true,
        borderWidth: 3,
    }],
  };
  
  const scoreValues = sortedScores.map(s => s.score);
  const { minValue, maxValue } = calculateOptimalYRange(scoreValues, scoreNorms);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
     // **AANGEPAST**: Voorkom de fout door een fallback object te gebruiken
      // als scoreNorms nog null is.
      coloredZones: { ...(scoreNorms || {}), score_richting: scoreRichting },
      thresholdLines: { ...(scoreNorms || {}) }
    },
    scales: {
      y: {
        min: minValue,
        max: maxValue,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: isMobile ? 10 : 12
          },
        }
      },
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: isMobile ? 10 : 12
          },
          maxRotation: isMobile ? 45 : 0,
          minRotation: isMobile ? 45 : 0,
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

  // **AANGEPAST** JSX structuur voor legenda onder de grafiek
  return (
    <div className="flex flex-col h-full w-full">
      <div className="relative flex-grow">
        <Line 
          options={options} 
          data={data} 
          plugins={[coloredZonesPlugin, thresholdLinesPlugin]} 
        />
        {isMobile && eenheid && (
          <div className="absolute bottom-1 left-1 bg-white/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-600">
            {eenheid}
          </div>
        )}
      </div>
      
      {/* **HERBOUWD** Legenda voor de nieuwe 10/20 en 14/20 drempels */}
      {scoreNorms && (
        <div className="mt-4 flex justify-center items-center">
            <div className="flex items-center gap-x-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-0.5" style={{borderTop: '2px dashed rgba(34, 197, 94, 0.8)'}}></div>
                    <span>14/20 (Goed)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-0.5" style={{borderTop: '2px dashed rgba(249, 115, 22, 0.8)'}}></div>
                    <span>10/20 (Voldoende)</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}