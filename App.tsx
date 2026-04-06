
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Project } from './types';
import { useProjects, useCreateProject } from './services/queries';
import { apiClient } from './services/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import InverterDetailsPage from './pages/InverterDetailsPage';
import Layout from './components/Layout';
import ProjectManagementModal from './components/ProjectManagementModal';
import SolisSettingsModal from './components/SolisSettingsModal';
import ModuleBuildsModal from './components/ModuleBuildsModal';
import BackendAssignmentModal from './components/BackendAssignmentModal';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const App: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects();
  const queryClient = useQueryClient();
  
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isModuleBuildsModalOpen, setModuleBuildsModalOpen] = useState(false);
  const [isAssignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleOpenNewProjectModal = () => {
    setEditingProject(null);
    setProjectModalOpen(true);
  };

  const handleCloseProjectModal = () => {
    setEditingProject(null);
    setProjectModalOpen(false);
  };

  const createProjectMutation = useCreateProject();

  const handleSaveProject = async (projectToSave: Project) => {
      try {
        const newProject: any = await createProjectMutation.mutateAsync({
          name: projectToSave.projectName,
          location: projectToSave.projectState,
          capacity_kw: projectToSave.capacity_kw
        });

        queryClient.invalidateQueries({ queryKey: ['projects'] });
        handleCloseProjectModal();
      } catch (err: any) {
        alert(`Failed to save project: ${err.message}`);
      }
  };

  if (isAuthLoading || (currentUser && isProjectsLoading)) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold">Talf Solar MIS</h2>
        <p className="text-gray-400 text-sm mt-2">{isAuthLoading ? 'Authenticating...' : 'Loading assets...'}</p>
      </div>
    );
  }

  return (
    <HashRouter>
      {!currentUser ? (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      ) : (
        <>
          <Layout 
            onOpenProjectModal={handleOpenNewProjectModal} 
            onOpenSettingsModal={() => setSettingsModalOpen(true)}
            onOpenAssignmentModal={() => setAssignmentModalOpen(true)}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/project/:projectCode" element={<ProjectDetailsPage />} />
              <Route path="/project/:projectCode/inverter/:inverterId" element={<InverterDetailsPage />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Layout>
          
          <ProjectManagementModal 
            isOpen={isProjectModalOpen} 
            onClose={handleCloseProjectModal}
            onSave={handleSaveProject}
            initialProject={editingProject}
          />
          <SolisSettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            onOpenModuleBuildsModal={() => {
              setSettingsModalOpen(false);
              setModuleBuildsModalOpen(true);
            }}
          />
          <ModuleBuildsModal
            isOpen={isModuleBuildsModalOpen}
            onClose={() => setModuleBuildsModalOpen(false)}
          />
          <BackendAssignmentModal
            isOpen={isAssignmentModalOpen}
            onClose={() => setAssignmentModalOpen(false)}
          />
        </>
      )}
    </HashRouter>
  );
};

export default App;
