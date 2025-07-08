// src/utils/formatters.js

/**
 * Formatteert een datumstring (bv. "2025-07-05") naar een leesbaar, lokaal formaat (bv. "05/07/2025").
 * Geeft 'N/A' terug als de input ongeldig is.
 * @param {string | null | undefined} dateString - De datumstring om te formatteren.
 * @returns {string} De geformatteerde datum of 'N/A'.
 */
export const formatDate = (dateString) => {
    if (!dateString) {
        return 'N/A';
    }
    const date = new Date(dateString);
    // Controleer of de datum geldig is
    if (isNaN(date.getTime())) {
        return 'N/A';
    }
    // Gebruik toLocaleDateString voor correcte, lokale formattering
    return date.toLocaleDateString('nl-BE'); // Gebruik 'nl-BE' voor dd/mm/jjjj formaat

    
}
const getPointColorClass = (point, maxPoints = 20) => {
  if (point === null || point === undefined) {
    return 'text-gray-500'; // Standaardkleur voor geen punt
  }
  const percentage = (point / maxPoints) * 100;

  if (percentage < 50) {
    return 'text-red-600 font-bold'; // Onder 50%
  }
  if (percentage < 65) {
    return 'text-orange-500 font-bold'; // Tussen 50% en 65%
  }
  return 'text-green-600 font-bold'; // Boven 65%
};
