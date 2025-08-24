// src/components/EvolutionChart.jsx - Optimized and Consistent Layout
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

// **HERBOUWD**: Y-as schaling met nieuwe, conditionele logica.
const calculateOptimalYRange = (scoreValues, scoreNorms) => {
  // Fallback als normen niet beschikbaar zijn: baseer op scores.
  if (!scoreNorms || scoreNorms['1'] === undefined || scoreNorms['20'] === undefined) {
    if (!scoreValues || scoreValues.length === 0) return { minValue: 0, maxValue: 100 };
    const minScore = Math.min(...scoreValues);
    const maxScore = Math.max(...scoreValues);
    const padding = (maxScore - minScore) * 0.1;
    return { minValue: minScore - padding, maxValue: maxScore + padding };
  }

  // 1. Bepaal het basisbereik op basis van de laagste en hoogste norm.
  const lowestNorm = scoreNorms['1'];
  const highestNorm = scoreNorms['20'];
  const normRange = highestNorm - lowestNorm;

  // 2. Bereken het nieuwe, strakkere bereik.
  let finalMinValue = lowestNorm + (normRange * 0.15);  // Verhoog de ondergrens met 15%
  let finalMaxValue = highestNorm - (normRange * 0.10); // Verlaag de bovengrens met 10%

  // 3. Controleer of de daadwerkelijke scores binnen dit nieuwe bereik vallen.
  if (scoreValues && scoreValues.length > 0) {
    const actualMin = Math.min(...scoreValues);
    const actualMax = Math.max(...scoreValues);

    // Als de hoogste score van de leerling buiten het nieuwe bereik valt,
    // negeer de -10% aanpassing en zorg dat de score zichtbaar is.
    if (actualMax > finalMaxValue) {
      finalMaxValue = actualMax + (normRange * 0.05); // Zorg voor 5% marge boven de hoogste score
    }

    // Als de laagste score van de leerling buiten het nieuwe bereik valt,
    // negeer de +15% aanpassing en zorg dat de score zichtbaar is.
    if (actualMin < finalMinValue) {
      finalMinValue = actualMin - (normRange * 0.05); // Zorg voor 5% marge onder de laagste score
    }
  }

  return { minValue: finalMinValue, maxValue: finalMaxValue };
};


export default function EvolutionChart({ scores, eenheid, onPointClick, scoreNorms, scoreRichting }) {
  const sortedScores = [...scores].sort((a, b) => new Date(a.datum) - new Date(b.datum));
  const isMobile = window.innerWidth < 640;
  
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
        pointRadius: isMobile ? 5 : 6,
        pointHoverRadius: isMobile ? 7 : 8,
        tension: 0.3,
        fill: true,
        borderWidth: isMobile ? 2 : 3,
    }],
  };
  
  const scoreValues = sortedScores.map(s => s.score);
  // **AANGEPAST**: De functie gebruikt nu BEIDE parameters.
  const { minValue, maxValue } = calculateOptimalYRange(scoreValues, scoreNorms);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
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
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: isMobile ? 10 : 11
          },
          padding: 8,
          maxTicksLimit: 8
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
          padding: 8,
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
        {isMobile && eenheid && (
          <div className="absolute bottom-1 left-1 bg-white/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-600">
            {eenheid}
          </div>
        )}
      </div>
      
      {scoreNorms && (
        <div className="mt-3 flex justify-center items-center">
            <div className="flex items-center gap-x-4 sm:gap-x-6 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-4 sm:w-5 h-0.5" style={{borderTop: '2px dashed rgba(34, 197, 94, 0.8)'}}></div>
                    {/* Toon de score voor 14/20 met de juiste eenheid */}
                    <span className="whitespace-nowrap font-medium">{scoreNorms['14']} {eenheid} (Goed)</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-4 sm:w-5 h-0.5" style={{borderTop: '2px dashed rgba(249, 115, 22, 0.8)'}}></div>
                    {/* Toon de score voor 10/20 met de juiste eenheid */}
                    <span className="whitespace-nowrap font-medium">{scoreNorms['10']} {eenheid} (Voldoende)</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}