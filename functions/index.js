// functions/index.js
// ─────────────────────────────────────────────────────────────────────────────
// REGIO (aug 2026): alle v2-functies draaien standaard in europe-west1.
//
// Waarom: zonder setGlobalOptions viel elke functie terug op de Firebase-
// standaard us-central1. Dat betekende dat de functies die persoonsgegevens
// verwerken — XP en scores, trainingsschema's, EHBO-voortgang, klassementen
// én smartschoolAuth — in de Verenigde Staten draaiden, terwijl de opslag
// (Firestore, back-ups, secrets) in België staat. Verwerking in een derde
// land is onder de AVG een doorgifte, ook zonder opslag.
//
// setGlobalOptions MOET vóór de requires staan: de functiedefinities worden
// tijdens het requiren geëvalueerd en nemen de dan geldende standaard over.
//
// Functies die zelf een regio opgeven (getSportNews) overschrijven deze
// standaard — dat blijft werken en stond al op europe-west1.
// keyRotationReminder valt buiten deze codebase (gcloud-beheerd).
// ─────────────────────────────────────────────────────────────────────────────
const { setGlobalOptions } = require('firebase-functions/v2');
setGlobalOptions({ region: 'europe-west1' });

// Initialiseer Firebase Admin SDK EENMAAL
const admin = require('firebase-admin');
admin.initializeApp();

// Export alle functions
module.exports = {
  ...require('./src/sport-functions'),
  ...require('./src/sport-test-functions'),
  ...require('./src/ehbo-functions'),
  ...require('./src/training-functions'),
  ...require('./src/engagement-functions'),
  ...require('./src/admin-functions'),
  ...require('./src/auth-functions'),
  ...require('./src/archive-functions'),
  ...require('./src/sportlab-functions'),
  ...require('./src/cleanup-functions')
};
