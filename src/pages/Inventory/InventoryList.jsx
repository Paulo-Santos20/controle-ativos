import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase'; 
import { 
  Plus, ChevronRight, Package, Loader2, Search, Filter, Archive, 
  CheckSquare, Square, Truck, ArrowDownCircle, X 
} from 'lucide-react'; 

import { useAuth } from '../../hooks/useAuth';
// --- 1. IMPORTA O NOVO HOOK ---
import { useInventoryQuery } from '../../hooks/useInventoryQuery'; 

import styles from './InventoryList.module.css';
import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';
import BulkMoveForm from '../../components/Inventory/BulkMoveForm';

const opcoesTipo = [{ value: 'all', label: 'Todos os Tipos' }, { value: 'computador', label: 'Computadores' }, { value: 'impressora', label: 'Impressoras' }];
const opcoesStatus = [{ value: 'all', label: 'Todos os Status' }, { value: 'Em uso', label: 'Em uso' }, { value: 'Estoque', label: 'Estoque' }, { value: 'Manutenção', label: 'Manutenção' }, { value: 'Devolvido', label: 'Devolvido' }, { value: 'Inativo', label: 'Inativo' }];

const InventoryList = () => {
  const { isAdmin, allowedUnits, permissions } = useAuth();

  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('select'); 
  const [selectedIds, setSelectedIds] = useState([]);

  // Estados de Filtro (Controlados localmente)
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  const [showReturned, setShowReturned] = useState(false); 
  const [unitsList, setUnitsList] = useState([]);

  // Debounce da busca (0.5s)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Busca lista de unidades para o filtro (apenas uma vez)
  useEffect(() => {
    const fetchUnits = async () => {
      const q = query(collection(db, 'units'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setUnitsList(snap.docs);
    };
    fetchUnits();
  }, []);

  // --- 2. USA O REACT QUERY ---
  const {
    data,            // Os dados cacheados
    fetchNextPage,   // Função para carregar mais
    hasNextPage,     // Tem mais páginas?
    isFetchingNextPage, // Está carregando a próxima?
    isLoading,       // Está carregando a primeira?
    isError,
    error,
    refetch          // Força recarregamento
  } = useInventoryQuery({
    filters: { 
      searchTerm: debouncedSearch, 
      type: filterType, 
      status: filterStatus, 
      unit: filterUnit 
    },
    isAdmin,
    allowedUnits
  });

  // --- 3. PROCESSA OS DADOS (Flat) ---
  // O React Query retorna páginas, precisamos "achatar" em uma lista única
  const assets = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  // Filtro Visual (Devolvidos) e Segurança Extra (Busca)
  const filteredAssetsDisplay = useMemo(() => {
    let result = assets;
    
    // Regra de Devolvido
    if (!showReturned) {
      result = result.filter(asset => asset.status !== 'Devolvido');
    }

    // Filtro extra de segurança para a Busca Textual (já que a query por ID não filtra unidade)
    if (debouncedSearch && !isAdmin) {
      result = result.filter(asset => allowedUnits.includes(asset.unitId));
    }

    return result;
  }, [assets, showReturned, debouncedSearch, isAdmin, allowedUnits]);


  // --- UI Helpers e Handlers ---
  const getStatusClass = (status) => {
    if (status === 'Em uso') return styles.statusUsage;
    if (status === 'Em manutenção') return styles.statusMaintenance;
    if (status === 'Inativo') return styles.statusInactive;
    if (status === 'Estoque') return styles.statusStock;
    if (status === 'Devolvido') return styles.statusReturned;
    return '';
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAssetsDisplay.length) setSelectedIds([]); 
    else setSelectedIds(filteredAssetsDisplay.map(a => a.id));
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleOpenModal = (view) => { setModalView(view); setIsModalOpen(true); };
  const handleCloseModal = () => { 
    setIsModalOpen(false); 
    setTimeout(() => setModalView('select'), 300); 
    refetch(); // Atualiza a lista ao fechar o modal para ver o novo item
  };
  const handleBulkSuccess = () => { setSelectedIds([]); refetch(); };

  const renderModalContent = () => {
    switch (modalView) {
      case 'select': return <AssetTypeSelector onSelectType={setModalView} />;
      case 'computer': return <AddAssetForm onClose={handleCloseModal} />;
      case 'printer': return <AddPrinterForm onClose={handleCloseModal} />;
      case 'bulk_move': return <BulkMoveForm onClose={handleCloseModal} selectedIds={selectedIds} onSuccess={handleBulkSuccess} />;
      default: return null;
    }
  };

  const renderContent = () => {
    if (isLoading) return <div className={styles.loadingState}><Loader2 className={styles.spinner} /><p>Carregando inventário...</p></div>;
    
    if (isError) {
      if (error?.code === 'failed-precondition') {
        return <div className={styles.errorState}><h3>⚠️ Índice Necessário</h3><p>Abra o console (F12) para criar o índice.</p></div>;
      }
      return <p className={styles.errorText}>Erro: {error.message}</p>;
    }

    if (filteredAssetsDisplay.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Package size={50} />
          <h2>Nenhum ativo encontrado</h2>
          <p>{searchTerm ? "Tente outro termo." : "Ajuste os filtros."}</p>
        </div>
      );
    }

    const isAllSelected = filteredAssetsDisplay.length > 0 && selectedIds.length === filteredAssetsDisplay.length;

    return (
      <>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{width: '50px', textAlign: 'center'}}>
                  <button onClick={handleSelectAll} className={styles.checkboxButton}>
                    {isAllSelected ? <CheckSquare size={22} color="#2563eb" strokeWidth={2.5} /> : <Square size={22} color="#64748b" strokeWidth={2} />}
                  </button>
                </th>
                <th>Tombamento</th>
                <th>Tipo</th>
                <th>Status</th>
                <th className={styles.hideMobile}>Unidade</th>
                <th className={styles.hideMobile}>Setor</th>
                <th className={styles.hideMobile}>Serial</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssetsDisplay.map(asset => {
                const isSelected = selectedIds.includes(asset.id);
                return (
                  <tr key={asset.id} className={isSelected ? styles.rowSelected : ''}>
                    <td style={{textAlign: 'center'}}>
                      <button onClick={() => handleSelectOne(asset.id)} className={styles.checkboxButton}>
                        {isSelected ? <CheckSquare size={22} color="#2563eb" strokeWidth={2.5} /> : <Square size={22} color="#94a3b8" strokeWidth={2} />}
                      </button>
                    </td>
                    <td data-label="Tombamento"><strong>{asset.id}</strong></td>
                    <td data-label="Tipo">{asset.tipoAtivo || asset.type}</td>
                    <td data-label="Status"><span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>{asset.status}</span></td>
                    <td data-label="Unidade" className={styles.hideMobile}>{asset.unitId}</td>
                    <td data-label="Setor" className={styles.hideMobile}>{asset.setor}</td>
                    <td data-label="Serial" className={styles.hideMobile}>{asset.serial}</td>
                    <td className={styles.actionCell}>
                      <Link to={`/inventory/${asset.id}`} className={styles.detailsButton}><ChevronRight size={16} /> Ver</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* --- BOTÃO CARREGAR MAIS (PAGINAÇÃO) --- */}
        {hasNextPage && !searchTerm && (
          <div className={styles.loadMoreContainer}>
            <button 
              className={styles.loadMoreButton} 
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? <Loader2 className={styles.spinner} size={18} /> : <ArrowDownCircle size={18} />}
              Carregar Mais
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.page}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalView === 'bulk_move' ? "Movimentação em Massa" : "Registrar Novo Ativo"}>
        {renderModalContent()}
      </Modal>

      {selectedIds.length > 0 && (
        <div className={styles.bulkActionBar}>
          <div className={styles.bulkInfo}><strong>{selectedIds.length}</strong> selecionados</div>
          <div className={styles.bulkActions}>
            <button className={styles.bulkButton} onClick={() => handleOpenModal('bulk_move')} disabled={!permissions?.ativos?.update}>
              <Truck size={18} /> Mover Selecionados
            </button>
          </div>
          <button className={styles.closeBulk} onClick={() => setSelectedIds([])}>Cancelar</button>
        </div>
      )}

      <header className={styles.header}>
        <h1 className={styles.title}>Inventário de Ativos</h1>
        <button className={styles.primaryButton} onClick={() => handleOpenModal('select')} disabled={!permissions?.ativos?.create}>
          <Plus size={18} /> Registrar Novo Ativo
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input type="text" placeholder="Buscar Tombamento (ID)..." className={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (<button onClick={() => setSearchTerm("")} style={{background:'none', border:'none', cursor:'pointer', color:'#999'}}><X size={16} /></button>)}
        </div>
        
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <Filter size={16} />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>{opcoesTipo.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>{opcoesStatus.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className={styles.filterSelect}><option value="all">Todas as Unidades</option>{unitsList.map(d=><option key={d.id} value={d.id}>{d.data().sigla}</option>)}</select>
          </div>
          <label className={styles.checkboxFilter}><input type="checkbox" checked={showReturned} onChange={(e) => setShowReturned(e.target.checked)} /> <Archive size={16} /> Mostrar Devolvidos</label>
        </div>
      </div>
      
      <div className={styles.content}>{renderContent()}</div>
    </div>
  );
};

export default InventoryList;