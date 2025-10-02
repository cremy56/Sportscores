// import_800m_crawl_schemas.js
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- DATA VOOR DE 'oefeningen' COLLECTIE (ZWEMMEN) ---
const oefeningen = {
  'zwem_crawl_benen': {
    naam: "Crawl Benen met Plank",
    categorie: "Techniek",
    beschrijving: "Isoleert de beenslag om de stuwkracht vanuit de heupen, de core stability en een stabiele waterligging te verbeteren.",
    visuele_media_url: "https://i.imgur.com/example.gif", // Placeholder URL
    instructies: [
      "Houd een zwemplankje met gestrekte armen voor je.",
      "Houd je lichaam zo horizontaal mogelijk in het water.",
      "Focus op een constante, compacte beenslag die vanuit de heupen komt.",
      "Houd je enkels ontspannen en je voeten licht naar binnen gedraaid."
    ]
  },
  'zwem_sculling': {
    naam: "Sculling (Wrikken)",
    categorie: "Techniek",
    beschrijving: "Een oefening gericht op het verbeteren van het 'watergevoel' door met de handen achtvormige bewegingen te maken, wat de efficiëntie van de armslag verhoogt.",
    visuele_media_url: "https://i.imgur.com/example.gif", // Placeholder URL
    instructies: [
      "Lig horizontaal in het water, met je armen naar voren of naast je lichaam (afhankelijk van de scull-variant).",
      "Houd je ellebogen hoog en stil.",
      "Maak met je handen en onderarmen een continue, achtvormige of 'vegende' beweging.",
      "Voel de druk van het water tegen je handpalmen en onderarmen."
    ]
  },
  'zwem_catch_up': {
    naam: "Catch-up Drill",
    categorie: "Techniek",
    beschrijving: "Een klassieke drill waarbij de ene hand wacht tot de andere hand de slag afmaakt en naar voren komt. Focust op een volledige armstrekking en lichaamsrotatie.",
    visuele_media_url: "https://i.imgur.com/example.gif", // Placeholder URL
    instructies: [
      "Begin de slag met beide armen gestrekt naar voren.",
      "Voer een volledige armslag uit met één arm.",
      "De andere arm blijft gestrekt naar voren wachten totdat de actieve arm weer vooraan is.",
      "Wissel van arm en herhaal. Focus op een lange slag en het roteren van de heupen."
    ]
  },
  'zwem_duur_rustig': {
    naam: "Duurtraining (Rustig)",
    categorie: "Uithouding",
    beschrijving: "Zwemmen op een rustig en constant tempo (lage hartslag) om de aerobe basis, de efficiëntie en het uithoudingsvermogen te vergroten.",
    visuele_media_url: "https://i.imgur.com/example.gif", // Placeholder URL
    instructies: [
      "Zwem de aangegeven afstand zonder te stoppen.",
      "Houd een comfortabel tempo aan waarbij je ademhaling gecontroleerd blijft (gesprekstempo).",
      "Focus op een constante techniek en een efficiënte slag.",
      "Het doel is de afstand volbrengen, niet de snelheid."
    ]
  },
  'zwem_interval_tempo': {
    naam: "Tempo Intervallen",
    categorie: "Snelheid",
    beschrijving: "Blokken zwemmen op een hoger, gecontroleerd tempo met vooraf bepaalde rustpauzes. Verbetert de snelheid, het tempo-gevoel en de lactaatdrempel.",
    visuele_media_url: "https://i.imgur.com/example.gif", // Placeholder URL
    instructies: [
      "Zwem de opgegeven afstand op een 'comfortabel zwaar' tempo (ongeveer 8/10 inspanning).",
      "Houd je strikt aan de voorgeschreven rusttijd tussen de intervallen.",
      "Probeer elke interval op een consistent tempo te zwemmen.",
      "Focus op het behouden van een goede techniek, ook als je vermoeid raakt."
    ]
  },
    'zwem_hypoxie': {
    naam: "Hypoxische Training",
    categorie: "Techniek",
    beschrijving: "Zwemmen met een verminderde ademhalingsfrequentie (bv. ademen om de 5, 7, of 9 slagen) om de longcapaciteit en de CO2-tolerantie te verbeteren.",
    visuele_media_url: "https://i.imgur.com/example.gif", // Placeholder URL
    instructies: [
        "Adem diep in en uit voor je start.",
        "Zwem de aangegeven afstand en adem alleen op de voorgeschreven slag (bv. elke 5e slag).",
        "Focus op een krachtige en efficiënte uitademing onder water.",
        "Stop onmiddellijk als je je duizelig voelt. Bouw dit geleidelijk op."
    ]
  },
  'zwem_sprint': {
    naam: "Sprints",
    categorie: "Snelheid",
    beschrijving: "Korte afstanden zwemmen op maximale snelheid om de topsnelheid, explosieve kracht en het zenuwstelsel te trainen.",
    visuele_media_url: "https://i.imgur.com/example.gif", // Placeholder URL
    instructies: [
        "Zwem de korte, aangegeven afstand op 95-100% van je maximale inspanning.",
        "Focus op een hoge arm- en beenfrequentie met maximale kracht.",
        "Neem voldoende rust tussen de sprints om volledig te herstellen.",
        "Techniek mag iets losser zijn, maar vermijd chaotisch zwemmen."
    ]
  }
};

// --- DATA VOOR DE 'trainingsschemas' COLLECTIE (ZWEMMEN) ---
const trainingsschemas = {
  // Schema voor Beginners
  'schema_800m_beginner_10weken': {
    naam: "Start to 800m (10 Weken)",
    duur_weken: 10,
    categorie: "Uithouding",
    omschrijving: "Een schema voor beginnende zwemmers die de basis van de crawl beheersen en willen opbouwen naar het zwemmen van 800 meter zonder te stoppen.",
    gekoppelde_test_id: "800m_crawl",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Watergewenning & Techniek.", taken: [ 
          { dag: "Dag 1", omschrijving: "4x 50m crawl (30s rust), 4x 25m benen (30s rust)", type: "Training", oefening_id: "zwem_crawl_benen" },
          { dag: "Dag 2", omschrijving: "6x 50m crawl met focus op ademhaling", type: "Techniek", oefening_id: "zwem_duur_rustig" }
      ] },
      { week_nummer: 2, doel_van_de_week: "Afstand licht verhogen.", taken: [
          { dag: "Dag 1", omschrijving: "6x 50m crawl (30s rust), 4x 50m benen (45s rust)", type: "Training", oefening_id: "zwem_crawl_benen" },
          { dag: "Dag 2", omschrijving: "2x 150m crawl rustig", type: "Uithouding", oefening_id: "zwem_duur_rustig" }
      ] },
      { week_nummer: 3, doel_van_de_week: "Techniek verfijnen.", taken: [
          { dag: "Dag 1", omschrijving: "4x 100m crawl, 4x 25m Catch-up drill", type: "Techniek", oefening_id: "zwem_catch_up" },
          { dag: "Dag 2", omschrijving: "4x 75m crawl (45s rust)", type: "Uithouding", oefening_id: "zwem_duur_rustig" }
      ] },
      { week_nummer: 4, doel_van_de_week: "Eerste duurblokken.", taken: [
          { dag: "Dag 1", omschrijving: "2x 200m crawl met 60s rust", type: "Uithouding", oefening_id: "zwem_duur_rustig" },
          { dag: "Dag 2", omschrijving: "8x 50m crawl (iets vlotter)", type: "Training", oefening_id: "zwem_interval_tempo" }
      ] },
      { week_nummer: 5, doel_van_de_week: "Uithouding opbouwen.", taken: [
          { dag: "Dag 1", omschrijving: "3x 200m crawl met 45s rust", type: "Uithouding", oefening_id: "zwem_duur_rustig" },
          { dag: "Dag 2", omschrijving: "1x 300m, gevolgd door 2x 50m", type: "Uithouding", oefening_id: "zwem_duur_rustig" }
      ] },
      { week_nummer: 6, doel_van_de_week: "Actieve rustweek.", taken: [
          { dag: "Dag 1", omschrijving: "200m rustig zwemmen, 4x 25m techniek", type: "Herstel", oefening_id: "zwem_sculling" },
          { dag: "Dag 2", omschrijving: "Lichte training: 10x 25m crawl", type: "Herstel", oefening_id: "zwem_duur_rustig" }
      ] },
      { week_nummer: 7, doel_van_de_week: "Langere afstanden.", taken: [
          { dag: "Dag 1", omschrijving: "2x 300m crawl met 60s rust", type: "Uithouding", oefening_id: "zwem_duur_rustig" },
          { dag: "Dag 2", omschrijving: "1x 400m crawl non-stop", type: "Uithouding", oefening_id: "zwem_duur_rustig" }
      ] },
      { week_nummer: 8, doel_van_de_week: "Tempo introduceren.", taken: [
          { dag: "Dag 1", omschrijving: "4x 100m (50m rustig, 50m vlot)", type: "Training", oefening_id: "zwem_interval_tempo" },
          { dag: "Dag 2", omschrijving: "500m crawl non-stop", type: "Uithouding", oefening_id: "zwem_duur_rustig" }
      ] },
      { week_nummer: 9, doel_van_de_week: "Piekweek.", taken: [
          { dag: "Dag 1", omschrijving: "1x 600m crawl non-stop", type: "Uithouding", oefening_id: "zwem_duur_rustig" },
          { dag: "Dag 2", omschrijving: "2x 400m met 60s rust", type: "Uithouding", oefening_id: "zwem_duur_rustig" }
      ] },
      { week_nummer: 10, doel_van_de_week: "Testweek.", taken: [
          { dag: "Dag 1", omschrijving: "Lichte training: 10 min rustig zwemmen", type: "Herstel" },
          { dag: "Dag 2", omschrijving: "TESTDAG: 800m crawl", type: "Meting" }
      ] }
    ]
  },
  // Schema voor Gevorderden
  'schema_800m_gevorderd_8weken': {
    naam: "800m Plan voor Gevorderden (8 Weken)",
    duur_weken: 8,
    categorie: "Uithouding",
    omschrijving: "Voor zwemmers die 800m kunnen volbrengen en hun tijd willen verbeteren (richting 13-15 minuten). Focus op tempo, techniek en uithouding.",
    gekoppelde_test_id: "800m_crawl",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Basis heractiveren.", taken: [ 
        { dag: "Dag 1", omschrijving: "10x 100m op comfortabel tempo (15s rust)", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "Duur: 1200m rustig", type: "Herstel", oefening_id: "zwem_duur_rustig" }, 
        { dag: "Dag 3", omschrijving: "Techniek: 8x 50m (25m sculling, 25m crawl)", type: "Techniek", oefening_id: "zwem_sculling" } ] },
      { week_nummer: 2, doel_van_de_week: "Tempo opbouwen.", taken: [ 
        { dag: "Dag 1", omschrijving: "5x 200m op 800m-doeltempo +10s (30s rust)", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "Duur: 1500m met laatste 100m versnellen", type: "Uithouding", oefening_id: "zwem_duur_rustig" }, 
        { dag: "Dag 3", omschrijving: "8x 75m crawl (25m snel, 50m rustig)", type: "Snelheid", oefening_id: "zwem_sprint" } ] },
      { week_nummer: 3, doel_van_de_week: "Snelheid & Techniek.", taken: [ 
        { dag: "Dag 1", omschrijving: "8x 50m sprints (45s rust) + 4x 100m techniek", type: "Snelheid", oefening_id: "zwem_sprint" }, 
        { dag: "Dag 2", omschrijving: "3x 300m op doeltempo (45s rust)", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 3", omschrijving: "Hypoxie: 6x 100m (ademhaling 3/5/7 per 25m)", type: "Techniek", oefening_id: "zwem_hypoxie" } ] },
      { week_nummer: 4, doel_van_de_week: "Actieve rustweek.", taken: [ 
        { dag: "Dag 1", omschrijving: "Duur: 1000m heel rustig", type: "Herstel", oefening_id: "zwem_duur_rustig" }, 
        { dag: "Dag 2", omschrijving: "Lichte training: 400m techniek, 4x 50m vlot", type: "Herstel", oefening_id: "zwem_catch_up" }, 
        { dag: "Dag 3", omschrijving: "Volledige rust.", type: "Herstel" } ] },
      { week_nummer: 5, doel_van_de_week: "Wedstrijdtempo.", taken: [ 
        { dag: "Dag 1", omschrijving: "4x 200m op doeltempo (20s rust)", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "Duur: 1000m, met tempowisselingen", type: "Uithouding", oefening_id: "zwem_duur_rustig" }, 
        { dag: "Dag 3", omschrijving: "10x 100m op doeltempo (15s rust)", type: "Training", oefening_id: "zwem_interval_tempo" } ] },
      { week_nummer: 6, doel_van_de_week: "Intensiteitspiek.", taken: [ 
        { dag: "Dag 1", omschrijving: "Piramide: 100-200-300-200-100m (alles vlot)", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "Duur: 800m rustig + 4x 50m sprints", type: "Herstel", oefening_id: "zwem_sprint" }, 
        { dag: "Dag 3", omschrijving: "Techniek: 6x 100m Catch-up drill", type: "Techniek", oefening_id: "zwem_catch_up" } ] },
      { week_nummer: 7, doel_van_de_week: "Tapering (Afbouwen).", taken: [ 
        { dag: "Dag 1", omschrijving: "3x 200m op doeltempo", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "Lichte training: 400m rustig + 4x 25m versnellen", type: "Herstel" }, 
        { dag: "Dag 3", omschrijving: "Volledige rust.", type: "Herstel" } ] },
      { week_nummer: 8, doel_van_de_week: "Testweek.", taken: [ 
        { dag: "Dag 1", omschrijving: "Zeer lichte training: 10 min rustig inzwemmen", type: "Herstel" }, 
        { dag: "Dag 2", omschrijving: "TESTDAG: 800m crawl", type: "Meting" },
        { dag: "Dag 3", omschrijving: "Volledige rust.", type: "Herstel" } ] }
    ]
  },
    // Schema voor Experts
  'schema_800m_expert_6weken': {
    naam: "800m Prestatiepiek (6 Weken)",
    duur_weken: 6,
    categorie: "Uithouding",
    omschrijving: "Een intensief schema voor competitieve zwemmers die hun 800m tijd significant willen aanscherpen (sub-12 minuten).",
    gekoppelde_test_id: "800m_crawl",
    weken: [
      { week_nummer: 1, doel_van_de_week: "Hoog volume & drempel.", taken: [ 
        { dag: "Dag 1", omschrijving: "16x 100m op drempeltempo (10s rust)", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "Tempo: 2x (4x 200m) op 800m-doeltempo", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 3", omschrijving: "Duur: 2000m rustig, focus op efficiëntie", type: "Herstel", oefening_id: "zwem_duur_rustig" } ] },
      { week_nummer: 2, doel_van_de_week: "Wedstrijdspecifiek.", taken: [ 
        { dag: "Dag 1", omschrijving: "Hoofdset: 8x 100m sneller dan doeltempo", type: "Snelheid", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "3x 500m (1e rustig, 2e op tempo, 3e progressief)", type: "Uithouding", oefening_id: "zwem_duur_rustig" }, 
        { dag: "Dag 3", omschrijving: "Sprints: 12x 50m (25m max, 25m rustig)", type: "Snelheid", oefening_id: "zwem_sprint" } ] },
      { week_nummer: 3, doel_van_de_week: "Overload & kracht.", taken: [ 
        { dag: "Dag 1", omschrijving: "4x 400m (negatieve split, 45s rust)", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "Tempo: 800m op doeltempo + 4x 50m sprint", type: "Training", oefening_id: "zwem_sprint" }, 
        { dag: "Dag 3", omschrijving: "Techniek: 10x 100m met focus op hoge elleboog", type: "Techniek", oefening_id: "zwem_catch_up" } ] },
      { week_nummer: 4, doel_van_de_week: "Intensiteitspiek.", taken: [ 
        { dag: "Dag 1", omschrijving: "Hoofdset: 2x (4x 100m) op wedstrijdtempo (15s rust)", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "Duur: 1500m met laatste 200m opbouwend", type: "Uithouding", oefening_id: "zwem_duur_rustig" }, 
        { dag: "Dag 3", omschrijving: "Hypoxie & Snelheid: 8x 75m (25m sprint, 50m hypoxisch)", type: "Snelheid", oefening_id: "zwem_hypoxie" } ] },
      { week_nummer: 5, doel_van_de_week: "Tapering.", taken: [ 
        { dag: "Dag 1", omschrijving: "6x 100m op doeltempo (30s rust)", type: "Training", oefening_id: "zwem_interval_tempo" }, 
        { dag: "Dag 2", omschrijving: "Lichte duur: 1000m rustig + 4x 25m versnellen", type: "Herstel" }, 
        { dag: "Dag 3", omschrijving: "Volledige rust.", type: "Herstel" } ] },
      { week_nummer: 6, doel_van_de_week: "Testweek.", taken: [ 
        { dag: "Dag 1", omschrijving: "Zeer lichte training: 400m loszwemmen, 2x 25m vlot", type: "Herstel" }, 
        { dag: "Dag 2", omschrijving: "TESTDAG: 800m crawl voor PR", type: "Meting" }, 
        { dag: "Dag 3", omschrijving: "Volledige rust.", type: "Herstel" } ] }
    ]
  }
};

async function importData() {
  console.log('Start import van 800m-crawl-oefeningen...');
  for (const [id, data] of Object.entries(oefeningen)) {
    await db.collection('oefeningen').doc(id).set(data);
    console.log(`✅ Oefening '${id}' toegevoegd.`);
  }
  console.log('Alle zwemoefeningen zijn geïmporteerd!');

  console.log('\nStart import van 800m-crawl-trainingsschema\'s...');
  for (const [id, data] of Object.entries(trainingsschemas)) {
    await db.collection('trainingsschemas').doc(id).set(data);
    console.log(`✅ Schema '${id}' toegevoegd.`);
  }
  console.log('Trainingsschema\'s zijn geïmporteerd!');
  
  console.log('\n🎉 Import voltooid!');
}

importData();