import React, { useState } from 'react';
import { db, auth } from '../../lib/firebase.js'; 
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  where, 
  collectionGroup 
} from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom'; // Importa o Link
import { 
  Laptop, 
  Printer, 
  Wrench, 
  History, // Ícone que vamos usar no título
  Plus, 
  PackageSearch,
  Loader2,
  ArrowRight // Ícone para o link "Ver Tudo"
} from 'lucide-react';

import styles from './Dashboard.module.css';
import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';

// Cores para o gráfico (UI/UX)
const COLORS = ['#007aff', '#5ac8fa', '#ff9500', '#34c759', '#ff3b30', '#af52de'];

/**
 * Painel principal com visão geral do status dos ativos.
 */
const Dashboard = () => {
  // --- LÓGICA DO MODAL (UI/UX) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('select'); // 'select' | 'computer' | 'printer'

  // --- CONSULTAS DE DADOS REAIS (Performance Total) ---

  // 1. Card: Em Manutenção
  const [maintenanceAssets, loadingMaintenance] = useCollection(
    query(collection(db, 'assets'), where('status', '==', 'Em manutenção'))
  );

  // 2. Card: Total de Computadores
  const [computerAssets, loadingComputers] = useCollection(
    query(collection(db, 'assets'), where('type', '==', 'computador'))
  );

  // 3. Card: Total de Impressoras
  const [printerAssets, loadingPrinters] = useCollection(
    query(collection(db, 'assets'), where('type', '==', 'impressora'))
  );

  // 4. Gráfico de Pizza: Busca as Unidades
  const [units, loadingUnits] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  // 5. Feed de Atividade: Busca na subcoleção 'history'
  const [history, loadingHistory, errorHistory] = useCollection(
    query(collectionGroup(db, 'history'), orderBy('timestamp', 'desc'), limit(5))
  );

  // --- Processamento dos dados para o Gráfico ---
  const pieChartData = units?.docs.map((doc, index) => ({
    name: doc.data().sigla || doc.data().name, 
    value: doc.data().assetCount || 0, 
    fill: COLORS[index % COLORS.length] 
  })) || [];
  
  // --- Lógica do Modal ---
  const handleOpenModal = () => { setModalView('select'); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setTimeout(() => setModalView('select'), 300); };
  const renderModalContent = () => {
    switch (modalView) {
      case 'select': return <AssetTypeSelector onSelectType={setModalView} />;
      case 'computer': return <AddAssetForm onClose={handleCloseModal} onBack={() => setModalView('select')} />;
      case 'printer': return <AddPrinterForm onClose={handleCloseModal} onBack={() => setModalView('select')} />;
      default: return null;
    }
  };

  // Helper para os contadores (UI/UX)
  const getCount = (loading, snapshot) => {
    if (loading) return <Loader2 size={16} className={styles.spinnerSmall} />;
    return snapshot ? snapshot.size : 0;
  };

  return (
    <div className={styles.dashboard}>
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
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.quickActions}>
          <button className={styles.actionButton} onClick={handleOpenModal}>
            <Plus size={18} /> Registrar Novo Ativo
          </button>
          <button className={styles.actionButtonSecondary}>
            <Wrench size={18} /> Iniciar Manutenção
          </button>
        </div>
      </header>

      {/* --- CARDS DE RESUMO (com dados reais) --- */}
      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <Wrench className={styles.cardIcon} style={{ color: 'var(--color-warning)' }} />
          <span className={styles.cardTitle}>Em Manutenção</span>
          <span className={styles.cardValue}>
            {getCount(loadingMaintenance, maintenanceAssets)}
          </span>
        </div>
        <div className={styles.card}>
          <Laptop className={styles.cardIcon} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.cardTitle}>Total Computadores</span>
          <span className={styles.cardValue}>
            {getCount(loadingComputers, computerAssets)}
          </span>
        </div>
        <div className={styles.card}>
          <Printer className={styles.cardIcon} style={{ color: 'var(--color-text-secondary)' }} />
          <span className={styles.cardTitle}>Total Impressoras</span>
          <span className={styles.cardValue}>
            {getCount(loadingPrinters, printerAssets)}
          </span>
        </div>
      </div>

      {/* --- LINHA DE CONTEÚDO (Gráfico e Feed) --- */}
      <div className={styles.contentRow}>
        
        {/* GRÁFICO DE PIZZA (com dados reais) */}
        <div className={styles.chartContainer}>
          <h2 className={styles.sectionTitle}>Ativos por Unidade</h2>
          {loadingUnits ? (
            <div className={styles.loadingState}><Loader2 className={styles.spinner} /></div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={110}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* FEED DE ATIVIDADE (com dados reais) */}
        <div className={styles.feedContainer}>
          
          {/* --- CABEÇALHO DO FEED ATUALIZADO --- */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <History size={18} /> {/* 3. ÍCONE ADICIONADO AQUI */}
              Últimas Atividades
            </h2>
            <Link to="/atividades" className={styles.viewAllLink}>
              Ver Tudo
              <ArrowRight size={16} />
            </Link>
          </div>
          
          {loadingHistory && <div className={styles.loadingState}><Loader2 className={styles.spinner} /></div>}
          
          {errorHistory && (
             <div className={styles.emptyFeed}>
               <p className={styles.errorText}>Erro ao carregar histórico.</p>
               <p className={styles.errorTextSmall}>Verifique as regras e índices do Firestore (veja console).</p>
               {console.error("Erro no Feed:", errorHistory)}
             </div>
          )}
          
          {!loadingHistory && history?.docs.length === 0 && (
            <div className={styles.emptyFeed}>
              <PackageSearch size={30} />
              <p>Nenhuma atividade registrada ainda.</p>
            </div>
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
                    <span className={styles.feedTime}>
                      {date ? formatDistanceToNow(date, { addSuffix: true, locale: ptBR }) : '...'}
                    </span>
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