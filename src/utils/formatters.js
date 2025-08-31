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

  // Prioriteer eenheden die niet als tijd moeten worden geïnterpreteerd
  if (eenheidLower === 'aantal') {
    return `${score}x`;
  }
  
  if (eenheidLower === 'meter') {
    return `${score} m`;
  }

  // Behandel eenheden die tijd in seconden representeren (bv. s, sec, km, 100m)
  const timeUnits = ['min', 'sec', 'seconden', 'seconds', 's'];
  if (timeUnits.includes(eenheidLower) || eenheidLower?.includes('m')) {
    // Voor sprints (< 60s), toon decimalen
    if (score < 60) {
      return `${score.toFixed(2).replace('.', '"')}s`; // bv. 12"80s
    }
    
    // Voor langere afstanden, converteer naar M'SS"
    const minutes = Math.floor(score / 60);
    const seconds = Math.round(score % 60);
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
  }
  
  // Fallback voor andere eenheden
  return `${score} ${eenheid}`;
};
/**
 * // WIJZIGING: Functie is robuuster gemaakt en geeft NaN terug bij foute input.
 * Zet tijdinvoer (bv. "1:15", "12.5", "12,5") om naar totale seconden.
 * @param {string} timeString - De ingevoerde tijd.
 * @returns {number|null|NaN} Het totaal aantal seconden, null bij lege invoer, of NaN bij ongeldige invoer.
 */
export const parseTimeInputToSeconds = (timeString) => {
    if (!timeString || typeof timeString !== 'string' || String(timeString).trim() === '') return null;

    const cleanString = String(timeString).trim().replace(',', '.');
    
    // Formaat: 1:15 of 1'15
    if (cleanString.includes(':') || cleanString.includes("'")) {
        const parts = cleanString.split(/:|'/);
        if (parts.length !== 2) return NaN; // Ongeldig formaat als er meer dan één scheidingsteken is
        
        const minutes = parseInt(parts[0], 10);
        const seconds = parseFloat(parts[1]);

        if (isNaN(minutes) || isNaN(seconds) || seconds >= 60) return NaN;
        
        return (minutes * 60) + seconds;
    }
    
    // Formaat: 12.5 (seconden en tienden/honderdsten)
    const numericValue = parseFloat(cleanString);
    if (!isNaN(numericValue)) {
        return numericValue;
    }
    
    // Als geen van de formaten overeenkomt, is het ongeldig
    return NaN;
};