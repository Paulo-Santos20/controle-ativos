import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { 
  Loader2, Search, User, UserCheck, Pencil, PackageSearch, 
  Plus, Ban, CheckCircle, Filter 
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '/src/hooks/useAuth.js';
import styles from '../Cadastros/CadastroPages.module.css'; 
import Modal from '../../components/Modal/Modal';
import EditUserForm from '/src/components/Users/EditUserForm.jsx';
import CreateUserForm from '/src/components/Users/CreateUserForm.jsx'; 

/**
 * Página para listar e gerenciar usuários do sistema.
 */
const UserList = () => {
  // --- 1. HOOK DE AUTH ---
  const { permissions, loading: authLoading } = useAuth();
  
  // --- 2. ESTADOS ---
  const [modalView, setModalView] = useState(null); // 'edit' | 'create'
  const [editingUserDoc, setEditingUserDoc] = useState(null); 
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("active"); // Padrão: Ativos
  const [filterRole, setFilterRole] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");

  // --- 3. QUERIES ---
  const qUsers = query(collection(db, 'users'), orderBy('displayName', 'asc'));
  const [users, loadingUsers, error] = useCollection(qUsers);

  const [roles] = useCollection(query(collection(db, 'roles'), orderBy('name', 'asc')));
  const [units] = useCollection(query(collection(db, 'units'), orderBy('name', 'asc')));

  // --- 4. FILTRAGEM ---
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.docs.filter(doc => {
      const data = doc.data();
      const isActive = data.isActive !== false; // Se undefined, é true

      // Filtro de Status
      if (filterStatus === 'active' && !isActive) return false;
      if (filterStatus === 'inactive' && isActive) return false;

      // Filtro de Role
      if (filterRole !== 'all' && data.role !== filterRole) return false;

      // Filtro de Unidade
      if (filterUnit !== 'all') {
        if (!data.assignedUnits || !data.assignedUnits.includes(filterUnit)) return false;
      }

      // Filtro de Texto
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nameMatch = data.displayName && data.displayName.toLowerCase().includes(search);
        const emailMatch = data.email && data.email.toLowerCase().includes(search);
        if (!nameMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [users, searchTerm, filterStatus, filterRole, filterUnit]);

  // --- 5. AÇÕES ---

  const handleOpenEdit = (userDoc) => {
    setEditingUserDoc(userDoc);
    setModalView('edit');
  };

  const handleOpenAddNew = () => {
    setEditingUserDoc(null);
    setModalView('create');
  };

  const handleCloseModal = () => {
    setModalView(null);
    setTimeout(() => setEditingUserDoc(null), 300);
  };

  const handleToggleStatus = async (userDoc) => {
    if (!permissions?.usuarios?.update) {
        toast.error("Sem permissão.");
        return;
    }

    const currentStatus = userDoc.data().isActive !== false;
    const newStatus = !currentStatus;
    
    if (userDoc.id === auth.currentUser.uid) {
      toast.error("Você não pode desativar sua própria conta!");
      return;
    }

    const confirmMsg = newStatus 
      ? `Reativar o usuário ${userDoc.data().displayName}?` 
      : `Desativar ${userDoc.data().displayName}? Ele será desconectado imediatamente.`;

    if (window.confirm(confirmMsg)) {
      try {
        await updateDoc(doc(db, 'users', userDoc.id), {
          isActive: newStatus
        });
        toast.success(newStatus ? "Usuário reativado." : "Usuário desativado.");
      } catch (error) {
        toast.error("Erro ao atualizar status: " + error.message);
      }
    }
  };

  // --- 6. RENDERIZAÇÃO ---
  
  const isLoading = authLoading || loadingUsers;

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
      return (
        <div className={styles.errorState}>
           <h3>⚠️ Erro</h3>
           <p>{error.message}</p>
           {error.code === 'permission-denied' && <p style={{fontSize: '0.8rem'}}>Verifique se você é Admin ou se as regras do Firestore permitem leitura.</p>}
        </div>
      );
    }

    if (filteredUsers.length === 0) {
      return (
        <div className={styles.emptyState}>
          <PackageSearch size={50} />
          <h3>Nenhum usuário encontrado</h3>
          <p>Tente ajustar os filtros de busca.</p>
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {filteredUsers.map(doc => {
          const user = doc.data();
          const isAdmin = user.role === 'admin_geral' || user.role === 'gestor';
          const isActive = user.isActive !== false; 

          return (
            <div key={doc.id} className={`${styles.listItem} ${!isActive ? styles.itemInactive : ''}`}>
              <div className={styles.listItemIcon} style={{ color: !isActive ? '#999' : (isAdmin ? 'var(--color-warning)' : 'var(--color-primary)') }}>
                {isAdmin ? <UserCheck size={24} /> : <User size={24} />}
              </div>
              
              <div className={styles.listItemContent}>
                <strong style={{ textDecoration: !isActive ? 'line-through' : 'none' }}>
                  {user.displayName || 'Usuário sem nome'}
                </strong>
                {!isActive && <span className={styles.badgeInactive}>DESATIVADO</span>}
                
                <small>{user.email}</small>
                
                <div style={{marginTop: '4px'}}>
                   <span className={styles.userRole}>Role: <strong>{user.role || 'N/A'}</strong></span>
                   <span style={{fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginLeft: '8px'}}>
                      Unidades: {user.assignedUnits && user.assignedUnits.length > 0 ? user.assignedUnits.join(', ') : 'Nenhuma'}
                   </span>
                </div>
              </div>

              <div className={styles.listItemActions}>
                {/* Botão de Status */}
                <button 
                  className={styles.iconButton}
                  onClick={() => handleToggleStatus(doc)}
                  disabled={!permissions?.usuarios?.update}
                  title={isActive ? "Desativar Usuário" : "Reativar Usuário"}
                  style={{ color: isActive ? '#ef4444' : '#22c55e' }} 
                >
                  {isActive ? <Ban size={18} /> : <CheckCircle size={18} />}
                </button>

                {/* Botão de Editar */}
                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleOpenEdit(doc)}
                  disabled={!permissions?.usuarios?.update} // Usa a permissão correta
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
      {/* --- Modal --- */}
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

      {/* --- Cabeçalho --- */}
      <header className={styles.header}>
        <h1 className={styles.title}>Gestão de Usuários</h1>
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenAddNew}
          disabled={!permissions?.usuarios?.create} 
          title={permissions?.usuarios?.create ? "" : "Sem permissão"}
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </header>

      {/* --- Filtros --- */}
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

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <Filter size={16} />
            
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className={styles.filterSelect}
            >
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="all">Todos</option>
            </select>

            <select 
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)} 
              className={styles.filterSelect}
            >
              <option value="all">Todos os Perfis</option>
              {roles?.docs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.data().name}</option>
              ))}
            </select>

            <select 
              value={filterUnit} 
              onChange={(e) => setFilterUnit(e.target.value)} 
              className={styles.filterSelect}
            >
              <option value="all">Todas as Unidades</option>
              {units?.docs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.data().sigla}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- Lista --- */}
      <div className={styles.content}>
        {renderList()}
      </div>
    </div>
  );
};

export default UserList;