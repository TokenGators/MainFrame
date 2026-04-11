import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NavBar } from './components/layout/NavBar';
import { BrowsePage } from './pages/BrowsePage';
import { NFTPage } from './pages/NFTPage';
import { ReviewPage } from './pages/ReviewPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <NavBar />
          <Routes>
            <Route path="/" element={<BrowsePage />} />
            <Route path="/nfts" element={<NFTPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
