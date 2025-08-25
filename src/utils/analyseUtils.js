// src/utils/analyseUtils.js

/**
 * Analyseert de evolutiedata van een leerling om ALLE focuspunten (testen met tekort) te vinden.
 * @param {Array} evolutionData - De data van de leerling.
 * @returns {Array} Een array van testobjecten die als focuspunt worden beschouwd.
 */
export function analyseerEvolutieData(evolutionData) {
  if (!evolutionData || evolutionData.length === 0) {
    return []; // Geef een lege array terug
  }

  // Filter alle testen waar de leerling een 'personal_best_points' heeft van 10 of minder.
  const zwakkeTesten = evolutionData.filter(test => 
    test.personal_best_points !== null && test.personal_best_points <= 10
  );

  // Sorteer de zwakke testen van laagste naar hoogste punt
  return zwakkeTesten.sort((a, b) => a.personal_best_points - b.personal_best_points);
}