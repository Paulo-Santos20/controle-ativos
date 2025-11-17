import React, { useState, useMemo } from 'react';
import { db } from '../../lib/firebase.js'; 
import { 
  collection, query, orderBy, limit, where, collectionGroup, documentId 
} from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { 
  Laptop, Printer, Wrench, History, Plus, PackageSearch, Loader2, ArrowRight
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth.js';
import styles from './Dashboard.module.css';

// Componentes
import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';
import AssetSearchForm from '../../components/Inventory/AssetSearchForm';
import MaintenanceAssetForm from '../../components/Inventory/MaintenanceAssetForm';

import DashboardSkeleton from '../../components/Skeletons/DashboardSkeleton';

const COLORS = ['#007aff', '#5ac8fa', '#ff9500', '#34c759', '#ff3b30', '#af52de'];

const Dashboard = () => {
  // --- 1. TODOS OS HOOKS DEVEM FICAR NO TOPO ---
  
  const { isAdmin, allowedUnits, permissions, loading: authLoading } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('select'); 
  const [maintenanceTarget, setMaintenanceTarget] = useState(null);

  // Helper para constraints
  const getPermissionConstraints = () => {
    if (isAdmin) return []; 
    if (allowedUnits.length > 0) return [where('unitId', 'in', allowedUnits)]; 
    return [where('unitId', '==', 'BLOQUEADO')];
  };

  // --- Queries (Sempre são chamadas, mesmo que retornem null) ---

  // Query 1: Em Manutenção
  const maintenanceQuery = useMemo(() => {
    if (authLoading) return null;
    return query(collection(db, 'assets'), where('status', '==', 'Em manutenção'), ...getPermissionConstraints());
  }, [authLoading, isAdmin, allowedUnits]);
  const [maintenanceAssets] = useCollection(maintenanceQuery);

  // Query 2: Computadores
  const computersQuery = useMemo(() => {
    if (authLoading) return null;
    return query(collection(db, 'assets'), where('type', '==', 'computador'), ...getPermissionConstraints());
  }, [authLoading, isAdmin, allowedUnits]);
  const [computerAssets, loadingComputers] = useCollection(computersQuery);

  // Query 3: Impressoras
  const printersQuery = useMemo(() => {
    if (authLoading) return null;
    return query(collection(db, 'assets'), where('type', '==', 'impressora'), ...getPermissionConstraints());
  }, [authLoading, isAdmin, allowedUnits]);
  const [printerAssets, loadingPrinters] = useCollection(printersQuery);

  // Query 4: Unidades
  const unitsQuery = useMemo(() => {
    if (authLoading) return null;
    if (isAdmin) return query(collection(db, 'units'), orderBy('name', 'asc'));
    if (allowedUnits.length > 0) return query(collection(db, 'units'), where(documentId(), 'in', allowedUnits));
    return null;
  }, [authLoading, isAdmin, allowedUnits]);
  const [units, loadingUnits] = useCollection(unitsQuery);

  // Query 5: Histórico
  const historyQuery = useMemo(() => {
    if (authLoading) return null;
    let constraints = [orderBy('timestamp', 'desc'), limit(5)];
    if (!isAdmin) {
      if (allowedUnits.length > 0) constraints.push(where('unitId', 'in', allowedUnits));
      else return null;
    }
    return query(collectionGroup(db, 'history'), ...constraints);
  }, [authLoading, isAdmin, allowedUnits]);
  const [history, loadingHistory, errorHistory] = useCollection(historyQuery);

  // --- 2. AGORA SIM PODEMOS FAZER O RETORNO CONDICIONAL ---
  if (authLoading) {
    return <DashboardSkeleton />;
  }
  // -------------------------------------------------------

  // Processamento de Dados
  const pieChartData = units?.docs.map((doc, index) => ({
    name: doc.data().sigla || doc.data().name, 
    value: doc.data().assetCount || 0, 
    fill: COLORS[index % COLORS.length] 
  })) || [];

  const getActiveCount = (loading, snapshot) => {
    if (loading) return <Loader2 size={16} className={styles.spinnerSmall} />;
    if (!snapshot) return 0;
    return snapshot.docs.filter(doc => doc.data().status !== 'Devolvido').length;
  };

  // Handlers
  const handleOpenRegister = () => { setModalView('select'); setIsModalOpen(true); };
  const handleOpenMaintenance = () => { setMaintenanceTarget(null); setModalView('maintenance_search'); setIsModalOpen(true); };
  const handleAssetFound = (assetData) => { setMaintenanceTarget(assetData); setModalView('maintenance_form'); };
  const handleCloseModal = () => { setIsModalOpen(false); setTimeout(() => { setModalView('select'); setMaintenanceTarget(null); }, 300); };

  const getModalTitle = () => {
    if (modalView === 'maintenance_search') return "Buscar Ativo para Manutenção";
    if (modalView === 'maintenance_form') return `Manutenção: ${maintenanceTarget?.id}`;
    if (modalView === 'computer') return "Registrar Novo Computador";
    if (modalView === 'printer') return "Registrar Nova Impressora";
    return "Registrar Novo Ativo";
  };

  const renderModalContent = () => {
    switch (modalView) {
      case 'select': return <AssetTypeSelector onSelectType={setModalView} />;
      case 'computer': return <AddAssetForm onClose={handleCloseModal} />;
      case 'printer': return <AddPrinterForm onClose={handleCloseModal} />;
      case 'maintenance_search': return <AssetSearchForm onAssetFound={handleAssetFound} onCancel={handleCloseModal} />;
      case 'maintenance_form': return <MaintenanceAssetForm onClose={handleCloseModal} assetId={maintenanceTarget?.id} currentData={maintenanceTarget} />;
      default: return null;
    }
  };

  return (
    <div className={styles.dashboard}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={getModalTitle()}>
        {renderModalContent()}
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.quickActions}>
          <button className={styles.actionButton} onClick={handleOpenRegister} disabled={!permissions?.ativos?.create} style={{ opacity: !permissions?.ativos?.create ? 0.6 : 1, cursor: !permissions?.ativos?.create ? 'not-allowed' : 'pointer' }}>
            <Plus size={18} /> Registrar Novo Ativo
          </button>
          <button className={styles.actionButtonSecondary} onClick={handleOpenMaintenance} disabled={!permissions?.ativos?.update} style={{ opacity: !permissions?.ativos?.update ? 0.6 : 1, cursor: !permissions?.ativos?.update ? 'not-allowed' : 'pointer' }}>
            <Wrench size={18} /> Iniciar Manutenção
          </button>
        </div>
      </header>

      <div className={styles.cardGrid}>
        <div className={styles.card}><Wrench className={styles.cardIcon} style={{ color: 'var(--color-warning)' }} /><span className={styles.cardTitle}>Em Manutenção</span><span className={styles.cardValue}>{maintenanceAssets ? maintenanceAssets.size : 0}</span></div>
        <div className={styles.card}><Laptop className={styles.cardIcon} style={{ color: 'var(--color-primary)' }} /><span className={styles.cardTitle}>Computadores Ativos</span><span className={styles.cardValue}>{getActiveCount(loadingComputers, computerAssets)}</span></div>
        <div className={styles.card}><Printer className={styles.cardIcon} style={{ color: 'var(--color-text-secondary)' }} /><span className={styles.cardTitle}>Impressoras Ativas</span><span className={styles.cardValue}>{getActiveCount(loadingPrinters, printerAssets)}</span></div>
      </div>

      <div className={styles.contentRow}>
        <div className={styles.chartContainer}>
          <h2 className={styles.sectionTitle}>Ativos por Unidade</h2>
          {loadingUnits ? <div className={styles.loadingState}><Loader2 className={styles.spinner} /></div> : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieChartData} cx="50%" cy="50%" labelLine={false} outerRadius={110} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                </Pie>
                <Tooltip /> <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={styles.feedContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}><History size={18} /> Últimas Atividades</h2>
            <Link to="/atividades" className={styles.viewAllLink}>Ver Tudo <ArrowRight size={16} /></Link>
          </div>
          
          {loadingHistory && <div className={styles.loadingState}><Loader2 className={styles.spinner} /></div>}
          {errorHistory && <div className={styles.emptyFeed}><p className={styles.errorText}>Erro ao carregar histórico.</p><p className={styles.errorTextSmall}>Verifique índices no console.</p></div>}
          
          {!loadingHistory && history?.docs.length === 0 && (
            <div className={styles.emptyFeed}><PackageSearch size={30} /><p>Nenhuma atividade registrada.</p></div>
          )}

          <ul className={styles.feedList}>
            {history?.docs.map(doc => {
              const item = doc.data();
              const date = item.timestamp?.toDate();
              return (
                <li key={doc.id} className={styles.feedItem}>
                  <History className={styles.feedIcon} />
                  <div className={styles.feedContent}>
                    <strong>{item.type}</strong>
                    <span className={styles.feedTime}>{date ? formatDistanceToNow(date, { addSuffix: true, locale: ptBR }) : '...'}</span>
                    <p>{item.details}</p>
                    <small>Usuário: {item.user}</small>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;