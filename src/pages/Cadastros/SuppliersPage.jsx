import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Plus, Loader2, Search, Briefcase, Phone, Mail, Pencil, Package, Lock } from 'lucide-react';

// --- 1. IMPORTA AUTH ---
import { useAuth } from '/src/hooks/useAuth.js';

import styles from './CadastroPages.module.css'; 
import Modal from '../../components/Modal/Modal';
import AddSupplierForm from '../../components/Settings/AddSupplierForm';

const SuppliersPage = () => {
  // --- 2. VERIFICA SE É ADMIN (Gestor) ---
  // Apenas gestores podem mexer em contratos/fornecedores
  const { isAdmin } = useAuth(); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const q = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
  const [suppliers, loading, error] = useCollection(q);

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    const search = searchTerm.toLowerCase();
    return suppliers.docs.filter(doc => {
      const data = doc.data();
      return (
        data.name.toLowerCase().includes(search) ||
        (data.serviceType && data.serviceType.toLowerCase().includes(search))
      );
    });
  }, [suppliers, searchTerm]);

  const handleOpenAddNew = () => { setEditingDoc(null); setIsModalOpen(true); };
  const handleOpenEdit = (doc) => { setEditingDoc(doc); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setTimeout(() => setEditingDoc(null), 300); };

  return (
    <div className={styles.page}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingDoc ? "Editar Empresa" : "Registrar Nova Empresa"}>
        <AddSupplierForm onClose={handleCloseModal} existingData={editingDoc ? { id: editingDoc.id, ...editingDoc.data() } : null} />
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Empresas de Suporte</h1>
        
        {/* --- BOTÃO PROTEGIDO --- */}
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenAddNew}
          disabled={!isAdmin}
          style={{ opacity: !isAdmin ? 0.5 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
          title={!isAdmin ? "Apenas gestores podem adicionar empresas" : ""}
        >
          <Plus size={18} /> Registrar Empresa
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className={styles.content}>
        {loading && <div className={styles.loadingState}><Loader2 className={styles.spinner} /></div>}
        
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
                  {/* ... (telefones, emails) ... */}
                </div>
                <div className={styles.listItemActions}>
                  {/* --- BOTÃO EDITAR PROTEGIDO --- */}
                  <button 
                    className={styles.secondaryButton} 
                    onClick={() => handleOpenEdit(doc)}
                    disabled={!isAdmin}
                    style={{ opacity: !isAdmin ? 0.5 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
                  >
                    {isAdmin ? <Pencil size={16} /> : <Lock size={16} />}
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