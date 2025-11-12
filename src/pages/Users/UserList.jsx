import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Loader2, Search, User, UserCheck, Pencil, PackageSearch, Plus } from 'lucide-react';
import { useAuth } from '/src/hooks/useAuth.js'; // <-- 1. Importa o Hook de Auth

import styles from '../Cadastros/CadastroPages.module.css'; 
import Modal from '../../components/Modal/Modal';
import EditUserForm from '/src/components/Users/EditUserForm.jsx';
import CreateUserForm from '/src/components/Users/CreateUserForm.jsx'; // <-- 2. Importa o novo formulário

/**
 * Página para listar e gerenciar usuários do sistema.
 */
const UserList = () => {
  // --- 3. Usa o Hook de Auth para verificar permissões ---
  const { permissions, loading: authLoading } = useAuth();

  // 'create' para o modal de novo, 'edit' para o modal de edição
  const [modalView, setModalView] = useState(null); 
  const [editingUserDoc, setEditingUserDoc] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");

  const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
  const [users, loadingUsers, error] = useCollection(q);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users.docs;
    const search = searchTerm.toLowerCase();
    return users.docs.filter(doc => {
      const data = doc.data();
      return (
        (data.displayName && data.displayName.toLowerCase().includes(search)) ||
        (data.email && data.email.toLowerCase().includes(search))
      );
    });
  }, [users, searchTerm]);

  // --- Funções de Controle do Modal ---
  const handleOpenEdit = (userDoc) => {
    setEditingUserDoc(userDoc);
    setModalView('edit');
  };

  const handleOpenAddNew = () => {
    setEditingUserDoc(null);
    setModalView('create');
  }

  const handleCloseModal = () => {
    setModalView(null);
    setTimeout(() => setEditingUserDoc(null), 300);
  };

  // Lógica de carregamento principal
  const isLoading = authLoading || loadingUsers;

  // Renderiza a lista de usuários
  const renderList = () => {
    if (isLoading) {
      return (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} />
          <p>Carregando usuários...</p>
        </div>
      );
    }
    if (error) { /* ... (código de erro) ... */ }
    if (filteredUsers.length === 0) { /* ... (código de lista vazia) ... */ }

    return (
      <div className={styles.list}>
        {filteredUsers.map(doc => {
          const user = doc.data();
          const isAdmin = user.role === 'admin_geral';
          return (
            <div key={doc.id} className={styles.listItem}>
              {/* ... (código do item da lista) ... */}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* --- 4. O Modal agora é dinâmico --- */}
      <Modal 
        isOpen={!!modalView} 
        onClose={handleCloseModal} 
        title={modalView === 'edit' ? "Gerenciar Usuário" : "Criar Novo Usuário"}
      >
        {modalView === 'edit' && editingUserDoc && (
          <EditUserForm 
            userDoc={editingUserDoc} 
            onClose={handleCloseModal} 
          />
        )}
        {modalView === 'create' && (
          <CreateUserForm 
            onClose={handleCloseModal} 
          />
        )}
      </Modal>

      {/* --- Cabeçalho da Página --- */}
      <header className={styles.header}>
        <h1 className={styles.title}>Gestão de Usuários</h1>
        
        {/* --- 5. O Botão agora é condicional --- */}
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenAddNew}
          // Desabilitado se não tiver permissão
          disabled={!permissions.usuarios.create} 
          title={permissions.usuarios.create ? "Criar um novo usuário" : "Você não tem permissão para criar usuários"}
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </header>

      {/* --- Barra de Filtro --- */}
      <div className={styles.toolbar}>
        {/* ... (código da searchBox) ... */}
      </div>

      {/* --- Conteúdo da Lista --- */}
      <div className={styles.content}>
        {renderList()}
      </div>
    </div>
  );
};

export default UserList;