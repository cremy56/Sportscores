import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Zorg ervoor dat je serviceAccountKey.json in dezelfde map staat
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'testen' COLLECTIE (TECHNIEKTEST SCHOOLSLAG) ---
const techniekTestSchoolslag = {
  // Het document ID dat we willen gebruiken in de 'testen' collectie
  "zwemmen_schoolslag": {
    naam: "Techniek Schoolslag",
    categorie: "Zwemmen",
    test_type: "techniek",
    school_id: "ka_beveren", // Pas dit eventueel aan naar de juiste school_id
    is_actief: true,
    beschrijving: "Een gedetailleerde analyse van de vijf kerncomponenten van de schoolslagtechniek. Elke component wordt beoordeeld op basis van visuele herkenning van de correcte en incorrecte uitvoering.",
    techniek_componenten: [
      {
        id: "lichaamspositie",
        titel: "Lichaamspositie",
        opties: [
          { label: "Hoge, horizontale ligging (gestroomlijnd)", afbeelding_url: "path/to/image.jpg", is_correct: true },
          { label: "Heupen te diep (zittende houding)", afbeelding_url: "path/to/image.jpg", is_correct: false }
        ]
      },
      {
        id: "ademhaling",
        titel: "Ademhaling",
        opties: [
          { label: "Tijdig en naar voren gericht, kin over het water", afbeelding_url: "path/to/image.jpg", is_correct: true },
          { label: "Hoofd te hoog opgetild of opzij gedraaid", afbeelding_url: "path/to/image.jpg", is_correct: false }
        ]
      },
      {
        id: "armbeweging",
        titel: "Armbeweging",
        opties: [
          { label: "Correcte 'sleutelgat' beweging tot schouders", afbeelding_url: "path/to/image.jpg", is_correct: true },
          { label: "Fout: Armen te wijd", afbeelding_url: "path/to/image.jpg", is_correct: false },
          { label: "Fout: Armen te ver naar achteren doorgetrokken", afbeelding_url: "path/to/image.jpg", is_correct: false }
        ]
      },
      {
        id: "beenbeweging",
        titel: "Beenbeweging",
        opties: [
          { label: "Correct: Hielen eerst, voeten gekanteld (flex)", afbeelding_url: "path/to/image.jpg", is_correct: true },
          { label: "Fout: Knieën eerst naar buiten (kikker)", afbeelding_url: "path/to/image.jpg", is_correct: false },
          { label: "Fout: Voeten niet opgetrokken (steekvoet)", afbeelding_url: "path/to/image.jpg", is_correct: false },
          { label: "Fout: Schaarslag (asymmetrisch)", afbeelding_url: "path/to/image.jpg", is_correct: false }
        ]
      },
      {
        id: "timing",
        titel: "Timing & Coördinatie",
        opties: [
          { label: "Correct: Duidelijke 'Armen - Benen - Glij' cyclus", afbeelding_url: "path/to/image.jpg", is_correct: true },
          { label: "Fout: Geen glijfase (continue beweging)", afbeelding_url: "path/to/image.jpg", is_correct: false }
        ]
      }
    ]
  }
};

async function importData() {
  console.log('Start import van de techniektest Schoolslag...');
  
  for (const [id, data] of Object.entries(techniekTestSchoolslag)) {
    // Gebruik de sleutel van het object als het custom document ID
    await db.collection('testen').doc(id).set(data);
    console.log(`✅ Techniektest '${id}' succesvol toegevoegd aan de 'testen' collectie.`);
  }
  
  console.log('\n🎉 Import voltooid!');
}

importData().catch(error => {
  console.error("Er is een fout opgetreden tijdens de import:", error);
});