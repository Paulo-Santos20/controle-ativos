import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Importa o <Link>
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query, where } from 'firebase/firestore'; 
import { db } from '/src/lib/firebase.js';
import { Plus, Loader2, Search, Laptop, ChevronRight, Package, Printer, HardDrive } from 'lucide-react';

import styles from './CadastroPages.module.css'; // Reutiliza o mesmo CSS
import Modal from '../../components/Modal/Modal';

// --- ESTA É A CORREÇÃO PRINCIPAL ---
// Importa AMBOS os formulários detalhados
import AddAssetForm from '../../components/Inventory/AddAssetForm'; 
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';
// ------------------------------------

// Helper de Ícone
const TypeIcon = ({ type }) => {
  if (type === 'computador') return <Laptop size={20} />;
  if (type === 'impressora') return <Printer size={20} />;
  return <HardDrive size={20} />; 
};

/**
 * Componente de página reutilizável.
 * Recebe 'type' e 'title' do router.jsx.
 */
const AssetModelPage = ({ type, title }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // A consulta busca na coleção 'assets' (ativos físicos)
  // e filtra pelo tipo que vem da prop (ex: 'computador' ou 'impressora')
  const q = query(
    collection(db, 'assets'), 
    where('type', '==', type), // Filtra pelo tipo correto
    orderBy('createdAt', 'desc')
  );
  
  const [assets, loading, error] = useCollection(q);

  // Lógica do filtro de busca (local)
  const filteredAssets = assets?.docs.filter(doc => {
    const data = doc.data();
    const search = searchTerm.toLowerCase();
    return (
      doc.id.toLowerCase().includes(search) || // Busca por Tombamento (ID)
      (data.serial && data.serial.toLowerCase().includes(search)) ||
      (data.setor && data.setor.toLowerCase().includes(search)) ||
      (data.hostname && data.hostname.toLowerCase().includes(search))
    );
  });
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Funções de estilo da lista (para os status)
  const getStatusClass = (status) => {
    if (status === 'Em uso') return styles.statusUsage;
    if (status === 'Em manutenção') return styles.statusMaintenance;
    if (status === 'Estoque') return styles.statusStock;
    if (status === 'Inativo') return styles.statusInactive;
    return '';
  };
  
  // --- NOVA FUNÇÃO DE RENDERIZAÇÃO DO MODAL (UI/UX) ---
  // Decide qual formulário mostrar baseado na 'prop'
  const renderModalContent = () => {
    if (type === 'computador') {
      return <AddAssetForm onClose={handleCloseModal} />;
    }
    if (type === 'impressora') {
      return <AddPrinterForm onClose={handleCloseModal} />;
    }
    // O 'onBack' foi removido, pois esta página não usa o seletor de tipo
    return <p>Erro: Tipo de formulário não reconhecido.</p>;
  };

  return (
    <div className={styles.page}>
      
      {/* --- MODAL CORRIGIDO --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={`Registrar Novo ${title.slice(0, -1)}`} 
      >
        {/* Agora renderiza o formulário correto baseado no 'type' */}
        {renderModalContent()}
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Cadastro de {title}</h1>
        {/* O botão agora abre o modal correto para esta página */}
        <button className={styles.primaryButton} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Registrar Novo {title.slice(0, -1)}
        </button>
      </header>

      {/* Barra de Filtro */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder={`Buscar em ${title.toLowerCase()} (por tombamento, serial, setor)...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- CONTEÚDO DA LISTA CORRIGIDO --- */}
      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Carregando {title.toLowerCase()}...</p>
          </div>
        )}
        
        {error && <p className={styles.errorText}>Erro: {error.message}</p>}

        {/* Usamos o layout de Tabela do InventoryList */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tombamento (ID)</th>
                <th>Status</th>
                <th>Setor</th>
                <th className={styles.hideMobile}>Modelo</th>
                <th className={styles.hideMobile}>Serial</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets && filteredAssets.map(doc => {
                const asset = doc.data();
                return (
                  <tr key={doc.id}>
                    <td data-label="Tombamento">{doc.id}</td>
                    <td data-label="Status">
                      <span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td data-label="Setor">{asset.setor}</td>
                    {/* Corrigido para 'modelo' e 'serial' que vêm do form */}
                    <td data-label="Modelo" className={styles.hideMobile}>{asset.modelo}</td>
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

        {/* Feedback para lista vazia */}
        {!loading && filteredAssets?.length === 0 && (
          <div className={styles.emptyState}>
            <Package size={40} />
            <h3>Nenhum {title.toLowerCase()} encontrado.</h3>
            <p>Clique no botão acima para registrar o primeiro.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetModelPage;