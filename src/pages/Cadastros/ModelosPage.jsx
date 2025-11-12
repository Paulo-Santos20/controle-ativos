import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Plus, Loader2, Search, HardDrive, Printer, Laptop } from 'lucide-react';

import styles from './CadastroPages.module.css'; // <-- Reutiliza o mesmo CSS
import Modal from '../../components/Modal/Modal';
import AddAssetModelForm from '../../components/Settings/AddAssetModelForm'; // <-- Reutiliza o form!

// Helper de Ícone
const TypeIcon = ({ type }) => {
  if (type === 'computador') return <Laptop size={20} />;
  if (type === 'impressora') return <Printer size={20} />;
  return <HardDrive size={20} />; // Padrão
};

const ModelosPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Busca os modelos para listar
  const q = query(collection(db, 'assetModels'), orderBy('name', 'asc'));
  const [models, loading, error] = useCollection(q);

  // Lógica do filtro (UI/UX)
  const filteredModels = models?.docs.filter(doc => {
    const data = doc.data();
    const search = searchTerm.toLowerCase();
    return (
      data.name.toLowerCase().includes(search) ||
      data.manufacturer.toLowerCase().includes(search) ||
      data.type.toLowerCase().includes(search) ||
      doc.id.toLowerCase().includes(search) // Busca pelo ID (SKU)
    );
  });

  return (
    <div className={styles.page}>
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Registrar Novo Modelo (PC/Imp)"
      >
        <AddAssetModelForm onClose={() => setIsModalOpen(false)} />
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Cadastro de Modelos</h1>
        <button className={styles.primaryButton} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Registrar Novo Modelo
        </button>
      </header>

      {/* Barra de Filtro */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, fabricante, tipo ou ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Conteúdo da Lista */}
      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Carregando modelos...</p>
          </div>
        )}
        
        {error && <p className={styles.errorText}>Erro: {error.message}</p>}

        <div className={styles.list}>
          {filteredModels && filteredModels.map(doc => {
            const model = doc.data();
            return (
              <div key={doc.id} className={styles.listItem}>
                <div className={styles.listItemIcon}>
                  <TypeIcon type={model.type} />
                </div>
                <div className={styles.listItemContent}>
                  <strong>{model.name} ({model.manufacturer})</strong>
                  <small>ID: {doc.id} | Tipo: {model.type}</small>
                </div>
                <button className={styles.secondaryButton}>Editar</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModelosPage;