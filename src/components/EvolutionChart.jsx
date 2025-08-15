// src/components/EvolutionChart.jsx
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
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

    if (score_richting === 'omlaag') {
      ctx.fillStyle = `rgba(34, 197, 94, ${zoneOpacity})`;
      ctx.fillRect(left, top, width, y14 - top);
      ctx.fillStyle = `rgba(249, 115, 22, ${zoneOpacity})`;
      ctx.fillRect(left, y14, width, y10 - y14);
      ctx.fillStyle = `rgba(239, 68, 68, ${zoneOpacity})`;
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

// **AANGEPAST**: De Y-as wordt nu berekend op basis van de hoogste en laagste score van de leerling.
const calculateOptimalYRange = (scoreValues) => {
  // Als er geen scores zijn, gebruik een standaard bereik.
  if (!scoreValues || scoreValues.length === 0) {
    return { minValue: 0, maxValue: 100 };
  }

  const actualMin = Math.min(...scoreValues);
  const actualMax = Math.max(...scoreValues);

  // Als alle scores gelijk zijn, voeg een kleine marge toe.
  if (actualMin === actualMax) {
    const padding = actualMin * 0.1;
    return {
      minValue: actualMin - padding,
      maxValue: actualMax + padding,
    };
  }

  // Bereken 10% van het bereik van de scores als marge.
  const range = actualMax - actualMin;
  const padding = range * 0.10;

  return {
    minValue: actualMin - padding,
    maxValue: actualMax + padding,
  };
};


export default function EvolutionChart({ scores, eenheid, onPointClick, scoreNorms, scoreRichting }) {
  const sortedScores = [...scores].sort((a, b) => new Date(a.datum) - new Date(b.datum));
  const isMobile = window.innerWidth < 640;
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
  // **AANGEPAST**: De 'scoreNorms' worden niet meer meegegeven voor de schaalberekening.
  const { minValue, maxValue } = calculateOptimalYRange(scoreValues);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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