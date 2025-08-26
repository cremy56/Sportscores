// import_geavanceerde_schemas.js
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
  // Oefeningen voor Gevorderden
  'lopen_hellinglopen_kracht': {
    naam: "Hellinglopen (Hill Repeats)",
    categorie: "Uithouding",
    beschrijving: "Korte, intense sprints bergop om kracht en explosiviteit in de benen op te bouwen en de loopefficiëntie te verbeteren.",
    visuele_media_url: "https://i.imgur.com/gJ530Kx.gif",
    instructies: ["Zoek een heuvel met een matige helling van 100-200 meter lang.", "Loop met 85-95% van je maximale inspanning naar de top.", "Wandel of jog heel rustig terug naar beneden als herstel.", "Herhaal voor het aangegeven aantal sets."]
  },
  'lopen_fartlek_snelheid': {
    naam: "Fartlek (Vaartspel)",
    categorie: "Uithouding",
    beschrijving: "Een ongestructureerde snelheidstraining waarbij je 'speelt' met verschillende tempo's tijdens een duurloop.",
    visuele_media_url: "https://i.imgur.com/uT642sH.gif",
    instructies: ["Begin met een rustige duurloop als basis.", "Kies willekeurige objecten in de verte en versnel tot je daar bent.", "Keer na de versnelling terug naar je rustige basistempo om te herstellen.", "Herhaal dit gedurende de aangegeven duur."]
  },
  // Oefeningen voor Experts
  'lopen_interval_yasso_800': {
    naam: "Yasso 800s",
    categorie: "Uithouding",
    beschrijving: "Een befaamde workout om je marathontijd te voorspellen, maar ook extreem effectief voor het verbeteren van je 5km-tijd. Het bestaat uit 800m-intervallen met gelijke jog-rust.",
    visuele_media_url: "https://i.imgur.com/gD6w2h1.gif",
    instructies: ["Loop 800 meter op een zeer hoog, constant tempo.", "Jog na elke 800m exact dezelfde tijd als je looptijd (bv. 3:30 gelopen = 3:30 joggen).", "Dit is een mentaal en fysiek zware training.", "Zorg voor een grondige warming-up en cooling-down."]
  },
   'lopen_interval_wedstrijdtempo': {
    naam: "Wedstrijdtempo Intervallen",
    categorie: "Techniek",
    beschrijving: "Intervallen gelopen op je doel-wedstrijdtempo voor de 5km. Dit traint je lichaam en geest om dit specifieke tempo efficiënt vol te houden.",
    visuele_media_url: "https://i.imgur.com/yThgS2C.gif",
    instructies: ["Na een warming-up, loop de aangegeven afstand op je exacte 5km doel-tempo.", "Neem de aangegeven rust tussen de intervallen.", "Focus op het behouden van een constante snelheid en een ontspannen looptechniek."]
  }
};

// --- DATA VOOR DE 'trainingsschemas' COLLECTIE ---
const trainingsschemas = {
  // Schema voor Gevorderden
  'schema_5km_gevorderd_6weken': {
    naam: "5km Plan voor Gevorderden (6 Weken)",
    duur_weken: 6,
    categorie: "Uithouding",
    omschrijving: "Een 6-wekenplan voor lopers die al 5km kunnen uitlopen en hun snelheid en eindtijd willen verbeteren door middel van tempo-, interval- en heuveltraining.",
    gekoppelde_test_id: "5km",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Herintroductie van snelheid en tempo.", taken: [ { dag: "Dag 1", omschrijving: "Interval: 6x 400m op 5km-wedstrijdtempo, met 400m jog-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" }, { dag: "Dag 2", omschrijving: "Duurloop: 30-35 minuten op rustig tempo.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Tempo Run: 15 minuten op een comfortabel zwaar tempo.", type: "Training", oefening_id: "lopen_tempo_lactaatdrempel" } ] },
      { week_nummer: 2, doel_van_de_week: "Kracht opbouwen op hellingen.", taken: [ { dag: "Dag 1", omschrijving: "Hellinglopen: 5x 150m sprint bergop, wandel terug naar beneden.", type: "Training", oefening_id: "lopen_hellinglopen_kracht" }, { dag: "Dag 2", omschrijving: "Duurloop: 35-40 minuten op rustig tempo.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Interval: 3x 800m op 5km-wedstrijdtempo, met 400m jog-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" } ] },
      { week_nummer: 3, doel_van_de_week: "Tempo en snelheid speels combineren.", taken: [ { dag: "Dag 1", omschrijving: "Tempo Run: 20 minuten op een comfortabel zwaar tempo.", type: "Training", oefening_id: "lopen_tempo_lactaatdrempel" }, { dag: "Dag 2", omschrijving: "Duurloop: 40 minuten op rustig tempo.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Fartlek: 25 minuten, met 6-8 versnellingen van 1 minuut.", type: "Training", oefening_id: "lopen_fartlek_snelheid" } ] },
      { week_nummer: 4, doel_van_de_week: "Rustweek om het lichaam sterker te laten worden.", taken: [ { dag: "Dag 1", omschrijving: "Lichte Duurloop: 20 minuten heel rustig joggen.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 2", omschrijving: "Actieve Rust: Wandelen of lichte stretching.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "Lichte Tempo Run: 10 minuten op een rustig tempo.", type: "Herstel", oefening_id: "lopen_tempo_lactaatdrempel" } ] },
      { week_nummer: 5, doel_van_de_week: "Intensiteitspiek voor de testweek.", taken: [ { dag: "Dag 1", omschrijving: "Hellinglopen: 6x 200m sprint bergop, wandel terug.", type: "Training", oefening_id: "lopen_hellinglopen_kracht" }, { dag: "Dag 2", omschrijving: "Duurloop: 30 minuten op rustig tempo.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Interval: 4x 800m op 5km-wedstrijdtempo, met 400m jog-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" } ] },
      { week_nummer: 6, doel_van_de_week: "Tapering en de test: volledig herstellen om maximaal te presteren.", taken: [ { dag: "Dag 1", omschrijving: "Zeer lichte training: 15 min rustig joggen met 2x 100m versnelling.", type: "Herstel" }, { dag: "Dag 2", omschrijving: "Volledige Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "TESTDAG: 5km zo snel mogelijk lopen na een goede warming-up.", type: "Meting" } ] }
    ]
  },
  // Schema voor Experts
  'schema_5km_expert_6weken': {
    naam: "5km Plan voor Experts (6 Weken)",
    duur_weken: 6,
    categorie: "Uithouding",
    omschrijving: "Een 6-wekenplan voor competitieve lopers die hun persoonlijk record op de 5km willen verbreken met geavanceerde trainingen zoals Yasso 800s en specifieke wedstrijdtempo-blokken.",
    gekoppelde_test_id: "5km",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Hoog volume en tempo opbouwen.", taken: [ { dag: "Dag 1", omschrijving: "Yasso 800s: 6x 800m met gelijke jog-rust.", type: "Training", oefening_id: "lopen_interval_yasso_800" }, { dag: "Dag 2", omschrijving: "Duurloop: 45 minuten op rustig tempo.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Tempo Run: 25 minuten op comfortabel zwaar tempo.", type: "Training", oefening_id: "lopen_tempo_lactaatdrempel" } ] },
      { week_nummer: 2, doel_van_de_week: "Wedstrijd-specifieke snelheid en kracht.", taken: [ { dag: "Dag 1", omschrijving: "Wedstrijdtempo: 3x 1.5km op doel-tempo, met 400m jog-rust.", type: "Training", oefening_id: "lopen_interval_wedstrijdtempo" }, { dag: "Dag 2", omschrijving: "Duurloop: 50 minuten op rustig tempo.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Hellinglopen: 8x 200m sprint bergop, wandel terug.", type: "Training", oefening_id: "lopen_hellinglopen_kracht" } ] },
      { week_nummer: 3, doel_van_de_week: "Maximale aerobe capaciteit testen.", taken: [ { dag: "Dag 1", omschrijving: "Yasso 800s: 8x 800m met gelijke jog-rust.", type: "Training", oefening_id: "lopen_interval_yasso_800" }, { dag: "Dag 2", omschrijving: "Duurloop: 55 minuten op rustig tempo.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Fartlek: 30 minuten, met 8-10 intensieve versnellingen.", type: "Training", oefening_id: "lopen_fartlek_snelheid" } ] },
      { week_nummer: 4, doel_van_de_week: "Rustweek om te supercompenseren.", taken: [ { dag: "Dag 1", omschrijving: "Lichte Duurloop: 25 minuten heel rustig joggen.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 2", omschrijving: "Actieve Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "Lichte Tempo Run: 15 minuten op rustig tempo.", type: "Herstel", oefening_id: "lopen_tempo_lactaatdrempel" } ] },
      { week_nummer: 5, doel_van_de_week: "Finale snelheidsprikkel.", taken: [ { dag: "Dag 1", omschrijving: "Wedstrijdtempo: 2km - 1.5km - 1km op doel-tempo, met 400m jog-rust.", type: "Training", oefening_id: "lopen_interval_wedstrijdtempo" }, { dag: "Dag 2", omschrijving: "Duurloop: 35 minuten op rustig tempo.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Yasso 800s: 4x 800m, maar sneller dan je doeltijd.", type: "Training", oefening_id: "lopen_interval_yasso_800" } ] },
      { week_nummer: 6, doel_van_de_week: "Tapering en de test: scherp en uitgerust aan de start.", taken: [ { dag: "Dag 1", omschrijving: "Zeer lichte training: 15 min rustig joggen met 4x 100m versnelling.", type: "Herstel" }, { dag: "Dag 2", omschrijving: "Volledige Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "TESTDAG: 5km zo snel mogelijk lopen na een goede warming-up.", type: "Meting" } ] }
    ]
  }
};

async function importData() {
  console.log('Start import van geavanceerde oefeningen...');
  for (const [id, data] of Object.entries(oefeningen)) {
    await db.collection('oefeningen').doc(id).set(data);
    console.log(`✅ Oefening '${id}' toegevoegd.`);
  }
  console.log('Alle oefeningen zijn geïmporteerd!');

  console.log('\nStart import van geavanceerde trainingsschema\'s...');
  for (const [id, data] of Object.entries(trainingsschemas)) {
    await db.collection('trainingsschemas').doc(id).set(data);
    console.log(`✅ Schema '${id}' toegevoegd.`);
  }
  console.log('Trainingsschema\'s zijn geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importData();