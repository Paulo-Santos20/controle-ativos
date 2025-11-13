import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js'; // Caminho absoluto
import { 
  Plus, 
  ChevronRight, 
  Package, 
  Loader2, 
  Search, 
  Filter, 
  Archive 
} from 'lucide-react'; 

// Importa o hook de autenticação e permissões
import { useAuth } from '/src/hooks/useAuth.js';

import styles from './InventoryList.module.css';
import Modal from '../../components/Modal/Modal';

// --- IMPORTA O FLUXO DE CADASTRO ---
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';

// --- Constantes para os Filtros ---
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
  { value: 'Devolvido', label: 'Devolvido' },
  { value: 'Inativo', label: 'Inativo' },
];

const InventoryList = () => {
  // --- 1. HOOK DE AUTH (SEGURANÇA) ---
  const { permissions, isAdmin, allowedUnits, loading: authLoading } = useAuth();

  // --- 2. ESTADOS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('select'); // 'select' | 'computer' | 'printer'

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  
  const [showReturned, setShowReturned] = useState(false); 

  // Busca unidades para o filtro dropdown (apenas para exibir os nomes)
  const [units] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  // --- 3. CONSULTA DINÂMICA E SEGURA (FIRESTORE) ---
  const assetsQuery = useMemo(() => {
    if (authLoading) return null;

    // Começa ordenando por data de criação
    let constraints = [orderBy('createdAt', 'desc')];

    // --- SEGURANÇA: Filtra unidades permitidas se não for Admin ---
    if (!isAdmin) {
      if (allowedUnits.length > 0) {
        // Limitação do Firestore: 'in' suporta no máximo 10 valores.
        // Para produção em larga escala, seria ideal filtrar no cliente ou usar subcoleções por unidade.
        // Aqui assumimos < 10 unidades por usuário.
        constraints.push(where("unitId", "in", allowedUnits));
      } else {
        // Se não tem unidades permitidas, bloqueia a query
        constraints.push(where("unitId", "==", "SEM_PERMISSAO"));
      }
    }

    // --- FILTROS DE SERVIDOR (Performance) ---
    if (filterType !== "all") {
      constraints.push(where("type", "==", filterType));
    }
    if (filterStatus !== "all") {
      constraints.push(where("status", "==", filterStatus));
    }
    // Filtro de Unidade da UI (só aplica se for compatível com as permissões)
    if (filterUnit !== "all") {
      // Se não for admin, só aplica se a unidade selecionada estiver nas permitidas
      if (isAdmin || allowedUnits.includes(filterUnit)) {
        constraints.push(where("unitId", "==", filterUnit));
      }
    }

    return query(collection(db, 'assets'), ...constraints);
  }, [filterType, filterStatus, filterUnit, isAdmin, allowedUnits, authLoading]);

  const [assets, loading, error] = useCollection(assetsQuery);

  // --- 4. FILTRAGEM NO CLIENTE (Híbrido) ---
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    
    let result = assets.docs;

    // A. Regra de "Devolvido" (Esconde por padrão)
    if (!showReturned) {
      result = result.filter(doc => doc.data().status !== 'Devolvido');
    }

    // B. Filtro de Texto (Busca)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(doc => {
        const data = doc.data();
        return (
          doc.id.toLowerCase().includes(search) || // Tombamento
          (data.serial && data.serial.toLowerCase().includes(search)) ||
          (data.hostname && data.hostname.toLowerCase().includes(search)) ||
          (data.modelo && data.modelo.toLowerCase().includes(search))
        );
      });
    }

    return result;
  }, [assets, searchTerm, showReturned]);

  // --- 5. HELPERS DE UI ---
  const getStatusClass = (status) => {
    if (status === 'Em uso') return styles.statusUsage;
    if (status === 'Em manutenção') return styles.statusMaintenance;
    if (status === 'Inativo') return styles.statusInactive;
    if (status === 'Estoque') return styles.statusStock;
    if (status === 'Devolvido') return styles.statusReturned;
    return '';
  };

  // Controle do Modal
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

  // Renderiza a Tabela
  const renderContent = () => {
    if (loading || authLoading) {
      return (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} />
          <p>Carregando inventário...</p>
        </div>
      );
    }
    
    if (error) {
      // Aviso amigável sobre índices do Firestore
      if (error.code === 'failed-precondition') {
        return (
          <div className={styles.errorState}>
            <h3>⚠️ Otimização Necessária</h3>
            <p>Esta combinação de filtros requer um índice no banco de dados.</p>
            <p style={{fontSize: '0.9rem'}}>Abra o console do navegador (F12) e clique no link fornecido pelo Firebase para criá-lo automaticamente.</p>
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
            {showReturned 
              ? "Tente ajustar seus filtros de busca." 
              : "Itens devolvidos estão ocultos. Marque 'Mostrar Devolvidos' para vê-los."}
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
              <th className={styles.hideMobile}>Unidade</th>
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
                  <td data-label="Tombamento"><strong>{doc.id}</strong></td>
                  <td data-label="Tipo">{asset.tipoAtivo || asset.type}</td>
                  <td data-label="Status">
                    <span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  {/* Mostra Unidade na tabela para clareza */}
                  <td data-label="Unidade" className={styles.hideMobile}>{asset.unitId}</td>
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
      {/* --- MODAL --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
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
        
        {/* Botão protegido por permissão */}
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenModal}
          disabled={!permissions?.ativos?.create}
          title={!permissions?.ativos?.create ? "Você não tem permissão para registrar ativos" : ""}
          style={{ opacity: !permissions?.ativos?.create ? 0.6 : 1 }}
        >
          <Plus size={18} /> Registrar Novo Ativo
        </button>
      </header>

      {/* --- BARRA DE FERRAMENTAS --- */}
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
        
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <Filter size={16} />
            {/* Filtro Tipo */}
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>
              {opcoesTipo.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            
            {/* Filtro Status */}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>
              {opcoesStatus.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            {/* Filtro Unidade (Só mostra unidades permitidas ou todas se for admin) */}
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className={styles.filterSelect}>
              <option value="all">Todas as Unidades</option>
              {units?.docs.map(doc => {
                // Se for admin OU se a unidade estiver na lista de permitidas
                if (isAdmin || allowedUnits.includes(doc.id)) {
                  return <option key={doc.id} value={doc.id}>{doc.data().sigla}</option>;
                }
                return null;
              })}
            </select>
          </div>

          {/* Checkbox Mostrar Devolvidos */}
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
      
      {/* --- LISTA --- */}
      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  );
};

export default InventoryList;