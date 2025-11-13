import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Loader2, Search, User, UserCheck, Pencil, PackageSearch, Plus } from 'lucide-react';
import { useAuth } from '/src/hooks/useAuth.js'; 

import styles from '../Cadastros/CadastroPages.module.css'; 
import Modal from '../../components/Modal/Modal';
import EditUserForm from '/src/components/Users/EditUserForm.jsx';
import CreateUserForm from '/src/components/Users/CreateUserForm.jsx'; 

/**
 * Página para listar e gerenciar usuários do sistema.
 */
const UserList = () => {
  // Usa o Hook de Auth para verificar permissões
  const { permissions, loading: authLoading } = useAuth();

  const [modalView, setModalView] = useState(null); 
  const [editingUserDoc, setEditingUserDoc] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");

  // Busca todos os usuários
  const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
  const [users, loadingUsers, error] = useCollection(q);

  // Filtro de busca local
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
    
    if (error) {
      // Mostra erro de permissão claramente
      return (
        <div className={styles.errorState}>
           <h3>⚠️ Erro ao Carregar Usuários</h3>
           <p>{error.message}</p>
           {error.code === 'permission-denied' && (
             <p style={{fontSize: '0.9rem', marginTop: '8px'}}>
               Seu usuário atual não tem permissão para listar usuários.
               Verifique as Regras de Segurança do Firestore.
             </p>
           )}
        </div>
      );
    }

    if (filteredUsers.length === 0) {
      return (
        <div className={styles.emptyState}>
          <PackageSearch size={50} />
          <h3>Nenhum usuário encontrado</h3>
          <p>Usuários que se registrarem no aplicativo aparecerão aqui.</p>
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {filteredUsers.map(doc => {
          const user = doc.data();
          // Verifica se é admin para destacar o ícone
          const isAdmin = user.role === 'admin_geral' || user.role === 'gestor';
          
          return (
            <div key={doc.id} className={styles.listItem}>
              <div className={styles.listItemIcon} style={{ color: isAdmin ? 'var(--color-warning)' : 'var(--color-primary)' }}>
                {isAdmin ? <UserCheck size={24} /> : <User size={24} />}
              </div>
              
              <div className={styles.listItemContent}>
                <strong>{user.displayName || 'Usuário sem nome'}</strong>
                <small>{user.email}</small>
                
                {/* Exibe Role e Unidades com estilo */}
                <div style={{marginTop: '4px'}}>
                   <span className={styles.userRole}>
                      Role: <strong>{user.role || 'N/A'}</strong>
                   </span>
                   <span style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginLeft: '8px'}}>
                      Unidades: {user.assignedUnits && user.assignedUnits.length > 0 ? user.assignedUnits.join(', ') : 'Nenhuma'}
                   </span>
                </div>
              </div>

              <div className={styles.listItemActions}>
                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleOpenEdit(doc)}
                  // Só habilita o botão de gerenciar se tiver permissão
                  disabled={!permissions.usuarios.update}
                  title={!permissions.usuarios.update ? "Sem permissão para editar" : "Gerenciar Usuário"}
                >
                  <Pencil size={16} />
                  <span>Gerenciar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      
      {/* --- O Modal Dinâmico --- */}
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
        
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenAddNew}
          disabled={!permissions.usuarios.create} 
          title={permissions.usuarios.create ? "Criar um novo usuário" : "Você não tem permissão para criar usuários"}
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </header>

      {/* --- Barra de Filtro --- */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- Conteúdo da Lista --- */}
      <div className={styles.content}>
        {renderList()}
      </div>
    </div>
  );
};

export default UserList;