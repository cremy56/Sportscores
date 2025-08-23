// import_basis_data.js
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'scholen' COLLECTIE ---
const scholen = {
  'ka_beveren': { // <-- Leesbare ID
    naam: "KA Beveren",
    stad: "Beveren",
    logo_url: "https://firebasestorage.googleapis.com/v0/b/sportscore-6774d.firebaseapp.com/o/logoKA.png?alt=media&token=699573be-1584-4294-9c74-97cdebf5cbd0"
  }
};

// --- DATA VOOR DE 'testen' COLLECTIE ---
const testen = {
  'cooper_test': { // <-- Leesbare ID
    naam: "Cooper test",
    beschrijving: "Doel: In 12 minuten tijd een zo groot mogelijke afstand al lopend afleggen. Procedure: 1. Zet een parcours uit van ± 400 meter 2. Begin aan de warming-up van ongeveer 2/3 minuten op lage intensiteit 3. Start met de test en loop gedurende 12 minuten zo ver als je kan 4. Stop na 12 minuten op het punt waar je op dat moment staat 5. Meet de resterende afstand en tel deze bij je rondes op Benodigdheden: Een atletiekbaan of een uitgemeten ronde, een chronometer",
    categorie: "Uithoudingsvermogen",
    eenheid: "meter",
    is_actief: true,
    max_punten: 20,
    school_id: "ka_beveren", // <-- Verwijst naar de leesbare ID van de school
    score_richting: "hoog"
  },
  'push_up': { // <-- Leesbare ID
    naam: "Push-up",
    beschrijving: "Doel: Pomp zo veel mogelijk keer tot de uitputting zonder te pauseren en met een correcte vormspanning. Meisjes mogen op de knieën steunen. Procedure: 1. Korte warming-up voor je bovenlichaam 2. Neem plaats in pomphouding op een fitness matje. Meisjes steunen op de knieën. 3. Plaats je handen naast het matje op schouderbreedte 4. Zak naar beneden totdat je ellebogen minimaal een hoek van 90 graden hebben bereikt 5. Duw jezelf vervolgens weer omhoog totdat je ellebogen gestrekt zijn 6. Neem tijdens de oefening geen pauze 7. 1 waarschuwing wanneer de vormspanning niet ok is (holle rug of zitvlak te hoog) 8. Wanneer het niet meer lukt om de oefening correct uit te voeren, dan stopt de test. 9. Tel het aantal correcte push-up’s. Benodigdheden: Fitness mat",
    categorie: "Kracht",
    eenheid: "aantal",
    is_actief: true,
    max_punten: 20,
    school_id: "ka_beveren", // <-- Verwijst naar de leesbare ID van de school
    score_richting: "hoog"
  },
  'pull_up': { // <-- Leesbare ID
    naam: "Pull-up",
    beschrijving: "Doel: Trek je zo veel mogelijk keer op tot de uitputting Je kin moet boven de stang uitkomen. Procedure: 1. Grijp de stang: Pak de stang stevig vast met je handpalmen van je af (overhandse greep). De greep is doorgaans iets breder dan schouderbreedte. 2. Span je core aan: Zorg voor een stabiele houding door je rug, buikspieren en billen aan te spannen. Dit voorkomt slingeren. 3. Trek je op: Adem in en trek jezelf omhoog, terwijl je je schouderbladen naar achteren en omlaag beweegt. 4. Voltooi de beweging: Blijf doorgaan tot je kin boven de stang uitkomt. 5. Laat je zakken: Kom met een gecontroleerde beweging weer omlaag naar de beginpositie met gestrekte armen. Benodigdheden: Stang",
    categorie: "Kracht",
    eenheid: "aantal",
    is_actief: true,
    max_punten: 20,
    school_id: "ka_beveren", // <-- Verwijst naar de leesbare ID van de school
    score_richting: "hoog"
  }
};

async function importBasisData() {
  console.log('Start import van scholen...');
  for (const [id, data] of Object.entries(scholen)) {
    await db.collection('scholen').doc(id).set(data);
    console.log(`✅ School '${id}' toegevoegd.`);
  }
  console.log('Alle scholen zijn geïmporteerd!');

  console.log('\nStart import van testen...');
  for (const [id, data] of Object.entries(testen)) {
    await db.collection('testen').doc(id).set(data);
    console.log(`✅ Test '${id}' toegevoegd.`);
  }
  console.log('Alle testen zijn geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importBasisData();