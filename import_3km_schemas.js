// import_3km_schemas.js
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
  'lopen_interval_strides': {
    naam: "Versnellingen (Strides)",
    categorie: "Techniek",
    beschrijving: "Korte, gecontroleerde versnellingen van ongeveer 100 meter om de loopefficiëntie, techniek en snelheid te verbeteren zonder het lichaam zwaar te belasten.",
    visuele_media_url: "https://i.imgur.com/vaxmH2E.gif",
    instructies: [
      "Zoek een vlak stuk van ongeveer 100-120 meter.",
      "Begin rustig te joggen en bouw je snelheid gedurende 20-30 seconden geleidelijk op tot ongeveer 85-90% van je maximale sprint.",
      "Focus op een snelle pasfrequentie en een ontspannen, rechte houding.",
      "Vertraag geleidelijk na de versnelling en wandel rustig terug naar het startpunt als herstel."
    ]
  },
  'lopen_cruise_intervals': {
    naam: "Cruise Intervals",
    categorie: "Uithouding",
    beschrijving: "Intervallen gelopen op of net onder je lactaatdrempel (tempo-tempo). Dit zijn kortere tempo-blokken met korte rust, ideaal om je snelheid en uithouding te verhogen.",
    visuele_media_url: "https://i.imgur.com/yThgS2C.gif",
    instructies: [
      "Loop de aangegeven afstand op een 'comfortabel zwaar' tempo (ongeveer 8/10 inspanning).",
      "Neem een korte, actieve herstelperiode (wandelen of heel rustig joggen) die aanzienlijk korter is dan de inspanning.",
      "Herhaal voor het aangegeven aantal sets, probeer elke interval op hetzelfde tempo te lopen."
    ]
  }
};

// --- DATA VOOR DE 'trainingsschemas' COLLECTIE ---
const trainingsschemas = {
  // Schema voor Beginners
'schema_3km_beginner_8weken': {
    naam: "Start to 3km (8 Weken)",
    duur_weken: 8,
    categorie: "Uithouding",
    omschrijving: "Een laagdrempelig 8-wekenplan om absolute beginners op te bouwen naar het lopen van 3 kilometer zonder te stoppen.",
    gekoppelde_test_id: "3km",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Wennen aan de routine.", taken: [ 
          { dag: "Dag 1", omschrijving: "6x (1 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 2", omschrijving: "6x (1 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 3", omschrijving: "6x (1 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" }
      ] },
      { week_nummer: 2, doel_van_de_week: "Loopintervallen verlengen.", taken: [
          { dag: "Dag 1", omschrijving: "5x (2 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 2", omschrijving: "5x (2 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 3", omschrijving: "5x (2 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" }
      ] },
      { week_nummer: 3, doel_van_de_week: "Meer lopen dan wandelen.", taken: [
          { dag: "Dag 1", omschrijving: "4x (3 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 2", omschrijving: "4x (3 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 3", omschrijving: "4x (3 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" }
      ] },
      { week_nummer: 4, doel_van_de_week: "Uithouding opbouwen.", taken: [
          { dag: "Dag 1", omschrijving: "4x (4 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 2", omschrijving: "4x (4 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 3", omschrijving: "4x (4 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" }
      ] },
      { week_nummer: 5, doel_van_de_week: "Langere loopblokken.", taken: [
          { dag: "Dag 1", omschrijving: "3x (6 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 2", omschrijving: "3x (6 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 3", omschrijving: "3x (6 min lopen, 2 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" }
      ] },
      { week_nummer: 6, doel_van_de_week: "Korte wandelpauzes.", taken: [
          { dag: "Dag 1", omschrijving: "2x (10 min lopen, 1 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 2", omschrijving: "2x (10 min lopen, 1 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" },
          { dag: "Dag 3", omschrijving: "2x (10 min lopen, 1 min wandelen)", type: "Training", oefening_id: "lopen_interval_starttorun" }
      ] },
      { week_nummer: 7, doel_van_de_week: "De eerste duurloop.", taken: [
          { dag: "Dag 1", omschrijving: "15 minuten lopen zonder stoppen.", type: "Training", oefening_id: "lopen_duurloop_basis" },
          { dag: "Dag 2", omschrijving: "15 minuten lopen zonder stoppen.", type: "Training", oefening_id: "lopen_duurloop_basis" },
          { dag: "Dag 3", omschrijving: "15 minuten lopen zonder stoppen.", type: "Training", oefening_id: "lopen_duurloop_basis" }
      ] },
      { week_nummer: 8, doel_van_de_week: "De eindtest.", taken: [
          { dag: "Testdag", omschrijving: "Loop 3km aan één stuk op je eigen tempo.", type: "Meting", oefening_id: "lopen_duurloop_basis" }
      ] }
    ]
  },
  // Schema voor Gevorderden
  'schema_3km_gevorderd_6weken': {
    naam: "3km Plan voor Gevorderden (6 Weken)",
    duur_weken: 6,
    categorie: "Uithouding",
    omschrijving: "Een 6-wekenplan voor lopers die 3km kunnen uitlopen en hun tijd willen verbeteren onder de 15-18 minuten.",
    gekoppelde_test_id: "3km",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Snelheid en tempo heractiveren.", taken: [ { dag: "Dag 1", omschrijving: "Interval: 8x 400m op 3km-doeltempo, met 200m jog-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" }, { dag: "Dag 2", omschrijving: "Duurloop: 25 minuten rustig.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Tempo Run: 12 minuten op comfortabel zwaar tempo.", type: "Training", oefening_id: "lopen_tempo_lactaatdrempel" } ] },
      { week_nummer: 2, doel_van_de_week: "Kracht en techniek verbeteren.", taken: [ { dag: "Dag 1", omschrijving: "Hellinglopen: 6x 150m sprint bergop.", type: "Training", oefening_id: "lopen_hellinglopen_kracht" }, { dag: "Dag 2", omschrijving: "Duurloop: 30 minuten rustig.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Duurloop: 20 min. met 6x versnellingen (strides).", type: "Techniek", oefening_id: "lopen_interval_strides" } ] },
      { week_nummer: 3, doel_van_de_week: "Wedstrijdtempo oefenen.", taken: [ { dag: "Dag 1", omschrijving: "Interval: 3x 1000m op 3km-doeltempo, met 400m jog-rust.", type: "Training", oefening_id: "lopen_interval_wedstrijdtempo" }, { dag: "Dag 2", omschrijving: "Duurloop: 30 minuten rustig.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Fartlek: 20 minuten met 5-6 snelle blokken.", type: "Training", oefening_id: "lopen_fartlek_snelheid" } ] },
      { week_nummer: 4, doel_van_de_week: "Rustweek voor herstel en progressie.", taken: [ { dag: "Dag 1", omschrijving: "Lichte Duurloop: 20 minuten heel rustig.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 2", omschrijving: "Actieve Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "Lichte training: 15 min. rustig met 4x versnellingen (strides).", type: "Techniek", oefening_id: "lopen_interval_strides" } ] },
      { week_nummer: 5, doel_van_de_week: "Intensiteitspiek voor de test.", taken: [ { dag: "Dag 1", omschrijving: "Tempo Run: 18 minuten op comfortabel zwaar tempo.", type: "Training", oefening_id: "lopen_tempo_lactaatdrempel" }, { dag: "Dag 2", omschrijving: "Duurloop: 25 minuten rustig.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Interval: 5x 600m op 3km-doeltempo, met 300m jog-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" } ] },
      { week_nummer: 6, doel_van_de_week: "Tapering en de test: scherp aan de start komen.", taken: [ { dag: "Dag 1", omschrijving: "Zeer lichte training: 15 min rustig joggen.", type: "Herstel" }, { dag: "Dag 2", omschrijving: "Volledige Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "TESTDAG: 3km zo snel mogelijk lopen.", type: "Meting" } ] }
    ]
  },
  // Schema voor Experts
  'schema_3km_expert_4weken': {
    naam: "3km Plan voor Experts (4 Weken)",
    duur_weken: 4,
    categorie: "Uithouding",
    omschrijving: "Een kort en intensief 4-wekenplan voor ervaren lopers die hun persoonlijk record op de 3km willen verbreken.",
    gekoppelde_test_id: "3km",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Maximale zuurstofopname en tempo verhogen.", taken: [ { dag: "Dag 1", omschrijving: "Interval: 10x 400m sneller dan doeltempo, met 200m jog-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" }, { dag: "Dag 2", omschrijving: "Duurloop: 40 minuten rustig.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Cruise Intervals: 4x 1000m op tempo, met 1 min rust.", type: "Training", oefening_id: "lopen_cruise_intervals" } ] },
      { week_nummer: 2, doel_van_de_week: "Wedstrijdhardheid en kracht opbouwen.", taken: [ { dag: "Dag 1", omschrijving: "Wedstrijdtempo: 2x (1200m, 800m, 400m) op doeltempo, met 200m jog-rust.", type: "Training", oefening_id: "lopen_interval_wedstrijdtempo" }, { dag: "Dag 2", omschrijving: "Duurloop: 45 minuten rustig.", type: "Herstel", oefening_id: "lopen_duurloop_aerobe_basis" }, { dag: "Dag 3", omschrijving: "Hellinglopen: 8x 200m sprint bergop.", type: "Training", oefening_id: "lopen_hellinglopen_kracht" } ] },
      { week_nummer: 3, doel_van_de_week: "Finale intensiteitspiek en snelheid.", taken: [ { dag: "Dag 1", omschrijving: "Interval: 6x 500m sneller dan doeltempo, met 300m jog-rust.", type: "Training", oefening_id: "lopen_interval_vo2max" }, { dag: "Dag 2", omschrijving: "Duurloop: 30 minuten rustig met 6x versnellingen (strides).", type: "Techniek", oefening_id: "lopen_interval_strides" }, { dag: "Dag 3", omschrijving: "Tempo Run: 20 minuten tempo.", type: "Training", oefening_id: "lopen_tempo_lactaatdrempel" } ] },
      { week_nummer: 4, doel_van_de_week: "Tapering en de test: volledig hersteld voor een toptijd.", taken: [ { dag: "Dag 1", omschrijving: "Lichte training: 15 min. rustig joggen met 4x versnellingen.", type: "Herstel", oefening_id: "lopen_interval_strides" }, { dag: "Dag 2", omschrijving: "Volledige Rust.", type: "Herstel" }, { dag: "Dag 3", omschrijving: "TESTDAG: 3km voor een nieuw persoonlijk record.", type: "Meting" } ] }
    ]
  }
};

async function importData() {
  console.log('Start import van 3km-oefeningen...');
  for (const [id, data] of Object.entries(oefeningen)) {
    await db.collection('oefeningen').doc(id).set(data);
    console.log(`✅ Oefening '${id}' toegevoegd.`);
  }
  console.log('Alle oefeningen zijn geïmporteerd!');

  console.log('\nStart import van 3km-trainingsschema\'s...');
  for (const [id, data] of Object.entries(trainingsschemas)) {
    await db.collection('trainingsschemas').doc(id).set(data);
    console.log(`✅ Schema '${id}' toegevoegd.`);
  }
  console.log('Trainingsschema\'s zijn geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importData();