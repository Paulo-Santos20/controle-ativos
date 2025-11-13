import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { Plus, ChevronRight, Package, Loader2, Search, Filter, Archive } from 'lucide-react'; 

import styles from './InventoryList.module.css';
import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';

const opcoesTipo = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'computador', label: 'Computadores' },
  { value: 'impressora', label: 'Impressoras' },
];
const opcoesStatus = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'Em uso', label: 'Em uso' },
  { value: 'Estoque', label: 'Estoque' },
  { value: 'Manutenção', label: 'Manutenção' },
  { value: 'Devolvido', label: 'Devolvido' }, // Adicionado aqui
  { value: 'Inativo', label: 'Inativo' },
];

const InventoryList = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('select'); 

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  
  // --- NOVO ESTADO: Mostrar Devolvidos ---
  const [showReturned, setShowReturned] = useState(false); 

  const [units] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  // Consulta Dinâmica (Servidor)
  const assetsQuery = useMemo(() => {
    let constraints = [orderBy('createdAt', 'desc')];

    if (filterType !== "all") constraints.push(where("type", "==", filterType));
    if (filterStatus !== "all") constraints.push(where("status", "==", filterStatus));
    if (filterUnit !== "all") constraints.push(where("unitId", "==", filterUnit));

    return query(collection(db, 'assets'), ...constraints);
  }, [filterType, filterStatus, filterUnit]);

  const [assets, loading, error] = useCollection(assetsQuery);

  // --- FILTRAGEM HÍBRIDA (Texto + Regra de Devolvido) ---
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    
    let result = assets.docs;

    // 1. Regra de Devolvidos: 
    // Se 'showReturned' for false, removemos tudo que é 'Devolvido'
    if (!showReturned) {
      result = result.filter(doc => doc.data().status !== 'Devolvido');
    }

    // 2. Filtro de Texto (Search)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(doc => {
        const data = doc.data();
        return (
          doc.id.toLowerCase().includes(search) ||
          (data.serial && data.serial.toLowerCase().includes(search)) ||
          (data.hostname && data.hostname.toLowerCase().includes(search))
        );
      });
    }

    return result;
  }, [assets, searchTerm, showReturned]); // Depende do showReturned

  // Estilos
  const getStatusClass = (status) => {
    if (status === 'Em uso') return styles.statusUsage;
    if (status === 'Em manutenção') return styles.statusMaintenance;
    if (status === 'Inativo') return styles.statusInactive;
    if (status === 'Estoque') return styles.statusStock;
    if (status === 'Devolvido') return styles.statusReturned; // Novo estilo
    return '';
  };

  const handleOpenModal = () => { setModalView('select'); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setTimeout(() => setModalView('select'), 300); };
  const renderModalContent = () => {
    switch (modalView) {
      case 'select': return <AssetTypeSelector onSelectType={setModalView} />;
      case 'computer': return <AddAssetForm onClose={handleCloseModal} />;
      case 'printer': return <AddPrinterForm onClose={handleCloseModal} />;
      default: return null;
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className={styles.loadingState}><Loader2 className={styles.spinner} /><p>Carregando inventário...</p></div>;
    }
    if (error) {
      // --- ADICIONE ESTA LINHA: ---
      console.error("ERRO FIRESTORE (CLIQUE NO LINK ABAIXO):", error);
      // ----------------------------

      if (error.code === 'failed-precondition') {
        return (
          <div className={styles.errorState}>
            <h3>⚠️ Consulta requer um Índice</h3>
            {/* ... */}
          </div>
        );
      }
      return <p className={styles.errorText}>Erro ao carregar inventário: {error.message}</p>;
    }
    
    if (filteredAssets.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Package size={50} />
          <h2>Nenhum ativo encontrado</h2>
          <p>
            {showReturned ? "Tente ajustar os filtros." : "Os itens devolvidos estão ocultos. Marque a opção 'Mostrar Devolvidos' para vê-los."}
          </p>
        </div>
      );
    }

    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tombamento</th>
              <th>Tipo</th>
              <th>Status</th>
              <th className={styles.hideMobile}>Setor</th>
              <th className={styles.hideMobile}>Serial</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map(doc => {
              const asset = doc.data();
              return (
                <tr key={doc.id}>
                  <td data-label="Tombamento">{doc.id}</td>
                  <td data-label="Tipo">{asset.tipoAtivo || asset.type}</td>
                  <td data-label="Status">
                    <span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td data-label="Setor" className={styles.hideMobile}>{asset.setor}</td>
                  <td data-label="Serial" className={styles.hideMobile}>{asset.serial}</td>
                  <td className={styles.actionCell}>
                    <Link to={`/inventory/${doc.id}`} className={styles.detailsButton}>
                      Ver <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalView === 'select' ? "Registrar Novo Ativo" : modalView === 'computer' ? "Registrar Novo Computador" : "Registrar Nova Impressora"}>
        {renderModalContent()}
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Inventário de Ativos</h1>
        <button className={styles.primaryButton} onClick={handleOpenModal}>
          <Plus size={18} /> Registrar Novo Ativo
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input type="text" placeholder="Buscar..." className={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <Filter size={16} />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>
              {opcoesTipo.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>
              {opcoesStatus.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className={styles.filterSelect}>
              <option value="all">Todas as Unidades</option>
              {units?.docs.map(doc => <option key={doc.id} value={doc.id}>{doc.data().sigla}</option>)}
            </select>
          </div>

          {/* --- CHECKBOX MOSTRAR DEVOLVIDOS --- */}
          <label className={styles.checkboxFilter}>
            <input 
              type="checkbox" 
              checked={showReturned} 
              onChange={(e) => setShowReturned(e.target.checked)} 
            />
            <Archive size={16} />
            Mostrar Devolvidos
          </label>
        </div>
      </div>
      
      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  );
};

export default InventoryList;