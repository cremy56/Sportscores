// Initialiseer Firebase Admin SDK EENMAAL
const admin = require('firebase-admin');
admin.initializeApp();


// Export alle functions
module.exports = {
  ...require('./src/sport-functions'),
  ...require('./src/sport-test-functions'),
  ...require('./src/ehbo-functions'),
  ...require('./src/training-functions'),
  ...require('./src/welzijn-functions'),
  ...require('./src/class-challenge-functions'),
  ...require('./src/admin-functions')
};