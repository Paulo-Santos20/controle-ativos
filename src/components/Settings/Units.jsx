import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Plus, Building, Loader2 } from 'lucide-react';

import styles from './SettingsTabs.module.css'; // Um CSS genérico para as abas
import Modal from '../Modal/Modal';
import AddUnitForm from './AddUnitForm';

const Units = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Busca as unidades para listar
  const q = query(collection(db, 'units'), orderBy('name', 'asc'));
  const [units, loading, error] = useCollection(q);

  return (
    <div className={styles.tabContent}>
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Registrar Nova Unidade"
      >
        <AddUnitForm onClose={() => setIsModalOpen(false)} />
      </Modal>

      <header className={styles.tabHeader}>
        <h2>Gerenciar Unidades</h2>
        <button className={styles.primaryButton} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Registrar Nova Unidade
        </button>
      </header>

      {loading && (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} />
          <p>Carregando unidades...</p>
        </div>
      )}
      
      {error && <p className={styles.errorText}>Erro: {error.message}</p>}

      <div className={styles.list}>
        {units && units.docs.map(doc => {
          const unit = doc.data();
          return (
            <div key={doc.id} className={styles.listItem}>
              <div className={styles.listItemIcon}>
                <Building size={20} />
              </div>
              <div className={styles.listItemContent}>
                <strong>{unit.name} ({unit.sigla})</strong>
                <small>CNPJ: {doc.id} | {unit.cidade}-{unit.estado}</small>
              </div>
              <button className={styles.secondaryButton}>Editar</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Units;