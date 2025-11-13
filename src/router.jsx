import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import ProtectedRoute from "./components/ProtectedRoute";

// ... (seus imports existentes de Login, Dashboard, etc) ...
import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import InventoryList from "./pages/Inventory/InventoryList";
import AssetDetail from "./pages/Inventory/AssetDetail";
import Reports from "./pages/Reports/Reports";
import UserList from "./pages/Users/UserList";
import UserProfile from "./pages/Users/UserProfile";
import NotFound from "./pages/NotFound/NotFound";
import UnidadesPage from "./pages/Cadastros/UnidadesPage";
import AssetModelPage from "./pages/Cadastros/AssetModelPage"; 
import ActivityLogPage from "./pages/ActivityLog/ActivityLogPage";
import ProfileListPage from "./pages/Users/ProfileListPage";
import OptionsPage from "./pages/Cadastros/OptionsPage";
import SuppliersPage from "./pages/Cadastros/SuppliersPage";

// --- NOVO IMPORT ---
import AssetScanPage from "./pages/Public/AssetScanPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  
  // --- ROTA DE SCAN (FORA DO LAYOUT PRINCIPAL) ---
  // Mantemos o ProtectedRoute para segurança, mas sem Sidebar
  {
    path: "/scan/:assetId",
    element: (
      <ProtectedRoute>
        <AssetScanPage />
      </ProtectedRoute>
    ),
  },
  // ----------------------------------------------

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    errorElement: <NotFound />, 
    children: [
      // ... (todas as suas rotas existentes, sem alteração) ...
      { index: true, element: <Dashboard /> },
      { path: "inventory", element: <InventoryList /> },
      { path: "inventory/:assetId", element: <AssetDetail /> },
      { path: "atividades", element: <ActivityLogPage /> },
      { path: "reports", element: <Reports /> },
      { path: "profile", element: <UserProfile /> },
      { path: "cadastros/unidades", element: <UnidadesPage /> },
      { path: "cadastros/computadores", element: <AssetModelPage type="computador" title="Computadores" /> },
      { path: "cadastros/impressoras", element: <AssetModelPage type="impressora" title="Impressoras" /> },
      { path: "cadastros/empresas", element: <SuppliersPage /> },
      { path: "cadastros/opcoes", element: <OptionsPage /> },
      { path: "usuarios/lista", element: <UserList /> },
      { path: "usuarios/perfis", element: <ProfileListPage /> },
      { path: "users", element: <Navigate to="/usuarios/lista" replace /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);