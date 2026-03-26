import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { GamePage } from './pages/GamePage'
import { DealsPage } from './pages/DealsPage'
import { BrowsePage } from './pages/BrowsePage'
import { SearchPage } from './pages/SearchPage'
import { WishlistPage } from './pages/WishlistPage'
import { AlertsPage } from './pages/AlertsPage'
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#0a0c14' }}>
          <Navbar />
          <main style={{ width: '100%' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/game/:appid" element={<GamePage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
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
              background: '#1e2235',
              color: '#e2e8f0',
              border: '1px solid #2a2d3e',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

