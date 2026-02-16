import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import GrowsPage from './pages/GrowsPage.jsx'
import GrowDetailPage from './pages/GrowDetailPage.jsx'
import NewGrowPage from './pages/NewGrowPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import SpeciesPage from './pages/SpeciesPage.jsx'
import AuthGate from './components/layout/AuthGate.jsx'

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/grows" replace />} />
          <Route path="/grows" element={<GrowsPage />} />
          <Route path="/grows/:id" element={<GrowDetailPage />} />
          <Route path="/new-grow" element={<NewGrowPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/species" element={<SpeciesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthGate>
  )
}
