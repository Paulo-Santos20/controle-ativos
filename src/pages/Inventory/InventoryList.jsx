import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { Plus, ChevronRight, Package, Loader2, Search, Filter } from 'lucide-react'; 

import styles from './InventoryList.module.css';
import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';

// --- Constantes para os Filtros (UI/UX) ---
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
  { value: 'Inativo', label: 'Inativo' },
];

const InventoryList = () => {
  // --- LÓGICA DO MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('select'); 

  // --- LÓGICA DE FILTROS ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");

  const [units, loadingUnits] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  // --- HOOK DE DADOS DINÂMICO (Performance Total) ---
  const assetsQuery = useMemo(() => {
    let constraints = [orderBy('createdAt', 'desc')]; // Começa com a ordenação

    // Adiciona filtros dinamicamente
    if (filterType !== "all") {
      constraints.push(where("type", "==", filterType));
    }
    if (filterStatus !== "all") {
      constraints.push(where("status", "==", filterStatus));
    }
    if (filterUnit !== "all") {
      constraints.push(where("unitId", "==", filterUnit));
    }

    // Retorna a consulta final
    return query(collection(db, 'assets'), ...constraints);
  }, [filterType, filterStatus, filterUnit]); // Dependências

  const [assets, loading, error] = useCollection(assetsQuery);

  // --- FILTRO DE TEXTO (Híbrido) ---
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    if (!searchTerm) return assets.docs; 

    const search = searchTerm.toLowerCase();
    return assets.docs.filter(doc => {
      const data = doc.data();
      return (
        doc.id.toLowerCase().includes(search) || // Tombamento (ID)
        (data.serial && data.serial.toLowerCase().includes(search)) ||
        (data.hostname && data.hostname.toLowerCase().includes(search))
      );
    });
  }, [assets, searchTerm]); 

  // --- Funções de estilo e modal ---
  const getStatusClass = (status) => {
    if (status === 'Em uso') return styles.statusUsage;
    if (status === 'Em manutenção') return styles.statusMaintenance;
    if (status === 'Inativo') return styles.statusInactive;
    if (status === 'Estoque') return styles.statusStock;
    return '';
  };

  const handleOpenModal = () => {
    setModalView('select');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setModalView('select'), 300); 
  };

  const renderModalContent = () => {
    switch (modalView) {
      case 'select':
        return <AssetTypeSelector onSelectType={setModalView} />;
      case 'computer':
        return <AddAssetForm onClose={handleCloseModal} onBack={() => setModalView('select')} />;
      case 'printer':
        return <AddPrinterForm onClose={handleCloseModal} onBack={() => setModalView('select')} />;
      default:
        return null;
    }
  };

  // Componente de UI para a lista (COMPLETO)
  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} />
          <p>Carregando inventário...</p>
        </div>
      );
    }
    if (error) {
      // ⚠️ Mensagem de erro do Firestore (para o índice)
      if (error.code === 'failed-precondition') {
        return (
          <div className={styles.errorState}>
            <h3>⚠️ Consulta requer um Índice</h3>
            <p>Você está combinando filtros. O Firestore precisa de um índice composto para isso.</p>
            <p>Abra o console (F12), encontre o link no erro do Firestore e clique nele para criar o índice automaticamente.</p>
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
          <p>Tente ajustar seus filtros ou registre um novo ativo.</p>
        </div>
      );
    }

    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tombamento (ID)</th>
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
      
      {/* --- MODAL CORRIGIDO --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        // Lógica do título dinâmico (CORRIGIDA)
        title={
          modalView === 'select' ? "Registrar Novo Ativo" :
          modalView === 'computer' ? "Registrar Novo Computador" :
          "Registrar Nova Impressora"
        }
      >
        {renderModalContent()}
      </Modal>

      {/* --- CABEÇALHO --- */}
      <header className={styles.header}>
        <h1 className={styles.title}>Inventário de Ativos</h1>
        <button className={styles.primaryButton} onClick={handleOpenModal}>
          <Plus size={18} /> Registrar Novo Ativo
        </button>
      </header>

      {/* --- TOOLBAR DE FILTROS --- */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por Tombamento, Serial, Hostname..." 
            className={styles.searchInput} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>
            {opcoesTipo.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>
            {opcoesStatus.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className={styles.filterSelect}>
            <option value="all">Todas as Unidades</option>
            {loadingUnits && <option>Carregando...</option>}
            {units?.docs.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.data().sigla}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* --- CONTEÚDO --- */}
      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  );
};

export default InventoryList;