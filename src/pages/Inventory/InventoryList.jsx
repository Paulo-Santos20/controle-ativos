import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  collection, query, orderBy, where, getDocs, limit, startAfter, documentId 
} from 'firebase/firestore';
import { db } from '../../lib/firebase'; 
import { 
  Plus, ChevronRight, Package, Loader2, Search, Filter, Archive, 
  CheckSquare, Square, Truck, ArrowDownCircle, X 
} from 'lucide-react'; 

import { useAuth } from '../../hooks/useAuth';
import styles from './InventoryList.module.css';

import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';
import BulkMoveForm from '../../components/Inventory/BulkMoveForm';

const opcoesTipo = [{ value: 'all', label: 'Todos os Tipos' }, { value: 'computador', label: 'Computadores' }, { value: 'impressora', label: 'Impressoras' }];
const opcoesStatus = [{ value: 'all', label: 'Todos os Status' }, { value: 'Em uso', label: 'Em uso' }, { value: 'Estoque', label: 'Estoque' }, { value: 'Manutenção', label: 'Manutenção' }, { value: 'Devolvido', label: 'Devolvido' }, { value: 'Inativo', label: 'Inativo' }];
const ITEMS_PER_PAGE = 20;

const InventoryList = () => {
  const { permissions, isAdmin, allowedUnits, loading: authLoading } = useAuth();

  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('select'); 
  const [selectedIds, setSelectedIds] = useState([]);

  // Estados de Dados
  const [assets, setAssets] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState(""); // O texto digitado
  const [debouncedSearch, setDebouncedSearch] = useState(""); // O texto processado após 500ms
  
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  const [showReturned, setShowReturned] = useState(false); 
  const [unitsList, setUnitsList] = useState([]);

  // 1. Carregar Unidades para o filtro
  useEffect(() => {
    const fetchUnits = async () => {
      const q = query(collection(db, 'units'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setUnitsList(snap.docs);
    };
    fetchUnits();
  }, []);

  // 2. Lógica de Debounce (Espera o usuário parar de digitar)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500); // 500ms de delay
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Função Principal de Busca (Normal + Pesquisa Específica)
  const fetchAssets = useCallback(async (isLoadMore = false, specificTerm = "") => {
    if (authLoading) return;
    
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    
    setError(null);

    try {
      let q;
      const collectionRef = collection(db, 'assets');
      
      // --- MODO BUSCA ESPECÍFICA (Se houver termo digitado) ---
      if (specificTerm) {
        // Busca por Tombamento (ID) usando prefixo
        // Ex: Digitar "PAT" acha "PAT-001", "PAT-002"
        const constraints = [
          orderBy(documentId()), 
          where(documentId(), '>=', specificTerm),
          where(documentId(), '<=', specificTerm + '\uf8ff'),
          limit(50) // Limite de segurança para busca
        ];

        // Aplica segurança de unidade se não for Admin
        // Nota: Isso fará a filtragem no cliente para simplificar índices complexos
        q = query(collectionRef, ...constraints);

      } else {
        // --- MODO LISTAGEM NORMAL (Paginação) ---
        let constraints = [orderBy('createdAt', 'desc')];

        // Filtros de Segurança
        if (!isAdmin) {
          if (allowedUnits.length > 0) constraints.push(where("unitId", "in", allowedUnits));
          else constraints.push(where("unitId", "==", "SEM_PERMISSAO"));
        }

        // Filtros UI
        if (filterType !== "all") constraints.push(where("type", "==", filterType));
        if (filterStatus !== "all") constraints.push(where("status", "==", filterStatus));
        if (filterUnit !== "all") {
          if (isAdmin || allowedUnits.includes(filterUnit)) {
            constraints.push(where("unitId", "==", filterUnit));
          }
        }

        constraints.push(limit(ITEMS_PER_PAGE));
        
        if (isLoadMore && lastDoc) {
          constraints.push(startAfter(lastDoc));
        }

        q = query(collectionRef, ...constraints);
      }

      // Executa
      const snapshot = await getDocs(q);
      
      let newAssets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // --- FILTRAGEM DE SEGURANÇA PÓS-BUSCA (Apenas para o modo de Busca Específica) ---
      // Como a busca por ID não usa o filtro de unidade na query (para evitar índice complexo),
      // filtramos aqui para garantir que o técnico não veja ativo de outro hospital.
      if (specificTerm && !isAdmin) {
        newAssets = newAssets.filter(asset => allowedUnits.includes(asset.unitId));
      }

      // Atualiza Estado
      if (isLoadMore) {
        setAssets(prev => [...prev, ...newAssets]);
      } else {
        setAssets(newAssets);
      }

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      setLastDoc(lastVisible);
      setHasMore(snapshot.docs.length === ITEMS_PER_PAGE && !specificTerm); // Sem "Carregar Mais" no modo busca

    } catch (err) {
      console.error("Erro:", err);
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [authLoading, isAdmin, allowedUnits, filterType, filterStatus, filterUnit, lastDoc]);

  // 4. Disparador: Quando Filtros ou Busca mudam
  useEffect(() => {
    // Se mudou o termo de busca ou os filtros, reseta e busca do zero
    setLastDoc(null);
    fetchAssets(false, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterStatus, filterUnit, isAdmin, allowedUnits, debouncedSearch]);


  // 5. Filtro Visual (Devolvidos)
  // Aplicado sobre os dados já baixados
  const displayedAssets = assets.filter(asset => {
    if (!showReturned && asset.status === 'Devolvido') return false;
    return true;
  });

  // --- UI Helpers ---
  const getStatusClass = (status) => {
    if (status === 'Em uso') return styles.statusUsage;
    if (status === 'Em manutenção') return styles.statusMaintenance;
    if (status === 'Inativo') return styles.statusInactive;
    if (status === 'Estoque') return styles.statusStock;
    if (status === 'Devolvido') return styles.statusReturned;
    return '';
  };

  const handleSelectAll = () => {
    if (selectedIds.length === displayedAssets.length) setSelectedIds([]); 
    else setSelectedIds(displayedAssets.map(a => a.id));
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleOpenModal = (view) => { setModalView(view); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setTimeout(() => setModalView('select'), 300); fetchAssets(false, debouncedSearch); };
  const handleBulkSuccess = () => { setSelectedIds([]); fetchAssets(false, debouncedSearch); };

  const renderContent = () => {
    if (loading) return <div className={styles.loadingState}><Loader2 className={styles.spinner} /><p>Buscando ativos...</p></div>;
    
    if (error) return <div className={styles.errorState}><h3>Erro na busca</h3><p>{error.message}</p></div>;

    if (displayedAssets.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Package size={50} />
          <h2>{debouncedSearch ? `Nenhum ativo encontrado com "${debouncedSearch}"` : "Nenhum ativo encontrado"}</h2>
          <p>Tente ajustar os filtros ou o termo de busca.</p>
        </div>
      );
    }

    const isAllSelected = displayedAssets.length > 0 && selectedIds.length === displayedAssets.length;

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
              {displayedAssets.map(asset => {
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

        {/* Botão Carregar Mais (Só aparece se NÃO estiver buscando texto específico) */}
        {hasMore && !debouncedSearch && (
          <div className={styles.loadMoreContainer}>
            <button className={styles.loadMoreButton} onClick={() => fetchAssets(true, "")} disabled={loadingMore}>
              {loadingMore ? <Loader2 className={styles.spinner} size={18} /> : <ArrowDownCircle size={18} />}
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
        {modalView === 'select' && <AssetTypeSelector onSelectType={setModalView} />}
        {modalView === 'computer' && <AddAssetForm onClose={handleCloseModal} />}
        {modalView === 'printer' && <AddPrinterForm onClose={handleCloseModal} />}
        {modalView === 'bulk_move' && <BulkMoveForm onClose={handleCloseModal} selectedIds={selectedIds} onSuccess={handleBulkSuccess} />}
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
          <input 
            type="text" 
            placeholder="Buscar Tombamento (ID)..." 
            className={styles.searchInput} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          {/* Botão X para limpar busca */}
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={{background:'none', border:'none', cursor:'pointer', color:'#999'}}>
               <X size={16} />
            </button>
          )}
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