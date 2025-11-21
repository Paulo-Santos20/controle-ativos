import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query, where } from 'firebase/firestore'; 
import { db } from '../../lib/firebase';
import { Plus, Loader2, Search, Laptop, ChevronRight, Package, Printer, HardDrive, Pencil, ShieldAlert } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';

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
  const { isAdmin, allowedUnits, permissions, loading: authLoading } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssetDoc, setEditingAssetDoc] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");

  // --- QUERY SEGURA ---
  const q = useMemo(() => {
    if (authLoading) return null;

    let constraints = [
      where('type', '==', type), 
      orderBy('createdAt', 'desc')
    ];

    // Lógica Estrita: Se tem lista, filtra. Se não é admin, bloqueia.
    if (allowedUnits && allowedUnits.length > 0) {
        constraints.push(where('unitId', 'in', allowedUnits));
    } else if (!isAdmin) {
        constraints.push(where('unitId', '==', 'BLOQUEADO'));
    }

    return query(collection(db, 'assets'), ...constraints);
  }, [type, isAdmin, allowedUnits, authLoading]);
  
  const [assets, loading, error] = useCollection(q);

  // --- FILTRAGEM VISUAL ---
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    
    // Helper
    const cleanId = (id) => String(id || '').trim();
    const safeAllowed = allowedUnits.map(u => cleanId(u));
    const hasSpecificUnits = safeAllowed.length > 0;

    let result = assets.docs.filter(doc => {
        const data = doc.data();
        const assetUnitId = cleanId(data.unitId);

        // Segurança Visual
        if (hasSpecificUnits) {
            if (!safeAllowed.includes(assetUnitId)) return false;
        } else if (!isAdmin) {
            return false;
        }
        return true;
    });

    if (searchTerm) {
        const search = searchTerm.toLowerCase();
        result = result.filter(doc => {
          const data = doc.data();
          return (
            doc.id.toLowerCase().includes(search) || 
            (data.serial && data.serial.toLowerCase().includes(search)) ||
            (data.setor && data.setor.toLowerCase().includes(search)) ||
            (data.hostname && data.hostname.toLowerCase().includes(search))
          );
        });
    }
    return result;
  }, [assets, searchTerm, isAdmin, allowedUnits]);
  
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
    return <p className={styles.errorText}>Erro: Tipo não reconhecido.</p>;
  };

  if (!authLoading && !isAdmin && allowedUnits.length === 0) {
      return (
          <div className={styles.loadingState}>
              <ShieldAlert size={48} color="#ef4444" />
              <h3>Acesso Negado</h3>
              <p>Você não tem permissão para visualizar ativos.</p>
          </div>
      );
  }

  return (
    <div className={styles.page}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAssetDoc ? `Editar ${title.slice(0)}` : `Registrar Novo ${title.slice(0, -1)}`}>
        {renderModalContent()}
      </Modal>

      {/* 1. CABEÇALHO */}
      <header className={styles.header}>
        <h1 className={styles.title}>Cadastro de {title}</h1>
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenAddNew}
          disabled={!permissions?.ativos?.create}
          title={!permissions?.ativos?.create ? "Sem permissão para registrar" : ""}
          style={{ opacity: !permissions?.ativos?.create ? 0.6 : 1 }}
        >
          <Plus size={18} /> Registrar Novo {title.slice(0, -1)}
        </button>
      </header>

      {/* 2. BARRA DE BUSCA (AQUI É O LUGAR CORRETO) */}
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

      {/* 3. CONTEÚDO (TABELA OU MENSAGEM DE VAZIO) */}
      <div className={styles.content}>
        {(loading || authLoading) && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Carregando {title.toLowerCase()}...</p>
          </div>
        )}
        
        {error && (
            <div className={styles.errorState}>
                <p>Erro ao carregar: {error.message}</p>
            </div>
        )}

        {/* Exibe Empty State APENAS se não houver loading, erro E a lista estiver vazia */}
        {!loading && !error && filteredAssets.length === 0 && (
           <div className={styles.emptyState}>
            <Package size={40} />
            <h3>Nenhum {title.toLowerCase().slice(0,-1)} encontrado.</h3>
            <p>Tente ajustar a busca ou clique em registrar.</p>
          </div>
        )}

        {/* Exibe Tabela APENAS se houver itens */}
        {!loading && !error && filteredAssets.length > 0 && (
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
                {filteredAssets.map(doc => {
                  const asset = doc.data();
                  return (
                    <tr key={doc.id}>
                      <td data-label="Tombamento"><strong>{doc.id}</strong></td>
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
        )}
      </div>
    </div>
  );
};

export default AssetModelPage;