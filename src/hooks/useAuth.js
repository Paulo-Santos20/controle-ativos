import { useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
// --- A CORREÇÃO ESTÁ AQUI ---
// Removemos 'docData', que não existe.
import { doc, collection } from 'firebase/firestore'; 
// ----------------------------
import { auth, db } from '/src/lib/firebase.js';

// Valores padrão para um usuário "guest" (sem permissões)
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

/**
 * Hook customizado para gerenciar o estado completo de autenticação e autorização.
 * Retorna o usuário do Auth, seu documento do Firestore e suas permissões mescladas.
 * (Princípio 1: Arquitetura Escalável)
 */
export const useAuth = () => {
  const [authUser, authLoading, authError] = useAuthState(auth);

  // 1. Encontra o documento de usuário no Firestore (ex: users/UID-DO-AUTH)
  const userDocRef = authUser ? doc(db, 'users', authUser.uid) : null;
  const [userData, userLoading, userError] = useDocumentData(userDocRef);

  // 2. Encontra o documento de PERFIL (role) no Firestore (ex: roles/tecnico_local)
  const roleDocRef = userData?.role ? doc(db, 'roles', userData.role) : null;
  const [roleData, roleLoading, roleError] = useDocumentData(roleDocRef);

  // 3. Mescla tudo (Princípio 5: Código de Alta Qualidade)
  const authData = useMemo(() => {
    const loading = authLoading || userLoading || roleLoading;

    // Se qualquer hook estiver carregando, ou não houver usuário, retorne o estado de loading
    if (loading || !authUser) {
      return { user: null, role: null, permissions: defaultPermissions, loading: true };
    }

    // O usuário está logado (Auth) mas não tem documento (Firestore)
    if (!userData) {
      // (O ProtectedRoute deve ter criado isso, mas por segurança tratamos)
      return { user: authUser, role: 'guest', permissions: defaultPermissions, loading: false };
    }

    // O usuário tem documento (Firestore) mas não tem perfil (Role)
    if (!roleData) {
      return { 
        user: authUser, 
        userData: userData,
        role: userData.role || 'guest', 
        permissions: defaultPermissions, 
        loading: false 
      };
    }

    // Sucesso Total: Retorna o usuário, sua role, e suas permissões
    return {
      user: authUser,
      userData: userData,
      role: userData.role,
      // Mescla as permissões padrão com as do perfil para evitar erros
      permissions: {
        ...defaultPermissions,
        ...roleData.permissions,
        // Garante que os sub-objetos também sejam mesclados
        dashboard: { ...defaultPermissions.dashboard, ...roleData.permissions?.dashboard },
        ativos: { ...defaultPermissions.ativos, ...roleData.permissions?.ativos },
        cadastros_unidades: { ...defaultPermissions.cadastros_unidades, ...roleData.permissions?.cadastros_unidades },
        cadastros_modelos: { ...defaultPermissions.cadastros_modelos, ...roleData.permissions?.cadastros_modelos },
        movimentacao: { ...defaultPermissions.movimentacao, ...roleData.permissions?.movimentacao },
        preventiva: { ...defaultPermissions.preventiva, ...roleData.permissions?.preventiva },
        usuarios: { ...defaultPermissions.usuarios, ...roleData.permissions?.usuarios },
        perfis: { ...defaultPermissions.perfis, ...roleData.permissions?.perfis },
      },
      loading: false,
    };
  }, [authUser, userData, roleData, authLoading, userLoading, roleLoading]);

  return authData;
};