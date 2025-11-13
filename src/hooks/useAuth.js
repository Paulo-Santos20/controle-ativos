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

  const roleDocRef = userData?.role ? doc(db, 'roles', userData.role) : null;
  const [roleData, roleLoading] = useDocumentData(roleDocRef);

  const authData = useMemo(() => {
    const loading = authLoading || userLoading || roleLoading;

    if (loading || !authUser) {
      return { 
        user: null, 
        userData: null, 
        permissions: defaultPermissions, 
        loading: true,
        isAdmin: false,
        allowedUnits: []
      };
    }

    // Verifica se é "Super Admin" (Gestor)
    // Assumimos que 'admin_geral' ou permissão total define o admin
    const isAdmin = userData?.role === 'admin_geral' || userData?.role === 'gestor';

    // Lista de unidades permitidas (Array de IDs)
    const allowedUnits = userData?.assignedUnits || [];

    return {
      user: authUser,
      userData: userData,
      role: userData?.role || 'guest',
      isAdmin,
      allowedUnits, // <-- Importante para filtrar as queries
      
      permissions: {
        ...defaultPermissions,
        ...roleData?.permissions,
        // Merge profundo para garantir segurança
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