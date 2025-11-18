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
  const { permissions, isAdmin, allowedUnits, loading: authLoading } = useAuth();

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
  const [showReturned, setShowReturned] = useState(false); 
  const [unitsList, setUnitsList] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 600); // Aumentei um pouco o tempo para 600ms
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchUnits = async () => {
      const q = query(collection(db, 'units'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setUnitsList(snap.docs);
    };
    fetchUnits();
  }, []);

  // --- AQUI ESTÁ A MÁGICA DA BUSCA ---
  const fetchAssets = useCallback(async (isLoadMore = false, specificTerm = "") => {
    if (authLoading) return;
    
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    
    setError(null);

    try {
      const collectionRef = collection(db, 'assets');
      
      // --- MODO BUSCA ESPECÍFICA (Se tiver texto digitado) ---
      if (specificTerm) {
        const termRaw = specificTerm.trim();
        
        // Prepara variações do texto para tentar encontrar de qualquer jeito
        const termUpper = termRaw.toUpperCase(); // ex: "DELL", "CMP-01"
        // Primeira letra maiúscula (Capitalize) ex: "Setor", "Dell"
        const termCap = termRaw.charAt(0).toUpperCase() + termRaw.slice(1).toLowerCase(); 
        
        const queries = [];
        const limitSearch = 10; // Busca 10 de cada tipo para não pesar

        // 1. Busca por ID (Tombamento) - Exato ou Prefixo (Maiúsculo)
        queries.push(query(collectionRef, 
          where(documentId(), '>=', termUpper), 
          where(documentId(), '<=', termUpper + '\uf8ff'), 
          limit(limitSearch)
        ));

        // 2. Busca por SETOR (Adicionado!) - Tenta Capitalizado (Ex: "Recepção")
        queries.push(query(collectionRef, 
          where('setor', '>=', termCap), 
          where('setor', '<=', termCap + '\uf8ff'), 
          limit(limitSearch)
        ));
        
        // 3. Busca por SERIAL
        queries.push(query(collectionRef, where('serial', '>=', termUpper), where('serial', '<=', termUpper + '\uf8ff'), limit(limitSearch)));

        // 4. Busca por MODELO (Tenta Capitalizado e Maiúsculo)
        queries.push(query(collectionRef, where('modelo', '>=', termCap), where('modelo', '<=', termCap + '\uf8ff'), limit(limitSearch)));
        
        // 5. Busca por HOSTNAME
        queries.push(query(collectionRef, where('hostname', '>=', termUpper), where('hostname', '<=', termUpper + '\uf8ff'), limit(limitSearch)));

        // Executa todas as buscas em paralelo
        const snapshots = await Promise.all(queries.map(q => getDocs(q)));
        
        // Junta os resultados em um Map para remover duplicatas (pelo ID)
        const uniqueAssets = new Map();
        
        snapshots.forEach(snap => {
          snap.docs.forEach(doc => {
            const data = doc.data();
            
            // --- FILTRO DE SEGURANÇA (Manual) ---
            // Como não podemos filtrar por unidade na query de busca textual (índices complexos),
            // filtramos aqui no código.
            if (isAdmin || allowedUnits.includes(data.unitId)) {
              
              // --- FILTRO DE STATUS E TIPO (Manual) ---
              // Se o usuário digitou busca, respeitamos os filtros de dropdown também?
              // Geralmente, busca textual "vence" tudo, mas vamos respeitar o básico:
              const typeMatch = filterType === 'all' || data.type === filterType;
              // Ocultar devolvidos se não estiver marcado
              const statusMatch = showReturned || data.status !== 'Devolvido';

              if (typeMatch && statusMatch) {
                 uniqueAssets.set(doc.id, { id: doc.id, ...data });
              }
            }
          });
        });

        const mergedResults = Array.from(uniqueAssets.values());
        setAssets(mergedResults);
        setHasMore(false); // Busca textual desativa o "Carregar Mais" infinito

      } else {
        // --- MODO LISTAGEM NORMAL (Sem busca, apenas paginação) ---
        let constraints = [orderBy('createdAt', 'desc')];

        if (!isAdmin) {
          if (allowedUnits.length > 0) constraints.push(where("unitId", "in", allowedUnits));
          else constraints.push(where("unitId", "==", "SEM_PERMISSAO"));
        }

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
      console.error("Erro na busca:", err);
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [authLoading, isAdmin, allowedUnits, filterType, filterStatus, filterUnit, lastDoc, showReturned]);

  useEffect(() => {
    setLastDoc(null);
    fetchAssets(false, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterStatus, filterUnit, isAdmin, allowedUnits, debouncedSearch, showReturned]); // showReturned adicionado aqui

  // Filtro visual final (apenas segurança, pois a busca já filtrou)
  const displayedAssets = assets; 

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
    if (loading || authLoading) {
      return <InventoryTableSkeleton />;
    }
    
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
          <p>{debouncedSearch ? `Nada encontrado para "${debouncedSearch}"` : "Tente ajustar os filtros."}</p>
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