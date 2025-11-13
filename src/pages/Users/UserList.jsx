import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
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

const UserList = () => {
  const { permissions, loading: authLoading } = useAuth();
  const [modalView, setModalView] = useState(null); 
  const [editingUserDoc, setEditingUserDoc] = useState(null); 
  
  // --- ESTADOS DOS FILTROS ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("active"); // Padrão: Mostrar só ativos
  const [filterRole, setFilterRole] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");

  // --- BUSCA DE DADOS ---
  // Usuários
  const qUsers = query(collection(db, 'users'), orderBy('displayName', 'asc'));
  const [users, loadingUsers, error] = useCollection(qUsers);

  // Roles (para o filtro)
  const [roles] = useCollection(query(collection(db, 'roles'), orderBy('name', 'asc')));
  
  // Unidades (para o filtro)
  const [units] = useCollection(query(collection(db, 'units'), orderBy('name', 'asc')));

  // --- LÓGICA DE FILTRAGEM AVANÇADA ---
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.docs.filter(doc => {
      const data = doc.data();
      const isActive = data.isActive !== false; // Se undefined, é true

      // 1. Filtro de Status
      if (filterStatus === 'active' && !isActive) return false;
      if (filterStatus === 'inactive' && isActive) return false;

      // 2. Filtro de Role (Perfil)
      if (filterRole !== 'all' && data.role !== filterRole) return false;

      // 3. Filtro de Unidade
      // Verifica se a unidade selecionada está no array de unidades do usuário
      if (filterUnit !== 'all') {
        if (!data.assignedUnits || !data.assignedUnits.includes(filterUnit)) return false;
      }

      // 4. Filtro de Texto (Nome ou Email)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nameMatch = data.displayName && data.displayName.toLowerCase().includes(search);
        const emailMatch = data.email && data.email.toLowerCase().includes(search);
        if (!nameMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [users, searchTerm, filterStatus, filterRole, filterUnit]);

  // --- AÇÕES ---
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

  const handleToggleStatus = async (userDoc) => {
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

  const isLoading = authLoading || loadingUsers;

  const renderList = () => {
    if (isLoading) return <div className={styles.loadingState}><Loader2 className={styles.spinner} /><p>Carregando usuários...</p></div>;
    
    if (error) return <div className={styles.errorState}><h3>Erro</h3><p>{error.message}</p></div>;

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
                <button 
                  className={styles.iconButton}
                  onClick={() => handleToggleStatus(doc)}
                  disabled={!permissions.usuarios.update}
                  title={isActive ? "Desativar Usuário" : "Reativar Usuário"}
                  style={{ color: isActive ? '#ef4444' : '#22c55e' }} 
                >
                  {isActive ? <Ban size={18} /> : <CheckCircle size={18} />}
                </button>

                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleOpenEdit(doc)}
                  disabled={!permissions.usuarios.update}
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
      <Modal isOpen={!!modalView} onClose={handleCloseModal} title={modalView === 'edit' ? "Gerenciar Usuário" : "Criar Novo Usuário"}>
        {modalView === 'edit' && editingUserDoc && <EditUserForm userDoc={editingUserDoc} onClose={handleCloseModal} />}
        {modalView === 'create' && <CreateUserForm onClose={handleCloseModal} />}
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Gestão de Usuários</h1>
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenAddNew}
          disabled={!permissions.usuarios.create} 
          title={permissions.usuarios.create ? "" : "Sem permissão"}
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </header>

      <div className={styles.toolbar}>
        {/* Barra de Busca */}
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        {/* Filtros Dropdown */}
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <Filter size={16} />
            
            {/* Filtro Status */}
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className={styles.filterSelect}
            >
              <option value="active">Ativos</option>
              <option value="inactive">Inativos (Desativados)</option>
              <option value="all">Todos</option>
            </select>

            {/* Filtro Perfil */}
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

            {/* Filtro Unidade */}
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

      <div className={styles.content}>
        {renderList()}
      </div>
    </div>
  );
};

export default UserList;