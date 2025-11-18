import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Importa o Contexto de Tema
import { ThemeProvider } from './context/ThemeContext';

import { router } from './router.jsx'; 
import './index.css';

// Configuração do Cliente React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Dados frescos por 5 minutos
      refetchOnWindowFocus: false, // Não recarrega ao focar a janela
      retry: 1, // Tenta novamente apenas 1 vez em caso de erro
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 1. Cache de Dados */}
    <QueryClientProvider client={queryClient}>
      {/* 2. Tema (Dark/Light) */}
      <ThemeProvider>
        {/* 3. Roteamento */}
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);