/**
 * App — composant racine de l'application.
 *
 * Gère la navigation de haut niveau :
 * 1. AuthGate       : vérifie si l'utilisateur est connecté
 * 2. ProjectsScreen : liste des projets (si pas de projet ouvert)
 * 3. WikiScreen     : wiki du projet ouvert (propre ou suivi en lecture seule)
 * 4. ProfileScreen  : overlay profil (accessible depuis partout)
 *
 * Charge aussi la liste des projets, projets suivis et le profil utilisateur au démarrage.
 */

import { useState, useEffect } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { WikiScreen } from './screens/WikiScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AdminPanel } from './components/admin/AdminPanel';
import {
  loadProjects, loadProjectData, getUserProfile, createUserProfile,
  getFollowedProjects, loadFollowedProjectData,
} from './lib/firestore';
import { auth, ADMIN_EMAIL } from './lib/firebase';
import { T, sBs } from './styles/theme';

function AppContent() {
  const [projects, setProjects] = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [followedProjects, setFollowedProjects] = useState([]); // projets suivis chez d'autres users
  const [showAdmin, setShowAdmin] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;
  const currentUser = auth.currentUser;

  // Projet et données actuellement ouverts
  const [currentProject, setCurrentProject] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [projectOwnerUid, setProjectOwnerUid] = useState(null); // uid du propriétaire du projet ouvert
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Chargement initial : projets + projets suivis + profil
  useEffect(() => {
    loadProjects().then(p => { setProjects(p); setProjectsLoaded(true); });

    if (currentUser) {
      getFollowedProjects(currentUser.uid).then(setFollowedProjects);

      getUserProfile(currentUser.uid).then(async profile => {
        if (profile) {
          setUserProfile(profile);
        } else {
          const displayName = await createUserProfile(currentUser.uid);
          setUserProfile({ displayName });
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ouvrir un projet dont on est propriétaire ─────────────────────────

  const handleProjectOpen = async (project, preloadedData) => {
    setIsReadOnly(false);
    setProjectOwnerUid(currentUser?.uid || null);
    setCurrentProject(project);
    if (preloadedData) {
      setCurrentData(preloadedData);
    } else {
      const data = await loadProjectData(project.id);
      setCurrentData(data);
    }
    setProfileOpen(false);
  };

  // ── Ouvrir un projet suivi (lecture seule) ────────────────────────────

  const handleFollowedProjectOpen = async (ownerUid, projectId, projectName) => {
    setIsReadOnly(true);
    setProjectOwnerUid(ownerUid);
    setCurrentProject({ id: projectId, name: projectName });
    const data = await loadFollowedProjectData(ownerUid, projectId);
    setCurrentData(data);
    setProfileOpen(false);
  };

  const handleGoProjects = () => {
    setCurrentProject(null);
    setCurrentData(null);
    setIsReadOnly(false);
    setProjectOwnerUid(null);
    loadProjects().then(setProjects);
    getFollowedProjects(currentUser?.uid).then(setFollowedProjects);
  };

  const handleProjectUpdate = updatedProject => {
    setProjects(prev => prev.map(p => (p.id === updatedProject.id ? updatedProject : p)));
  };

  // Écran de chargement initial
  if (!projectsLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: T.tx, fontFamily: "'Cormorant Garamond',serif" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌍</div>
          <div style={{ fontSize: 14, color: T.mu }}>Chargement…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Overlay profil (accessible depuis tous les écrans) */}
      {profileOpen && currentUser && (
        <ProfileScreen
          user={currentUser}
          userProfile={userProfile}
          onClose={() => setProfileOpen(false)}
          onProfileUpdate={setUserProfile}
          projects={projects}
          followedProjects={followedProjects}
          onProjectOpen={handleProjectOpen}
          onFollowedProjectOpen={handleFollowedProjectOpen}
        />
      )}

      {/* Wiki ouvert */}
      {currentProject && currentData ? (
        <WikiScreen
          project={currentProject}
          data={currentData}
          onGoProjects={handleGoProjects}
          onProjectUpdate={handleProjectUpdate}
          onProfile={() => setProfileOpen(true)}
          userProfile={userProfile}
          ownerUid={projectOwnerUid}
          isReadOnly={isReadOnly}
        />
      ) : (
        <>
          <ProjectsScreen
            projects={projects}
            followedProjects={followedProjects}
            onProjectOpen={handleProjectOpen}
            onFollowedProjectOpen={handleFollowedProjectOpen}
            onProjectsChange={setProjects}
            onProfile={() => setProfileOpen(true)}
            userProfile={userProfile}
            currentUser={currentUser}
          />
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              style={{ ...sBs, position: 'fixed', bottom: 20, right: 20, background: T.bgC, color: T.ac, borderColor: T.ac + '44', zIndex: 900 }}
            >
              ⚙ Admin
            </button>
          )}
          {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
        </>
      )}
    </>
  );
}

export function App() {
  return (
    <AuthGate>
      <AppContent />
    </AuthGate>
  );
}
