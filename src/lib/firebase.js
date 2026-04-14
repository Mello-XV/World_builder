/**
 * Configuration et initialisation de Firebase.
 *
 * Firebase = la base de données en ligne de l'application.
 * - Auth    : gère la connexion/inscription des utilisateurs
 * - Firestore : base de données NoSQL (stocke les projets et les fiches)
 *
 * La config Firebase est publique par conception — la sécurité est dans les Firestore Rules.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Ces valeurs sont publiques par conception Firebase — la sécurité est assurée
// par les Firestore Security Rules, pas par le secret de la clé API.
// Voir : https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey: 'AIzaSyDQC8QCP3J9Q4fptgkWsdZWYpw-UtY_eBk',
  authDomain: 'world-builder-f179c.firebaseapp.com',
  projectId: 'world-builder-f179c',
  storageBucket: 'world-builder-f179c.firebasestorage.app',
  messagingSenderId: '628702210025',
  appId: '1:628702210025:web:b833dc0f3c5eaac0194d78',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const ADMIN_EMAIL = 'gregoiremorval@gmail.com';
