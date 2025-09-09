// src/utils/analyseUtils.js

/**
 * Analyseert de evolutiedata van een leerling om ALLE focuspunten (testen met tekort) te vinden.
 * @param {Array} evolutionData - De data van de leerling.
 * @returns {Array} Een array van testobjecten die als focuspunt worden beschouwd.
 */
export function analyseerEvolutieData(evolutionData) {
  if (!evolutionData || evolutionData.length === 0) {
    return [];
  }

  console.log("=== ANALYSE DEBUG ===");
  
  const alleTestenMetStatus = evolutionData.map(test => {
    const currentPoints = test.personal_best_points || 0;
    const isWeak = currentPoints <= 10;
    
    // Bepaal of er verbetering is (van zwak naar sterk)
    // Voor nu: als er een actief schema bestaat EN de score nu > 10 is
    let isImproved = false;
    if (currentPoints > 10 && currentPoints <= 15) {
      // Waarschijnlijk recent verbeterd (tussen 10-15 punten)
      isImproved = true;
    }
    
    console.log(`Test: ${test.naam}, Points: ${currentPoints}, Is Weak: ${isWeak}, Is Improved: ${isImproved}`);
    
    return {
      ...test,
      isWeak,
      isImproved
    };
  });

  // Return ZOWEL zwakke ALS verbeterde testen
  const resultaat = alleTestenMetStatus.filter(test => test.isWeak || test.isImproved);
  console.log("Resultaat na filter:", resultaat.map(t => `${t.naam} (weak: ${t.isWeak}, improved: ${t.isImproved})`));
  
  return resultaat.sort((a, b) => a.personal_best_points - b.personal_best_points);
}