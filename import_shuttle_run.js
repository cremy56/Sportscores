import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'oefeningen' COLLECTIE (10x5m SHUTTLE RUN) ---
const oefeningen = {
  'sprint_start_techniek': {
    naam: "Acceleratie & Sprintstarts",
    categorie: "Snelheid",
    beschrijving: "Korte, explosieve sprints vanuit stilstand of een lichte draf. Deze oefening verbetert je reactievermogen en je vermogen om snel op topsnelheid te komen, wat essentieel is bij elke start en na elke keerbeweging.",
    visuele_media_url: "https://i.imgur.com/uT0mG1b.gif",
    instructies: [
      "Markeer een afstand van 10-15 meter.",
      "Start vanuit een atletische houding (licht gebogen knieën, voorste voet voor).",
      "Focus op een krachtige eerste afzet en lage, korte passen om snelheid op te bouwen.",
      "Sprint 'all-out' over de gemarkeerde afstand.",
      "Wandel rustig terug als herstel en herhaal."
    ]
  },
  'wendbaarheid_keertechniek': {
    naam: "Keer- & Remtechniek",
    categorie: "Techniek",
    beschrijving: "Gerichte training op het efficiënt afremmen en 180 graden draaien. Een goede techniek hier bespaart cruciale tienden van seconden en vermindert energieverlies.",
    visuele_media_url: "https://i.imgur.com/bQ9gJ2E.gif",
    instructies: [
      "Zet een kegel op 5 meter afstand.",
      "Loop op 70-80% snelheid naar de kegel.",
      "Rem af door je zwaartepunt te verlagen en korte, snelle pasjes te maken.",
      "Plaats je buitenste voet net voorbij de kegel en draai je heupen om jezelf in de nieuwe richting te lanceren.",
      "Focus op een zo kort mogelijk grondcontact tijdens de draai."
    ]
  },
  'plyometrie_wendbaarheid': {
    naam: "Plyometrie voor Wendbaarheid",
    categorie: "Kracht",
    beschrijving: "Explosieve, spronggebaseerde oefeningen die de reactieve kracht van de spieren in de benen en core trainen. Dit vertaalt zich direct naar een snellere afzet en meer explosiviteit bij het keren.",
    visuele_media_url: "https://i.imgur.com/s4bJ9nF.gif",
    instructies: [
      "Voer oefeningen uit zoals Box Jumps (op een stabiele verhoging springen), Squat Jumps (vanuit gehurkte positie omhoog springen) en Skater Jumps (zijwaartse sprongen).",
      "Focus op maximale hoogte en explosiviteit bij elke sprong.",
      "Zorg voor een zachte, gecontroleerde landing om de impact op te vangen.",
      "Deze training is intensief, dus voer hem uit op een zachte ondergrond en na een goede warming-up."
    ]
  },
  'anaerobe_shuttle_intervallen': {
    naam: "Anaerobe Shuttle Intervallen",
    categorie: "Uithouding",
    beschrijving: "Een volledige 10x5m shuttle run op maximale intensiteit, gevolgd door een lange rustperiode. Dit traint het anaerobe energiesysteem om te presteren onder hoge verzuring en verbetert je herstelvermogen.",
    visuele_media_url: "https://i.imgur.com/3f8tB3d.gif",
    instructies: [
      "Zet twee kegels 5 meter uit elkaar.",
      "Voer de 10x5m shuttle run test uit op 95-100% van je maximale inspanning.",
      "Noteer je tijd.",
      "Neem 2 tot 3 minuten volledige rust (wandelen of stilstaan) om je lichaam bijna volledig te laten herstellen.",
      "Herhaal voor het aangegeven aantal sets."
    ]
  },
  '10x5m_test_simulatie': {
    naam: "10x5m Shuttle Run Test Simulatie",
    categorie: "Meting",
    beschrijving: "Een volledige uitvoering van de 10x5m shuttle run test op maximale snelheid. Wordt gebruikt als meetpunt voor je vooruitgang en om te wennen aan de specifieke eisen van de test.",
    visuele_media_url: "https://i.imgur.com/3f8tB3d.gif",
    instructies: [
      "Zorg voor een grondige warming-up met focus op heupen en enkels.",
      "Zet de kegels exact 5 meter uit elkaar.",
      "Loop 10 keer heen en weer zo snel als je kunt.",
      "Zorg ervoor dat je voet de lijn raakt of overschrijdt bij elke keer.",
      "Laat je tijd opnemen en noteer deze. Neem na de test een uitgebreide cooling-down."
    ]
  }
};

// --- DATA VOOR DE 'trainingsschemas' COLLECTIE (10x5m SHUTTLE RUN) ---
const trainingsschemas = {
  // Schema voor Beginners
  'schema_10x5m_beginner_4weken': {
    naam: "10x5m Basis (4 Weken)",
    duur_weken: 4,
    categorie: "Techniek",
    omschrijving: "Een 4-wekenplan voor beginners om de techniek van het keren onder de knie te krijgen en een basis voor acceleratie te leggen.",
    gekoppelde_test_id: "10x5m_shuttle_run",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Keertechniek aanleren.", taken: [
          { dag: "Dag 1", omschrijving: "Techniek: 15 min rustig oefenen op de keerbeweging.", type: "Techniek", oefening_id: "wendbaarheid_keertechniek" },
          { dag: "Dag 2", omschrijving: "Snelheid: 8x 10m sprint vanuit stilstand.", type: "Training", oefening_id: "sprint_start_techniek" }
      ]},
      { week_nummer: 2, doel_van_de_week: "Techniek en snelheid combineren.", taken: [
          { dag: "Dag 1", omschrijving: "Combinatie: 5x een 2x5m shuttle (heen en terug) met focus op de draai.", type: "Training", oefening_id: "wendbaarheid_keertechniek" },
          { dag: "Dag 2", omschrijving: "Snelheid: 10x 15m sprint vanuit stilstand.", type: "Training", oefening_id: "sprint_start_techniek" }
      ]},
      { week_nummer: 3, doel_van_de_week: "Uithouding opbouwen.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 3x een 6x5m shuttle op 80% inspanning.", type: "Training", oefening_id: "anaerobe_shuttle_intervallen" },
          { dag: "Dag 2", omschrijving: "Techniek: 10 min keertechniek op snelheid.", type: "Techniek", oefening_id: "wendbaarheid_keertechniek" }
      ]},
      { week_nummer: 4, doel_van_de_week: "De eindtest.", taken: [
          { dag: "Dag 1", omschrijving: "Rustige training: 4x 2x5m shuttle op 60% inspanning.", type: "Herstel" },
          { dag: "Dag 2", omschrijving: "TESTDAG: 10x5m Shuttle Run Test.", type: "Meting", oefening_id: "10x5m_test_simulatie" }
      ]}
    ]
  },
  // Schema voor Gevorderden
  'schema_10x5m_gevorderd_4weken': {
    naam: "10x5m Gevorderd (4 Weken)",
    duur_weken: 4,
    categorie: "Snelheid",
    omschrijving: "Een 4-wekenplan om de snelheid bij het keren te verhogen en de anaerobe weerstand te verbeteren.",
    gekoppelde_test_id: "10x5m_shuttle_run",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Snelheid en techniek opdrijven.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 4x 10x5m shuttle op 85% inspanning, met 90s rust.", type: "Training", oefening_id: "anaerobe_shuttle_intervallen" },
          { dag: "Dag 2", omschrijving: "Techniek: 15 min keertechniek op hoge snelheid.", type: "Techniek", oefening_id: "wendbaarheid_keertechniek" }
      ]},
      { week_nummer: 2, doel_van_de_week: "Explosiviteit ontwikkelen.", taken: [
          { dag: "Dag 1", omschrijving: "Kracht: 20 min plyometrische oefeningen.", type: "Kracht", oefening_id: "plyometrie_wendbaarheid" },
          { dag: "Dag 2", omschrijving: "Snelheid: 6x 20m sprint (combinatie van start- en keertechniek).", type: "Training", oefening_id: "sprint_start_techniek" }
      ]},
      { week_nummer: 3, doel_van_de_week: "Wedstrijdintensiteit nabootsen.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 3x 10x5m shuttle op 95% inspanning, met 2 min rust.", type: "Training", oefening_id: "anaerobe_shuttle_intervallen" },
          { dag: "Dag 2", omschrijving: "Kracht: 15 min plyometrische oefeningen.", type: "Kracht", oefening_id: "plyometrie_wendbaarheid" }
      ]},
      { week_nummer: 4, doel_van_de_week: "Tapering en de test.", taken: [
          { dag: "Dag 1", omschrijving: "Lichte training: 6x 1x5m shuttle (enkel afremmen en starten).", type: "Herstel", oefening_id: "wendbaarheid_keertechniek" },
          { dag: "Dag 2", omschrijving: "TESTDAG: 10x5m Shuttle Run Test voor een nieuw record.", type: "Meting", oefening_id: "10x5m_test_simulatie" }
      ]}
    ]
  },
  // Schema voor Experts
  'schema_10x5m_expert_4weken': {
    naam: "10x5m Expert (4 Weken)",
    duur_weken: 4,
    categorie: "Prestatie",
    omschrijving: "Een intensief 4-wekenplan voor atleten om de laatste tienden van een seconde te winnen door maximale explosiviteit en weerstand tegen verzuring.",
    gekoppelde_test_id: "10x5m_shuttle_run",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Maximale snelheid en kracht.", taken: [
          { dag: "Dag 1", omschrijving: "Interval: 5x 10x5m shuttle op 95-100% inspanning, met 2-3 min rust.", type: "Training", oefening_id: "anaerobe_shuttle_intervallen" },
          { dag: "Dag 2", omschrijving: "Kracht: 25 min intensieve plyometrie.", type: "Kracht", oefening_id: "plyometrie_wendbaarheid" },
          { dag: "Dag 3", omschrijving: "Techniek: 15 min keertechniek op absolute topsnelheid.", type: "Techniek", oefening_id: "wendbaarheid_keertechniek" }
      ]},
      { week_nummer: 2, doel_van_de_week: "Overload en weerstand tegen vermoeidheid.", taken: [
          { dag: "Dag 1", omschrijving: "Overload Interval: 3x 12x5m shuttle (2 extra shuttles) op 90%.", type: "Training", oefening_id: "anaerobe_shuttle_intervallen" },
          { dag: "Dag 2", omschrijving: "Kracht & Snelheid: 15 min plyo gevolgd door 6x 15m sprints.", type: "Training", oefening_id: "plyometrie_wendbaarheid" },
          { dag: "Dag 3", omschrijving: "Herstelloop: 20 min zeer rustig joggen.", type: "Herstel" }
      ]},
      { week_nummer: 3, doel_van_de_week: "Piekweek: maximale intensiteit.", taken: [
          { dag: "Dag 1", omschrijving: "Testsimulatie: 2x 10x5m shuttle 'all-out' met 5 min rust tussendoor. De beste tijd telt.", type: "Meting", oefening_id: "10x5m_test_simulatie" },
          { dag: "Dag 2", omschrijving: "Actief herstel: 15 min wandelen of lichte stretching.", type: "Herstel" },
          { dag: "Dag 3", omschrijving: "Kracht: 15 min plyometrie (minder volume, focus op kwaliteit).", type: "Kracht", oefening_id: "plyometrie_wendbaarheid" }
      ]},
      { week_nummer: 4, doel_van_de_week: "Tapering voor een toptijd.", taken: [
          { dag: "Dag 1", omschrijving: "Zeer lichte training: 5 min joggen, 4x keerbeweging op 50%.", type: "Herstel", oefening_id: "wendbaarheid_keertechniek" },
          { dag: "Dag 2", omschrijving: "Volledige Rust.", type: "Herstel" },
          { dag: "Dag 3", omschrijving: "TESTDAG: 10x5m Shuttle Run voor een nieuw persoonlijk record.", type: "Meting", oefening_id: "10x5m_test_simulatie" }
      ]}
    ]
  }
};
async function importData() {
  console.log('Start import van 10x5m-oefeningen...');
  for (const [id, data] of Object.entries(oefeningen)) {
    await db.collection('oefeningen').doc(id).set(data);
    console.log(`✅ Oefening '${id}' toegevoegd.`);
  }
  console.log('Alle oefeningen zijn geïmporteerd!');

  console.log('\nStart import van 10x5m-trainingsschema\'s...');
  for (const [id, data] of Object.entries(trainingsschemas)) {
    await db.collection('trainingsschemas').doc(id).set(data);
    console.log(`✅ Schema '${id}' toegevoegd.`);
  }
  console.log('Trainingsschema\'s zijn geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importData();