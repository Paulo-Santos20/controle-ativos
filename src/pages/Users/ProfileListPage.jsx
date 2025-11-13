import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Loader2, Plus, Pencil, Trash2, PackageSearch } from 'lucide-react';
import { toast } from 'sonner';

// Reutiliza o CSS das outras páginas de cadastro (Princípio 5)
import styles from '../Cadastros/CadastroPages.module.css'; 
import Modal from '../../components/Modal/Modal';
// Importa o formulário de Perfil (com .jsx explícito para evitar erros de Vite)
import AddRoleForm from '../../components/Users/AddRoleForm.jsx';

// Importa o Logger de Auditoria
import { logAudit } from '/src/utils/auditLogger';

/**
 * Página para listar e gerenciar Perfis (Roles) do sistema.
 */
const ProfileListPage = () => {
  // Estado para controlar o modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleDoc, setEditingRoleDoc] = useState(null); 
  
  // Busca todos os perfis (roles) do sistema
  const q = query(collection(db, 'roles'), orderBy('name', 'asc'));
  const [roles, loading, error] = useCollection(q);

  // --- Funções de Controle do Modal ---
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
  
  // --- Ação de Deletar ---
  const handleDelete = async (roleDoc) => {
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
        
        // Log de Auditoria
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

  // Renderiza a lista de perfis
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
      return <p className={styles.errorText}>Erro ao carregar perfis: {error.message}</p>;
    }

    if (roles && roles.docs.length === 0) {
      return (
        <div className={styles.emptyState}>
          <PackageSearch size={50} />
          <h3>Nenhum perfil encontrado</h3>
          <p>Clique em "Registrar Novo Perfil" para criar um.</p>
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
                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleOpenEdit(doc)}
                >
                  <Pencil size={16} />
                  <span>Editar Permissões</span>
                </button>
                <button 
                  className={styles.iconButton}
                  title="Excluir Perfil"
                  onClick={() => handleDelete(doc)}
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
      {/* --- O Modal de Edição/Criação --- */}
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

      {/* --- Cabeçalho da Página --- */}
      <header className={styles.header}>
        <h1 className={styles.title}>Gerenciamento de Perfis</h1>
        <button className={styles.primaryButton} onClick={handleOpenAddNew}>
          <Plus size={18} /> Registrar Novo Perfil
        </button>
      </header>
      
      {/* --- Conteúdo da Lista --- */}
      <div className={styles.content}>
        {renderList()}
      </div>
    </div>
  );
};

export default ProfileListPage;