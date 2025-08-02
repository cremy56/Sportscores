// src/components/EvolutionChart.jsx - Mobile Optimized - IMPROVED SCALING & LAYOUT
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// Custom plugin voor gekleurde zones (geen wijzigingen hier)
const coloredZonesPlugin = {
  id: 'coloredZones',
  beforeDraw(chart, args, options) {
    const { ctx, chartArea: { top, bottom, left, right, width }, scales: { y } } = chart;
    const { threshold_50, threshold_65, score_richting } = options;

    if (threshold_50 === undefined || threshold_65 === undefined) return;
    
    const yMin = y.min;
    const yMax = y.max;
    
    if ((threshold_50 < yMin || threshold_50 > yMax) && (threshold_65 < yMin || threshold_65 > yMax)) {
      return;
    }

    ctx.save();
    
    const y50 = y.getPixelForValue(Math.max(Math.min(threshold_50, yMax), yMin));
    const y65 = y.getPixelForValue(Math.max(Math.min(threshold_65, yMax), yMin));

    const zoneOpacity = 0.35;
    
    if (score_richting === 'omlaag') {
      if (threshold_50 >= yMin && threshold_50 <= yMax) {
        ctx.fillStyle = `rgba(239, 68, 68, ${zoneOpacity})`;
        ctx.fillRect(left, y50, width, bottom - y50);
      }
      if (threshold_50 >= yMin && threshold_65 <= yMax) {
        ctx.fillStyle = `rgba(249, 115, 22, ${zoneOpacity})`;
        const zoneTop = Math.max(y65, top);
        const zoneBottom = Math.min(y50, bottom);
        if (zoneBottom > zoneTop) ctx.fillRect(left, zoneTop, width, zoneBottom - zoneTop);
      }
      if (threshold_65 >= yMin && threshold_65 <= yMax) {
        ctx.fillStyle = `rgba(34, 197, 94, ${zoneOpacity})`;
        ctx.fillRect(left, top, width, y65 - top);
      }
    } else {
      if (threshold_50 >= yMin && threshold_50 <= yMax) {
        ctx.fillStyle = `rgba(239, 68, 68, ${zoneOpacity})`;
        ctx.fillRect(left, y50, width, bottom - y50);
      }
      if (threshold_50 >= yMin && threshold_65 <= yMax) {
        ctx.fillStyle = `rgba(249, 115, 22, ${zoneOpacity})`;
        const zoneTop = Math.max(y65, top);
        const zoneBottom = Math.min(y50, bottom);
        if (zoneBottom > zoneTop) ctx.fillRect(left, zoneTop, width, zoneBottom - zoneTop);
      }
      if (threshold_65 >= yMin && threshold_65 <= yMax) {
        ctx.fillStyle = `rgba(34, 197, 94, ${zoneOpacity})`;
        ctx.fillRect(left, top, width, y65 - top);
      }
    }
    ctx.restore();
  }
};

// Custom plugin voor drempel lijnen (geen wijzigingen hier)
const thresholdLinesPlugin = {
  id: 'thresholdLines',
  afterDatasetsDraw(chart, args, options) {
    const { ctx, chartArea: { left, right }, scales: { y } } = chart;
    const { threshold_50, threshold_65 } = options;

    if (threshold_50 === undefined || threshold_65 === undefined) return;
    
    const yMin = y.min;
    const yMax = y.max;

    if ((threshold_50 < yMin || threshold_50 > yMax) && (threshold_65 < yMin || threshold_65 > yMax)) {
      return;
    }

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 3;

    if (threshold_50 >= yMin && threshold_50 <= yMax) {
      const y50 = y.getPixelForValue(threshold_50);
      ctx.strokeStyle = 'rgba(249, 115, 22, 1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left + 5, y50);
      ctx.lineTo(right - 5, y50);
      ctx.stroke();
    }

    if (threshold_65 >= yMin && threshold_65 <= yMax) {
      const y65 = y.getPixelForValue(threshold_65);
      ctx.strokeStyle = 'rgba(34, 197, 94, 1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left + 5, y65);
      ctx.lineTo(right - 5, y65);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// **AANGEPAST** Intelligente Y-as schaling functie
const calculateOptimalYRange = (scoreValues, thresholds, testName = '') => {
  if (scoreValues.length === 0) {
    return { minValue: 0, maxValue: 100 }; // Default fallback
  }

  const scoreMin = Math.min(...scoreValues);
  const scoreMax = Math.max(...scoreValues);
  
  let minValue = scoreMin;
  let maxValue = scoreMax;
  
  const isCooperTest = testName?.toLowerCase().includes('cooper');
  
  if (isCooperTest) {
    let rangeMin = scoreMin;
    let rangeMax = scoreMax;
    
    if (thresholds) {
      rangeMin = Math.min(rangeMin, thresholds.threshold_50, thresholds.threshold_65);
      rangeMax = Math.max(rangeMax, thresholds.threshold_50, thresholds.threshold_65);
    }
    
    // Gebruik Cooper range als basis, zoals gevraagd
    const cooperMin = 2100;
    const cooperMax = 3900;
    
    // Pas aan als data daarbuiten valt, met 15% padding
    minValue = Math.min(cooperMin, rangeMin - (rangeMin * 0.15));
    maxValue = Math.max(cooperMax, rangeMax + (rangeMax * 0.15));
    
    if (maxValue - minValue < 800) {
      const center = (maxValue + minValue) / 2;
      minValue = center - 400;
      maxValue = center + 400;
    }
  } else {
    if (thresholds) {
      const { threshold_50, threshold_65 } = thresholds;
      minValue = Math.min(minValue, threshold_50, threshold_65);
      maxValue = Math.max(maxValue, threshold_50, threshold_65);
    }
    
    const range = maxValue - minValue;
    let padding;
    
    if (range === 0) {
      padding = Math.max(maxValue * 0.1, 10);
    } else if (range < 100) {
      padding = range * 0.3;
    } else {
      padding = range * 0.15; // 15% padding
    }
    
    minValue -= padding;
    maxValue += padding;
  }
  
  if (minValue < 0 && scoreMin >= 0) {
    minValue = 0;
  }
  
  return { minValue, maxValue };
};

export default function EvolutionChart({ scores, eenheid, onPointClick, thresholds, testName }) {
  const sortedScores = [...scores].sort((a, b) => new Date(a.datum) - new Date(b.datum));
  const isMobile = window.innerWidth < 640;

  const data = {
    labels: sortedScores.map(s => {
      const date = new Date(s.datum);
      return isMobile 
        ? date.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' })
        : date.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }),
    datasets: [{
      label: 'Evolutie',
      data: sortedScores.map(s => s.score),
      borderColor: 'rgb(126, 34, 206)',
      backgroundColor: 'rgba(126, 34, 206, 0.1)',
      pointBackgroundColor: 'rgb(126, 34, 206)',
      pointBorderColor: 'white',
      pointBorderWidth: 2,
      pointRadius: isMobile ? 5 : 7,
      pointHoverRadius: isMobile ? 7 : 9,
      tension: 0.3,
      fill: true,
      borderWidth: isMobile ? 2 : 3,
    }],
  };

  const scoreValues = sortedScores.map(s => s.score);
  const { minValue, maxValue } = calculateOptimalYRange(scoreValues, thresholds, testName);
const isCooperTest = testName?.toLowerCase().includes('cooper');

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: 'rgb(55, 65, 81)',
        bodyColor: 'rgb(55, 65, 81)',
        borderColor: 'rgba(126, 34, 206, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { size: isMobile ? 12 : 14 },
        bodyFont: { size: isMobile ? 11 : 13 },
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
              if (score <= threshold_65) level = '🏆 Excellent';
              else if (score <= threshold_50) level = '👍 Goed';
              else level = '💪 Verbetering nodig';
            } else {
              if (score >= threshold_65) level = '🏆 Excellent';
              else if (score >= threshold_50) level = '👍 Goed';
              else level = '💪 Verbetering nodig';
            }
            return level;
          }
        }
      },
      coloredZones: thresholds,
      thresholdLines: thresholds
    },
   scales: {
      x: {
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: { size: isMobile ? 10 : 12 },
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
            size: isMobile ? 10 : 12
          },
          
          // **AANGEPAST** Forceer de stapgrootte voor de Coopertest
          stepSize: isCooperTest ? 250 : undefined,
          
          // Vereenvoudigde callback die enkel formatteert
          callback: function(value) {
            return isMobile ? `${Math.round(value)}` : `${Math.round(value)} ${eenheid || ''}`;
            
            const range = maxValue - minValue;
            if (range <= 0) return isMobile ? `${Math.round(value)}` : `${Math.round(value)} ${eenheid || ''}`;

            let step;
            if (range <= 50) step = 5;
            else if (range <= 100) step = 10;
            else if (range <= 500) step = 50;
            else if (range <= 1000) step = 100;
            else step = 200;
            
            if (Math.round(value) % step === 0) {
              return isMobile ? `${Math.round(value)}` : `${Math.round(value)} ${eenheid || ''}`;
            }
            return '';
          },
          maxTicksLimit: isMobile ? 6 : 8,
          stepSize: undefined
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
      
      {/* **AANGEPAST** Threshold Legend onder de grafiek */}
      {thresholds && (() => {
        const thresholdInRange = 
          (thresholds.threshold_50 >= minValue && thresholds.threshold_50 <= maxValue) ||
          (thresholds.threshold_65 >= minValue && thresholds.threshold_65 <= maxValue);
        return thresholdInRange;
      })() && (
        <div className="mt-4 flex justify-center items-center">
            <div className="flex items-center gap-x-6 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-0.5" style={{borderTop: '2px dashed rgba(34, 197, 94, 1)'}}></div>
                    <span>P65 (Excellent)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-0.5" style={{borderTop: '2px dashed rgba(249, 115, 22, 1)'}}></div>
                    <span>P50 (Goed)</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}