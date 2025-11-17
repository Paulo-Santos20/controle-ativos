import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom'; // Importar useLocation
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase.js';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'; 
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import Loading from './Loading/Loading';

const ProtectedRoute = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);
  const [isCheckingDb, setIsCheckingDb] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false); // Estado local da flag
  const location = useLocation(); // Para saber onde estamos

  useEffect(() => {
    let unsubscribe = () => {};

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      
      // 1. Listener em Tempo Real (Vigia Status e Senha)
      unsubscribe = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Checagem de Bloqueio
          if (data.isActive === false) {
            toast.error("Conta desativada.");
            await signOut(auth);
            return;
          }

          // Checagem de Senha Obrigatória
          if (data.mustChangePassword === true) {
            setMustChangePassword(true);
          } else {
            setMustChangePassword(false);
          }
          
          setIsCheckingDb(false); // Terminou de checar
        } else {
          // Se o doc não existe, cria (Auto-Create)
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            role: 'guest',
            isActive: true,
            assignedUnits: [],
            createdAt: serverTimestamp()
          });
          // Não seta isCheckingDb aqui, vai rodar o snapshot de novo
        }
      }, (error) => {
        console.error("Erro ao monitorar usuário:", error);
        setIsCheckingDb(false); // Libera para não travar em loading
      });
    } else {
      setIsCheckingDb(false);
    }

    return () => unsubscribe();
  }, [user]);

  if (loading || (user && isCheckingDb)) return <Loading />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // --- LÓGICA DE REDIRECIONAMENTO DE SENHA ---
  
  // Se precisa trocar a senha E não está na página de troca
  if (mustChangePassword && location.pathname !== '/force-password') {
    return <Navigate to="/force-password" replace />;
  }

  // Se NÃO precisa trocar a senha MAS está na página de troca (evita acesso manual)
  if (!mustChangePassword && location.pathname === '/force-password') {
    return <Navigate to="/" replace />;
  }

  // Se precisa trocar E já está na página correta, renderiza a página (children)
  // Caso contrário, renderiza o app normal.
  return children;
};

export default ProtectedRoute;