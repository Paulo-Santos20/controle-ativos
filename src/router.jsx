import { createBrowserRouter, Navigate } from "react-router-dom"; // <-- CORREÇÃO AQUI

// Layouts e Protetores
import App from "./App";
import ProtectedRoute from "./components/ProtectedRoute";

// Páginas Principais
import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import InventoryList from "./pages/Inventory/InventoryList";
import AssetDetail from "./pages/Inventory/AssetDetail";
import Reports from "./pages/Reports/Reports";
import UserList from "./pages/Users/UserList";
import UserProfile from "./pages/Users/UserProfile";
import NotFound from "./pages/NotFound/NotFound";

// Páginas de Cadastro
import UnidadesPage from "./pages/Cadastros/UnidadesPage";
import AssetModelPage from "./pages/Cadastros/AssetModelPage"; 

// Página de Atividades
import ActivityLogPage from "./pages/ActivityLog/ActivityLogPage";

// Página de Gerenciamento de Perfis
import ProfileListPage from "./pages/Users/ProfileListPage";

import SuppliersPage from "./pages/Cadastros/SuppliersPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    errorElement: <NotFound />, 
    children: [
      { index: true, element: <Dashboard /> },
      { path: "inventory", element: <InventoryList /> },
      { path: "inventory/:assetId", element: <AssetDetail /> },
      { path: "atividades", element: <ActivityLogPage /> },
      { path: "reports", element: <Reports /> },
      { path: "profile", element: <UserProfile /> },
      
      // Rotas de Cadastros
      { path: "cadastros/unidades", element: <UnidadesPage /> },
      { 
        path: "cadastros/computadores", 
        element: <AssetModelPage type="computador" title="Computadores" /> 
      },
      { 
        path: "cadastros/impressoras", 
        element: <AssetModelPage type="impressora" title="Impressoras" /> 
      },
      
      { 
        path: "cadastros/empresas",  // <-- Nova Rota
        element: <SuppliersPage /> 
      },
      // --- ROTAS DE USUÁRIOS ATUALIZADAS ---
      { 
        path: "usuarios/lista", // Rota principal
        element: <UserList /> 
      },
      { 
        path: "usuarios/perfis", // Nova rota para Gerenciar Perfis
        element: <ProfileListPage /> 
      },
      
      // Redirecionamento (opcional): Se alguém for para /users, manda para a lista
      // Esta era a linha 70 que estava causando o erro
      { path: "users", element: <Navigate to="/usuarios/lista" replace /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);