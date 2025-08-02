// src/utils/firebaseUtils.js - Enhanced Threshold Handling
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

    console.log(`Found ${tests.length} active tests`);

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

      console.log(`Found ${scores.length} scores for test ${test.naam} (${test.id})`);

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
    // Enhanced input validation
    if (!testId) {
      console.warn('getScoreThresholds: Missing testId');
      return null;
    }
    
    if (leeftijd === null || leeftijd === undefined || isNaN(leeftijd)) {
      console.warn('getScoreThresholds: Invalid age:', leeftijd);
      return null;
    }
    
    if (!geslacht) {
      console.warn('getScoreThresholds: Missing gender');
      return null;
    }

    // Age validation and normalization - BELANGRIJKE FIX
    const numericAge = Number(leeftijd);
    if (numericAge < 0 || numericAge > 100) {
      console.warn('getScoreThresholds: Age out of valid range:', numericAge);
      return null;
    }

    // CORRECTE IMPLEMENTATIE: Beperk leeftijd tot maximaal 17 jaar voor normen
    const normAge = Math.min(numericAge, 17);
    
    console.log(`Age normalization: ${numericAge} years old -> using norms for age ${normAge}`);

    // Enhanced gender mapping
    const mappedGender = GENDER_MAPPING[geslacht.toString().toLowerCase()] || 
                        GENDER_MAPPING[geslacht.toString()] || 
                        geslacht.toString().toUpperCase();
    
    if (!['M', 'V'].includes(mappedGender)) {
      console.warn('getScoreThresholds: Could not map gender:', geslacht, 'to M or V');
      return null;
    }

    console.log('Gender mapping:', { 
      original: geslacht, 
      mapped: mappedGender,
      originalType: typeof geslacht
    });

    // Primaire query met genormaliseerde leeftijd
    try {
      const normenQuery = query(
        collection(db, 'normen'),
        where('test_id', '==', testId),
        where('leeftijd', '==', normAge),
        where('geslacht', '==', mappedGender)
      );

      console.log(`Querying thresholds for: test=${testId}, age=${normAge}, gender=${mappedGender}`);

      const normenSnapshot = await getDocs(normenQuery);
      
      if (!normenSnapshot.empty) {
        const normenDoc = normenSnapshot.docs[0];
        const normenData = normenDoc.data();
        
        console.log(`✅ Found thresholds for age ${normAge}:`, normenData);
        
        // FLEXIBELE VALIDATIE: Controleer verschillende mogelijke veld combinaties
        console.log('🔍 Analyzing available norm fields:', Object.keys(normenData));
        
        let threshold_50 = null;
        let threshold_65 = null;
        
        // Strategie 1: punt_8 en score_min (originele verwachting)
        if (normenData.punt_8 !== undefined && normenData.score_min !== undefined) {
          threshold_50 = normenData.punt_8;
          threshold_65 = calculateP65Threshold(normenData);
          console.log('✅ Using punt_8 + score_min strategy');
        }
        // Strategie 2: punt (zonder nummer) en score_min - NIEUWE STRATEGIE
        else if (normenData.punt !== undefined && normenData.score_min !== undefined) {
          threshold_50 = normenData.punt;
          // Simuleer punt_8 voor berekening
          const estimatedData = {
            ...normenData,
            punt_8: normenData.punt
          };
          threshold_65 = calculateP65Threshold(estimatedData);
          console.log('✅ Using punt (generic) + score_min strategy');
        }
        // Strategie 3: Directe threshold velden (als die bestaan)
        else if (normenData.threshold_50 !== undefined && normenData.threshold_65 !== undefined) {
          threshold_50 = normenData.threshold_50;
          threshold_65 = normenData.threshold_65;
          console.log('✅ Using direct threshold fields');
        }
        // Strategie 4: Andere punt velden proberen (punt_10, punt_12, etc.)
        else if (normenData.score_min !== undefined) {
          // Zoek naar beschikbare punt velden
          const puntFields = Object.keys(normenData).filter(key => key.startsWith('punt_'));
          console.log('🔍 Available punt fields:', puntFields);
          
          if (puntFields.length > 0) {
            // Sorteer de punt velden en gebruik ze als basis
            const sortedPuntFields = puntFields.sort();
            const midPuntField = sortedPuntFields[Math.floor(sortedPuntFields.length / 2)];
            
            threshold_50 = normenData[midPuntField];
            
            // Bereken threshold_65 op basis van beschikbare data
            const estimatedData = {
              ...normenData,
              punt_8: threshold_50 // Gebruik het gevonden punt als basis
            };
            threshold_65 = calculateP65Threshold(estimatedData);
            
            console.log(`✅ Using ${midPuntField} (${threshold_50}) as threshold_50 basis`);
          }
        }
        // Strategie 5: Alleen score_min/score_max gebruiken voor basis schatting
        else if (normenData.score_min !== undefined && normenData.score_max !== undefined) {
          // Basis schatting: 50e percentiel = 40% van de range vanaf minimum
          const range = normenData.score_max - normenData.score_min;
          threshold_50 = normenData.score_min + (range * 0.4);
          threshold_65 = normenData.score_min + (range * 0.6);
          console.log('✅ Using score_min/score_max estimation strategy');
        }

        if (threshold_50 !== null && threshold_65 !== null) {
          const result = {
            threshold_50,
            threshold_65,
            score_richting: normenData.score_richting || 'hoog',
            leeftijd: normAge,
            original_leeftijd: numericAge,
            geslacht: mappedGender,
            original_geslacht: geslacht,
            test_id: testId,
            used_age_cap: normAge !== numericAge,
            data_source: normenData.punt_8 !== undefined ? 'punt_8' : 
                        normenData.punt !== undefined ? 'punt_generic' : 
                        'estimated'
          };

          console.log('✅ Successfully created threshold result:', result);
          return result;
        } else {
          console.warn(`❌ Could not extract thresholds from available norm data:`, {
            availableFields: Object.keys(normenData),
            normenData
          });
        }
      } else {
        console.log(`❌ No thresholds found for test ${testId}, age ${normAge}, gender ${mappedGender}`);
      }
    } catch (queryError) {
      console.error('❌ Error in primary threshold query:', queryError);
    }

    // Fallback strategie: probeer andere leeftijden rond de genormaliseerde leeftijd
    console.log('🔄 Trying fallback age strategies...');
    const fallbackAges = [17, 16, 15, 14, 13].filter(age => age !== normAge);
    
    for (const fallbackAge of fallbackAges) {
      try {
        const fallbackQuery = query(
          collection(db, 'normen'),
          where('test_id', '==', testId),
          where('leeftijd', '==', fallbackAge),
          where('geslacht', '==', mappedGender)
        );

        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        if (!fallbackSnapshot.empty) {
          const fallbackDoc = fallbackSnapshot.docs[0];
          const fallbackData = fallbackDoc.data();
          
          // Primaire strategie: punt_8 of generieke punt
          if ((fallbackData.punt_8 !== undefined || fallbackData.punt !== undefined) && fallbackData.score_min !== undefined) {
            console.log(`✅ Using fallback age ${fallbackAge} (requested: ${numericAge}, normalized: ${normAge})`);
            
            const basePoint = fallbackData.punt_8 || fallbackData.punt;
            const estimatedData = {
              ...fallbackData,
              punt_8: basePoint
            };
            
            return {
              threshold_50: basePoint,
              threshold_65: calculateP65Threshold(estimatedData),
              score_richting: fallbackData.score_richting || 'hoog',
              leeftijd: fallbackAge,
              original_leeftijd: numericAge,
              geslacht: mappedGender,
              original_geslacht: geslacht,
              test_id: testId,
              used_age_cap: normAge !== numericAge,
              used_fallback_age: true,
              fallback_age: fallbackAge,
              data_source: fallbackData.punt_8 !== undefined ? 'punt_8' : 'punt_generic'
            };
          } else if (fallbackData.score_min !== undefined) {
            // Ook voor fallback: probeer andere strategieën
            console.log(`🔄 Fallback age ${fallbackAge} missing punt_8/punt, trying alternative extraction`);
            
            let fallbackThreshold50 = null;
            let fallbackThreshold65 = null;
            
            // Zoek naar punt velden in fallback data
            const puntFields = Object.keys(fallbackData).filter(key => key.startsWith('punt_'));
            if (puntFields.length > 0) {
              const midPuntField = puntFields.sort()[Math.floor(puntFields.length / 2)];
              fallbackThreshold50 = fallbackData[midPuntField];
              
              const estimatedData = { ...fallbackData, punt_8: fallbackThreshold50 };
              fallbackThreshold65 = calculateP65Threshold(estimatedData);
              
              console.log(`✅ Using fallback age ${fallbackAge} with ${midPuntField} strategy`);
              
              return {
                threshold_50: fallbackThreshold50,
                threshold_65: fallbackThreshold65,
                score_richting: fallbackData.score_richting || 'hoog',
                leeftijd: fallbackAge,
                original_leeftijd: numericAge,
                geslacht: mappedGender,
                original_geslacht: geslacht,
                test_id: testId,
                used_age_cap: normAge !== numericAge,
                used_fallback_age: true,
                fallback_age: fallbackAge,
                data_source: 'estimated_fallback'
              };
            }
          }
        }
      } catch (fallbackError) {
        console.error(`Error trying fallback age ${fallbackAge}:`, fallbackError);
        continue;
      }
    }

    console.log(`❌ No thresholds found for test ${testId} with any age strategy`);
    return null;
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    const errorMessage = handleFirestoreError(error, 'Laden van score thresholds');
    console.error("Error getting score thresholds:", error);
    // Don't throw error, just return null to allow graceful degradation
    console.log('Returning null due to threshold fetch error, component will continue without thresholds');
    return null;
  }
};

/**
 * Enhanced P65 threshold calculation
 */
const calculateP65Threshold = (normenData) => {
  // Direct P65 field if available
  if (normenData.punt_10 !== undefined) {
    return normenData.punt_10;
  }

  // Enhanced calculation based on available data
  const punt8 = normenData.punt_8 || normenData.punt; // Accepteer ook generieke 'punt' veld
  const scoreMin = normenData.score_min;
  const scoreMax = normenData.score_max;
  
  if (!punt8) {
    console.warn('calculateP65Threshold: No punt_8 or punt field found');
    return null;
  }
  
  // Use more sophisticated calculation if we have more data points
  if (scoreMax !== undefined && scoreMin !== undefined) {
    const totalRange = Math.abs(scoreMax - scoreMin);
    const p50Position = Math.abs(punt8 - scoreMin) / totalRange;
    
    // Estimate P65 based on normal distribution principles
    const improvement = totalRange * 0.15; // 15% additional improvement for P65
    
    if (normenData.score_richting === 'omlaag') {
      return Math.max(punt8 - improvement, scoreMin);
    } else {
      return Math.min(punt8 + improvement, scoreMax);
    }
  }

  // Fallback to original calculation
  const range = Math.abs(punt8 - scoreMin);
  const improvement = range * 0.3;
  
  if (normenData.score_richting === 'omlaag') {
    return punt8 - improvement;
  } else {
    return punt8 + improvement;
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
    const errorMessage = handleFirestoreError(error, 'Laden van beschikbare schooljaren');
    console.error("Error getting available school years:", error);
    console.log("Falling back to generated school years");
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
    console.error("Error getting school year stats:", error);
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
    console.error("Error fetching scores data:", error);
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
    console.error("Error saving with batch:", error);
    throw new Error(errorMessage);
  }
};