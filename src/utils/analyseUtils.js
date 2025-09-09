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

  const alleTestenMetStatus = evolutionData.map(test => {
    // Gebruik consistent personal_best_points voor beide bepalingen
    const currentBest = test.personal_best_points || 0;
    
    // Bepaal of er verbetering is door te kijken naar de evolutie in scores
    let isImproved = false;
    if (test.scores && test.scores.length >= 4) {
      const gesorteerdeScores = test.scores.sort((a, b) => new Date(b.datum) - new Date(a.datum));
      const recenteScores = gesorteerdeScores.slice(0, 2); // Laatste 2 scores
      const oudereScores = gesorteerdeScores.slice(-2); // Eerste 2 scores
      
      const gemiddeldeRecent = recenteScores.reduce((sum, s) => sum + (s.rapportpunt || 0), 0) / recenteScores.length;
      const gemiddeldeOuder = oudereScores.reduce((sum, s) => sum + (s.rapportpunt || 0), 0) / oudereScores.length;
      
      isImproved = currentBest >= 10.5 && gemiddeldeRecent > gemiddeldeOuder;
    }

    const isWeak = currentBest <= 10; // Nog steeds zwak

    return {
      ...test,
      isWeak,
      isImproved,
      current_best: currentBest
    };
  }).filter(Boolean);

  // Return alle testen die zwak zijn OF verbeterd
  return alleTestenMetStatus.filter(test => test.isWeak || test.isImproved);
}