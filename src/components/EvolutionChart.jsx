// src/components/EvolutionChart.jsx
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables); // Registreer alle onderdelen van Chart.js

// De custom plugin om de gekleurde zones te tekenen
const coloredZonesPlugin = {
  id: 'coloredZones',
  beforeDraw(chart, args, options) {
    const { ctx, chartArea: { top, bottom, left, right, width }, scales: { y } } = chart;
    const { threshold_50, threshold_65, score_richting } = options;

    // Doe niets als de drempelwaarden niet zijn meegegeven
    if (threshold_50 === undefined || threshold_65 === undefined) return;

    ctx.save();
    
    // Bepaal de pixel-posities van de drempels
    const y50 = y.getPixelForValue(threshold_50);
    const y65 = y.getPixelForValue(threshold_65);

    // Teken de zones op basis van de score richting
    if (score_richting === 'omlaag') { // Lager is beter
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'; // Groen
      ctx.fillRect(left, top, width, y65 - top);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.1)'; // Oranje
      ctx.fillRect(left, y65, width, y50 - y65);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'; // Rood
      ctx.fillRect(left, y50, width, bottom - y50);
    } else { // Hoger is beter
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'; // Rood
      ctx.fillRect(left, y50, width, bottom - y50);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.1)'; // Oranje
      ctx.fillRect(left, y65, width, y50 - y65);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'; // Groen
      ctx.fillRect(left, top, width, y65 - top);
    }

    ctx.restore();
  }
};

// De export staat nu op de juiste plek, en de component accepteert 'thresholds'
export default function EvolutionChart({ scores, eenheid, thresholds }) {
  const data = {
    labels: scores.map(s => new Date(s.datum).toLocaleDateString('nl-BE')),
    datasets: [
      {
        label: `Evolutie`,
        data: scores.map(s => s.score),
        borderColor: 'rgb(126, 34, 206)',
        backgroundColor: 'rgba(126, 34, 206, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            // De eenheid wordt nu correct toegevoegd
            return `Score: ${context.parsed.y} ${eenheid || ''}`;
          }
        }
      },
      // De drempelwaarden worden hier correct doorgegeven aan de plugin
      coloredZones: thresholds 
    },
    onClick: (event, elements) => {
        if (elements.length > 0) {
            const elementIndex = elements[0].index;
            const scoreData = scores[elementIndex];
            // Let op: window.alert() is niet ideaal, dit kan later vervangen worden
            window.alert(`Score op ${new Date(scoreData.datum).toLocaleDateString('nl-BE')}: ${scoreData.score} ${eenheid || ''}`);
        }
    }
  };

  // De plugin wordt nu correct meegegeven aan de Line component
  return <Line options={options} data={data} plugins={[coloredZonesPlugin]} />;
}
