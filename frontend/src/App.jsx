import React, { useEffect, lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { userAuthStore } from "./store/userAuthStore"
import { userChatStore } from "./store/userChatStore"
import PageLoader from './components/PageLoader';
import { Toaster } from "react-hot-toast";
import DynamicBackground from './components/DynamicBackground';
import PWAInitializer from './components/PWAInitializer';
import KeyRecoveryPrompt from './components/KeyRecoveryPrompt';

const ChatPage = lazy(() => import('./pages/ChatPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const App = () => {
  const { checkAuth, isCheckingAuth, authUser } = userAuthStore();
  const { theme } = userChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Keep data-theme in sync when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (isCheckingAuth) return <PageLoader />;

  return (
    <>
      <DynamicBackground />
      <PWAInitializer />
      <KeyRecoveryPrompt />
      <Suspense fallback={<PageLoader transparent />}>
        <Routes>
          <Route path="/" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />
          <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        </Routes>
      </Suspense>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-glass-panel)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
            borderRadius: '16px',
            fontSize: '0.8125rem',
            fontWeight: '600',
            fontFamily: 'var(--font-body)',
            boxShadow: 'var(--shadow-panel)',
            padding: '12px 18px',
          },
          success: {
            icon: null,
            style: {
              borderLeft: '3px solid var(--online-color)',
            }
          },
          error: {
            icon: null,
            style: {
              borderLeft: '3px solid var(--danger-color)',
            }
          },
        }}
      />
    </>
  );
};

export default App;