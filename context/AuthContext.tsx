import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User } from '../types';
import { useAuthStore } from '../store/useAuthStore';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { useMe } from '../services/queries';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { role, logout: zustandLogout, isLoggedIn, token } = useAuthStore();
  const { data: meData, isLoading: isMeLoading, isError: isMeError } = useMe();
  
  // If the token exists but the 'me' call fails (e.g. 401), we should consider them not logged in
  // The apiClient already triggers zustandLogout() on 401, so isLoggedIn will become false.
  
  const currentUser: User | null = (isLoggedIn && !isMeError) ? {
    username: meData?.full_name || 'Authenticated User',
    role: (meData?.role?.toLowerCase() || role?.toLowerCase() || 'viewer') as any
  } : null;

  const login = async (username: string, pass: string): Promise<User | null> => {
    throw new Error('Use useLogin mutation instead');
  };

  const logout = () => {
    zustandLogout();
    window.location.hash = '#/login';
  };

  const isLoading = isLoggedIn ? isMeLoading : false;

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
