import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { getToken, parseToken, removeToken } from './lib/auth.js';
import Layout from './components/Layout.js';
import LoginPage from './pages/LoginPage.js';
import DashboardPage from './pages/DashboardPage.js';
import DownloadsPage from './pages/DownloadsPage.js';
import TranscriptsPage from './pages/TranscriptsPage.js';
import SearchPage from './pages/SearchPage.js';
import SettingsPage from './pages/SettingsPage.js';
import UsersPage from './pages/UsersPage.js';

// ── Auth context ────────────────────────────────────────────────────────────

interface AuthState {
  id: number;
  username: string;
  is_admin: boolean;
}

const AuthContext = createContext<{
  user: AuthState | null;
  setUser: (u: AuthState | null) => void;
  logout: () => void;
}>({ user: null, setUser: () => {}, logout: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

// ── Dark mode context ────────────────────────────────────────────────────────

const DarkModeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} });

export function useDarkMode() {
  return useContext(DarkModeContext);
}

// ── Protected route ──────────────────────────────────────────────────────────

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<AuthState | null>(() => {
    const token = getToken();
    if (!token) return null;
    return parseToken(token);
  });

  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  function logout() {
    removeToken();
    setUser(null);
  }

  return (
    <DarkModeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      <AuthContext.Provider value={{ user, setUser, logout }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
            <Route
              path="/"
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="downloads" element={<DownloadsPage />} />
              <Route path="transcripts" element={<TranscriptsPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </DarkModeContext.Provider>
  );
}
