import { useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore'; 
import { auth, db } from '/src/lib/firebase.js';

// --- 1. DEFINA SEU E-MAIL DE SUPER ADMIN AQUI ---
const MASTER_EMAIL = "seu.email@exemplo.com.br"; // <--- COLOQUE SEU E-MAIL AQUI
// -----------------------------------------------

const defaultPermissions = {
  dashboard: { read: false },
  ativos: { create: false, read: false, update: false, delete: false },
  cadastros_unidades: { create: false, read: false, update: false, delete: false },
  cadastros_modelos: { create: false, read: false, update: false, delete: false },
  cadastros_empresas: { create: false, read: false, update: false, delete: false },
  cadastros_opcoes: { create: false, read: false, update: false, delete: false },
  monitoramento: { read: false },
  movimentacao: { create: false },
  preventiva: { create: false },
  usuarios: { create: false, read: false, update: false, delete: false },
  perfis: { create: false, read: false, update: false, delete: false },
};

// Permissões TOTAIS forçadas
const masterPermissions = {
  dashboard: { read: true },
  ativos: { create: true, read: true, update: true, delete: true },
  cadastros_unidades: { create: true, read: true, update: true, delete: true },
  cadastros_modelos: { create: true, read: true, update: true, delete: true },
  cadastros_empresas: { create: true, read: true, update: true, delete: true },
  cadastros_opcoes: { create: true, read: true, update: true, delete: true },
  monitoramento: { read: true },
  movimentacao: { create: true },
  preventiva: { create: true },
  usuarios: { create: true, read: true, update: true, delete: true },
  perfis: { create: true, read: true, update: true, delete: true },
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
       return { user: null, loading: false, isAdmin: false, permissions: defaultPermissions };
    }

    // --- 2. LÓGICA BLINDADA ---
    // Verifica se é o dono do sistema pelo e-mail
    const isMaster = authUser.email === MASTER_EMAIL;

    const currentRole = userData?.role ? userData.role.toLowerCase() : 'guest';
    
    // Admin é: Master Email OU Role de Admin no banco
    const isAdmin = isMaster || currentRole === 'admin_geral' || currentRole === 'gestor';

    const allowedUnits = userData?.assignedUnits || [];

    // Se for Master ou Admin, usa permissões totais. Senão, usa as do banco.
    const finalPermissions = (isMaster || isAdmin) ? masterPermissions : {
        ...defaultPermissions,
        ...roleData?.permissions,
        dashboard: { ...defaultPermissions.dashboard, ...roleData?.permissions?.dashboard },
        ativos: { ...defaultPermissions.ativos, ...roleData?.permissions?.ativos },
        monitoramento: { ...defaultPermissions.monitoramento, ...roleData?.permissions?.monitoramento },
        cadastros_unidades: { ...defaultPermissions.cadastros_unidades, ...roleData?.permissions?.cadastros_unidades },
        cadastros_modelos: { ...defaultPermissions.cadastros_modelos, ...roleData?.permissions?.cadastros_modelos },
        cadastros_empresas: { ...defaultPermissions.cadastros_empresas, ...roleData?.permissions?.cadastros_empresas },
        cadastros_opcoes: { ...defaultPermissions.cadastros_opcoes, ...roleData?.permissions?.cadastros_opcoes },
        movimentacao: { ...defaultPermissions.movimentacao, ...roleData?.permissions?.movimentacao },
        preventiva: { ...defaultPermissions.preventiva, ...roleData?.permissions?.preventiva },
        usuarios: { ...defaultPermissions.usuarios, ...roleData?.permissions?.usuarios },
        perfis: { ...defaultPermissions.perfis, ...roleData?.permissions?.perfis },
    };

    return {
      user: authUser,
      userData: userData,
      role: isMaster ? 'admin_geral' : currentRole, // Força a role visualmente
      isAdmin, 
      allowedUnits,
      permissions: finalPermissions,
      loading: false,
    };
  }, [authUser, userData, roleData, authLoading, userLoading, roleLoading]);

  return authData;
};