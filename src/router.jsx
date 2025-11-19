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

// --- CORREÇÃO: Importação da Página de Importação ---
import BulkImportPage from "./pages/Inventory/BulkImportPage";

// Página de Monitoramento
import MonitoringPage from "./pages/Monitoring/MonitoringPage";

// Páginas de Usuário e Públicas
import ProfileListPage from "./pages/Users/ProfileListPage";
import AssetScanPage from "./pages/Public/AssetScanPage";
import ForceChangePasswordPage from "./pages/Auth/ForceChangePasswordPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  
  // Rota Pública (Scan QR Code)
  {
    path: "/scan/:assetId",
    element: <AssetScanPage />, 
  },

  // Rota de Troca de Senha Obrigatória
  {
    path: "/force-password",
    element: (
      <ProtectedRoute>
        <ForceChangePasswordPage />
      </ProtectedRoute>
    ),
  },

  // Área Logada (Layout Principal)
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
      
      // --- INVENTÁRIO ---
      { path: "inventory", element: <InventoryList /> },
      
      // Rota específica ANTES da dinâmica (:assetId)
      { path: "inventory/importar", element: <BulkImportPage /> }, 
      
      { path: "inventory/:assetId", element: <AssetDetail /> },
      // -------------------
      
      // Relatórios e Atividades
      { path: "atividades", element: <ActivityLogPage /> },
      { path: "reports", element: <Reports /> },
      { path: "profile", element: <UserProfile /> },
      { path: "monitoramento", element: <MonitoringPage /> },

      // Cadastros
      { path: "cadastros/unidades", element: <UnidadesPage /> },
      { path: "cadastros/computadores", element: <AssetModelPage type="computador" title="Computadores" /> },
      { path: "cadastros/impressoras", element: <AssetModelPage type="impressora" title="Impressoras" /> },
      { path: "cadastros/empresas", element: <SuppliersPage /> },
      { path: "cadastros/opcoes", element: <OptionsPage /> },
      
      // Gestão de Usuários
      { path: "usuarios/lista", element: <UserList /> },
      { path: "usuarios/perfis", element: <ProfileListPage /> },
      
      // Compatibilidade com rotas antigas
      { path: "users", element: <Navigate to="/usuarios/lista" replace /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);