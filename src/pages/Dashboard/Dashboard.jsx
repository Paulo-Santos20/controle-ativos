import React, { useState, useMemo } from 'react';
import { db } from '../../lib/firebase'; 
import { 
  collection, query, orderBy, limit, where, collectionGroup, documentId 
} from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { 
  Laptop, Printer, Wrench, History, Plus, PackageSearch, Loader2, ArrowRight
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import styles from './Dashboard.module.css';
import DashboardSkeleton from '../../components/Skeletons/DashboardSkeleton';

import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';
import AssetSearchForm from '../../components/Inventory/AssetSearchForm';
import MaintenanceAssetForm from '../../components/Inventory/MaintenanceAssetForm';

const COLORS = ['#007aff', '#5ac8fa', '#ff9500', '#34c759', '#ff3b30', '#af52de'];

const Dashboard = () => {
  const { isAdmin, allowedUnits, permissions, loading: authLoading } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('select'); 
  const [maintenanceTarget, setMaintenanceTarget] = useState(null);

  // --- HELPER DE SEGURANÇA ---
  const getPermissionConstraints = () => {
    if (allowedUnits && allowedUnits.length > 0) {
        return [where('unitId', 'in', allowedUnits)]; 
    }
    if (isAdmin) {
        return []; 
    }
    return [where('unitId', '==', 'BLOQUEADO')];
  };

  // --- 2. QUERIES (HOOKS) ---

  // A. Cards
  const maintenanceQuery = useMemo(() => {
    if (authLoading) return null;
    return query(
      collection(db, 'assets'), 
      where('status', '==', 'Em manutenção'),
      ...getPermissionConstraints()
    );
  }, [authLoading, isAdmin, allowedUnits]);
  const [maintenanceAssets] = useCollection(maintenanceQuery);

  const computersQuery = useMemo(() => {
    if (authLoading) return null;
    return query(
      collection(db, 'assets'), 
      where('type', '==', 'computador'),
      ...getPermissionConstraints()
    );
  }, [authLoading, isAdmin, allowedUnits]);
  const [computerAssets, loadingComputers] = useCollection(computersQuery);

  const printersQuery = useMemo(() => {
    if (authLoading) return null;
    return query(
      collection(db, 'assets'), 
      where('type', '==', 'impressora'),
      ...getPermissionConstraints()
    );
  }, [authLoading, isAdmin, allowedUnits]);
  const [printerAssets, loadingPrinters] = useCollection(printersQuery);

  // --- B. DADOS PARA O GRÁFICO (Esta query estava faltando) ---
  const allAssetsQuery = useMemo(() => {
    if (authLoading) return null;
    return query(collection(db, 'assets'), ...getPermissionConstraints());
  }, [authLoading, isAdmin, allowedUnits]);
  // Aqui definimos a variável que estava dando erro:
  const [allAssets, loadingAllAssets] = useCollection(allAssetsQuery);


  // C. Unidades (Para os nomes)
  const unitsQuery = useMemo(() => {
    if (authLoading) return null;
    if (allowedUnits && allowedUnits.length > 0) {
        return query(collection(db, 'units'), where(documentId(), 'in', allowedUnits));
    }
    if (isAdmin) {
        return query(collection(db, 'units'), orderBy('name', 'asc'));
    }
    return null;
  }, [authLoading, isAdmin, allowedUnits]);
  const [units, loadingUnits] = useCollection(unitsQuery);

  // D. Histórico (Feed)
  const historyQuery = useMemo(() => {
    if (authLoading || !isAdmin) return null; // Só admin vê feed
    return query(collectionGroup(db, 'history'), orderBy('timestamp', 'desc'), limit(5));
  }, [authLoading, isAdmin]);
  const [history, loadingHistory, errorHistory] = useCollection(historyQuery);


  // --- 3. CÁLCULO DO GRÁFICO ---
  const pieChartData = useMemo(() => {
    if (!allAssets || !units) return [];

    // Conta quantos ativos existem por ID de unidade
    const counts = {};
    allAssets.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'Devolvido' || data.status === 'Descartado') return;

        const uId = data.unitId;
        if (uId) {
            counts[uId] = (counts[uId] || 0) + 1;
        }
    });

    // Mapeia usando os nomes das unidades
    return units.docs
      .map(doc => {
         const unitData = doc.data();
         const count = counts[doc.id] || 0;
         return {
            name: unitData.sigla || unitData.name,
            value: count,
            fill: COLORS[0] 
         };
      })
      .filter(item => item.value > 0) // Esconde unidades vazias
      .map((item, index) => ({
          ...item,
          fill: COLORS[index % COLORS.length]
      }));

  }, [allAssets, units]);


  // --- 4. LOADING GLOBAL ---
  if (authLoading) {
    return <DashboardSkeleton />;
  }

  // --- HELPERS VISUAIS ---
  const getActiveCount = (loading, snapshot) => {
    if (loading) return <Loader2 size={20} className={styles.spinnerSmall} />;
    if (!snapshot) return 0;
    return snapshot.docs.filter(doc => {
      const s = doc.data().status;
      return s !== 'Devolvido' && s !== 'Descartado' && s !== 'Inativo';
    }).length;
  };

  const handleOpenRegister = () => { setModalView('select'); setIsModalOpen(true); };
  const handleOpenMaintenance = () => { setMaintenanceTarget(null); setModalView('maintenance_search'); setIsModalOpen(true); };
  const handleAssetFound = (assetData) => { setMaintenanceTarget(assetData); setModalView('maintenance_form'); };
  const handleCloseModal = () => { setIsModalOpen(false); setTimeout(() => { setModalView('select'); setMaintenanceTarget(null); }, 300); };

  const getModalTitle = () => {
    if (modalView === 'maintenance_search') return "Buscar Ativo";
    if (modalView === 'maintenance_form') return `Manutenção: ${maintenanceTarget?.id}`;
    if (modalView === 'computer') return "Novo Computador";
    if (modalView === 'printer') return "Nova Impressora";
    return "Registrar Ativo";
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
        <div className={styles.card}>
          <div className={styles.cardIcon}><Wrench style={{ color: 'var(--color-warning)' }} /></div>
          <span className={styles.cardTitle}>Em Manutenção</span>
          <span className={styles.cardValue}>{maintenanceAssets ? maintenanceAssets.size : 0}</span>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}><Laptop style={{ color: 'var(--color-primary)' }} /></div>
          <span className={styles.cardTitle}>Computadores Ativos</span>
          <span className={styles.cardValue}>{getActiveCount(loadingComputers, computerAssets)}</span>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}><Printer style={{ color: 'var(--color-text-secondary)' }} /></div>
          <span className={styles.cardTitle}>Impressoras Ativas</span>
          <span className={styles.cardValue}>{getActiveCount(loadingPrinters, printerAssets)}</span>
        </div>
      </div>

      {/* Layout Dinâmico: Ocupa 100% se não for Admin (sem feed) */}
      <div className={`${styles.contentRow} ${!isAdmin ? styles.fullWidth : ''}`}>
        
        <div className={styles.chartContainer}>
          <h2 className={styles.sectionTitle}>Ativos por Unidade</h2>
          {/* Aqui usamos a variável loadingAllAssets que estava faltando */}
          {(loadingAllAssets || loadingUnits) ? <div className={styles.loadingState}><Loader2 className={styles.spinner} /></div> : (
            <ResponsiveContainer width="100%" height={300}>
              {pieChartData.length > 0 ? (
                <PieChart>
                  <Pie data={pieChartData} cx="50%" cy="50%" labelLine={false} outerRadius={110} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                  </Pie>
                  <Tooltip /> <Legend />
                </PieChart>
              ) : (
                <div className={styles.emptyFeed}><p>Nenhum dado para exibir.</p></div>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Feed apenas para Admin */}
        {isAdmin && (
          <div className={styles.feedContainer}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}><History size={18} /> Últimas Atividades</h2>
              <Link to="/atividades" className={styles.viewAllLink}>Ver Tudo <ArrowRight size={16} /></Link>
            </div>
            
            {loadingHistory && <div className={styles.loadingState}><Loader2 className={styles.spinner} /></div>}
            {errorHistory && <div className={styles.emptyFeed}><p className={styles.errorText}>Erro no histórico.</p></div>}
            {!loadingHistory && history?.docs.length === 0 && <div className={styles.emptyFeed}><PackageSearch size={30} /><p>Nenhuma atividade.</p></div>}

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
        )}
      </div>
    </div>
  );
};

export default Dashboard;