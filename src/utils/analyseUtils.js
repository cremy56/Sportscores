// src/utils/analyseUtils.js

/**
 * Analyseert de evolutiedata van een leerling om het belangrijkste focuspunt te vinden.
 * @param {Array} evolutionData - De data van de leerling, opgehaald via getStudentEvolutionData.
 * @returns {Object|null} Het testobject van het belangrijkste focuspunt, of null als er geen is.
 */
export function analyseerEvolutieData(evolutionData) {
  if (!evolutionData || evolutionData.length === 0) {
    return null;
  }

  let zwaksteTest = null;
  // We starten met 21, zodat elke score van 1-20 lager is.
  let laagstePunt = 21; 

  evolutionData.forEach(test => {
    // We kijken nu naar 'personal_best_points' in plaats van 'score'
    if (test.personal_best_points !== null && test.personal_best_points < laagstePunt) {
      laagstePunt = test.personal_best_points;
      zwaksteTest = test;
    }
  });

  return zwaksteTest;
}