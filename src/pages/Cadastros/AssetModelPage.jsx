import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query, where } from 'firebase/firestore'; 
import { db } from '/src/lib/firebase.js';
import { Plus, Loader2, Search, Laptop, ChevronRight, Package, Printer, HardDrive, Pencil } from 'lucide-react';

// --- 1. IMPORTA AUTH ---
import { useAuth } from '/src/hooks/useAuth.js';

import styles from './CadastroPages.module.css'; 
import Modal from '../../components/Modal/Modal';
import AddAssetForm from '../../components/Inventory/AddAssetForm'; 
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';
import EditAssetForm from '../../components/Inventory/EditAssetForm'; 
import EditPrinterForm from '../../components/Inventory/EditPrinterForm';

const TypeIcon = ({ type }) => {
  if (type === 'computador') return <Laptop size={20} />;
  if (type === 'impressora') return <Printer size={20} />;
  return <HardDrive size={20} />; 
};

const AssetModelPage = ({ type, title }) => {
  // --- 2. LÓGICA DE PERMISSÃO ---
  const { isAdmin, allowedUnits, permissions, loading: authLoading } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssetDoc, setEditingAssetDoc] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");

  // --- 3. QUERY SEGURA ---
  const q = useMemo(() => {
    if (authLoading) return null;

    let constraints = [
      where('type', '==', type), 
      orderBy('createdAt', 'desc')
    ];

    // Filtra por unidade se não for admin
    if (!isAdmin) {
        if (allowedUnits.length > 0) {
            constraints.push(where('unitId', 'in', allowedUnits));
        } else {
            constraints.push(where('unitId', '==', 'BLOQUEADO'));
        }
    }

    return query(collection(db, 'assets'), ...constraints);
  }, [type, isAdmin, allowedUnits, authLoading]);
  
  const [assets, loading, error] = useCollection(q);

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    if (!searchTerm) return assets.docs; 

    const search = searchTerm.toLowerCase();
    return assets.docs.filter(doc => {
      const data = doc.data();
      return (
        doc.id.toLowerCase().includes(search) || 
        (data.serial && data.serial.toLowerCase().includes(search)) ||
        (data.setor && data.setor.toLowerCase().includes(search)) ||
        (data.hostname && data.hostname.toLowerCase().includes(search))
      );
    });
  }, [assets, searchTerm]);
  
  const handleOpenAddNew = () => {
    setEditingAssetDoc(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (assetDoc) => {
    setEditingAssetDoc(assetDoc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingAssetDoc(null), 300);
  };

  const getStatusClass = (status) => {
    if (status === 'Em uso') return styles.statusUsage;
    if (status === 'Em manutenção') return styles.statusMaintenance;
    if (status === 'Estoque') return styles.statusStock;
    if (status === 'Inativo') return styles.statusInactive;
    return '';
  };
  
  const renderModalContent = () => {
    const isEditing = !!editingAssetDoc;

    if (type === 'computador') {
      return isEditing ? (
        <EditAssetForm onClose={handleCloseModal} assetId={editingAssetDoc.id} existingData={editingAssetDoc.data()} />
      ) : (
        <AddAssetForm onClose={handleCloseModal} />
      );
    }
    if (type === 'impressora') {
      return isEditing ? (
        <EditPrinterForm onClose={handleCloseModal} assetId={editingAssetDoc.id} existingData={editingAssetDoc.data()} />
      ) : (
        <AddPrinterForm onClose={handleCloseModal} />
      );
    }
    return <p className={styles.errorText}>Erro: Tipo de formulário não reconhecido.</p>;
  };

  return (
    <div className={styles.page}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAssetDoc ? `Editar ${title.slice(0, -1)}` : `Registrar Novo ${title.slice(0, -1)}`}>
        {renderModalContent()}
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Cadastro de {title}</h1>
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenAddNew}
          // --- 4. BOTÃO PROTEGIDO ---
          disabled={!permissions?.ativos?.create}
          title={!permissions?.ativos?.create ? "Sem permissão para registrar" : ""}
          style={{ opacity: !permissions?.ativos?.create ? 0.6 : 1 }}
        >
          <Plus size={18} /> Registrar Novo {title.slice(0, -1)}
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder={`Buscar em ${title.toLowerCase()} (tombamento, serial, setor)...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        {(loading || authLoading) && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Carregando {title.toLowerCase()}...</p>
          </div>
        )}
        
        {error && <p className={styles.errorText}>Erro: {error.message}</p>}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tombamento (ID)</th>
                <th>Status</th>
                <th>Setor</th>
                <th className={styles.hideMobile}>Modelo</th>
                <th className={styles.hideMobile}>Serial</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets && filteredAssets.map(doc => {
                const asset = doc.data();
                return (
                  <tr key={doc.id}>
                    <td data-label="Tombamento">{doc.id}</td>
                    <td data-label="Status">
                      <span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td data-label="Setor">{asset.setor}</td>
                    <td data-label="Modelo" className={styles.hideMobile}>{asset.modelo}</td>
                    <td data-label="Serial" className={styles.hideMobile}>{asset.serial}</td>
                    
                    <td className={styles.actionCell}>
                      <Link to={`/inventory/${doc.id}`} className={styles.detailsButton}>
                        Ver <ChevronRight size={16} />
                      </Link>
                      
                      {/* --- 5. BOTÃO EDITAR PROTEGIDO --- */}
                      {permissions?.ativos?.update && (
                        <button 
                          className={styles.iconButton} 
                          title="Editar"
                          onClick={() => handleOpenEdit(doc)}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && !authLoading && filteredAssets?.length === 0 && (
           <div className={styles.emptyState}>
            <Package size={40} />
            <h3>Nenhum {title.toLowerCase()} encontrado.</h3>
            <p>Clique no botão acima para registrar o primeiro.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetModelPage;