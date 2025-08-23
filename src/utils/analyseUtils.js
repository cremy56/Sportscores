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

  // Simpele logica voor nu: zoek de test met de laagste 'personal_best_score'.
  // Dit kan later veel complexer gemaakt worden (bv. met percentielen, trends, etc.).
  let zwaksteTest = null;
  let laagsteScore = Infinity;

  evolutionData.forEach(test => {
    // We kijken alleen naar testen waar een score voor is.
    if (test.personal_best_score !== null && test.personal_best_score < laagsteScore) {
      laagsteScore = test.personal_best_score;
      zwaksteTest = test;
    }
  });

  return zwaksteTest; // We geven het volledige test-object terug
}