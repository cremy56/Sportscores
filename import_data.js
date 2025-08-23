// import_data.js
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'trainingsschemas' COLLECTIE ---
const trainingsschemas = {
  'schema_pushup_beginner_4weken': { 
    naam: "Beginner Push-up Programma", 
    duur_weken: 4, 
    categorie: "Kracht", 
    omschrijving: "Een compleet 4-weken durend schema, om beginners te helpen hun eerste volledige push-up te bereiken door middel van progressieve overbelasting en ondersteunende oefeningen.", 
    gekoppelde_test_id: "J3LLeskbIAGYbjp7y0RH", // <-- PAS DEZE ID AAN!
    weken: [ 
      { week_nummer: 1, doel_van_de_week: "Leg een solide basis met geassisteerde push-ups en bouw kernstabiliteit op.", taken: [ { dag: "Dag 1", omschrijving: "Geassisteerde Push-up (op knieën): 3 sets van 8-10 herhalingen.", type: "Training", oefening_id: "pushup_geassisteerd_knieen" }, { dag: "Dag 2", omschrijving: "Tempo Push-up (negatief): 2 sets van 6 herhalingen (4 sec. laten zakken).", type: "Techniek", oefening_id: "pushup_negatief_tempo" }, { dag: "Dag 3", omschrijving: "Verhoogde Push-up: 3 sets van 6-8 herhalingen (handen op een bankje).", type: "Training", oefening_id: "pushup_verhoogd" } ] }, 
      { week_nummer: 2, doel_van_de_week: "Verhoog de intensiteit en introduceer nieuwe variaties om de spieren te prikkelen.", taken: [ { dag: "Dag 1", omschrijving: "Geassisteerde Push-up (op knieën): 3 sets, probeer 10-12 herhalingen.", type: "Training", oefening_id: "pushup_geassisteerd_knieen" }, { dag: "Dag 2", omschrijving: "Verlengde Plank: 4 sets van 20 seconden vasthouden.", type: "Kracht", oefening_id: "plank_verlengd" }, { dag: "Dag 3", omschrijving: "Brede Geassisteerde Push-up: 3 sets van 8-10 herhalingen.", type: "Training", oefening_id: "pushup_breed_geassisteerd" } ] }, 
      { week_nummer: 3, doel_van_de_week: "Bouw kracht op in de volledige bewegingsbaan en test je vooruitgang.", taken: [ { dag: "Dag 1", omschrijving: "Verhoogde Push-up: 3 sets, probeer 8-10 herhalingen.", type: "Training", oefening_id: "pushup_verhoogd" }, { dag: "Dag 2", omschrijving: "Up and Down Plank: 3 sets van 10-20 herhalingen.", type: "Kracht", oefening_id: "plank_up_and_down" }, { dag: "Dag 3", omschrijving: "Geassisteerde Pauze Push-up: 3 sets van 5 herhalingen.", type: "Techniek", oefening_id: "pushup_pauze_geassisteerd" } ] }, 
      { week_nummer: 4, doel_van_de_week: "Maximaliseer je kracht en zet een nieuw persoonlijk record.", taken: [ { dag: "Dag 1", omschrijving: "Geassisteerde Close-Grip Push-up: 4 sets van 8 herhalingen.", type: "Training", oefening_id: "pushup_closegrip_geassisteerd" }, { dag: "Dag 2", omschrijving: "Prone YTWs: 1 set van 3 rondes (Y, T, W is één ronde).", type: "Stabiliteit", oefening_id: "rug_schouder_prone_ytw" }, { dag: "Dag 3", omschrijving: "Eindtest: Doe zoveel mogelijk gewone push-ups met perfecte vorm.", type: "Meting", oefening_id: "pushup_krachttraining_basis" } ] } 
    ] 
  }
};

async function importData() {
  console.log('Start import van trainingsschema...');
  for (const [id, data] of Object.entries(trainingsschemas)) {
    await db.collection('trainingsschemas').doc(id).set(data);
    console.log(`✅ Schema '${id}' toegevoegd.`);
  }
  console.log('Trainingsschema is geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importData();