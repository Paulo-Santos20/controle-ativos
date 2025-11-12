import React, { useState } from 'react';
import styles from './Settings.module.css';
import { Building, HardDrive, Briefcase } from 'lucide-react'; // Ícones da nova biblio

// 1. Importar o novo componente da aba
import Units from '../../components/Settings/Units';

// Componentes "stub" para as outras abas
const TabModelos = () => <div style={{padding: '20px'}}>Conteúdo CRUD para Modelos de Ativos...</div>;
const TabEmpresas = () => <div style={{padding: '20px'}}>Conteúdo CRUD para Empresas (Suporte)...</div>;

const Settings = () => {
  const [activeTab, setActiveTab] = useState('unidades');

  const renderTabContent = () => {
    switch (activeTab) {
      // 2. Renderizar o componente Units
      case 'unidades': return <Units />;
      case 'modelos': return <TabModelos />;
      case 'empresas': return <TabEmpresas />;
      default: return null;
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Configurações Gerais</h1>
      </header>

      <div className={styles.content}>
        <div className={styles.tabNav}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'unidades' ? styles.active : ''}`}
            onClick={() => setActiveTab('unidades')}>
            <Building size={16} /> Unidades
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'modelos' ? styles.active : ''}`}
            onClick={() => setActiveTab('modelos')}>
            <HardDrive size={16} /> Modelos de Ativos
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'empresas' ? styles.active : ''}`}
            onClick={() => setActiveTab('empresas')}>
            <Briefcase size={16} /> Empresas (Suporte)
          </button>
        </div>

        <div className={styles.tabContent}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;