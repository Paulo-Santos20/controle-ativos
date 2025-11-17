import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
// --- 1. IMPORTAÇÕES DO REACT QUERY ---
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router.jsx'; 
import './index.css';

// --- 2. CRIA O CLIENTE DO QUERY ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Os dados ficam "frescos" por 5 minutos. 
      // Se você voltar para a tela nesse tempo, não faz nova leitura no banco.
      staleTime: 1000 * 60 * 5, 
      refetchOnWindowFocus: false, // Não recarrega só de mudar de janela
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* --- 3. ENVOLVE O APP NO PROVIDER --- */}
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);