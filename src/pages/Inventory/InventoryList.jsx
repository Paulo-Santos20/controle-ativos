import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  collection, query, orderBy, where, getDocs, limit, startAfter, documentId 
} from 'firebase/firestore';
import { db } from '../../lib/firebase'; 
import { 
  Plus, ChevronRight, Package, Loader2, Search, Filter, Archive, 
  CheckSquare, Square, Truck, ArrowDownCircle, X, Import 
} from 'lucide-react'; 

import { useAuth } from '../../hooks/useAuth';
import styles from './InventoryList.module.css';

import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';
import BulkMoveForm from '../../components/Inventory/BulkMoveForm';
import InventoryTableSkeleton from '../../components/Skeletons/InventoryTableSkeleton';

const opcoesTipo = [{ value: 'all', label: 'Todos os Tipos' }, { value: 'computador', label: 'Computadores' }, { value: 'impressora', label: 'Impressoras' }];
const opcoesStatus = [{ value: 'all', label: 'Todos os Status' }, { value: 'Em uso', label: 'Em uso' }, { value: 'Estoque', label: 'Estoque' }, { value: 'Manutenção', label: 'Manutenção' }, { value: 'Devolvido', label: 'Devolvido' }, { value: 'Inativo', label: 'Inativo' }];
const ITEMS_PER_PAGE = 20;

const InventoryList = () => {
  // useAuth traz os dados do usuário logado
  const { permissions, isAdmin, allowedUnits, loading: authLoading, user } = useAuth();

 

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
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  const [showReturned, setShowReturned] = useState(false); 
  const [unitsList, setUnitsList] = useState([]);

  // Helper de Limpeza de String (Remove espaços invisíveis)
  const cleanId = (id) => String(id || '').trim();

  // 1. Limpeza de Segurança ao mudar permissões
  useEffect(() => {
    setAssets([]);
    setLastDoc(null);
  }, [isAdmin, allowedUnits]);

  // 2. Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 600); 
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Carregar Unidades
  useEffect(() => {
    const fetchUnits = async () => {
      const q = query(collection(db, 'units'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setUnitsList(snap.docs);
    };
    fetchUnits();
  }, []);

  const getUnitName = (unitId) => {
    if (!unitId) return '-';
    const unit = unitsList.find(u => u.id === unitId);
    if (unit) {
        const data = unit.data();
        return data.sigla || data.name || unitId;
    }
    return unitId;
  };

  // --- 4. BUSCA DE DADOS (QUERY) ---
  const fetchAssets = useCallback(async (isLoadMore = false, specificTerm = "") => {
    if (authLoading) return;
    
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    
    setError(null);

    try {
      const collectionRef = collection(db, 'assets');
      
      // A. Busca Específica (Texto)
      if (specificTerm) {
        const termRaw = specificTerm.trim();
        const termUpper = termRaw.toUpperCase();
        const termCap = termRaw.charAt(0).toUpperCase() + termRaw.slice(1).toLowerCase(); 
        
        // (Consultas paralelas mantidas para performance)
        const queries = [
            query(collectionRef, where(documentId(), '>=', termUpper), where(documentId(), '<=', termUpper + '\uf8ff'), limit(10)),
            query(collectionRef, where('setor', '>=', termCap), where('setor', '<=', termCap + '\uf8ff'), limit(10)),
            query(collectionRef, where('serial', '>=', termUpper), where('serial', '<=', termUpper + '\uf8ff'), limit(10)),
            query(collectionRef, where('modelo', '>=', termCap), where('modelo', '<=', termCap + '\uf8ff'), limit(10)),
            query(collectionRef, where('hostname', '>=', termUpper), where('hostname', '<=', termUpper + '\uf8ff'), limit(10))
        ];

        const snapshots = await Promise.all(queries.map(q => getDocs(q)));
        const uniqueAssets = new Map();
        
        snapshots.forEach(snap => {
          snap.docs.forEach(doc => {
             uniqueAssets.set(doc.id, { id: doc.id, ...doc.data() });
          });
        });

        setAssets(Array.from(uniqueAssets.values()));
        setHasMore(false); 

      } else {
        // B. Listagem Padrão
        let constraints = [orderBy('createdAt', 'desc')];

        // --- LÓGICA DE SEGURANÇA CORRIGIDA (NO SERVIDOR) ---
        // Se tiver unidades específicas na lista, FILTRA por elas (mesmo sendo Admin).
        // Se não tiver unidades e NÃO for admin, BLOQUEIA.
        // Se não tiver unidades e FOR admin, MOSTRA TUDO.
        
        if (allowedUnits && allowedUnits.length > 0) {
             constraints.push(where("unitId", "in", allowedUnits));
        } else if (!isAdmin) {
             constraints.push(where("unitId", "==", "SEM_PERMISSAO"));
        }

        if (filterType !== "all") constraints.push(where("type", "==", filterType));
        if (filterStatus !== "all") constraints.push(where("status", "==", filterStatus));
        
        // Filtro de unidade selecionado pelo usuário
        if (filterUnit !== "all") {
           // Só permite filtrar se o usuário tiver acesso a essa unidade (ou for super admin sem restrição)
           if (isAdmin && allowedUnits.length === 0) {
              constraints.push(where("unitId", "==", filterUnit));
           } else if (allowedUnits.includes(filterUnit)) {
              constraints.push(where("unitId", "==", filterUnit));
           }
        }

        constraints.push(limit(ITEMS_PER_PAGE));
        if (isLoadMore && lastDoc) constraints.push(startAfter(lastDoc));

        const q = query(collectionRef, ...constraints);
        const snapshot = await getDocs(q);
        let newAssets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (isLoadMore) {
          setAssets(prev => [...prev, ...newAssets]);
        } else {
          setAssets(newAssets);
        }

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        setLastDoc(lastVisible);
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
      }

    } catch (err) {
      console.error("Erro:", err);
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [authLoading, isAdmin, allowedUnits, filterType, filterStatus, filterUnit, lastDoc]);

  useEffect(() => {
    setLastDoc(null);
    fetchAssets(false, debouncedSearch);
  }, [filterType, filterStatus, filterUnit, isAdmin, JSON.stringify(allowedUnits), debouncedSearch, showReturned]);


  // --- 5. FILTRAGEM VISUAL BLINDADA (CLIENT-SIDE) ---
  const displayedAssets = useMemo(() => {
    if (!assets) return [];

    // Lista limpa de IDs permitidos
    const safeAllowedUnits = allowedUnits.map(u => cleanId(u));
    const hasSpecificUnits = safeAllowedUnits.length > 0;

    return assets.filter(asset => {
      const assetUnitId = cleanId(asset.unitId);

      // --- NOVA REGRA DE SEGURANÇA ---
      // 1. Se o usuário tem unidades específicas na lista, ele SÓ pode ver essas unidades.
      //    Isso vale MESMO se ele for Admin.
      if (hasSpecificUnits) {
         if (!safeAllowedUnits.includes(assetUnitId)) {
            return false; // Bloqueia visualmente
         }
      } 
      // 2. Se não tem unidades na lista:
      //    - Se for Admin, vê tudo (passa).
      //    - Se não for Admin, não vê nada (já bloqueado na query, mas reforça aqui).
      else if (!isAdmin) {
         return false;
      }

      // Filtro Devolvido
      if (!showReturned && asset.status === 'Devolvido') return false;

      // Filtro de Texto (Reforço para busca específica)
      if (debouncedSearch) {
         const search = debouncedSearch.toLowerCase();
         return (
            asset.id.toLowerCase().includes(search) || 
            (asset.serial && asset.serial.toLowerCase().includes(search)) ||
            (asset.hostname && asset.hostname.toLowerCase().includes(search)) ||
            (asset.modelo && asset.modelo.toLowerCase().includes(search)) ||
            (asset.setor && asset.setor.toLowerCase().includes(search))
         );
      }
      return true;
    });
  }, [assets, isAdmin, allowedUnits, showReturned, debouncedSearch]);

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
  const handleCloseModal = () => { 
    setIsModalOpen(false); 
    setTimeout(() => setModalView('select'), 300); 
    fetchAssets(false, debouncedSearch); 
  };
  const handleBulkSuccess = () => { setSelectedIds([]); fetchAssets(false, debouncedSearch); };

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
    if (loading || authLoading) return <InventoryTableSkeleton />;
    
    if (error) {
      if (error.code === 'failed-precondition') {
        return <div className={styles.errorState}><h3>⚠️ Índice Necessário</h3><p>Abra o console (F12) e clique no link do Firebase.</p></div>;
      }
      return <div className={styles.errorState}><p>Erro: {error.message}</p></div>;
    }

    if (displayedAssets.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Package size={50} />
          <h2>Nenhum ativo encontrado</h2>
          <p>{debouncedSearch ? "Tente outro termo." : "Ajuste os filtros ou verifique suas permissões."}</p>
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
                    {isAllSelected ? <CheckSquare size={22} color="#007aff" strokeWidth={2.5} /> : <Square size={22} color="#64748b" strokeWidth={2} />}
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
                        {isSelected ? <CheckSquare size={22} color="#007aff" strokeWidth={2.5} /> : <Square size={22} color="#94a3b8" strokeWidth={2} />}
                      </button>
                    </td>
                    <td data-label="Tombamento"><strong>{asset.id}</strong></td>
                    <td data-label="Tipo">{asset.tipoAtivo || asset.type}</td>
                    <td data-label="Status"><span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>{asset.status}</span></td>
                    <td data-label="Unidade" className={styles.hideMobile}>{getUnitName(asset.unitId)}</td>
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
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
             <h1 className={styles.title}>Inventário de Ativos</h1>
             <Link to="/inventory/importar" className={styles.secondaryButton} style={{textDecoration: 'none'}}>
                <Import size={18} /> Importar Excel
             </Link>
        </div>

        <button className={styles.primaryButton} onClick={() => handleOpenModal('select')} disabled={!permissions?.ativos?.create}>
          <Plus size={18} /> Registrar Novo Ativo
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar Tombamento, Serial, Setor..." 
            className={styles.searchInput} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          {searchTerm && (<button onClick={() => setSearchTerm("")} style={{background:'none', border:'none', cursor:'pointer', color:'#999'}}><X size={16} /></button>)}
        </div>
        
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <Filter size={16} />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>{opcoesTipo.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>{opcoesStatus.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className={styles.filterSelect}><option value="all">Todas as Unidades</option>{unitsList.map(d=><option key={d.id} value={d.id}>{d.data().sigla || d.data().name}</option>)}</select>
          </div>
          <label className={styles.checkboxFilter}><input type="checkbox" checked={showReturned} onChange={(e) => setShowReturned(e.target.checked)} /> <Archive size={16} /> Mostrar Devolvidos</label>
        </div>
      </div>
      
      <div className={styles.content}>{renderContent()}</div>
    </div>
  );
};

export default InventoryList;