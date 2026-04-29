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
    const currentPoints = test.personal_best_points || 0;
    const isWeak = currentPoints <= 10;
    
    // Bepaal of er verbetering is op basis van score geschiedenis
    let isImproved = false;
    if (test.scores && test.scores.length >= 2) {
      // Sorteer scores chronologisch (oudste eerst)
      const chronologicalScores = test.scores.sort((a, b) => new Date(a.datum) - new Date(b.datum));
      
      // Check de eerste helft van scores - was de leerling toen zwak?
      const firstHalf = chronologicalScores.slice(0, Math.ceil(chronologicalScores.length / 2));
      const hadConsistentWeakScores = firstHalf.filter(score => (score.rapportpunt || 0) <= 10).length >= Math.ceil(firstHalf.length * 0.7); // 70% van eerste scores zwak
      
      // Check de laatste helft - is nu sterk?
      const secondHalf = chronologicalScores.slice(Math.floor(chronologicalScores.length / 2));
      const hasConsistentStrongScores = secondHalf.filter(score => (score.rapportpunt || 0) > 10).length >= Math.ceil(secondHalf.length * 0.7); // 70% van laatste scores sterk
      
      // En nu sterk is (>10)
      const isNowStrong = currentPoints > 10;
      
      // Alleen als echte verbetering: was consistent zwak, nu consistent sterk
      isImproved = hadConsistentWeakScores && hasConsistentStrongScores && isNowStrong;
      
    } else {
     
    }
    
    return {
      ...test,
      isWeak,
      isImproved
    };
  });

  // Return ZOWEL zwakke ALS verbeterde testen
  const resultaat = alleTestenMetStatus.filter(test => test.isWeak || test.isImproved);
 
  
  return resultaat.sort((a, b) => a.personal_best_points - b.personal_best_points);
}