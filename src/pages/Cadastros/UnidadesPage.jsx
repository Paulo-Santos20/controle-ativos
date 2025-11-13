import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Plus, Building, Loader2, Search, MapPin, Pencil, Lock } from 'lucide-react'; // Lock icon

// --- 1. IMPORTA AUTH ---
import { useAuth } from '/src/hooks/useAuth.js';

import styles from './CadastroPages.module.css';
import Modal from '../../components/Modal/Modal';
import AddUnitForm from '../../components/Settings/AddUnitForm';

const UnidadesPage = () => {
  // --- 2. VERIFICA PERMISSÕES ---
  const { permissions } = useAuth();
  const canManageUnits = permissions?.cadastros_unidades?.update; // Ou create

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnitDoc, setEditingUnitDoc] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");

  const q = query(collection(db, 'units'), orderBy('name', 'asc'));
  const [units, loading, error] = useCollection(q);

  const filteredUnits = units?.docs.filter(doc => {
    if (!searchTerm) return true;
    const data = doc.data();
    const search = searchTerm.toLowerCase();
    return (
      data.name.toLowerCase().includes(search) ||
      data.sigla.toLowerCase().includes(search) ||
      doc.id.toLowerCase().includes(search)
    );
  });

  const handleOpenAddNew = () => {
    setEditingUnitDoc(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unitDoc) => {
    setEditingUnitDoc(unitDoc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingUnitDoc(null), 300); 
  };
  
  const renderList = () => {
    if (loading) return <div className={styles.loadingState}><Loader2 className={styles.spinner} /><p>Carregando unidades...</p></div>;
    if (error) return <p className={styles.errorText}>Erro: {error.message}</p>;

    return (
      <div className={styles.list}>
        {filteredUnits?.map(doc => {
          const unit = doc.data();
          return (
            <div key={doc.id} className={styles.listItem}>
              <div className={styles.listItemIcon}>
                <Building size={24} />
              </div>
              <div className={styles.listItemContent}>
                <strong>{unit.name} ({unit.sigla})</strong>
                <small>CNPJ: {doc.id} | {unit.cidade}-{unit.estado}</small>
              </div>
              <div className={styles.listItemActions}>
                {unit.geolocalizacao && (
                  <a href={unit.geolocalizacao} target="_blank" rel="noopener noreferrer" className={styles.iconButton}>
                    <MapPin size={18} />
                  </a>
                )}
                
                {/* --- BOTÃO PROTEGIDO --- */}
                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleOpenEdit(doc)}
                  disabled={!canManageUnits}
                  title={!canManageUnits ? "Sem permissão para editar" : "Editar"}
                  style={{ opacity: !canManageUnits ? 0.5 : 1, cursor: !canManageUnits ? 'not-allowed' : 'pointer' }}
                >
                  {canManageUnits ? <Pencil size={16} /> : <Lock size={16} />}
                  <span>Editar</span>
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
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUnitDoc ? "Editar Unidade" : "Registrar Nova Unidade"}>
        <AddUnitForm onClose={handleCloseModal} existingUnitDoc={editingUnitDoc} />
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Cadastro de Unidades</h1>
        
        {/* --- BOTÃO NOVO PROTEGIDO --- */}
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenAddNew}
          disabled={!canManageUnits}
          style={{ opacity: !canManageUnits ? 0.5 : 1, cursor: !canManageUnits ? 'not-allowed' : 'pointer' }}
        >
          <Plus size={18} /> Registrar Nova Unidade
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className={styles.content}>
        {renderList()}
      </div>
    </div>
  );
};

export default UnidadesPage;