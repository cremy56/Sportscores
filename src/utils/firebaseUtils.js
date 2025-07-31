// src/utils/firebaseUtils.js
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

/**
 * Haalt evolutiedata op voor een specifieke student
 * @param {string} studentId - De ID van de student
 * @param {number} schoolYear - Het schooljaar (bijvoorbeeld 2024)
 * @returns {Promise<Array>} Array met evolutiedata
 */
export const getStudentEvolutionData = async (studentId, schoolYear) => {
  try {
    if (!studentId) {
      throw new Error('Student ID is verplicht');
    }

    // Stap 1: Haal alle scores op voor deze student in het schooljaar
    const scoresRef = collection(db, 'scores');
    const scoresQuery = query(
      scoresRef,
      where('leerling_id', '==', studentId),
      where('score_jaar', '==', schoolYear)
    );
    
    const scoresSnapshot = await getDocs(scoresQuery);
    const scores = [];
    scoresSnapshot.forEach((doc) => {
      scores.push(doc.data());
    });

    // Stap 2: Groepeer scores per test
    const testScores = {};
    scores.forEach(score => {
      if (!testScores[score.test_id]) {
        testScores[score.test_id] = [];
      }
      testScores[score.test_id].push({
        score: score.score,
        datum: score.datum
      });
    });

    // Stap 3: Haal testinformatie op
    const testenRef = collection(db, 'testen');
    const testenSnapshot = await getDocs(testenRef);
    const evolutionData = [];

    testenSnapshot.forEach((doc) => {
      const testData = doc.data();
      const testId = doc.id;
      
      if (testScores[testId] && testScores[testId].length > 0) {
        // Sorteer scores op datum
        const sortedScores = testScores[testId].sort((a, b) => 
          new Date(a.datum) - new Date(b.datum)
        );

        // Vind personal best
        const personalBest = testData.score_richting === 'hoog' 
          ? Math.max(...sortedScores.map(s => s.score))
          : Math.min(...sortedScores.map(s => s.score));
        
        const personalBestEntry = sortedScores.find(s => s.score === personalBest);

        evolutionData.push({
          test_id: testId,
          test_naam: testData.naam,
          categorie: testData.categorie,
          eenheid: testData.eenheid,
          score_richting: testData.score_richting,
          personal_best_score: personalBest,
          personal_best_datum: personalBestEntry?.datum,
          all_scores: sortedScores
        });
      }
    });
    
    return evolutionData;
  } catch (error) {
    console.error('Error fetching student evolution data:', error);
    throw error;
  }
};

/**
 * Haalt score thresholds op uit Firebase
 * @param {string} testId - De ID van de test
 * @param {number} leeftijd - De leeftijd van de student
 * @param {string} geslacht - Het geslacht van de student ('M' of 'F')
 * @returns {Promise<Object>} Object met score thresholds
 */
export const getScoreThresholds = async (testId, leeftijd, geslacht) => {
  try {
    // Probeer eerst specifieke thresholds op te halen
    const thresholdsRef = collection(db, 'drempelwaarden');
    const q = query(
      thresholdsRef,
      where('test_id', '==', testId),
      where('leeftijd', '==', leeftijd),
      where('geslacht', '==', geslacht)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return doc.data();
    }
    
    // Fallback: haal algemene thresholds op voor deze test
    const generalQuery = query(
      thresholdsRef,
      where('test_id', '==', testId)
    );
    
    const generalSnapshot = await getDocs(generalQuery);
    if (!generalSnapshot.empty) {
      const doc = generalSnapshot.docs[0];
      return doc.data();
    }
    
    // Laatste fallback: standaard waarden
    return {
      threshold_50: 50,
      threshold_65: 65,
      score_richting: 'hoog'
    };
  } catch (error) {
    console.error('Error fetching score thresholds:', error);
    // Fallback naar standaard waarden bij fout
    return {
      threshold_50: 50,
      threshold_65: 65,
      score_richting: 'hoog'
    };
  }
};