import { useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore'; 
import { auth, db } from '/src/lib/firebase.js';

// Permissões padrão (tudo bloqueado)
const defaultPermissions = {
  dashboard: { read: false },
  ativos: { create: false, read: false, update: false, delete: false },
  cadastros_unidades: { create: false, read: false, update: false, delete: false },
  cadastros_modelos: { create: false, read: false, update: false, delete: false },
  movimentacao: { create: false },
  preventiva: { create: false },
  usuarios: { create: false, read: false, update: false, delete: false },
  perfis: { create: false, read: false, update: false, delete: false },
};

export const useAuth = () => {
  const [authUser, authLoading] = useAuthState(auth);

  const userDocRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const [userData, userLoading] = useDocumentData(userDocRef);

  // Só busca a role se tivermos o userData
  const roleName = userData?.role || 'guest';
  const roleDocRef = userData?.role ? doc(db, 'roles', roleName) : null;
  const [roleData, roleLoading] = useDocumentData(roleDocRef);

  const authData = useMemo(() => {
    const loading = authLoading || userLoading || roleLoading;

    if (loading) {
      return { 
        user: null, 
        userData: null, 
        permissions: defaultPermissions, 
        loading: true,
        isAdmin: false,
        allowedUnits: []
      };
    }

    if (!authUser) {
       return { user: null, loading: false, isAdmin: false };
    }

    // --- LÓGICA DE ADMIN ROBUSTA ---
    // Aceita variações de escrita para evitar bugs
    const currentRole = userData?.role ? userData.role.toLowerCase() : 'guest';
    const isAdmin = 
      currentRole === 'admin_geral' || 
      currentRole === 'gestor' || 
      currentRole === 'administrador';

    // Lista de unidades permitidas
    const allowedUnits = userData?.assignedUnits || [];


    return {
      user: authUser,
      userData: userData,
      role: userData?.role || 'guest',
      isAdmin, // <-- Se isso for true, você vê tudo
      allowedUnits,
      
      permissions: {
        ...defaultPermissions,
        ...roleData?.permissions,
        // Merge profundo de segurança
        dashboard: { ...defaultPermissions.dashboard, ...roleData?.permissions?.dashboard },
        ativos: { ...defaultPermissions.ativos, ...roleData?.permissions?.ativos },
        cadastros_unidades: { ...defaultPermissions.cadastros_unidades, ...roleData?.permissions?.cadastros_unidades },
        cadastros_modelos: { ...defaultPermissions.cadastros_modelos, ...roleData?.permissions?.cadastros_modelos },
        movimentacao: { ...defaultPermissions.movimentacao, ...roleData?.permissions?.movimentacao },
        preventiva: { ...defaultPermissions.preventiva, ...roleData?.permissions?.preventiva },
        usuarios: { ...defaultPermissions.usuarios, ...roleData?.permissions?.usuarios },
        perfis: { ...defaultPermissions.perfis, ...roleData?.permissions?.perfis },
      },
      loading: false,
    };
  }, [authUser, userData, roleData, authLoading, userLoading, roleLoading]);

  return authData;
};