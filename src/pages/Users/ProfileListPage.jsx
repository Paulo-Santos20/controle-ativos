import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Loader2, Plus, Pencil, Trash2, PackageSearch, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

// Importa Auth
import { useAuth } from '/src/hooks/useAuth.js';
import { logAudit } from '../../utils/AuditLogger.js';

import styles from '../Cadastros/CadastroPages.module.css'; 
import Modal from '../../components/Modal/Modal';
import AddRoleForm from '../../components/Users/AddRoleForm.jsx';

const ProfileListPage = () => {
  // --- 1. SEGURANÇA CORRIGIDA ---
  // Pegamos 'isAdmin' do hook
  const { permissions, isAdmin } = useAuth();
  
  // A permissão é verdadeira se for Admin OU se tiver a flag específica
  const canManage = isAdmin || permissions?.perfis?.manage;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleDoc, setEditingRoleDoc] = useState(null); 
  
  const q = query(collection(db, 'roles'), orderBy('name', 'asc'));
  const [roles, loading, error] = useCollection(q);

  const handleOpenAddNew = () => {
    setEditingRoleDoc(null);
    setIsModalOpen(true);
  };
  
  const handleOpenEdit = (roleDoc) => {
    setEditingRoleDoc(roleDoc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingRoleDoc(null), 300);
  };
  
  const handleDelete = async (roleDoc) => {
    if (!canManage) {
        toast.error("Acesso negado.");
        return;
    }
    const roleId = roleDoc.id;
    const roleName = roleDoc.data().name;

    if (roleId === 'admin_geral' || roleId === 'guest') {
      toast.error("Este perfil padrão não pode ser excluído.");
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir o perfil "${roleName}"?`)) {
      const toastId = toast.loading("Excluindo perfil...");
      try {
        await deleteDoc(doc(db, 'roles', roleId));
        
        await logAudit(
          "Exclusão de Perfil", 
          `O perfil "${roleName}" (ID: ${roleId}) foi excluído.`, 
          `Perfil: ${roleName}`
        );

        toast.success("Perfil excluído com sucesso!", { id: toastId });
      } catch (err) {
        toast.error("Erro ao excluir: " + err.message, { id: toastId });
      }
    }
  };

  const renderList = () => {
    if (loading) {
      return (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} />
          <p>Carregando perfis...</p>
        </div>
      );
    }
    
    if (error) {
      if (error.code === 'permission-denied') {
        return (
          <div className={styles.loadingState} style={{color: '#ef4444'}}>
             <ShieldAlert size={48} />
             <h3>Acesso Negado</h3>
             <p>Você não tem permissão para visualizar a lista de perfis.</p>
          </div>
        );
      }
      return <p className={styles.errorText}>Erro técnico: {error.message}</p>;
    }

    if (roles && roles.docs.length === 0) {
      return (
        <div className={styles.emptyState}>
          <PackageSearch size={50} />
          <h3>Nenhum perfil encontrado</h3>
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {roles.docs.map(doc => {
          const role = doc.data();
          return (
            <div key={doc.id} className={styles.listItem}>
              <div className={styles.listItemContent}>
                <strong>{role.name}</strong>
                <small>ID: {doc.id}</small>
              </div>
              <div className={styles.listItemActions}>
                
                {/* Botão Editar */}
                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleOpenEdit(doc)}
                  disabled={!canManage}
                  style={{ opacity: !canManage ? 0.5 : 1, cursor: !canManage ? 'not-allowed' : 'pointer' }}
                >
                  <Pencil size={16} />
                  <span>Editar Permissões</span>
                </button>

                {/* Botão Excluir */}
                <button 
                  className={styles.iconButton}
                  onClick={() => handleDelete(doc)}
                  disabled={!canManage}
                  style={{ opacity: !canManage ? 0.5 : 1, cursor: !canManage ? 'not-allowed' : 'pointer' }}
                >
                  <Trash2 size={16} />
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
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingRoleDoc ? "Editar Perfil" : "Registrar Novo Perfil"}
      >
        <AddRoleForm 
          onClose={handleCloseModal}
          existingRoleDoc={editingRoleDoc}
        />
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Gerenciamento de Perfis</h1>
        
        {/* Botão Novo */}
        <button 
            className={styles.primaryButton} 
            onClick={handleOpenAddNew}
            disabled={!canManage}
            style={{ opacity: !canManage ? 0.5 : 1, cursor: !canManage ? 'not-allowed' : 'pointer' }}
        >
          <Plus size={18} /> Registrar Novo Perfil
        </button>
      </header>
      
      <div className={styles.content}>
        {renderList()}
      </div>
    </div>
  );
};

export default ProfileListPage;