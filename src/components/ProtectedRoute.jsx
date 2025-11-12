import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import Loading from './Loading/Loading';

const ProtectedRoute = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);

  if (loading) {
    // Exibe um loading em tela cheia enquanto o Firebase verifica a auth
    return <Loading />;
  }

  if (error) {
    // Você pode tratar o erro aqui, talvez redirecionar para uma pág de erro
    console.error("Erro de autenticação:", error);
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    // Usuário não está logado, redireciona para a página de login
    // 'replace' evita que o usuário volte para a página protegida no "Voltar"
    return <Navigate to="/login" replace />;
  }

  // Usuário está logado, renderiza a página solicitada
  return children;
};

export default ProtectedRoute;