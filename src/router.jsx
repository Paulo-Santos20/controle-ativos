import { createBrowserRouter, Navigate } from "react-router-dom";

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
import SuppliersPage from "./pages/Cadastros/SuppliersPage";
import OptionsPage from "./pages/Cadastros/OptionsPage";

// Página de Atividades
import ActivityLogPage from "./pages/ActivityLog/ActivityLogPage";

// --- AQUI ESTAVA O PROBLEMA: Importação Explícita ---
import ProfileListPage from "./pages/Users/ProfileListPage";

// Página Pública
import AssetScanPage from "./pages/Public/AssetScanPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  
  // --- ROTA DE SCAN (FORA DO LAYOUT PRINCIPAL) ---
  {
    path: "/scan/:assetId",
    element: (
      <ProtectedRoute>
        <AssetScanPage />
      </ProtectedRoute>
    ),
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
      { path: "cadastros/empresas", element: <SuppliersPage /> },
      { path: "cadastros/opcoes", element: <OptionsPage /> },
      
      // Rotas de Usuários
      { path: "usuarios/lista", element: <UserList /> },
      { path: "usuarios/perfis", element: <ProfileListPage /> },
      
      // Redirecionamento legado
      { path: "users", element: <Navigate to="/usuarios/lista" replace /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);