// src/utils/firebaseUtils.js - Enhanced Threshold Handling & New Norms Function
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc,
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
  baseDelay: 1000,
  maxDelay: 10000,
};

// Enhanced gender mapping with more comprehensive mapping
const GENDER_MAPPING = {
  'man': 'M',
  'vrouw': 'V', 
  'jongen': 'M',
  'meisje': 'V',
  'M': 'M',
  'V': 'V',
  'm': 'M',
  'v': 'V',
  'male': 'M',
  'female': 'V'
};

/**
 * Enhanced error handling function
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
 */
export async function retryOperation(operation, maxRetries = RETRY_CONFIG.maxRetries) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.code);
      
      if (['permission-denied', 'unauthenticated', 'invalid-argument', 'not-found'].includes(error.code)) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
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
 * Haalt evolutiegegevens op voor een student - ALLE data (geen schooljaar filter)
 */
export const getStudentEvolutionData = async (studentId) => {
  const operation = async () => {
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

    let leerlingId = studentId;
    
    if (studentId && !studentId.includes('@')) {
      try {
        const userDoc = await getDoc(doc(db, 'users', studentId));
        if (userDoc.exists() && userDoc.data().email) {
          leerlingId = userDoc.data().email;
        }
      } catch (error) {
        console.warn('Could not fetch user document, using original studentId:', error);
      }
    }

    const testDataPromises = tests.map(async (test) => {
      const scoresQuery = query(
        collection(db, 'scores'),
        where('test_id', '==', test.id),
        where('leerling_id', '==', leerlingId),
        orderBy('datum', 'desc')
      );

      const scoresSnapshot = await getDocs(scoresQuery);
      const scores = scoresSnapshot.docs.map(doc => {
        const data = doc.data();
        let parsedDatum = null;
        
        if (data.datum) {
          if (typeof data.datum === 'string') {
            parsedDatum = new Date(data.datum);
          } else if (data.datum.toDate && typeof data.datum.toDate === 'function') {
            parsedDatum = data.datum.toDate();
          } else if (data.datum instanceof Date) {
            parsedDatum = data.datum;
          }
        }
        
        if (!parsedDatum || isNaN(parsedDatum.getTime())) {
          console.warn(`Could not parse datum for score ${doc.id}:`, data.datum);
          parsedDatum = new Date();
        }

        return {
          id: doc.id,
          ...data,
          datum: parsedDatum
        };
      });

      if (scores.length === 0) {
        return null;
      }

      const sortedScores = scores.sort((a, b) => new Date(b.datum) - new Date(a.datum));
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
    return results.filter(result => result !== null);
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
 */
const calculatePersonalBest = (scores, scoreRichting) => {
  if (!scores || scores.length === 0) {
    return { score: null, datum: null };
  }

  const sortedScores = [...scores].sort((a, b) => {
    if (scoreRichting === 'hoog') {
      return b.score - a.score;
    } else {
      return a.score - b.score;
    }
  });

  const best = sortedScores[0];
  return {
    score: best.score,
    datum: best.datum
  };
};

/**
 * FIXED: Haalt score thresholds op - gebruikt correcte leeftijdsbeperking (max 17 jaar)
 */
export const getScoreThresholds = async (testId, leeftijd, geslacht) => {
  const operation = async () => {
    if (!testId || leeftijd === null || leeftijd === undefined || isNaN(leeftijd) || !geslacht) {
      console.warn('getScoreThresholds: Invalid input');
      return null;
    }

    const numericAge = Number(leeftijd);
    const normAge = Math.min(numericAge, 17);
    const mappedGender = GENDER_MAPPING[geslacht.toString().toLowerCase()] || geslacht.toString().toUpperCase();
    
    if (!['M', 'V'].includes(mappedGender)) {
      console.warn('getScoreThresholds: Could not map gender:', geslacht);
      return null;
    }

    const fetchForAge = async (age) => {
      const normenQuery = query(
        collection(db, 'normen'),
        where('test_id', '==', testId),
        where('leeftijd', '==', age),
        where('geslacht', '==', mappedGender)
      );
      const normenSnapshot = await getDocs(normenQuery);

      if (normenSnapshot.empty) return null;

      const normenData = normenSnapshot.docs[0].data();
      let threshold_50 = null;
      let threshold_65 = null;
      let source = 'estimated';

      if (normenData.punt_8 !== undefined && normenData.score_min !== undefined) {
        threshold_50 = normenData.punt_8;
        threshold_65 = calculateP65Threshold(normenData);
        source = 'punt_8';
      } else if (normenData.punt !== undefined && normenData.score_min !== undefined) {
        threshold_50 = normenData.punt;
        threshold_65 = calculateP65Threshold({ ...normenData, punt_8: normenData.punt });
        source = 'punt_generic';
      } else if (normenData.threshold_50 !== undefined && normenData.threshold_65 !== undefined) {
        threshold_50 = normenData.threshold_50;
        threshold_65 = normenData.threshold_65;
        source = 'direct_fields';
      }

      if (threshold_50 !== null && threshold_65 !== null) {
        return {
          threshold_50,
          threshold_65,
          score_richting: normenData.score_richting || 'hoog',
          leeftijd: age,
          original_leeftijd: numericAge,
          geslacht: mappedGender,
        };
      }
      return null;
    };

    let result = await fetchForAge(normAge);
    if (result) return result;

    const fallbackAges = [17, 16, 15, 14, 13].filter(age => age !== normAge);
    for (const fallbackAge of fallbackAges) {
      result = await fetchForAge(fallbackAge);
      if (result) {
        console.log(`Using fallback age ${fallbackAge} for thresholds.`);
        return { ...result, used_fallback_age: true, fallback_age: fallbackAge };
      }
    }

    console.log(`No thresholds found for test ${testId} with any age strategy`);
    return null;
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    handleFirestoreError(error, 'Laden van score thresholds');
    return null;
  }
};

/**
 * Enhanced P65 threshold calculation
 */
const calculateP65Threshold = (normenData) => {
  if (normenData.punt_10 !== undefined) return normenData.punt_10;

  const punt8 = normenData.punt_8 || normenData.punt;
  if (!punt8) return null;

  const scoreMin = normenData.score_min;
  const scoreMax = normenData.score_max;
  const scoreRichting = normenData.score_richting || 'hoog';

  if (scoreMax !== undefined && scoreMin !== undefined) {
    const totalRange = Math.abs(scoreMax - scoreMin);
    const improvement = totalRange * 0.15;
    return scoreRichting === 'omlaag' ? Math.max(punt8 - improvement, scoreMin) : Math.min(punt8 + improvement, scoreMax);
  }

  const range = Math.abs(punt8 - scoreMin);
  const improvement = range * 0.3;
  return scoreRichting === 'omlaag' ? punt8 - improvement : punt8 + improvement;
};

/**
 * HERSCHREVEN: Haalt normen op uit een 20-puntenschaal gebaseerd op de NIEUWE datastructuur.
 * Deze functie haalt één document per test_id op en filtert de 'punten_schaal' array client-side.
 */
export const getScoreNorms = async (testId, leeftijd, geslacht) => {
  const operation = async () => {
    if (!testId || leeftijd === null || leeftijd === undefined || isNaN(leeftijd) || !geslacht) {
      console.warn('getScoreNorms: Ongeldige input', { testId, leeftijd, geslacht });
      return null;
    }

    // --- START VAN DE WIJZIGING ---
    // We gebruiken nu een query om te zoeken naar het document waar het *veld* 'test_id' correct is.
    const normenQuery = query(
      collection(db, 'normen'),
      where('test_id', '==', testId)
    );
    const normenSnapshot = await getDocs(normenQuery);

    if (normenSnapshot.empty || !normenSnapshot.docs[0].data().punten_schaal) {
      console.log(`❌ Geen norm-document of 'punten_schaal' gevonden voor test ${testId}.`);
      return null;
    }
    
    // We pakken het eerste resultaat van de query
    const normDocument = normenSnapshot.docs[0].data();
    // --- EINDE VAN DE WIJZIGING ---

    const puntenSchaal = normDocument.punten_schaal;
    const scoreRichting = normDocument.score_richting || 'hoog';
    const numericAge = Number(leeftijd);
    const mappedGender = GENDER_MAPPING[geslacht.toString().toLowerCase()] || geslacht.toString().toUpperCase();

    if (!['M', 'V'].includes(mappedGender)) {
      console.warn('getScoreNorms: Kon geslacht niet mappen:', geslacht);
      return null;
    }

    const extractNormsForAge = (age) => {
      const relevantNorms = puntenSchaal.filter(
        norm => norm.leeftijd === age && norm.geslacht === mappedGender
      );

      if (relevantNorms.length === 0) return null;

      const findScore = (punt) => relevantNorms.find(n => n.punt === punt)?.score_min;
      
      const norm_1 = findScore(1);
      const norm_10 = findScore(10);
      const norm_14 = findScore(14);
      const norm_20 = findScore(20);

      if ([norm_1, norm_10, norm_14, norm_20].every(n => n !== undefined)) {
        console.log(`✅ Normen gevonden voor test ${testId} op leeftijd ${age}.`);
        return {
          '1': norm_1,
          '10': norm_10,
          '14': norm_14,
          '20': norm_20,
          score_richting: scoreRichting,
          leeftijd: age,
        };
      }
      return null;
    };
    
    const normAge = Math.min(numericAge, 17);
    let result = extractNormsForAge(normAge);
    if (result) return { ...result, original_leeftijd: numericAge };

    console.log(`Geen complete normen gevonden voor leeftijd ${normAge}. Proberen van fallback leeftijden...`);
    const fallbackAges = [17, 16, 15, 14, 13].filter(age => age !== normAge);

    for (const fallbackAge of fallbackAges) {
      result = extractNormsForAge(fallbackAge);
      if (result) {
        console.log(`✅ Fallback succesvol: gebruik van leeftijd ${fallbackAge} voor normen.`);
        return { 
          ...result, 
          original_leeftijd: numericAge, 
          used_fallback_age: true, 
          fallback_age: fallbackAge 
        };
      }
    }

    console.log(`❌ Geen volledige 20-punts normen gevonden voor test ${testId} met enige leeftijdsstrategie.`);
    return null;
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    handleFirestoreError(error, 'Laden van 20-punts normen');
    return null;
  }
};

/**
 * Haalt alle beschikbare schooljaren op uit de database
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
      
      if (datum && !isNaN(datum.getTime())) {
        const schoolYear = getSchoolYearFromDate(datum);
        if (schoolYear && !isNaN(schoolYear)) {
          schoolYears.add(schoolYear);
        }
      }
    });
    
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
    handleFirestoreError(error, 'Laden van beschikbare schooljaren');
    return generateSchoolYears();
  }
};

/**
 * Haalt statistieken op voor een specifiek schooljaar
 */
export const getSchoolYearStats = async (schoolId, schoolYear) => {
  const operation = async () => {
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
      if (scoreDate && !isNaN(scoreDate.getTime())) {
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
    throw new Error(errorMessage);
  }
};

/**
 * Enhanced fetch function voor algemene Firestore operaties
 */
export const fetchScoresData = async (schoolId, userId) => {
  const operation = async () => {
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
    throw new Error(errorMessage);
  }
};

/**
 * Enhanced save function voor batch operations
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
    throw new Error(errorMessage);
  }
};