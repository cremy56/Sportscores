// src/utils/firebaseUtils.js
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  enableNetwork,
  disableNetwork 
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// Import school year utilities
import { 
  getSchoolYearFromDate, 
  getCurrentSchoolYear, 
  generateSchoolYears,
  getSchoolYearBounds,
  formatSchoolYear 
} from './schoolyearUtils';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

/**
 * Enhanced error handling function
 * @param {Error} error - The Firestore error
 * @param {string} operation - Description of the operation that failed
 * @returns {string} User-friendly error message
 */
export function handleFirestoreError(error, operation = 'Firestore operation') {
  console.error(`${operation} error:`, error);
  
  switch (error.code) {
    case 'permission-denied':
      return `Geen toegang tot ${operation.toLowerCase()}. Controleer je rechten.`;
    case 'network-error':
    case 'unavailable':
      return 'Netwerkfout. Controleer je internetverbinding en probeer opnieuw.';
    case 'deadline-exceeded':
      return 'Verzoek duurde te lang. Probeer opnieuw.';
    case 'resource-exhausted':
      return 'Te veel verzoeken. Wacht een moment en probeer opnieuw.';
    case 'unauthenticated':
      return 'Niet ingelogd. Log opnieuw in.';
    case 'failed-precondition':
      return 'Gegevens zijn mogelijk gewijzigd. Ververs de pagina.';
    case 'aborted':
      return 'Actie werd afgebroken. Probeer opnieuw.';
    case 'not-found':
      return 'Gevraagde gegevens niet gevonden.';
    default:
      return error.message || 'Er is een onbekende fout opgetreden.';
  }
}

/**
 * Retry function with exponential backoff
 * @param {Function} operation - The async operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise} The result of the operation
 */
export async function retryOperation(operation, maxRetries = RETRY_CONFIG.maxRetries) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.code);
      
      // Don't retry certain errors
      if (['permission-denied', 'unauthenticated', 'invalid-argument', 'not-found'].includes(error.code)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
        RETRY_CONFIG.maxDelay
      );
      
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Network status monitoring
 */
let isOnline = navigator.onLine;

export function setupNetworkMonitoring() {
  window.addEventListener('online', async () => {
    console.log('Network connection restored');
    isOnline = true;
    
    try {
      await enableNetwork(db);
      toast.success('Verbinding hersteld', { duration: 3000 });
    } catch (error) {
      console.error('Failed to enable network:', error);
    }
  });

  window.addEventListener('offline', async () => {
    console.log('Network connection lost');
    isOnline = false;
    
    try {
      await disableNetwork(db);
      toast.error('Geen internetverbinding', {
        duration: 5000,
        icon: '📡'
      });
    } catch (error) {
      console.error('Failed to disable network:', error);
    }
  });
}

export function getNetworkStatus() {
  return isOnline;
}


/**
 * Enhanced DEBUG versie van getStudentEvolutionData
 */
/**
 * Haalt evolutiegegevens op voor een student - ALLE data (geen schooljaar filter)
 * Schooljaar filtering gebeurt client-side voor betere performance en flexibiliteit
 * @param {string} studentId - Het ID van de student
 * @returns {Promise<Array>} Array van test objecten met scores
 */
export const getStudentEvolutionData = async (studentId) => {
  const operation = async () => {
    // 1. Haal alle testen op voor de school
    const testsQuery = query(
      collection(db, 'testen'),
      where('is_actief', '==', true),
      orderBy('categorie'),
      orderBy('naam')
    );
    
    const testsSnapshot = await getDocs(testsQuery);
    const tests = testsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${tests.length} active tests`);

    // 2. Bepaal de juiste leerling_id voor de query
    let leerlingId = studentId;
    
    if (studentId && !studentId.includes('@')) {
      try {
        const userDoc = await getDoc(doc(db, 'users', studentId));
        if (userDoc.exists() && userDoc.data().email) {
          leerlingId = userDoc.data().email;
          console.log(`Using email ${leerlingId} for student lookup (from user ID ${studentId})`);
        }
      } catch (error) {
        console.warn('Could not fetch user document, using original studentId:', error);
      }
    }

    console.log(`Looking for scores with leerling_id: ${leerlingId}`);

    // 3. Voor elke test, haal alle scores op van deze student
    const testDataPromises = tests.map(async (test) => {
      // Gebruik 'datum' veld voor orderBy (niet 'afgenomen_op')
      const scoresQuery = query(
        collection(db, 'scores'),
        where('test_id', '==', test.id),
        where('leerling_id', '==', leerlingId),
        orderBy('datum', 'desc') // Gebruik 'datum' in plaats van 'afgenomen_op'
      );

      const scoresSnapshot = await getDocs(scoresQuery);
      const scores = scoresSnapshot.docs.map(doc => {
        const data = doc.data();
        let parsedDatum = null;
        
        // Parse het datum veld
        if (data.datum) {
          if (typeof data.datum === 'string') {
            parsedDatum = new Date(data.datum);
          } else if (data.datum.toDate && typeof data.datum.toDate === 'function') {
            parsedDatum = data.datum.toDate();
          } else if (data.datum instanceof Date) {
            parsedDatum = data.datum;
          }
        }
        
        // Fallback als datum niet kan worden geparsed
        if (!parsedDatum || isNaN(parsedDatum.getTime())) {
          console.warn(`Could not parse datum for score ${doc.id}:`, data.datum);
          parsedDatum = new Date(); // Gebruik huidige datum als fallback
        }

        return {
          id: doc.id,
          ...data,
          datum: parsedDatum
        };
      });

      console.log(`Found ${scores.length} scores for test ${test.naam} (${test.id})`);

      if (scores.length === 0) {
        return null; // Geen scores voor deze test
      }

      // Sorteer scores op datum (nieuwste eerst voor personal best)
      const sortedScores = scores.sort((a, b) => new Date(b.datum) - new Date(a.datum));

      // Bereken personal best over ALLE scores (niet per schooljaar)
      const personalBest = calculatePersonalBest(sortedScores, test.score_richting);

      return {
        test_id: test.id,
        test_naam: test.naam,
        categorie: test.categorie,
        eenheid: test.eenheid,
        score_richting: test.score_richting,
        personal_best_score: personalBest.score,
        personal_best_datum: personalBest.datum,
        all_scores: sortedScores.map(score => ({
          score: score.score,
          datum: score.datum,
          id: score.id,
          rapportpunt: score.rapportpunt || null
        }))
      };
    });

    const results = await Promise.all(testDataPromises);
    const validResults = results.filter(result => result !== null);
    
    console.log(`Processed evolution data: ${validResults.length} tests with scores`);
    
    return validResults;
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    const errorMessage = handleFirestoreError(error, 'Laden van evolutiegegevens');
    console.error("Error getting student evolution data:", error);
    throw new Error(errorMessage);
  }
};

/**
 * Berekent de personal best uit een array van scores
 * @param {Array} scores - Array van score objecten
 * @param {string} scoreRichting - 'hoog' of 'omlaag'  
 * @returns {Object} Object met beste score en datum
 */
const calculatePersonalBest = (scores, scoreRichting) => {
  if (!scores || scores.length === 0) {
    return { score: null, datum: null };
  }

  const sortedScores = [...scores].sort((a, b) => {
    if (scoreRichting === 'hoog') {
      return b.score - a.score; // Hoogste eerst
    } else {
      return a.score - b.score; // Laagste eerst  
    }
  });

  const best = sortedScores[0];
  return {
    score: best.score,
    datum: best.datum
  };
};
/**
 * Haalt score thresholds op voor een specifieke test, leeftijd en geslacht
 * @param {string} testId - Het test ID
 * @param {number} leeftijd - De leeftijd van de student
 * @param {string} geslacht - Het geslacht ('M' of 'V')
 * @returns {Promise<Object|null>} Threshold object of null als niet gevonden
 */
export const getScoreThresholds = async (testId, leeftijd, geslacht) => {
  const operation = async () => {
    // Validatie van input parameters
    if (!testId || leeftijd === null || leeftijd === undefined || !geslacht) {
      console.warn('Invalid parameters for getScoreThresholds:', { testId, leeftijd, geslacht });
      return null;
    }

    // Validatie van leeftijd
    if (isNaN(leeftijd) || leeftijd < 0 || leeftijd > 100) {
      console.warn('Invalid age for getScoreThresholds:', leeftijd);
      return null;
    }
    
    const normAge = Math.min(leeftijd, 17);
    
    // FIX: Map gender values to match database format
    const genderMapping = {
      'man': 'M',
      'vrouw': 'V',
      'jongen': 'M',
      'meisje': 'V',
      'M': 'M',
      'V': 'V'
    };
    
    const mappedGender = genderMapping[geslacht] || geslacht.toUpperCase();
    
    const normenQuery = query(
      collection(db, 'normen'),
      where('test_id', '==', testId),
      where('leeftijd', '==', normAge),
      where('geslacht', '==', mappedGender)
    );

    const normenSnapshot = await getDocs(normenQuery);
    
    if (normenSnapshot.empty) {
      console.log(`No thresholds found for test ${testId}, age ${normAge}, gender ${mappedGender} (original: ${geslacht})`);
      return null;
    }

    const normenDoc = normenSnapshot.docs[0];
    const normenData = normenDoc.data();
      
    // Controleer of de benodigde velden aanwezig zijn
    if (normenData.punt_8 !== undefined && normenData.score_min !== undefined) {
      // Bereken thresholds op basis van beschikbare data
      const threshold_50 = normenData.punt_8;  // 50e percentiel (punt 8/20)
      const threshold_65 = calculateP65Threshold(normenData);

      return {
        threshold_50,
        threshold_65,
        score_richting: normenData.score_richting || 'hoog',
        leeftijd: normAge,
        geslacht: mappedGender,
        test_id: testId
      };
    }

    return null;
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    const errorMessage = handleFirestoreError(error, 'Laden van score thresholds');
    console.error("Error getting score thresholds:", error);
    throw new Error(errorMessage);
  }
};

/**
 * Berekent het 65e percentiel threshold op basis van beschikbare normgegevens
 * @param {Object} normenData - De norm data uit de database
 * @returns {number} Het berekende 65e percentiel
 */
const calculateP65Threshold = (normenData) => {
  // Als er een specifiek P65 veld is, gebruik dat
  if (normenData.punt_10 !== undefined) {
    return normenData.punt_10; // Punt 10/20 ≈ 65e percentiel
  }

  // Anders schatten op basis van punt_8 en score_min
  const punt8 = normenData.punt_8;
  const scoreMin = normenData.score_min;
  
  // Simpele lineaire interpolatie voor betere threshold
  const range = Math.abs(punt8 - scoreMin);
  const improvement = range * 0.3; // 30% verbetering voor 65e percentiel
  
  if (normenData.score_richting === 'omlaag') {
    return punt8 - improvement; // Lager is beter
  } else {
    return punt8 + improvement; // Hoger is beter
  }
};

/**
 * Haalt alle beschikbare schooljaren op uit de database
 * Analyseert alle score data om beschikbare periodes te vinden
 * @param {string} schoolId - Het school ID (optioneel)
 * @returns {Promise<Array>} Array van schooljaar objecten
 */
export const getAvailableSchoolYears = async (schoolId = null) => {
  const operation = async () => {
    let scoresQuery = query(collection(db, 'scores'));
    
    if (schoolId) {
      scoresQuery = query(
        collection(db, 'scores'),
        where('school_id', '==', schoolId)
      );
    }
    
    const scoresSnapshot = await getDocs(scoresQuery);
    const schoolYears = new Set();
    
    scoresSnapshot.docs.forEach(doc => {
      const scoreData = doc.data();
      const datum = scoreData.datum?.toDate?.() || new Date(scoreData.datum);
      
      if (datum && !isNaN(datum.getTime())) { // Valideer datum
        const schoolYear = getSchoolYearFromDate(datum);
        if (schoolYear && !isNaN(schoolYear)) { // Valideer schooljaar
          schoolYears.add(schoolYear);
        }
      }
    });
    
    // Convert naar array en sorteer (nieuwste eerst)
    return Array.from(schoolYears)
      .sort((a, b) => b - a)
      .map(year => ({
        value: year,
        label: `${year}-${year + 1}`,
        isCurrent: year === getCurrentSchoolYear()
      }));
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    const errorMessage = handleFirestoreError(error, 'Laden van beschikbare schooljaren');
    console.error("Error getting available school years:", error);
    // Fallback naar standaard jaren bij fout
    console.log("Falling back to generated school years");
    return generateSchoolYears();
  }
};

/**
 * Haalt statistieken op voor een specifiek schooljaar
 * @param {string} schoolId - Het school ID
 * @param {number} schoolYear - Het schooljaar
 * @returns {Promise<Object>} Statistieken object
 */
export const getSchoolYearStats = async (schoolId, schoolYear) => {
  const operation = async () => {
    // Validatie van input parameters
    if (!schoolId || !schoolYear || isNaN(schoolYear)) {
      throw new Error('Invalid parameters for getSchoolYearStats');
    }

    const schoolYearBounds = getSchoolYearBounds(schoolYear);
    
    const scoresQuery = query(
      collection(db, 'scores'),
      where('school_id', '==', schoolId),
      where('datum', '>=', schoolYearBounds.startDate),
      where('datum', '<=', schoolYearBounds.endDate)
    );
    
    const scoresSnapshot = await getDocs(scoresQuery);
    const scores = scoresSnapshot.docs.map(doc => doc.data());
    
    // Groepeer per student
    const studentStats = {};
    scores.forEach(score => {
      const studentId = score.leerling_id;
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          studentId,
          totalScores: 0,
          testCount: new Set(),
          firstScore: null,
          lastScore: null
        };
      }
      
      studentStats[studentId].totalScores++;
      studentStats[studentId].testCount.add(score.test_id);
      
      const scoreDate = score.datum?.toDate?.() || new Date(score.datum);
      if (scoreDate && !isNaN(scoreDate.getTime())) { // Valideer datum
        if (!studentStats[studentId].firstScore || scoreDate < studentStats[studentId].firstScore) {
          studentStats[studentId].firstScore = scoreDate;
        }
        if (!studentStats[studentId].lastScore || scoreDate > studentStats[studentId].lastScore) {
          studentStats[studentId].lastScore = scoreDate;
        }
      }
    });
    
    const uniqueStudents = Object.keys(studentStats).length;
    const totalScores = scores.length;
    const uniqueTests = new Set(scores.map(s => s.test_id)).size;
    const avgScoresPerStudent = uniqueStudents > 0 ? totalScores / uniqueStudents : 0;
    
    return {
      schoolYear: formatSchoolYear(schoolYear),
      uniqueStudents,
      totalScores,
      uniqueTests,
      avgScoresPerStudent: Math.round(avgScoresPerStudent * 100) / 100,
      period: {
        start: schoolYearBounds.startDate,
        end: schoolYearBounds.endDate
      },
      studentDetails: studentStats
    };
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    const errorMessage = handleFirestoreError(error, 'Laden van schooljaar statistieken');
    console.error("Error getting school year stats:", error);
    throw new Error(errorMessage);
  }
};

/**
 * Enhanced fetch function voor algemene Firestore operaties
 * @param {string} schoolId - School ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Object met scores, groepen en testen
 */
export const fetchScoresData = async (schoolId, userId) => {
  const operation = async () => {
    // Validatie van input parameters
    if (!schoolId || !userId) {
      throw new Error('School ID en User ID zijn verplicht');
    }

    const [scoresSnapshot, groepenSnapshot, testenSnapshot] = await Promise.all([
      getDocs(query(
        collection(db, 'scores'), 
        where('school_id', '==', schoolId),
        where('leerkracht_id', '==', userId)
      )),
      getDocs(query(collection(db, 'groepen'), where('school_id', '==', schoolId))),
      getDocs(query(collection(db, 'testen'), where('school_id', '==', schoolId)))
    ]);

    return {
      scores: scoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      groepen: groepenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      testen: testenSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    const errorMessage = handleFirestoreError(error, 'Laden van scores data');
    console.error("Error fetching scores data:", error);
    throw new Error(errorMessage);
  }
};

/**
 * Enhanced save function voor batch operations
 * @param {WriteBatch} batch - Firestore batch object
 * @returns {Promise<void>}
 */
export const saveWithRetry = async (batch) => {
  const operation = async () => {
    if (!batch) {
      throw new Error('Batch object is required');
    }
    await batch.commit();
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    const errorMessage = handleFirestoreError(error, 'Opslaan van gegevens');
    console.error("Error saving with batch:", error);
    throw new Error(errorMessage);
  }
};