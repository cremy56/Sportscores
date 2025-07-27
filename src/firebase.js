// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// STAP 1: Ga naar uw Firebase Project Instellingen.
//   - Klik op het tandwiel-icoon linksboven in uw Firebase Console.
//   - Kies "Projectinstellingen".
//   - Scroll naar beneden naar "Uw apps".
//   - Als u nog geen web-app heeft geregistreerd, klik op het web-icoon (</>) en volg de stappen.
//   - Kopieer het 'firebaseConfig'-object dat wordt getoond.

// STAP 2: Plak uw persoonlijke configuratie hieronder.
// De waarden hier zijn slechts een voorbeeld.
const firebaseConfig = {
  apiKey: "AIzaSyBzJ1PFEffKthDcAayzEaqcYn63VfhC524",
  authDomain: "sportscore-6774d.firebaseapp.com",
  projectId: "sportscore-6774d",
  storageBucket: "sportscore-6774d.appspot.com",
  messagingSenderId: "327566231586",
  appId: "1:327566231586:web:96d794e837e8514bd2627b"
};

// Initialiseer Firebase
const app = initializeApp(firebaseConfig);

// Exporteer de diensten die u in de rest van uw app zult gebruiken
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
