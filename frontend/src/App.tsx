import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Navbar } from './components/Navbar'
import { SiteFooter } from './components/SiteFooter'

const HomePage = lazy(async () => ({ default: (await import('./pages/HomePage')).HomePage }))
const GamePage = lazy(async () => ({ default: (await import('./pages/GamePage')).GamePage }))
const BrowsePage = lazy(async () => ({ default: (await import('./pages/BrowsePage')).BrowsePage }))
const ComparePage = lazy(async () => ({ default: (await import('./pages/ComparePage')).ComparePage }))
const FreeGamesPage = lazy(async () => ({ default: (await import('./pages/FreeGamesPage')).FreeGamesPage }))
const SearchPage = lazy(async () => ({ default: (await import('./pages/SearchPage')).SearchPage }))
const WishlistPage = lazy(async () => ({ default: (await import('./pages/WishlistPage')).WishlistPage }))
const AlertsPage = lazy(async () => ({ default: (await import('./pages/AlertsPage')).AlertsPage }))
const CollectionsPage = lazy(async () => ({ default: (await import('./pages/CollectionsPage')).CollectionsPage }))
const CollectionDetailPage = lazy(async () => ({ default: (await import('./pages/CollectionDetailPage')).CollectionDetailPage }))
const StatsPage = lazy(async () => ({ default: (await import('./pages/StatsPage')).StatsPage }))
const LoginPage = lazy(async () => ({ default: (await import('./pages/LoginPage')).LoginPage }))
const RegisterPage = lazy(async () => ({ default: (await import('./pages/RegisterPage')).RegisterPage }))
const ProfilePage = lazy(async () => ({ default: (await import('./pages/ProfilePage')).ProfilePage }))
const PrivacyPage = lazy(async () => ({ default: (await import('./pages/PrivacyPage')).PrivacyPage }))
const AffiliateDisclosurePage = lazy(async () => ({ default: (await import('./pages/AffiliateDisclosurePage')).AffiliateDisclosurePage }))

function RouteFallback() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <div className="skeleton" style={{ height: '72px', borderRadius: '12px', marginBottom: '16px' }} />
      <div className="skeleton" style={{ height: '260px', borderRadius: '16px' }} />
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div style={{ minHeight: '100vh', width: '100%' }}>
            <Navbar />
            <main style={{ width: '100%' }}>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/browse" element={<BrowsePage />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/free" element={<FreeGamesPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/game/:appid" element={<GamePage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route path="/collections/:id" element={<CollectionDetailPage />} />
                  <Route path="/stats" element={<StatsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/affiliate-disclosure" element={<AffiliateDisclosurePage />} />
                </Routes>
              </Suspense>
            </main>
          </div>
          <SiteFooter />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App

