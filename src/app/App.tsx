import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import Dashboard from '../features/dashboard/Dashboard'
import InventoryPage from '../features/inventory/InventoryPage'
import LocationsPage from '../features/locations/LocationsPage'
import SettingsPage from '../features/settings/SettingsPage'
import LoginPage from '../features/auth/LoginPage'
import SetPasswordPage from '../features/auth/SetPasswordPage'
import { useAuth } from '../lib/auth'
import { Spinner } from '../components/ui'

export default function App() {
  const { loading, session, needsPassword } = useAuth()
  if (loading) return <Spinner />
  if (session && needsPassword) return <SetPasswordPage />
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="settings" element={session ? <SettingsPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
