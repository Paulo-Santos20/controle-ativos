import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts e Protetores
import App from "./App";
import ProtectedRoute from "./components/ProtectedRoute";
import Loading from "./components/Loading/Loading";

// Páginas com Lazy Loading
const Login = lazy(() => import("./pages/Auth/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const InventoryList = lazy(() => import("./pages/Inventory/InventoryList"));
const AssetDetail = lazy(() => import("./pages/Inventory/AssetDetail"));
const Reports = lazy(() => import("./pages/Reports/Reports"));
const UserList = lazy(() => import("./pages/Users/UserList"));
const UserProfile = lazy(() => import("./pages/Users/UserProfile"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));

// Páginas de Cadastro
const UnidadesPage = lazy(() => import("./pages/Cadastros/UnidadesPage"));
const AssetModelPage = lazy(() => import("./pages/Cadastros/AssetModelPage"));
const SuppliersPage = lazy(() => import("./pages/Cadastros/SuppliersPage"));
const OptionsPage = lazy(() => import("./pages/Cadastros/OptionsPage"));

// Página de Atividades
const ActivityLogPage = lazy(() => import("./pages/ActivityLog/ActivityLogPage"));

// Importação da Página de Importação
const BulkImportPage = lazy(() => import("./pages/Inventory/BulkImportPage"));

// Página de Monitoramento
const MonitoringPage = lazy(() => import("./pages/Monitoring/MonitoringPage"));

// Páginas de Usuário e Públicas
const ProfileListPage = lazy(() => import("./pages/Users/ProfileListPage"));
const AssetScanPage = lazy(() => import("./pages/Public/AssetScanPage"));
const ForceChangePasswordPage = lazy(() => import("./pages/Auth/ForceChangePasswordPage"));
const PasswordResetPage = lazy(() => import("./pages/Auth/PasswordResetPage"));

// Componente de fallback para suspense
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Loading />
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    ),
  },

  // Troca de Senha
  {
    path: "/force-password",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <ForceChangePasswordPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // Redefinição de Senha via Email (pública - não precisa estar logado)
  {
    path: "/reset-password",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PasswordResetPage />
      </Suspense>
    ),
  },

  // Área Logada
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    errorElement: (
      <Suspense fallback={<PageLoader />}>
        <NotFound />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        )
      },

      // --- INVENTÁRIO (ORDEM CRÍTICA) ---
      {
        path: "inventory",
        element: (
          <Suspense fallback={<PageLoader />}>
            <InventoryList />
          </Suspense>
        )
      },

      // 1º: Rotas específicas (como importar)
      {
        path: "inventory/importar",
        element: (
          <Suspense fallback={<PageLoader />}>
            <BulkImportPage />
          </Suspense>
        )
      },

      // 2º: Rota dinâmica (qualquer outra coisa é considerada ID)
      {
        path: "inventory/:assetId",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AssetDetail />
          </Suspense>
        )
      },
      // -----------------------------------

      {
        path: "atividades",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ActivityLogPage />
          </Suspense>
        )
      },
      {
        path: "reports",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Reports />
          </Suspense>
        )
      },
      {
        path: "profile",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserProfile />
          </Suspense>
        )
      },
      {
        path: "monitoramento",
        element: (
          <Suspense fallback={<PageLoader />}>
            <MonitoringPage />
          </Suspense>
        )
      },

      // Cadastros
      {
        path: "cadastros/unidades",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UnidadesPage />
          </Suspense>
        )
      },
      {
        path: "cadastros/computadores",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AssetModelPage type="computador" title="Computadores" />
          </Suspense>
        )
      },
      {
        path: "cadastros/impressoras",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AssetModelPage type="impressora" title="Impressoras" />
          </Suspense>
        )
      },
      {
        path: "cadastros/empresas",
        element: (
          <Suspense fallback={<PageLoader />}>
            <SuppliersPage />
          </Suspense>
        )
      },
      {
        path: "cadastros/opcoes",
        element: (
          <Suspense fallback={<PageLoader />}>
            <OptionsPage />
          </Suspense>
        )
      },

      // Usuários
      {
        path: "usuarios/lista",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserList />
          </Suspense>
        )
      },
      {
        path: "usuarios/perfis",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfileListPage />
          </Suspense>
        )
      },

      { path: "users", element: <Navigate to="/usuarios/lista" replace /> },
    ],
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFound />
      </Suspense>
    )
  },
]);