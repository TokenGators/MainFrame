import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NavBar } from './components/layout/NavBar';
import { BrowsePage } from './pages/BrowsePage';
import { NFTPage } from './pages/NFTPage';
import { NFTDetailPage } from './pages/NFTDetailPage';
import { ReviewPage } from './pages/ReviewPage';
import { HoldersPage } from './pages/HoldersPage';
import { CollectorPage } from './pages/CollectorPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* bg-background = #28272a from CSS vars */}
        <div className="min-h-screen bg-background text-[#E0E0E0]">
          <NavBar />
          {/* pt-[45px] clears the fixed navbar */}
          <div className="pt-[45px]">
            <Routes>
              <Route path="/"        element={<BrowsePage />} />
              <Route path="/nfts"    element={<NFTPage />} />
              <Route path="/nfts/:token_id" element={<NFTDetailPage />} />
              <Route path="/holders" element={<HoldersPage />} />
              <Route path="/collectors/:wallet" element={<CollectorPage />} />
              <Route path="/review"  element={<ReviewPage />} />
              <Route path="*"        element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
