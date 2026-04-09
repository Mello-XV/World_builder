/**
 * Toutes les opérations de lecture/écriture avec Firestore.
 *
 * Structure de la base de données :
 *   users/{uid}/projects/{projectId}         → métadonnées du projet (nom, description)
 *   users/{uid}/projectData/{projectId}      → données du projet (toutes les fiches)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { auth, db } from './firebase';

/** Retourne l'UID de l'utilisateur connecté, ou null si déconnecté. */
function getUserId() {
  return auth.currentUser?.uid ?? null;
}

/** Charge la liste de tous les projets de l'utilisateur. */
export async function loadProjects() {
  const uid = getUserId();
  if (!uid) return [];
  try {
    const q = query(collection(db, 'users', uid, 'projects'), orderBy('createdAt'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('loadProjects:', e);
    return [];
  }
}

/** Sauvegarde (ou crée) un projet. */
export async function saveProject(project) {
  const uid = getUserId();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'users', uid, 'projects', project.id), project);
  } catch (e) {
    console.error('saveProject:', e);
  }
}

/** Supprime un projet et toutes ses données. */
export async function deleteProjectDB(projectId) {
  const uid = getUserId();
  if (!uid) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'projects', projectId));
    await deleteDoc(doc(db, 'users', uid, 'projectData', projectId));
  } catch (e) {
    console.error('deleteProjectDB:', e);
  }
}

/** Charge les données (fiches) d'un projet. */
export async function loadProjectData(projectId) {
  const uid = getUserId();
  if (!uid) return { entries: {}, nextId: 1 };
  try {
    const d = await getDoc(doc(db, 'users', uid, 'projectData', projectId));
    return d.exists() ? d.data() : { entries: {}, nextId: 1 };
  } catch (e) {
    console.error('loadProjectData:', e);
    return { entries: {}, nextId: 1 };
  }
}

/** Sauvegarde les données (fiches) d'un projet. */
export async function saveProjectData(projectId, data) {
  const uid = getUserId();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'users', uid, 'projectData', projectId), data);
  } catch (e) {
    console.error('saveProjectData:', e);
  }
}
