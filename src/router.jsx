import { createBrowserRouter } from "react-router-dom";

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

// --- NOSSAS PÁGINAS DE CADASTRO ---
// Importa a página de Unidades
import UnidadesPage from "./pages/Cadastros/UnidadesPage";
// Importa o componente reutilizável para Computadores/Impressoras
import AssetModelPage from "./pages/Cadastros/AssetModelPage"; 

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
      { path: "reports", element: <Reports /> },
      { path: "users", element: <UserList /> },
      { path: "profile", element: <UserProfile /> },
      
      // --- ROTAS DE CADASTROS (AQUI ESTÁ A CORREÇÃO) ---
      
      // A rota para a página de Unidades
      { 
        path: "cadastros/unidades", 
        element: <UnidadesPage /> 
      },
      
      // A rota para a página de Computadores
      // (Usa o AssetModelPage com a prop type="computador")
      { 
        path: "cadastros/computadores", 
        element: <AssetModelPage 
                    type="computador" 
                    title="Computadores" 
                 /> 
      },
      
      // A rota para a página de Impressoras
      // (Usa o *mesmo* AssetModelPage com a prop type="impressora")
      { 
        path: "cadastros/impressoras", 
        element: <AssetModelPage 
                    type="impressora" 
                    title="Impressoras" 
                 /> 
      },
    ],
  },
  // A rota 404 (pega-tudo)
  { path: "*", element: <NotFound /> },
]);