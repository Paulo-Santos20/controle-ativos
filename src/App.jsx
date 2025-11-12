import React from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from './components/Layout/Layout'

// Este componente App.jsx agora foca em 'providers'
// e passa a responsabilidade do layout visual para o <Layout>

function App() {
  // Lógica de autenticação (como useAuth) virá aqui
  // Se não estiver logado, você pode redirecionar para /login

  return (
    <>
      <Toaster position="top-right" richColors />
      <Layout>
        {/* O <Outlet> renderiza a página da rota atual (Dashboard, Inventory, etc.) */}
        <Outlet />
      </Layout>
    </>
  )
}

export default App