// src/utils/firebaseUtils.js
import { db } from '../firebase';
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Enhanced gender mapping
export const GENDER_MAPPING = {
  'man': 'M', 'vrouw': 'V',
  'jongen': 'M', 'meisje': 'V',
  'M': 'M', 'V': 'V',
  'm': 'M', 'v': 'V',
  'male': 'M', 'female': 'V'
};

/**
 * Firestore foutafhandeling
 */
export function handleFirestoreError(error, operation = 'Firestore operation') {
  console.error(`${operation} error:`, error);
  switch (error.code) {
    case 'permission-denied': return `Geen toegang tot ${operation.toLowerCase()}.`;
    case 'network-error':
    case 'unavailable': return 'Netwerkfout. Controleer je internetverbinding.';
    case 'deadline-exceeded': return 'Verzoek duurde te lang. Probeer opnieuw.';
    case 'unauthenticated': return 'Niet ingelogd. Log opnieuw in.';
    case 'not-found': return 'Gevraagde gegevens niet gevonden.';
    default: return error.message || 'Er is een onbekende fout opgetreden.';
  }
}

/**
 * Netwerk status monitoring
 */
let isOnline = navigator.onLine;

export function setupNetworkMonitoring() {
  window.addEventListener('online', async () => {
    isOnline = true;
    try {
      await enableNetwork(db);
      toast.success('Verbinding hersteld', { duration: 3000 });
    } catch (error) {
      console.error('Failed to enable network:', error);
    }
  });

  window.addEventListener('offline', async () => {
    isOnline = false;
    try {
      await disableNetwork(db);
      toast.error('Geen internetverbinding', { duration: 5000, icon: '📡' });
    } catch (error) {
      console.error('Failed to disable network:', error);
    }
  });
}

export function getNetworkStatus() {
  return isOnline;
}

/**
 * Haalt evolutiegegevens op voor een student via de API
 */
export const getStudentEvolutionData = async (studentId, schoolId, token) => {
  if (!studentId || !schoolId || !token) {
    throw new Error('studentId, schoolId en token zijn verplicht');
  }
  try {
    const response = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_student_evolution', leerlingId: studentId, schoolId })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'API fout');
    }
    const data = await response.json();
    return (data.evolutionData || []).map(test => ({
      ...test,
      all_scores: (test.all_scores || []).map(s => ({
        ...s,
        datum: s.datum ? new Date(s.datum) : new Date()
      })),
      personal_best_datum: test.personal_best_datum ? new Date(test.personal_best_datum) : null
    }));
  } catch (error) {
    console.error('Error getting student evolution data:', error);
    throw new Error('Kon de evolutiegegevens niet laden.');
  }
};

/**
 * Haalt score normen op via de API
 */
export const getScoreNorms = async (testId, klas, geslacht, token) => {
  if (!testId || !klas || !geslacht || !token) {
    console.warn('getScoreNorms: testId, klas, geslacht en token zijn verplicht');
    return null;
  }
  try {
    const response = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_score_norms', testId, klas, geslacht })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.normen || null;
  } catch (error) {
    console.error('getScoreNorms error:', error);
    return null;
  }
};