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
  runTransaction,
  where,
  onSnapshot,
} from 'firebase/firestore';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';

// ── Gestion des statuts utilisateurs (approbation admin) ──────────────────

/** Crée un document de statut 'pending' pour un nouvel utilisateur. */
export async function createPendingUser(uid, email) {
  try {
    await setDoc(doc(db, 'userStatus', uid), { email, status: 'pending', createdAt: Date.now() });
  } catch (e) {
    console.error('createPendingUser:', e);
  }
}

/** Retourne le statut d'un utilisateur, ou null si introuvable. */
export async function getUserStatus(uid) {
  try {
    const d = await getDoc(doc(db, 'userStatus', uid));
    return d.exists() ? d.data() : null;
  } catch (e) {
    console.error('getUserStatus:', e);
    return null;
  }
}

/** Retourne tous les statuts utilisateurs (admin seulement). */
export async function getAllUserStatuses() {
  try {
    const snapshot = await getDocs(collection(db, 'userStatus'));
    return snapshot.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('getAllUserStatuses:', e);
    return [];
  }
}

/** Met à jour le statut d'un utilisateur : 'approved' ou 'rejected'. */
export async function updateUserStatus(uid, status) {
  try {
    await setDoc(doc(db, 'userStatus', uid), { status, reviewedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.error('updateUserStatus:', e);
  }
}

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

/** Upload une photo vers Firebase Storage et retourne son URL de téléchargement. */
export async function uploadEntryPhoto(file) {
  const uid = getUserId();
  if (!uid) throw new Error('Non authentifié');
  const path = `users/${uid}/photos/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ── Profils utilisateurs ──────────────────────────────────────────────────

/** Charge le profil d'un utilisateur (null si inexistant). */
export async function getUserProfile(uid) {
  try {
    const d = await getDoc(doc(db, 'userProfiles', uid));
    return d.exists() ? d.data() : null;
  } catch (e) {
    console.error('getUserProfile:', e);
    return null;
  }
}

/** Met à jour (merge) le profil d'un utilisateur. */
export async function setUserProfile(uid, data) {
  try {
    await setDoc(doc(db, 'userProfiles', uid), data, { merge: true });
  } catch (e) {
    console.error('setUserProfile:', e);
  }
}

/**
 * Crée le profil d'un nouvel utilisateur avec un pseudo auto-généré "user-XX".
 * Utilise un compteur atomique dans appConfig/userCounter pour éviter les doublons
 * et ne pas nécessiter de lister toute la collection userProfiles.
 */
export async function createUserProfile(uid) {
  try {
    const existing = await getDoc(doc(db, 'userProfiles', uid));
    if (existing.exists()) return existing.data().displayName;

    let displayName;
    const counterRef = doc(db, 'appConfig', 'userCounter');
    await runTransaction(db, async tx => {
      const counterSnap = await tx.get(counterRef);
      const idx = counterSnap.exists() ? counterSnap.data().count : 0;
      displayName = `user-${idx.toString().padStart(2, '0')}`;
      tx.set(doc(db, 'userProfiles', uid), { displayName, createdAt: Date.now() });
      tx.set(counterRef, { count: idx + 1 }, { merge: true });
    });
    return displayName;
  } catch (e) {
    console.error('createUserProfile:', e);
    return 'user-??';
  }
}

// ── Partage et suivi de projet ────────────────────────────────────────────

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // pas de 0/O/1/I
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Retourne le code de partage d'un projet, en le créant si besoin.
 * Le code est stocké dans le document projet ET dans shareCodes/{code}.
 */
export async function getOrCreateShareCode(projectId) {
  const uid = getUserId();
  if (!uid) return null;
  try {
    const projRef = doc(db, 'users', uid, 'projects', projectId);
    const projSnap = await getDoc(projRef);
    if (!projSnap.exists()) return null;
    const data = projSnap.data();
    if (data.shareCode) return data.shareCode;
    let code;
    do { code = generateCode(); }
    while ((await getDoc(doc(db, 'shareCodes', code))).exists());
    await Promise.all([
      setDoc(projRef, { shareCode: code }, { merge: true }),
      setDoc(doc(db, 'shareCodes', code), { ownerUid: uid, projectId, projectName: data.name }),
    ]);
    return code;
  } catch (e) {
    console.error('getOrCreateShareCode:', e);
    return null;
  }
}

/** Cherche un projet par code de partage. Retourne { ownerUid, projectId, projectName } ou null. */
export async function findProjectByCode(rawCode) {
  try {
    const snap = await getDoc(doc(db, 'shareCodes', rawCode.trim().toUpperCase()));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error('findProjectByCode:', e);
    return null;
  }
}

/**
 * Envoie une demande de suivi.
 * Retourne { success, projectName } ou { error }.
 */
export async function sendFollowRequest(fromUid, fromDisplayName, shareCode) {
  try {
    const info = await findProjectByCode(shareCode);
    if (!info) return { error: 'Code invalide' };
    if (info.ownerUid === fromUid) return { error: 'Tu ne peux pas suivre ton propre projet' };
    const reqId = `${fromUid}_${info.projectId}`;
    const existing = await getDoc(doc(db, 'followRequests', reqId));
    if (existing.exists()) {
      const s = existing.data().status;
      if (s === 'approved') return { error: 'Tu suis déjà ce projet' };
      if (s === 'pending') return { error: 'Demande déjà envoyée, en attente d\'approbation' };
    }
    await setDoc(doc(db, 'followRequests', reqId), {
      fromUid, fromDisplayName,
      toUid: info.ownerUid,
      projectId: info.projectId,
      projectName: info.projectName,
      status: 'pending',
      createdAt: Date.now(),
    });
    return { success: true, projectName: info.projectName };
  } catch (e) {
    console.error('sendFollowRequest:', e);
    return { error: e.message };
  }
}

/** Retourne toutes les demandes reçues par un propriétaire. */
export async function getFollowRequestsForOwner(toUid) {
  try {
    const snap = await getDocs(query(collection(db, 'followRequests'), where('toUid', '==', toUid)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('getFollowRequestsForOwner:', e);
    return [];
  }
}

/** Approuve ou refuse une demande de suivi (req = objet complet de la demande). */
export async function respondToFollowRequest(requestId, approve, req) {
  try {
    await setDoc(doc(db, 'followRequests', requestId),
      { status: approve ? 'approved' : 'rejected', reviewedAt: Date.now() }, { merge: true });
    if (approve) {
      const projSnap = await getDoc(doc(db, 'users', req.toUid, 'projects', req.projectId));
      const curr = projSnap.exists() ? (projSnap.data().approvedFollowers || []) : [];
      if (!curr.includes(req.fromUid)) {
        await setDoc(doc(db, 'users', req.toUid, 'projects', req.projectId),
          { approvedFollowers: [...curr, req.fromUid] }, { merge: true });
      }
      await setDoc(doc(db, 'users', req.fromUid, 'following', req.projectId), {
        ownerUid: req.toUid, projectId: req.projectId,
        projectName: req.projectName, approvedAt: Date.now(),
      });
    }
  } catch (e) {
    console.error('respondToFollowRequest:', e);
  }
}

/** Retourne la liste des projets suivis par un utilisateur. */
export async function getFollowedProjects(uid) {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'following'));
    return snap.docs.map(d => d.data());
  } catch (e) {
    console.error('getFollowedProjects:', e);
    return [];
  }
}

/** Charge les données d'un projet dont on est follower (pas owner). */
export async function loadFollowedProjectData(ownerUid, projectId) {
  try {
    const d = await getDoc(doc(db, 'users', ownerUid, 'projectData', projectId));
    return d.exists() ? d.data() : { entries: {}, nextId: 1 };
  } catch (e) {
    console.error('loadFollowedProjectData:', e);
    return { entries: {}, nextId: 1 };
  }
}

// ── Commentaires ──────────────────────────────────────────────────────────

/**
 * Abonnement temps réel aux commentaires d'une fiche.
 * Retourne la fonction de désabonnement.
 */
export function subscribeToComments(ownerUid, projectId, entryId, callback) {
  const entryKey = `${ownerUid}_${projectId}_${String(entryId)}`;
  const q = query(collection(db, 'comments'), where('entryKey', '==', entryKey));
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => a.createdAt - b.createdAt);
    callback(docs);
  }, err => { console.error('subscribeToComments:', err); callback([]); });
}

/** Ajoute un commentaire sur une fiche. */
export async function addComment(ownerUid, projectId, entryId, authorUid, authorName, text) {
  const entryKey = `${ownerUid}_${projectId}_${String(entryId)}`;
  try {
    await setDoc(doc(db, 'comments', `${entryKey}_${Date.now()}`), {
      entryKey, ownerUid, projectId, entryId: String(entryId),
      authorUid, authorName, text: text.trim(), createdAt: Date.now(),
    });
  } catch (e) { console.error('addComment:', e); }
}

/** Supprime un commentaire. */
export async function deleteComment(commentId) {
  try {
    await deleteDoc(doc(db, 'comments', commentId));
  } catch (e) { console.error('deleteComment:', e); }
}

/** Sauvegarde les données (fiches) d'un projet. Retourne true si succès, false sinon. */
export async function saveProjectData(projectId, data) {
  const uid = getUserId();
  if (!uid) return false;
  try {
    await setDoc(doc(db, 'users', uid, 'projectData', projectId), data);
    return true;
  } catch (e) {
    console.error('saveProjectData:', e);
    return false;
  }
}
