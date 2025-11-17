import { useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore'; 
import { auth, db } from '/src/lib/firebase.js';

const defaultPermissions = {
  dashboard: { read: false },
  ativos: { create: false, read: false, update: false, delete: false },
  cadastros_unidades: { create: false, read: false, update: false, delete: false },
  cadastros_modelos: { create: false, read: false, update: false, delete: false },
  cadastros_empresas: { create: false, read: false, update: false, delete: false },
  cadastros_opcoes: { create: false, read: false, update: false, delete: false },
  // --- NOVO DEFAULT ---
  monitoramento: { read: false },
  // -------------------
  movimentacao: { create: false },
  preventiva: { create: false },
  usuarios: { create: false, read: false, update: false, delete: false },
  perfis: { create: false, read: false, update: false, delete: false },
};

export const useAuth = () => {
  const [authUser, authLoading] = useAuthState(auth);

  const userDocRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const [userData, userLoading] = useDocumentData(userDocRef);

  const roleName = userData?.role || 'guest';
  const roleDocRef = userData?.role ? doc(db, 'roles', roleName) : null;
  const [roleData, roleLoading] = useDocumentData(roleDocRef);

  const authData = useMemo(() => {
    const loading = authLoading || userLoading || roleLoading;

    if (loading) {
      return { user: null, userData: null, permissions: defaultPermissions, loading: true, isAdmin: false, allowedUnits: [] };
    }

    if (!authUser) {
       return { user: null, loading: false, isAdmin: false };
    }

    const currentRole = userData?.role ? userData.role.toLowerCase() : 'guest';
    const isAdmin = currentRole === 'admin_geral' || currentRole === 'gestor' || currentRole === 'administrador';
    const allowedUnits = userData?.assignedUnits || [];

    return {
      user: authUser,
      userData: userData,
      role: userData?.role || 'guest',
      isAdmin,
      allowedUnits,
      
      permissions: {
        ...defaultPermissions,
        ...roleData?.permissions,
        dashboard: { ...defaultPermissions.dashboard, ...roleData?.permissions?.dashboard },
        ativos: { ...defaultPermissions.ativos, ...roleData?.permissions?.ativos },
        monitoramento: { ...defaultPermissions.monitoramento, ...roleData?.permissions?.monitoramento }, // <-- Merge
        cadastros_unidades: { ...defaultPermissions.cadastros_unidades, ...roleData?.permissions?.cadastros_unidades },
        cadastros_modelos: { ...defaultPermissions.cadastros_modelos, ...roleData?.permissions?.cadastros_modelos },
        cadastros_empresas: { ...defaultPermissions.cadastros_empresas, ...roleData?.permissions?.cadastros_empresas },
        cadastros_opcoes: { ...defaultPermissions.cadastros_opcoes, ...roleData?.permissions?.cadastros_opcoes },
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