import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const queryClient = new QueryClient();

function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b bg-white dark:bg-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🐊 Gatorpedia</h1>
      </header>
      <main className="p-8">
        <p className="text-gray-500 dark:text-gray-400">Registry backend is live. Full UI coming in Cycle B.</p>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
