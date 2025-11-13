import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase.js';
// Importamos onSnapshot para ouvir mudanças em TEMPO REAL
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'; 
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import Loading from './Loading/Loading';

const ProtectedRoute = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);

  // --- LÓGICA DE SINCRONIZAÇÃO E SEGURANÇA ---
  useEffect(() => {
    let unsubscribe = () => {};

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      
      // 1. Cria o usuário se não existir (Lógica anterior)
      const checkAndCreateUser = async () => {
        try {
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            await setDoc(userRef, {
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              role: 'guest',
              isActive: true, // <--- NOVO: Padrão é ativo
              assignedUnits: [],
              createdAt: serverTimestamp()
            });
          }
        } catch (err) {
          console.error("Erro sync:", err);
        }
      };
      checkAndCreateUser();

      // 2. VIGILÂNCIA EM TEMPO REAL (O "Expulsor")
      // Escuta mudanças no documento do usuário. Se 'isActive' virar false, desloga.
      unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Se isActive for explicitamente false (e não undefined)
          if (data.isActive === false) {
            toast.error("Sua conta foi desativada pelo administrador.");
            signOut(auth); // <-- TCHAU! Força o logout
          }
        }
      });
    }

    return () => unsubscribe(); // Limpa o ouvinte ao desmontar
  }, [user]);

  if (loading) return <Loading />;

  if (error) {
    console.error("Erro auth:", error);
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;