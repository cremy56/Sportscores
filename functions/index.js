// Initialiseer Firebase Admin SDK EENMAAL
const admin = require('firebase-admin');
admin.initializeApp();

// Import alle module functions
const sportFunctions = require('./src/sport-functions');
const sportTestFunctions = require('./src/sport-test-functions');
const ehboFunctions = require('./src/ehbo-functions');
const trainingFunctions = require('./src/training-functions');
const welzijnFunctions = require('./src/welzijn-functions');
const classChallengeFunction = require('./src/class-challenge-functions');
const adminFunctions = require('./src/admin-functions');

// Export alle functions
module.exports = {
  ...sportFunctions,
  ...sportTestFunctions,
  ...ehboFunctions,
  ...trainingFunctions,
  ...welzijnFunctions,
  ...classChallengeFunction,
  ...adminFunctions
};