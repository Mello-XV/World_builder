/**
 * App — composant racine de l'application.
 *
 * Gère la navigation de haut niveau :
 * 1. AuthGate       : vérifie si l'utilisateur est connecté
 * 2. ProjectsScreen : liste des projets (si pas de projet ouvert)
 * 3. WikiScreen     : wiki du projet ouvert
 * 4. ProfileScreen  : overlay profil (accessible depuis partout)
 *
 * Charge aussi la liste des projets et le profil utilisateur au démarrage.
 */

import { useState, useEffect } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { WikiScreen } from './screens/WikiScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AdminPanel } from './components/admin/AdminPanel';
import { loadProjects, loadProjectData, getUserProfile, createUserProfile } from './lib/firestore';
import { auth, ADMIN_EMAIL } from './lib/firebase';
import { T, sBs } from './styles/theme';

function AppContent() {
  const [projects, setProjects] = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;
  const currentUser = auth.currentUser;

  // Projet et données actuellement ouverts
  const [currentProject, setCurrentProject] = useState(null);
  const [currentData, setCurrentData] = useState(null);

  // Chargement initial : projets + profil utilisateur
  useEffect(() => {
    loadProjects().then(p => { setProjects(p); setProjectsLoaded(true); });

    if (currentUser) {
      getUserProfile(currentUser.uid).then(async profile => {
        if (profile) {
          setUserProfile(profile);
        } else {
          // Crée un profil par défaut si inexistant (premier login)
          const displayName = await createUserProfile(currentUser.uid);
          setUserProfile({ displayName });
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProjectOpen = async (project, preloadedData) => {
    setCurrentProject(project);
    if (preloadedData) {
      setCurrentData(preloadedData);
    } else {
      const data = await loadProjectData(project.id);
      setCurrentData(data);
    }
  };

  const handleGoProjects = () => {
    setCurrentProject(null);
    setCurrentData(null);
    loadProjects().then(setProjects);
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
          onProjectOpen={handleProjectOpen}
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
        />
      ) : (
        <>
          <ProjectsScreen
            projects={projects}
            onProjectOpen={handleProjectOpen}
            onProjectsChange={setProjects}
            onProfile={() => setProfileOpen(true)}
            userProfile={userProfile}
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
