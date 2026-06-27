/**
 * App.tsx — Auth gate routing.
 *
 * Flow:
 *   - No session → /login
 *   - Session but not allowed → error
 *   - Session + allowed but PIN locked → /pin
 *   - Everything OK → Layout (bottom nav + page)
 */
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { PinProvider, usePin } from '@/hooks/usePin';
import { ToastProvider, useToast, setToastFn } from '@/components/ui/toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Pages (eagerly loaded — small)
import LoginPage from '@/pages/LoginPage';
import PinPage from '@/pages/PinPage';
import HomePage from '@/pages/HomePage';
import TasksPage from '@/pages/TasksPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Module pages (lazy loaded via React.lazy)
import {
  FinancePage,
  CaloriesPage,
  InventoryPage,
  ShoppingPage,
  IncidentsPage,
  CalendarPage,
  BodyPage,
  SmokingPage,
  GoalsPage,
} from '@/pages/ModulePages';

// Layout
import ModuleShell from '@/components/Layout/ModuleShell';

/** Loading fallback for lazy-loaded modules. */
function ModuleLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

/** Connects toast context to global toast() function. */
function ToastBridge() {
  const { addToast } = useToast();
  useEffect(() => {
    setToastFn(addToast);
  }, [addToast]);
  return null;
}

/** Wraps lazy modules with Suspense + ErrorBoundary. */
function LazyModule({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<ModuleLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/** Auth gate: redirects based on auth + PIN state. */
function AuthGate() {
  const { session, isLoading, isAllowed, userInfo } = useAuth();
  const { isUnlocked } = usePin();
  const location = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!session) {
    if (location.pathname !== '/login') {
      return <Navigate to="/login" replace />;
    }
    return <LoginPage />;
  }

  // Logged in but whitelist check still loading
  if (!isAllowed && !userInfo) {
    return (
      <div className="flex min-h-screen-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Logged in but not in whitelist (userInfo was fetched, came back null)
  if (!isAllowed) {
    return (
      <div className="flex min-h-screen-dvh items-center justify-center p-6 text-center">
        <p className="text-sm text-destructive">
          {t('auth.loginErrorWhitelist')}
        </p>
      </div>
    );
  }

  // Logged in + allowed but PIN not unlocked
  if (!isUnlocked) {
    return <PinPage />;
  }

  // If on /login while authenticated, redirect to home
  if (location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  // Fully authenticated — show app
  return (
    <Routes>
      <Route element={<ModuleShell />}>
        <Route index element={<HomePage />} />
        <Route path="tasks" element={<Navigate to="/tasks/me" replace />} />
        <Route path="tasks/:tab" element={<TasksPage />} />
        <Route path="finance" element={<LazyModule><FinancePage /></LazyModule>} />
        <Route path="calories" element={<LazyModule><CaloriesPage /></LazyModule>} />
        <Route path="inventory" element={<LazyModule><InventoryPage /></LazyModule>} />
        <Route path="shopping" element={<LazyModule><ShoppingPage /></LazyModule>} />
        <Route path="incidents" element={<LazyModule><IncidentsPage /></LazyModule>} />
        <Route path="calendar" element={<LazyModule><CalendarPage /></LazyModule>} />
        <Route path="body" element={<LazyModule><BodyPage /></LazyModule>} />
        <Route path="smoking" element={<LazyModule><SmokingPage /></LazyModule>} />
        <Route path="goals" element={<LazyModule><GoalsPage /></LazyModule>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PinProvider>
        <ToastProvider>
          <ToastBridge />
          <Routes>
            <Route path="/*" element={<AuthGate />} />
          </Routes>
        </ToastProvider>
      </PinProvider>
    </AuthProvider>
  );
}
