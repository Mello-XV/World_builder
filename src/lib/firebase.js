/**
 * Configuration et initialisation de Firebase.
 *
 * Firebase = la base de données en ligne de l'application.
 * - Auth    : gère la connexion/inscription des utilisateurs
 * - Firestore : base de données NoSQL (stocke les projets et les fiches)
 *
 * Les clés sont lues depuis les variables d'environnement Vite (.env).
 * Ne jamais mettre de secrets en dur dans ce fichier.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
