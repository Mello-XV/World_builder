/**
 * App — composant racine de l'application.
 *
 * Gère la navigation de haut niveau :
 * 1. AuthGate   : vérifie si l'utilisateur est connecté
 * 2. ProjectsScreen : liste des projets (si pas de projet ouvert)
 * 3. WikiScreen : wiki du projet ouvert
 *
 * Charge aussi la liste des projets au démarrage.
 */

import { useState, useEffect } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { WikiScreen } from './screens/WikiScreen';
import { loadProjects, loadProjectData } from './lib/firestore';
import { T } from './styles/theme';

function AppContent() {
  const [projects, setProjects] = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  // Projet et données actuellement ouverts
  const [currentProject, setCurrentProject] = useState(null);
  const [currentData, setCurrentData] = useState(null);

  // Chargement initial de la liste des projets
  useEffect(() => {
    loadProjects().then(p => {
      setProjects(p);
      setProjectsLoaded(true);
    });
  }, []);

  // Ouvrir un projet : charge ses données si besoin
  const handleProjectOpen = async (project, preloadedData) => {
    setCurrentProject(project);
    if (preloadedData) {
      setCurrentData(preloadedData);
    } else {
      const data = await loadProjectData(project.id);
      setCurrentData(data);
    }
  };

  // Retourner à la liste des projets
  const handleGoProjects = () => {
    setCurrentProject(null);
    setCurrentData(null);
    // Recharge la liste au cas où elle aurait changé
    loadProjects().then(setProjects);
  };

  // Mise à jour du nom du projet dans la liste
  const handleProjectUpdate = updatedProject => {
    setProjects(prev => prev.map(p => (p.id === updatedProject.id ? updatedProject : p)));
  };

  // Écran de chargement initial
  if (!projectsLoaded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: T.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', color: T.tx, fontFamily: "'Cormorant Garamond',serif" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌍</div>
          <div style={{ fontSize: 14, color: T.mu }}>Chargement…</div>
        </div>
      </div>
    );
  }

  // Wiki ouvert
  if (currentProject && currentData) {
    return (
      <WikiScreen
        project={currentProject}
        data={currentData}
        onGoProjects={handleGoProjects}
        onProjectUpdate={handleProjectUpdate}
      />
    );
  }

  // Liste des projets
  return (
    <ProjectsScreen
      projects={projects}
      onProjectOpen={handleProjectOpen}
      onProjectsChange={setProjects}
    />
  );
}

export function App() {
  return (
    <AuthGate>
      <AppContent />
    </AuthGate>
  );
}
