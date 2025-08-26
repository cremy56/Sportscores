// src/utils/formatters.js

/**
 * Formatteert een datum-object of -string naar een leesbaar, lokaal formaat (bv. "26 aug. 2025").
 * @param {Date | object | string} dateInput - De datum om te formatteren (kan een Firestore Timestamp zijn).
 * @returns {string} De geformatteerde datum of 'N/A'.
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    
    // Converteer Firestore Timestamp of string naar een Date object
    const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);

    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('nl-BE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * Geeft een Tailwind CSS class terug op basis van een punt op 20.
 * @param {number | null} point - Het behaalde punt.
 * @param {number} maxPoints - Het maximum aantal punten (standaard 20).
 * @returns {string} De Tailwind CSS class voor de tekstkleur.
 */
export const getPointColorClass = (point, maxPoints = 20) => {
  if (point === null || point === undefined) {
    return 'text-gray-500';
  }
  const percentage = (point / maxPoints) * 100;

  if (percentage < 50) return 'text-red-600 font-bold';
  if (percentage < 65) return 'text-orange-500 font-bold';
  return 'text-green-600 font-bold';
};

/**
 * Formatteert een score met de juiste eenheid (bv. 'x' voor aantal, 'm' voor meter, M'SS" voor tijd).
 * @param {number | null} score - De behaalde score.
 * @param {string} eenheid - De eenheid van de test.
 * @returns {string} De geformatteerde score.
 */
export const formatScoreWithUnit = (score, eenheid) => {
  if (score === null || score === undefined || isNaN(score)) return '-';
  
  const eenheidLower = eenheid?.toLowerCase();
// Controleer op eenheden die tijd in seconden representeren
  if (['sec', 'seconden', 'seconds', 's'].includes(eenheidLower) || eenheidLower?.includes('m')) {
    // Voor sprints (bv. 100m) tonen we decimalen
    if (score < 60) {
      return `${score.toFixed(2).replace('.', '"')}s`; // bv. 12"80s
    }
    
    // Voor langere afstanden, converteer naar M'SS"
    const minutes = Math.floor(score / 60);
    const seconds = Math.round(score % 60);
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
  }
  // --- EINDE WIJZIGING ---
  if (eenheidLower === 'aantal') {
    return `${score}x`;
  }
  
  if (eenheidLower === 'meter') {
    return `${score} m`;
  }

  // Behandelt eenheden voor tijd (opgeslagen in seconden)
  if (['min', 'sec', 'seconden', 'seconds', 's'].includes(eenheidLower)) {
    const minutes = Math.floor(score / 60);
    const seconds = Math.round(score % 60); // Rond seconden af voor netheid
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
  }
  
  // Fallback voor andere eenheden
  return `${score} ${eenheid}`;
};
/**
 * Zet tijdinvoer (bv. "10'30", "10.5") om naar totale seconden.
 * @param {string} timeString - De ingevoerde tijd.
 * @returns {number|null} Het totaal aantal seconden, of null bij ongeldige invoer.
 */
// src/utils/formatters.js

export const parseTimeInputToSeconds = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return null;

    const cleanString = String(timeString).replace(',', '.');
    let totalSeconds = 0;

    // Formaat: 10'30.50 of 10:30.50
    if (cleanString.includes("'") || cleanString.includes(':')) {
        const parts = cleanString.split(/'|:/);
        const minutes = parseInt(parts[0], 10) || 0;
        const secondsAndHundredths = parseFloat(parts[1]) || 0;
        totalSeconds = (minutes * 60) + secondsAndHundredths;
    } 
    // Formaat: 12.80 (seconden en honderdsten) of 630 (totale seconden)
    else {
        const numericValue = parseFloat(cleanString);
        if (!isNaN(numericValue)) {
            totalSeconds = numericValue;
        } else {
            return null;
        }
    }
    
    if (isNaN(totalSeconds)) return null;

    return totalSeconds;
};