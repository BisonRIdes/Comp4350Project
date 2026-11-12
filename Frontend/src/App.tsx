import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import PostRidePage from './pages/PostRidePage'
import MapPage from './pages/MapPage'
import ProfilePage from './pages/ProfilePage'
import VerifyPage from './pages/VerifyPage'
import PaymentPage from './pages/PaymentPage'
import EditRidePage from './pages/EditRidePage'
import RideDetailsPage from './pages/RideDetailsPage'
import NotificationsPage from './pages/NotificationsPage'
import { GuestOnly, RequireAuth } from './components/RouteGuards'
import { UpdatesProvider } from './components/UpdatesProvider'

// Start each new page at the top instead of keeping the previous scroll position.
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <UpdatesProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/post-ride" element={<RequireAuth><PostRidePage /></RequireAuth>} />
          <Route path="/rides/:rideId" element={<RequireAuth><RideDetailsPage /></RequireAuth>} />
          <Route path="/rides/:rideId/edit" element={<RequireAuth><EditRidePage /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
          <Route path="/map" element={<RequireAuth><MapPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/requests/:requestId/pay" element={<RequireAuth><PaymentPage /></RequireAuth>} />
        </Routes>
      </UpdatesProvider>
    </BrowserRouter>
  )
}

export default App
