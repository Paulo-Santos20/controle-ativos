import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout/Layout';

/**
 * Componente raiz do layout da aplicação.
 * Envolve as rotas filhas (Outlet) com o Layout principal (Sidebar/Header).
 */
function App() {
  return (
    <>
      {/* Provider de Notificações (Toasts) */}
      <Toaster position="top-right" richColors closeButton />

      {/* Estrutura de Layout (Sidebar + Header + Conteúdo) */}
      <Layout>
        {/* Onde as páginas (Dashboard, Inventory, etc.) serão renderizadas */}
        <Outlet />
      </Layout>
    </>
  );
}

export default App;