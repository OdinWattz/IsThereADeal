import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { GamePage } from './pages/GamePage'
import { BrowsePage } from './pages/BrowsePage'
import { ComparePage } from './pages/ComparePage'
import { FreeGamesPage } from './pages/FreeGamesPage'
import { SearchPage } from './pages/SearchPage'
import { WishlistPage } from './pages/WishlistPage'
import { AlertsPage } from './pages/AlertsPage'
import { CollectionsPage } from './pages/CollectionsPage'
import { CollectionDetailPage } from './pages/CollectionDetailPage'
import { StatsPage } from './pages/StatsPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProfilePage } from './pages/ProfilePage'

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
              </Routes>
            </main>
          </div>
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

