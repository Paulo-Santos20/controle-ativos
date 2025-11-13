import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Plus, Loader2, Search, Briefcase, Phone, Mail, Pencil, Package } from 'lucide-react';

import styles from './CadastroPages.module.css'; // Reutiliza CSS padrão
import Modal from '../../components/Modal/Modal';
import AddSupplierForm from '../../components/Settings/AddSupplierForm';

const SuppliersPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Busca fornecedores
  const q = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
  const [suppliers, loading, error] = useCollection(q);

  // Filtro
  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    const search = searchTerm.toLowerCase();
    return suppliers.docs.filter(doc => {
      const data = doc.data();
      return (
        data.name.toLowerCase().includes(search) ||
        (data.serviceType && data.serviceType.toLowerCase().includes(search)) ||
        (data.contactName && data.contactName.toLowerCase().includes(search))
      );
    });
  }, [suppliers, searchTerm]);

  const handleOpenAddNew = () => {
    setEditingDoc(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingDoc(doc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingDoc(null), 300);
  };

  return (
    <div className={styles.page}>
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingDoc ? "Editar Empresa" : "Registrar Nova Empresa"}
      >
        <AddSupplierForm 
          onClose={handleCloseModal} 
          existingData={editingDoc ? { id: editingDoc.id, ...editingDoc.data() } : null}
        />
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Empresas de Suporte</h1>
        <button className={styles.primaryButton} onClick={handleOpenAddNew}>
          <Plus size={18} /> Registrar Empresa
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, serviço ou contato..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Carregando empresas...</p>
          </div>
        )}
        
        {error && <p className={styles.errorText}>Erro: {error.message}</p>}

        {!loading && filteredSuppliers.length === 0 && (
           <div className={styles.emptyState}>
            <Package size={40} />
            <h3>Nenhuma empresa encontrada.</h3>
            <p>Cadastre seus fornecedores de manutenção e garantia aqui.</p>
          </div>
        )}

        <div className={styles.list}>
          {filteredSuppliers.map(doc => {
            const item = doc.data();
            return (
              <div key={doc.id} className={styles.listItem}>
                <div className={styles.listItemIcon}>
                  <Briefcase size={24} />
                </div>
                <div className={styles.listItemContent}>
                  <strong>{item.name}</strong>
                  <small>{item.serviceType}</small>
                  <div style={{display:'flex', gap:'12px', marginTop:'4px', fontSize:'0.85rem', color:'var(--color-text-secondary)'}}>
                    <span style={{display:'flex', alignItems:'center', gap:'4px'}}>
                        <Phone size={12}/> {item.phone} ({item.contactName})
                    </span>
                    <span style={{display:'flex', alignItems:'center', gap:'4px'}}>
                        <Mail size={12}/> {item.email}
                    </span>
                  </div>
                </div>
                <div className={styles.listItemActions}>
                  <button className={styles.secondaryButton} onClick={() => handleOpenEdit(doc)}>
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SuppliersPage;