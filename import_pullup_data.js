// import_pullup_data.js
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'oefeningen' COLLECTIE ---
const oefeningen = {
  'grip_dead_hang': {
    naam: "Dead Hang",
    categorie: "Kracht",
    beschrijving: "Passief aan een stang hangen om de grijpkracht en schouderstabiliteit te vergroten. Dit is de absolute basis voor elke pull-up.",
    visuele_media_url: "https://i.imgur.com/w23l5a8.gif",
    instructies: [
      "Grijp de pull-up stang vast met je handen iets breder dan schouderbreedte.",
      "Laat je lichaam volledig en ontspannen hangen met gestrekte armen.",
      "Houd deze positie vast voor de aangegeven tijd, focus op je ademhaling."
    ]
  },
  'pullup_scapular': {
    naam: "Scapular Pull-up",
    categorie: "Techniek",
    beschrijving: "Een oefening gericht op het activeren van de schouderbladen (scapula). Dit leert je om de pull-up te starten vanuit de rugspieren in plaats van alleen de armen.",
    visuele_media_url: "https://i.imgur.com/vHslqgB.gif",
    instructies: [
      "Begin in een ontspannen Dead Hang positie.",
      "Zonder je armen te buigen, trek je schouderbladen naar beneden en naar elkaar toe.",
      "Je lichaam zal hierdoor een klein stukje omhoog komen.",
      "Houd de spanning even vast en laat je gecontroleerd terugzakken."
    ]
  },
  'rug_inverted_row': {
    naam: "Inverted Row",
    categorie: "Kracht",
    beschrijving: "Een horizontale trekbeweging die dezelfde spieren als de pull-up traint, maar met minder lichaamsgewicht. De moeilijkheidsgraad kan worden aangepast door je lichaam rechter op te stellen.",
    visuele_media_url: "https://i.imgur.com/R3x4V2A.gif",
    instructies: [
      "Ga onder een lage stang liggen (ongeveer heuphoogte).",
      "Grijp de stang vast en houd je lichaam in een perfect rechte lijn.",
      "Trek je borst richting de stang door je rugspieren samen te knijpen.",
      "Laat je gecontroleerd en volledig terugzakken."
    ]
  },
  'pullup_negatief': {
    naam: "Negatieve Pull-up",
    categorie: "Kracht",
    beschrijving: "Focust uitsluitend op de neerwaartse (excentrische) fase van de pull-up. Dit is een van de snelste manieren om de specifieke kracht voor de volledige beweging op te bouwen.",
    visuele_media_url: "https://i.imgur.com/gO5g2vN.gif",
    instructies: [
      "Gebruik een stoel of spring om in de bovenste positie van de pull-up te komen (kin boven de stang).",
      "Haal je voeten van de ondersteuning.",
      "Laat je lichaam zo langzaam en gecontroleerd mogelijk zakken (streef naar 3-5 seconden).",
      "Wanneer je armen volledig gestrekt zijn, is de herhaling voorbij."
    ]
  }
};

// --- DATA VOOR DE 'trainingsschemas' COLLECTIE ---
const trainingsschemas = {
  'schema_pullup_opbouw_6weken': {
    naam: "6-Weken Pull-up Opbouwschema",
    duur_weken: 6,
    categorie: "Kracht",
    omschrijving: "Een 6-wekenplan ontworpen om de nodige kracht en techniek op te bouwen voor het uitvoeren van een eerste volledige pull-up, met een focus op grijpkracht, rugactivatie en excentrische controle.",
    gekoppelde_test_id: "pull_up",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Fundering leggen: Grijpkracht en schouderactivatie.", taken: [ { dag: "Dag 1", omschrijving: "Dead Hang: 3 sets, 15-20 seconden vasthouden.", type: "Training", oefening_id: "grip_dead_hang" }, { dag: "Dag 2", omschrijving: "Scapular Pull-up: 3 sets van 5 herhalingen.", type: "Techniek", oefening_id: "pullup_scapular" }, { dag: "Dag 3", omschrijving: "Dead Hang: 3 sets, probeer 20-25 seconden vast te houden.", type: "Training", oefening_id: "grip_dead_hang" } ] },
      { week_nummer: 2, doel_van_de_week: "Introductie van de horizontale trekbeweging.", taken: [ { dag: "Dag 1", omschrijving: "Inverted Row: 3 sets van 8-10 herhalingen.", type: "Training", oefening_id: "rug_inverted_row" }, { dag: "Dag 2", omschrijving: "Dead Hang: 3 sets, 30 seconden vasthouden.", type: "Training", oefening_id: "grip_dead_hang" }, { dag: "Dag 3", omschrijving: "Scapular Pull-up: 3 sets van 6-8 herhalingen.", type: "Techniek", oefening_id: "pullup_scapular" } ] },
      { week_nummer: 3, doel_van_de_week: "Kracht opbouwen met de Inverted Row.", taken: [ { dag: "Dag 1", omschrijving: "Inverted Row: 3 sets, probeer 10-12 herhalingen.", type: "Training", oefening_id: "rug_inverted_row" }, { dag: "Dag 2", omschrijving: "Scapular Pull-up: 3 sets van 8-10 herhalingen.", type: "Techniek", oefening_id: "pullup_scapular" }, { dag: "Dag 3", omschrijving: "Inverted Row: 4 sets van 8 herhalingen.", type: "Training", oefening_id: "rug_inverted_row" } ] },
      { week_nummer: 4, doel_van_de_week: "Introductie van de negatieve beweging.", taken: [ { dag: "Dag 1", omschrijving: "Negatieve Pull-up: 3 sets van 3 herhalingen (focus op traag zakken).", type: "Training", oefening_id: "pullup_negatief" }, { dag: "Dag 2", omschrijving: "Inverted Row: 3 sets van 12 herhalingen.", type: "Training", oefening_id: "rug_inverted_row" }, { dag: "Dag 3", omschrijving: "Dead Hang: 2 sets, zo lang mogelijk vasthouden (max hold).", type: "Training", oefening_id: "grip_dead_hang" } ] },
      { week_nummer: 5, doel_van_de_week: "Versterken van de negatieve fase.", taken: [ { dag: "Dag 1", omschrijving: "Negatieve Pull-up: 4 sets van 3-4 herhalingen.", type: "Training", oefening_id: "pullup_negatief" }, { dag: "Dag 2", omschrijving: "Inverted Row: 4 sets van 10-12 herhalingen.", type: "Training", oefening_id: "rug_inverted_row" }, { dag: "Dag 3", omschrijving: "Negatieve Pull-up: 3 sets van 5 herhalingen.", type: "Training", oefening_id: "pullup_negatief" } ] },
      { week_nummer: 6, doel_van_de_week: "Piekweek: De eerste poging.", taken: [ { dag: "Dag 1", omschrijving: "Lichte training: Scapular Pull-up, 2 sets van 5 herhalingen.", type: "Herstel" }, { dag: "Dag 2", omschrijving: "Volledige Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "Test: Na een goede warming-up, probeer 1 volledige pull-up. Herhaal na rust indien mogelijk.", type: "Meting" } ] }
    ]
  }
};

async function importData() {
  console.log('Start import van pull-up opbouw oefeningen...');
  for (const [id, data] of Object.entries(oefeningen)) {
    await db.collection('oefeningen').doc(id).set(data);
    console.log(`✅ Oefening '${id}' toegevoegd.`);
  }
  console.log('Alle oefeningen zijn geïmporteerd!');

  console.log('\nStart import van pull-up trainingsschema...');
  for (const [id, data] of Object.entries(trainingsschemas)) {
    await db.collection('trainingsschemas').doc(id).set(data);
    console.log(`✅ Schema '${id}' toegevoegd.`);
  }
  console.log('Trainingsschema is geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importData();