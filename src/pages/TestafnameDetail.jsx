// Het probleem zit in de handleScoreChange functie en de preview logic
// Hier is de gefixte versie:

const handleScoreChange = (value) => {
    const validation = validateScore(value, details.eenheid);
    
    // Bereken preview punten tijdens typen
    let previewPoints = null;
    
    // Check of we een geldige numerieke waarde hebben
    const numericValue = value ? parseFloat(value.toString().replace(',', '.')) : null;
    
    if (numericValue !== null && !isNaN(numericValue) && editingScore.leerlingId) {
        const leerling = details.leerlingen.find(l => l.id === editingScore.leerlingId);
        
        console.log('=== PREVIEW CALCULATION ===');
        console.log('Input value:', value);
        console.log('Numeric value:', numericValue);
        console.log('Leerling found:', !!leerling);
        if (leerling) {
            console.log('Leerling data:', {
                naam: leerling.naam,
                leeftijd: leerling.leeftijd,
                geslacht: leerling.geslacht
            });
        }
        console.log('Test norms available:', details.testNorms.length);
        console.log('Score richting:', details.score_richting);
        console.log('============================');
        
        if (leerling && details.testNorms.length > 0 && leerling.leeftijd && leerling.geslacht) {
            previewPoints = calculatePointsWithInterpolation(
                numericValue, 
                leerling.leeftijd, 
                leerling.geslacht, 
                details.testNorms,
                details.score_richting
            );
            
            console.log('Final preview points:', previewPoints);
        } else {
            console.log('Preview calculation skipped - missing requirements:', {
                hasLeerling: !!leerling,
                hasNorms: details.testNorms.length > 0,
                hasLeeftijd: !!leerling?.leeftijd,
                hasGeslacht: !!leerling?.geslacht
            });
        }
    }
    
    setEditingScore(prev => ({ 
        ...prev, 
        score: value, 
        validation,
        previewPoints
    }));
};

// Ook een verbeterde calculatePointsWithInterpolation functie met meer debugging:
function calculatePointsWithInterpolation(score, age, gender, normsArray, scoreDirection = 'hoog') {
    console.log('calculatePointsWithInterpolation called with:', {
        score,
        age,
        gender,
        normsArrayLength: normsArray?.length,
        scoreDirection
    });

    if (!score || !age || !gender || !normsArray || normsArray.length === 0) {
        console.log('Early return due to missing parameters');
        return null;
    }

    // Flatten de normen data - extract alle punten_schaal items
    let allNorms = [];
    normsArray.forEach((normDoc, docIndex) => {
        console.log(`Processing norm document ${docIndex}:`, normDoc);
        
        if (normDoc.punten_schaal && Array.isArray(normDoc.punten_schaal)) {
            normDoc.punten_schaal.forEach((punt, puntIndex) => {
                console.log(`  Punt ${puntIndex}:`, punt);
                allNorms.push(punt);
            });
        }
    });

    console.log('All flattened norms:', allNorms);

    if (allNorms.length === 0) {
        console.log('No norms found in punten_schaal arrays');
        return null;
    }

    // Gebruik leeftijd 17 als fallback voor oudere leerlingen
    const targetAge = Math.min(age, 17);
    console.log('Target age:', targetAge);
    
    // Converteer geslacht naar hoofdletter formaat (zoals in je data: "M")
    const targetGender = gender.toLowerCase() === 'man' ? 'M' : 
                        gender.toLowerCase() === 'vrouw' ? 'V' : 
                        gender.toUpperCase();
    
    console.log('Target gender:', targetGender);
    
    // Filter normen voor specifieke leeftijd en geslacht
    const relevantNorms = allNorms
        .filter(norm => {
            const ageMatch = norm.leeftijd === targetAge;
            const genderMatch = norm.geslacht === targetGender;
            console.log(`Checking norm: leeftijd ${norm.leeftijd} === ${targetAge} (${ageMatch}) && geslacht "${norm.geslacht}" === "${targetGender}" (${genderMatch})`);
            return ageMatch && genderMatch;
        })
        .sort((a, b) => a.score_min - b.score_min);

    console.log('Relevant norms found:', relevantNorms.length);
    console.log('Relevant norms details:', relevantNorms);

    if (relevantNorms.length === 0) {
        console.log(`No norms found for age ${targetAge}, gender ${targetGender}`);
        return null;
    }

    // Voor scores onder de laagste norm
    if (score < relevantNorms[0].score_min) {
        const result = scoreDirection === 'hoog' ? 0 : relevantNorms[0].punt;
        console.log('Score below minimum, returning:', result);
        return result;
    }

    // Voor scores boven de hoogste norm
    const highestNorm = relevantNorms[relevantNorms.length - 1];
    if (score >= highestNorm.score_min) {
        console.log('Score above maximum, returning:', highestNorm.punt);
        return highestNorm.punt;
    }

    // Zoek de twee normen waar de score tussen valt
    for (let i = 0; i < relevantNorms.length - 1; i++) {
        const currentNorm = relevantNorms[i];
        const nextNorm = relevantNorms[i + 1];

        if (score >= currentNorm.score_min && score < nextNorm.score_min) {
            // Lineaire interpolatie tussen de twee punten
            const scoreDiff = nextNorm.score_min - currentNorm.score_min;
            const pointDiff = nextNorm.punt - currentNorm.punt;
            const scorePosition = score - currentNorm.score_min;
            
            // Bereken geïnterpoleerde punt
            const interpolatedPoints = currentNorm.punt + (scorePosition / scoreDiff) * pointDiff;
            
            // Rond af op 0.5
            const result = Math.round(interpolatedPoints * 2) / 2;
            
            console.log('Interpolation calculation:', {
                currentNorm,
                nextNorm,
                scoreDiff,
                pointDiff,
                scorePosition,
                interpolatedPoints,
                result
            });
            
            return result;
        }
    }

    // Fallback: gebruik de laatste norm
    const fallback = relevantNorms[relevantNorms.length - 1].punt;
    console.log('Using fallback:', fallback);
    return fallback;
}

// Zorg er ook voor dat de preview correct wordt getoond in de UI:
// In de JSX waar de preview wordt getoond, voeg wat debugging toe:

{editingScore.previewPoints !== null && editingScore.validation?.valid && (
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-green-600 whitespace-nowrap font-bold">
        Preview: {editingScore.previewPoints}/{details.max_punten}
        {/* Debug info - remove in production */}
        <div className="text-xs text-gray-400">
            (Score: {editingScore.score}, Valid: {editingScore.validation?.valid ? 'Yes' : 'No'})
        </div>
    </div>
)}

// En in de punten kolom:
{editingScore.id === lid.score_id && editingScore.previewPoints !== null && editingScore.validation?.valid ? (
    <div className="text-center">
        <span className="font-bold text-lg text-green-600 animate-pulse">
            {editingScore.previewPoints}/{details.max_punten}
        </span>
        {/* Debug info - remove in production */}
        <div className="text-xs text-gray-400">
            Preview aktief
        </div>
    </div>
) : (
    <span className={`font-bold text-lg ${getScoreColorClass(lid.punt, details.max_punten)}`}>
        {lid.punt !== null ? `${lid.punt}/${details.max_punten}` : '-'}
    </span>
)}