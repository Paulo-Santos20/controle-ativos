import React, { useState } from 'react';
import { db } from '../../lib/firebase.js';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { 
  Laptop, Printer, Wrench, History, Plus, PackageSearch 
} from 'lucide-react';

import styles from './Dashboard.module.css';
import Loading from '../../components/Loading/Loading.jsx';

// --- IMPORTA O FLUXO DE CADASTRO ---
import Modal from '../../components/Modal/Modal';
import AssetTypeSelector from '../../components/Inventory/AssetTypeSelector';
import AddAssetForm from '../../components/Inventory/AddAssetForm';
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';

// ... (o código do pieChartData continua o mesmo) ...
const pieChartData = [
  { name: 'Hospital HMR', value: 450 },
  { name: 'Hospital HMA', value: 300 },
  { name: 'Hospital HSS', value: 220 },
];
const COLORS = ['#007aff', '#5ac8fa', '#ff9500'];

const Dashboard = () => {
  // --- LÓGICA DE MODAL ATUALIZADA (UI/UX) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Controla qual view mostrar: 'select', 'computer', ou 'printer'
  const [modalView, setModalView] = useState('select'); 

  // ... (o código dos hooks useCollection continua o mesmo) ...
  const [maintenanceAssets, loadingMaintenance, errorMaintenance] = useCollection(
    query(collection(db, 'assets'), where('status', '==', 'Em manutenção'))
  );
  const [history, loadingHistory, errorHistory] = useCollection(
    query(collection(db, 'assetHistory'), orderBy('timestamp', 'desc'), limit(5))
  );

  if (errorMaintenance || errorHistory) {
    toast.error("Erro ao carregar dados do dashboard.");
    console.error(errorMaintenance || errorHistory);
    return <p>Erro ao carregar dados.</p>;
  }

  const maintenanceCount = loadingMaintenance ? '...' : maintenanceAssets.size;

  // --- FUNÇÕES DE CONTROLE DO MODAL (Idênticas ao InventoryList) ---
  const handleOpenModal = () => {
    setModalView('select'); 
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setModalView('select'), 300); 
  };

  // --- LÓGICA DE RENDERIZAÇÃO DO MODAL (Idêntica ao InventoryList) ---
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

  return (
    <div className={styles.dashboard}>
      {/* --- MODAL ATUALIZADO --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        // Título dinâmico
        title={
          modalView === 'select' ? "Registrar Novo Ativo" :
          modalView === 'computer' ? "Registrar Novo Computador" :
          "Registrar Nova Impressora"
        }
      >
        {renderModalContent()}
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.quickActions}>
          {/* O botão agora usa a função de abertura correta */}
          <button className={styles.actionButton} onClick={handleOpenModal}>
            <Plus size={18} /> Registrar Novo Ativo
          </button>
          <button className={styles.actionButtonSecondary}>
            <Wrench size={18} /> Iniciar Manutenção
          </button>
        </div>
      </header>
      
      {/* ... (O resto do seu Dashboard (Cards, Gráficos, Feed) permanece idêntico) ... */}
      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <Wrench className={styles.cardIcon} style={{ color: 'var(--color-warning)' }} />
          <span className={styles.cardTitle}>Em Manutenção</span>
          <span className={styles.cardValue}>{maintenanceCount}</span>
        </div>
        <div className={styles.card}>
          <Laptop className={styles.cardIcon} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.cardTitle}>Total Computadores</span>
          <span className={styles.cardValue}>...</span> 
        </div>
        <div className={styles.card}>
          <Printer className={styles.cardIcon} style={{ color: 'var(--color-text-secondary)' }} />
          <span className={styles.cardTitle}>Total Impressoras</span>
          <span className={styles.cardValue}>...</span>
        </div>
      </div>

      <div className={styles.contentRow}>
        <div className={styles.chartContainer}>
          <h2 className={styles.sectionTitle}>Ativos por Unidade</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={110}
                fill="#8884d8"
                dataKey="value"
                label={(entry) => entry.name}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.feedContainer}>
          <h2 className={styles.sectionTitle}>Últimas Atividades</h2>
          {loadingHistory && <Loading />}
          
          {!loadingHistory && history?.docs.length === 0 && (
            <div className={styles.emptyFeed}>
              <PackageSearch size={30} />
              <p>Nenhuma atividade registrada ainda.</p>
            </div>
          )}

          <ul className={styles.feedList}>
            {history?.docs.map(doc => {
              const item = doc.data();
              return (
                <li key={doc.id} className={styles.feedItem}>
                  <History className={styles.feedIcon} />
                  <div className={styles.feedContent}>
                    <strong>{item.type}</strong> (Usuário: {item.user})
                    <p>{item.details}</p>
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