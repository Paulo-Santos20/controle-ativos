import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase.js';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'; 
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import Loading from './Loading/Loading';

const ProtectedRoute = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);
  const location = useLocation();

  useEffect(() => {
    let unsubscribe = () => {};

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      
      const checkAndCreateUser = async () => {
        try {
          const docSnap = await getDoc(userRef);
          
          // SÓ cria se tiver CERTEZA ABSOLUTA que não existe
          if (!docSnap.exists()) {
            console.log("Criando novo perfil de usuário...");
            await setDoc(userRef, {
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              role: 'guest',
              isActive: true,
              assignedUnits: [],
              createdAt: serverTimestamp()
            });
          } else {
            // Se já existe, NÃO FAZ NADA. Não sobrescreve role.
            // Isso protege seu admin de virar guest.
          }
        } catch (err) {
          console.error("Erro ao sincronizar usuário:", err);
        }
      };
      checkAndCreateUser();

      unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isActive === false) {
            toast.error("Conta desativada.");
            signOut(auth);
          }
        }
      });
    }
    return () => unsubscribe();
  }, [user]);

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;