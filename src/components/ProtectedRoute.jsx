import React, { useEffect } from 'react'; // Importar useEffect
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase.js'; // Importar 'db'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; // Importar funções do Firestore
import Loading from './Loading/Loading';

const ProtectedRoute = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);

  // --- ARQUITETURA: Sincronização de Usuário (Auth -> Firestore) ---
  useEffect(() => {
    if (user) {
      // O usuário está logado. Vamos garantir que ele exista no Firestore.
      const userRef = doc(db, 'users', user.uid);
      
      const checkAndCreateUser = async () => {
        try {
          const docSnap = await getDoc(userRef);
          
          if (!docSnap.exists()) {
            // Documento não existe, vamos criá-lo
            console.log(`Documento de usuário para ${user.uid} não encontrado. Criando...`);
            await setDoc(userRef, {
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0], // Padrão
              role: 'guest', // Role padrão (sem permissão)
              assignedUnits: [], // Nenhuma unidade
              createdAt: serverTimestamp()
            });
            toast.info("Perfil de usuário criado no banco de dados.");
          }
        } catch (err) {
          console.error("Erro ao sincronizar usuário no Firestore:", err);
          toast.error("Erro ao verificar perfil de usuário.");
        }
      };

      checkAndCreateUser();
    }
  }, [user]); // Roda toda vez que o 'user' (do Auth) mudar

  // --- Lógica de Roteamento (Original) ---
  if (loading) {
    // Exibe um loading em tela cheia enquanto o Firebase verifica a auth
    return <Loading />;
  }

  if (error) {
    console.error("Erro de autenticação:", error);
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    // Usuário não está logado, redireciona para a página de login
    return <Navigate to="/login" replace />;
  }

  // Usuário está logado, renderiza a página solicitada
  return children;
};

export default ProtectedRoute;