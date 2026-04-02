import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import FahrschuelerPage from '@/pages/FahrschuelerPage';
import FahrzeugePage from '@/pages/FahrzeugePage';
import PruefungenPage from '@/pages/PruefungenPage';
import FahrlehrerPage from '@/pages/FahrlehrerPage';
import FahrstundenPage from '@/pages/FahrstundenPage';

const SchuelerOnboardingPage = lazy(() => import('@/pages/intents/SchuelerOnboardingPage'));
const PruefungsabschlussPage = lazy(() => import('@/pages/intents/PruefungsabschlussPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="fahrschueler" element={<FahrschuelerPage />} />
              <Route path="fahrzeuge" element={<FahrzeugePage />} />
              <Route path="pruefungen" element={<PruefungenPage />} />
              <Route path="fahrlehrer" element={<FahrlehrerPage />} />
              <Route path="fahrstunden" element={<FahrstundenPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="intents/schueler-onboarding" element={<Suspense fallback={null}><SchuelerOnboardingPage /></Suspense>} />
              <Route path="intents/pruefungsabschluss" element={<Suspense fallback={null}><PruefungsabschlussPage /></Suspense>} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
