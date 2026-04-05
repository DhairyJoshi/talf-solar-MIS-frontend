
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  onOpenProjectModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenAssignmentModal: () => void;
}

const Layout: React.FC<Props> = ({ children, onOpenProjectModal, onOpenSettingsModal, onOpenAssignmentModal }) => {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-solar-bg font-sans text-solar-text">
      {/* Navbar */}
      <nav className="h-16 border-b border-solar-border bg-solar-card/80 backdrop-blur fixed w-full top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 to-orange-600 rounded-full"></div>
            <span className="text-xl font-bold text-white tracking-wide">Talf Solar <span className="font-light text-solar-accent">MIS</span></span>
          </Link>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <>
                <button 
                  onClick={onOpenProjectModal}
                  className="text-sm bg-solar-border hover:bg-gray-600 text-white px-3 py-1.5 rounded transition"
                >
                  + New Project
                </button>
                <button 
                  onClick={onOpenAssignmentModal}
                  className="text-xs border border-solar-accent text-solar-accent hover:bg-solar-accent hover:text-solar-bg px-2 py-1 rounded transition font-medium"
                >
                  Backend Assignment
                </button>
                <button onClick={onOpenSettingsModal} className="text-gray-400 hover:text-white" title="API Settings">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </>
            )}
             <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-white">{currentUser?.username}</p>
                <p className="text-xs text-gray-400 capitalize">{currentUser?.role}</p>
              </div>
              <button onClick={logout} className="text-gray-400 hover:text-red-400" title="Logout">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 mt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-solar-border text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Talf Solar India. All rights reserved.
      </footer>
    </div>
  );
};

export default Layout;
