// src/utils/schoolyearUtils.js

/**
 * Bepaalt het schooljaar op basis van een datum
 * In België loopt het schooljaar van 1 september tot 31 augustus
 * @param {Date|string} date - De datum om te analyseren
 * @returns {number} Het startjaar van het schooljaar (bv. 2023 voor schooljaar 2023-2024)
 */
export const getSchoolYearFromDate = (date) => {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // 0-based (0 = januari, 8 = september)
  
  // Als de maand augustus (7) of eerder is, behoort het tot het vorige schooljaar
  // Anders behoort het tot het huidige schooljaar
  return month <= 7 ? year - 1 : year;
};

/**
 * Genereert een lijst van beschikbare schooljaren
 * @param {number} yearsBack - Hoeveel jaar terug te gaan (default: tot 2020)
 * @returns {Array} Array van schooljaar objecten met value en label
 */
export const generateSchoolYears = (yearsBack = null) => {
  const years = [];
  const currentDate = new Date();
  const currentSchoolYear = getSchoolYearFromDate(currentDate);
  
  const startYear = yearsBack ? currentSchoolYear - yearsBack : 2020;
  
  for (let i = currentSchoolYear; i >= startYear; i--) {
    years.push({ 
      value: i, 
      label: `${i}-${i + 1}`,
      isCurrent: i === currentSchoolYear
    });
  }
  
  return years;
};

/**
 * Filtert scores op basis van schooljaar
 * @param {Array} scores - Array van score objecten met datum veld
 * @param {number} schoolYear - Het gewenste schooljaar (startjaar)
 * @returns {Array} Gefilterde scores voor het opgegeven schooljaar
 */
export const filterScoresBySchoolYear = (scores, schoolYear) => {
  if (!scores || !Array.isArray(scores)) return [];
  
  return scores.filter(score => {
    if (!score.datum) return false;
    const scoreSchoolYear = getSchoolYearFromDate(score.datum);
    return scoreSchoolYear === schoolYear;
  });
};

/**
 * Filtert test data op basis van schooljaar
 * Kijkt naar zowel personal_best_datum als all_scores
 * @param {Array} testData - Array van test objecten
 * @param {number} schoolYear - Het gewenste schooljaar
 * @returns {Array} Gefilterde en aangepaste test data
 */
export const filterTestDataBySchoolYear = (testData, schoolYear) => {
  if (!testData || !Array.isArray(testData)) return [];
  
  return testData.map(test => {
    // Filter all_scores voor het gewenste schooljaar
    const filteredScores = filterScoresBySchoolYear(test.all_scores || [], schoolYear);
    
    if (filteredScores.length === 0) {
      return null; // Test heeft geen scores voor dit schooljaar
    }
    
    // Bereken nieuwe personal_best voor dit schooljaar
    const personalBest = calculatePersonalBestForPeriod(filteredScores, test.score_richting);
    
    return {
      ...test,
      all_scores: filteredScores,
      personal_best_score: personalBest.score,
      personal_best_datum: personalBest.datum,
      schooljaar: `${schoolYear}-${schoolYear + 1}` // Voor referentie
    };
  }).filter(test => test !== null); // Verwijder tests zonder scores
};

/**
 * Berekent personal best voor een specifieke periode
 * @param {Array} scores - Array van scores
 * @param {string} scoreRichting - 'hoog' of 'omlaag'
 * @returns {Object} Object met beste score en datum
 */
const calculatePersonalBestForPeriod = (scores, scoreRichting) => {
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
 * Groepeer scores per schooljaar
 * @param {Array} scores - Array van score objecten
 * @returns {Object} Object gegroepeerd per schooljaar
 */
export const groupScoresBySchoolYear = (scores) => {
  if (!scores || !Array.isArray(scores)) return {};
  
  return scores.reduce((acc, score) => {
    if (!score.datum) return acc;
    
    const schoolYear = getSchoolYearFromDate(score.datum);
    const key = `${schoolYear}-${schoolYear + 1}`;
    
    if (!acc[key]) {
      acc[key] = {
        year: schoolYear,
        label: key,
        scores: []
      };
    }
    
    acc[key].scores.push(score);
    return acc;
  }, {});
};

/**
 * Krijg het huidige schooljaar
 * @returns {number} Het huidige schooljaar (startjaar)
 */
export const getCurrentSchoolYear = () => {
  return getSchoolYearFromDate(new Date());
};

/**
 * Check of een datum binnen een specifiek schooljaar valt
 * @param {Date|string} date - De te controleren datum
 * @param {number} schoolYear - Het schooljaar (startjaar)
 * @returns {boolean} True als de datum binnen het schooljaar valt
 */
export const isDateInSchoolYear = (date, schoolYear) => {
  const dateSchoolYear = getSchoolYearFromDate(date);
  return dateSchoolYear === schoolYear;
};

/**
 * Krijg de start- en einddatum van een schooljaar
 * @param {number} schoolYear - Het schooljaar (startjaar)
 * @returns {Object} Object met startDate en endDate
 */
export const getSchoolYearBounds = (schoolYear) => {
  const startDate = new Date(schoolYear, 8, 1); // 1 september
  const endDate = new Date(schoolYear + 1, 7, 31, 23, 59, 59); // 31 augustus, einde van de dag
  
  return {
    startDate,
    endDate,
    label: `${schoolYear}-${schoolYear + 1}`
  };
};

/**
 * Format schooljaar voor weergave
 * @param {number} schoolYear - Het schooljaar (startjaar)
 * @returns {string} Geformatteerd schooljaar (bv. "2023-2024")
 */
export const formatSchoolYear = (schoolYear) => {
  return `${schoolYear}-${schoolYear + 1}`;
};