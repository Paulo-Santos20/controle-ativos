import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router.jsx'; 
// --- IMPORTA O PROVIDER ---
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

const queryClient = new QueryClient({ /* ... configs ... */ });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Envolve o Router com o ThemeProvider */}
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);