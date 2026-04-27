// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';


const firebaseConfig = {
  apiKey: 'AIzaSyBzJ1PFEffKthDcAayzEaqcYn63VfhC524',
  authDomain: 'sportscore-6774d.firebaseapp.com',
  projectId: 'sportscore-6774d',
  storageBucket: 'sportscore-6774d.appspot.com',
  messagingSenderId: '327566231586',
  appId: '1:327566231586:web:96d794e837e8514bd2627b'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
