import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Plus, Building, Loader2, Search, MapPin, Pencil } from 'lucide-react';

import styles from './CadastroPages.module.css';
import Modal from '../../components/Modal/Modal';
import AddUnitForm from '../../components/Settings/AddUnitForm';

const UnidadesPage = () => {
  // --- LÓGICA DE MODAL ATUALIZADA ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Guarda o doc da unidade a ser editada (null se for para "criar")
  const [editingUnitDoc, setEditingUnitDoc] = useState(null); 
  
  const [searchTerm, setSearchTerm] = useState("");

  const q = query(collection(db, 'units'), orderBy('name', 'asc'));
  const [units, loading, error] = useCollection(q);

  // Lógica do filtro (sem alteração)
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

  // --- NOVAS FUNÇÕES PARA O MODAL ---
  const handleOpenAddNew = () => {
    setEditingUnitDoc(null); // Limpa o estado de edição
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unitDoc) => {
    setEditingUnitDoc(unitDoc); // Define qual unidade editar
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Limpa o estado de edição ao fechar (boa prática)
    // Damos um pequeno delay para a animação de fechar do modal
    setTimeout(() => setEditingUnitDoc(null), 300); 
  };
  
  // Componente de UI para a lista (atualizado com o novo onClick)
  const renderList = () => {
    if (loading) {
      return (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} />
          <p>Carregando unidades...</p>
        </div>
      );
    }
    if (error) {
      return <p className={styles.errorText}>Erro: {error.message}</p>;
    }
    if (filteredUnits.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h3>Nenhuma unidade encontrada</h3>
          <p>Verifique seu filtro ou registre uma nova unidade.</p>
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {filteredUnits.map(doc => {
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
                  <a 
                    href={unit.geolocalizacao} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.iconButton}
                    title="Abrir no Google Maps"
                  >
                    <MapPin size={18} />
                  </a>
                )}
                {/* --- BOTÃO DE EDITAR AGORA É FUNCIONAL --- */}
                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleOpenEdit(doc)} // Passa o doc inteiro
                >
                  <Pencil size={16} />
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
      {/* O Modal agora é dinâmico */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingUnitDoc ? "Editar Unidade" : "Registrar Nova Unidade"}
      >
        {/* Passa a unidade para o formulário */}
        <AddUnitForm 
          onClose={handleCloseModal} 
          existingUnitDoc={editingUnitDoc} // Passa o doc para o form
        />
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Cadastro de Unidades</h1>
        {/* O botão de novo agora usa a nova função */}
        <button className={styles.primaryButton} onClick={handleOpenAddNew}>
          <Plus size={18} /> Registrar Nova Unidade
        </button>
      </header>

      {/* Barra de Filtro (sem alteração) */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, sigla ou CNPJ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        {renderList()}
      </div>
    </div>
  );
};

export default UnidadesPage;