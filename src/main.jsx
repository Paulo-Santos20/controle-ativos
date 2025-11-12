import React from 'react';
import ReactDOM from 'react-dom/client';

// 1. Importe o PROVEDOR de rotas
import { RouterProvider } from 'react-router-dom';

// 2. Importe a NOSSA CONFIGURAÇÃO de rotas (que já conhece o <App>)
import { router } from './router.jsx'; 

// 3. Importe seu CSS global
import './index.css';

// 4. Renderize o PROVEDOR, não o <App>
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);