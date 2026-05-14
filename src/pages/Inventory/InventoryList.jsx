import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  collection, query, orderBy, where, getDocs, limit, startAfter, documentId, getCountFromServer 
} from 'firebase/firestore';
import { db } from '../../lib/firebase'; 
import { 
  Plus, ChevronRight, Package, Loader2, Search, Filter, Archive, 
  CheckSquare, Square, Truck, ArrowDownCircle, X, Import, Trash2 
} from 'lucide-react'; 

import { useAuth } from '../../hooks/useAuth';
import { useOptions } from '../../hooks/useOptions';
import styles from './InventoryList.module.css';
import { getUnitConstraints, IN_LIMIT, chunkArray } from '../../utils/queryHelpers';

import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';
import BulkMoveForm from '../../components/Inventory/BulkMoveForm';
import BulkDeleteForm from '../../components/Inventory/BulkDeleteForm';
import InventoryTableSkeleton from '../../components/Skeletons/InventoryTableSkeleton';
import { FILTRO_TIPO, FILTRO_STATUS, ITEMS_PER_PAGE, OPCOES_SO } from '../../constants/options';

const InventoryList = () => {
  const { permissions, isAdmin, allowedUnits, loading: authLoading, user } = useAuth();
  const { options } = useOptions(['memorias', 'hd_ssd', 'processadores', 'versoes_so', 'sistemas_operacionais']);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('select');
  const [selectedIds, setSelectedIds] = useState([]);

  const [assets, setAssets] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterMemoria, setFilterMemoria] = useState("all");
  const [filterHdSsd, setFilterHdSsd] = useState("all");
  const [filterProcessador, setFilterProcessador] = useState("all");
  const [filterSistemaOp, setFilterSistemaOp] = useState("all");
  const [filterSO, setFilterSO] = useState("all");
  const [showReturned, setShowReturned] = useState(false);
  const [unitsList, setUnitsList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const sentinelRef = useRef(null);

  const versoesSOFiltered = useMemo(() => {
    return (options.versoes_so || []).filter(v => !/^(windows|linux|ubuntu|macos)/i.test(v.trim()));
  }, [options.versoes_so]);

  const sistemasOpOptions = useMemo(() => {
    return (options.sistemas_operacionais && options.sistemas_operacionais.length > 0) ? options.sistemas_operacionais : OPCOES_SO;
  }, [options.sistemas_operacionais]);

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

  const getUnitName = useCallback((unitId) => {
    if (!unitId) return '-';
    const unit = unitsList.find(u => u.id === unitId);
    if (unit) {
        const data = unit.data();
        return data.sigla || data.name || unitId;
    }
    return unitId;
  }, [unitsList]);

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
            query(collectionRef, where('hostname', '>=', termUpper), where('hostname', '<=', termUpper + '\uf8ff'), limit(10)),
            query(collectionRef, where('marca', '>=', termCap), where('marca', '<=', termCap + '\uf8ff'), limit(10)),
            query(collectionRef, where('so', '>=', termCap), where('so', '<=', termCap + '\uf8ff'), limit(10)),
            query(collectionRef, where('funcionario', '>=', termCap), where('funcionario', '<=', termCap + '\uf8ff'), limit(10)),
            query(collectionRef, where('status', '>=', termCap), where('status', '<=', termCap + '\uf8ff'), limit(10))
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
        const baseConstraints = [orderBy('createdAt', 'desc')];

        const unitConstraints = getUnitConstraints(allowedUnits, isAdmin);
        const useChunked = allowedUnits && allowedUnits.length > IN_LIMIT && !isAdmin;

        if (filterType !== "all") baseConstraints.push(where("type", "==", filterType));
        if (filterStatus !== "all") baseConstraints.push(where("status", "==", filterStatus));

        if (filterUnit !== "all" && isAdmin && allowedUnits.length === 0) {
           baseConstraints.push(where("unitId", "==", filterUnit));
        }

        if (useChunked) {
          const chunks = chunkArray(allowedUnits);
          const pageLimit = isLoadMore && lastDoc ? [startAfter(lastDoc)] : [];
          const chunkQueries = chunks.map(chunk =>
            query(collectionRef, ...baseConstraints, where("unitId", "in", chunk), limit(ITEMS_PER_PAGE), ...pageLimit)
          );
          const snapshots = await Promise.all(chunkQueries.map(q => getDocs(q)));
          const mergedMap = new Map();
          let hasFullPage = false;
          snapshots.forEach(snap => {
            snap.docs.forEach(doc => { if (!mergedMap.has(doc.id)) mergedMap.set(doc.id, { id: doc.id, ...doc.data() }); });
            if (snap.docs.length === ITEMS_PER_PAGE) hasFullPage = true;
          });
          const newAssets = Array.from(mergedMap.values());

          if (isLoadMore) {
            setAssets(prev => [...prev, ...newAssets]);
          } else {
            setAssets(newAssets);
            if (allowedUnits && allowedUnits.length > 0 && allowedUnits.length <= IN_LIMIT && !isAdmin) {
              let countConstraints = [where("unitId", "in", allowedUnits)];
              if (filterType !== "all") countConstraints.push(where("type", "==", filterType));
              if (filterStatus !== "all") countConstraints.push(where("status", "==", filterStatus));
              if (filterUnit !== "all" && isAdmin && allowedUnits.length === 0) {
                countConstraints.push(where("unitId", "==", filterUnit));
              }
              getCountFromServer(query(collectionRef, ...countConstraints))
                .then(snap => setTotalCount(snap.data().count))
                .catch(() => {});
            }
          }

          setLastDoc(null);
          setHasMore(hasFullPage);
        } else {
          if (unitConstraints.length > 0) {
            baseConstraints.push(...unitConstraints);
          } else if ((!allowedUnits || allowedUnits.length === 0) && !isAdmin) {
            baseConstraints.push(where("unitId", "==", "SEM_PERMISSAO"));
          }

          baseConstraints.push(limit(ITEMS_PER_PAGE));
          if (isLoadMore && lastDoc) baseConstraints.push(startAfter(lastDoc));

          const q = query(collectionRef, ...baseConstraints);
          const queue = [getDocs(q)];

          if (!isLoadMore) {
            let countConstraints = [];
            if (unitConstraints.length > 0) {
              countConstraints.push(...unitConstraints);
            } else if ((!allowedUnits || allowedUnits.length === 0) && !isAdmin) {
              countConstraints.push(where("unitId", "==", "SEM_PERMISSAO"));
            }
            if (filterType !== "all") countConstraints.push(where("type", "==", filterType));
            if (filterStatus !== "all") countConstraints.push(where("status", "==", filterStatus));
            if (filterUnit !== "all" && isAdmin && allowedUnits.length === 0) {
              countConstraints.push(where("unitId", "==", filterUnit));
            }
            queue.push(
              getCountFromServer(query(collectionRef, ...countConstraints))
                .then(snap => snap.data().count)
                .catch(() => null)
            );
          }

          const [snapshot, total] = await Promise.all(queue);
          let newAssets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          if (isLoadMore) {
            setAssets(prev => [...prev, ...newAssets]);
          } else {
            setAssets(newAssets);
            if (total != null) setTotalCount(total);
          }

          const lastVisible = snapshot.docs[snapshot.docs.length - 1];
          setLastDoc(lastVisible);
          setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
        }
      }

    } catch (err) {
      console.error("Erro:", err);
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [authLoading, isAdmin, allowedUnits, filterType, filterStatus, filterUnit, lastDoc]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore || loading || debouncedSearch) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        fetchAssets(true, "");
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, debouncedSearch, fetchAssets]);

  useEffect(() => {
    setLastDoc(null);
    fetchAssets(false, debouncedSearch);
  }, [filterType, filterStatus, filterUnit, isAdmin, JSON.stringify(allowedUnits), debouncedSearch, showReturned, filterMemoria, filterHdSsd, filterProcessador, filterSistemaOp, filterSO]);


  // --- 5. FILTRAGEM VISUAL BLINDADA (CLIENT-SIDE) ---
  const displayedAssets = useMemo(() => {
    if (!assets) return [];

    const safeAllowedUnits = allowedUnits.map(u => cleanId(u));
    const hasSpecificUnits = safeAllowedUnits.length > 0;

    return assets.filter(asset => {
      const assetUnitId = cleanId(asset.unitId);

      if (hasSpecificUnits) {
         if (!safeAllowedUnits.includes(assetUnitId)) {
            return false;
         }
      } 
      else if (!isAdmin) {
         return false;
      }

      if (!showReturned && asset.status === 'Devolvido') return false;

      if (filterMemoria !== "all" && asset.memoria !== filterMemoria) return false;
      if (filterHdSsd !== "all" && asset.hdSsd !== filterHdSsd) return false;
      if (filterProcessador !== "all" && asset.processador !== filterProcessador) return false;
      if (filterSistemaOp !== "all" && asset.so !== filterSistemaOp) return false;
      const soVersaoValue = asset.soVersao || asset.versao_so || '';
      if (filterSO !== "all" && soVersaoValue !== filterSO) return false;

      if (debouncedSearch) {
         const search = debouncedSearch.toLowerCase();
         const match = (val) => val && val.toLowerCase().includes(search);
         return (
            match(asset.id) ||
            match(asset.serial) ||
            match(asset.hostname) ||
            match(asset.modelo) ||
            match(asset.setor) ||
            match(asset.marca) ||
            match(asset.memoria) ||
            match(asset.hdSsd) ||
            match(asset.processador) ||
            match(asset.so) ||
            match(asset.soVersao) ||
            match(asset.versao_so) ||
            match(asset.funcionario) ||
            match(asset.observacao) ||
            match(asset.macAddress) ||
            match(asset.serviceTag) ||
            match(asset.tipoAtivo) ||
            match(asset.tombamento) ||
            match(asset.propriedade) ||
            match(asset.conectividade) ||
            match(asset.cartucho) ||
            match(asset.cartuchoPreto) ||
            match(asset.cartuchoColorido) ||
            match(asset.drCilindro) ||
            match(asset.frenteVerso) ||
            match(asset.ip) ||
            match(asset.status) ||
            match(asset.pavimento) ||
            match(asset.sala)
         );
      }
      return true;
    });
  }, [assets, isAdmin, allowedUnits, showReturned, debouncedSearch, filterMemoria, filterHdSsd, filterProcessador, filterSistemaOp, filterSO]);

const getStatusClass = useCallback((status) => {
    if (status === 'Em uso') return styles.statusUsage;
    if (status === 'Em manutenção') return styles.statusMaintenance;
    if (status === 'Inativo') return styles.statusInactive;
    if (status === 'Estoque') return styles.statusStock;
    if (status === 'Devolvido') return styles.statusReturned;
    return '';
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === displayedAssets.length) setSelectedIds([]);
    else setSelectedIds(displayedAssets.map(a => a.id));
  }, [selectedIds.length, displayedAssets]);

  const handleSelectOne = useCallback((id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  }, [selectedIds]);

  const handleOpenModal = useCallback((view) => { setModalView(view); setIsModalOpen(true); }, []);
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setModalView('select'), 300);
    fetchAssets(false, debouncedSearch);
  }, [fetchAssets, debouncedSearch]);
  const handleBulkSuccess = useCallback(() => { setSelectedIds([]); fetchAssets(false, debouncedSearch); }, [fetchAssets, debouncedSearch]);

  const handleBulkDeleteSuccess = useCallback(() => {
    setSelectedIds([]);
    fetchAssets(false, debouncedSearch);
  }, [fetchAssets, debouncedSearch]);

  const renderModalContent = useCallback(() => {
    switch (modalView) {
      case 'select': return <AssetTypeSelector onSelectType={setModalView} />;
      case 'computer': return <AddAssetForm onClose={handleCloseModal} />;
      case 'printer': return <AddPrinterForm onClose={handleCloseModal} />;
      case 'bulk_move': return <BulkMoveForm onClose={handleCloseModal} selectedIds={selectedIds} onSuccess={handleBulkSuccess} />;
      case 'bulk_delete': return <BulkDeleteForm onClose={handleCloseModal} selectedIds={selectedIds} onSuccess={handleBulkDeleteSuccess} />;
      default: return null;
    }
  }, [modalView, handleCloseModal, selectedIds, handleBulkSuccess, handleBulkDeleteSuccess]);

  const renderContent = useCallback(() => {
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
                      {isAllSelected ? <CheckSquare size={22} color="var(--color-primary)" strokeWidth={2.5} /> : <Square size={22} color="var(--color-text-secondary)" strokeWidth={2} />}
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
                        {isSelected ? <CheckSquare size={22} color="var(--color-primary)" strokeWidth={2.5} /> : <Square size={22} color="var(--color-text-secondary)" strokeWidth={2} />}
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

        <div ref={sentinelRef} style={{ height: 1 }} />

        {hasMore && !debouncedSearch && (
          <div className={styles.loadMoreContainer}>
            <button className={styles.loadMoreButton} onClick={() => fetchAssets(true, "")} disabled={loadingMore}>
              {loadingMore ? <Loader2 className={styles.spinner} size={18} /> : <ArrowDownCircle size={18} />}
              Carregar mais
            </button>
          </div>
        )}
      </>
    );
  }, [loading, authLoading, error, displayedAssets, selectedIds.length, debouncedSearch, hasMore, loadingMore, fetchAssets, handleSelectAll, handleSelectOne, getStatusClass, getUnitName]);

  return (
    <div className={styles.page}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalView === 'bulk_move' ? "Movimentação em Massa" : modalView === 'bulk_delete' ? "Exclusão em Massa" : "Registrar Novo Ativo"}>
        {renderModalContent()}
      </Modal>

      {selectedIds.length > 0 && (
        <div className={styles.bulkActionBar}>
          <div className={styles.bulkInfo}><strong>{selectedIds.length}</strong> selecionados</div>
          <div className={styles.bulkActions}>
            {isAdmin && (
              <button className={styles.bulkButtonDanger} onClick={() => handleOpenModal('bulk_delete')}>
                <Trash2 size={18} /> Excluir Selecionados
              </button>
            )}
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
          {searchTerm && (<button onClick={() => setSearchTerm("")} style={{background:'none', border:'none', cursor:'pointer', color:'var(--color-text-secondary)'}}><X size={16} /></button>)}
        </div>
        
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <Filter size={16} />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>{FILTRO_TIPO.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>{FILTRO_STATUS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className={styles.filterSelect}>{isAdmin && allowedUnits.length === 0 ? <option value="all">Todas as Unidades</option> : null}{unitsList.filter(d => isAdmin && allowedUnits.length === 0 || allowedUnits.includes(d.id)).map(d=><option key={d.id} value={d.id}>{d.data().sigla || d.data().name}</option>)}</select>
            <select value={filterMemoria} onChange={(e) => setFilterMemoria(e.target.value)} className={styles.filterSelect}><option value="all">Todas as Memórias</option>{(options.memorias || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
            <select value={filterHdSsd} onChange={(e) => setFilterHdSsd(e.target.value)} className={styles.filterSelect}><option value="all">Todos os HD/SSD</option>{(options.hd_ssd || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
            <select value={filterProcessador} onChange={(e) => setFilterProcessador(e.target.value)} className={styles.filterSelect}><option value="all">Todos os Processadores</option>{(options.processadores || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
            <select value={filterSistemaOp} onChange={(e) => setFilterSistemaOp(e.target.value)} className={styles.filterSelect}><option value="all">Todos os S.O.</option>{sistemasOpOptions.map(o => <option key={o} value={o}>{o}</option>)}</select>
            <select value={filterSO} onChange={(e) => setFilterSO(e.target.value)} className={styles.filterSelect}><option value="all">Todas as Versões SO</option>{versoesSOFiltered.map(o => <option key={o} value={o}>{o}</option>)}</select>
          </div>
          <label className={styles.checkboxFilter}><input type="checkbox" checked={showReturned} onChange={(e) => setShowReturned(e.target.checked)} /> <Archive size={16} /> Mostrar Devolvidos</label>
        </div>
      </div>
      
      <div className={styles.resultCount}>
        {debouncedSearch
          ? `${displayedAssets.length} ${displayedAssets.length === 1 ? 'resultado' : 'resultados'}`
          : `${totalCount || displayedAssets.length} itens encontrados`
        }
        {hasMore && !debouncedSearch && ' — role para carregar mais'}
      </div>
      
      <div className={styles.content}>{renderContent()}</div>
    </div>
  );
};

export default InventoryList;