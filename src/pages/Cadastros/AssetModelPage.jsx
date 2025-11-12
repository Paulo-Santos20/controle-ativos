import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom'; // Importa o <Link> para navegação
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query, where } from 'firebase/firestore'; 
import { db } from '/src/lib/firebase.js'; // Caminho absoluto
import { 
  Plus, 
  Loader2, 
  Search, 
  Laptop, 
  ChevronRight, 
  Package, 
  Printer, 
  HardDrive, 
  Pencil // Ícone para "Editar"
} from 'lucide-react';

// CSS compartilhado para páginas de cadastro
import styles from './CadastroPages.module.css'; 
// Componente de Modal reutilizável
import Modal from '../../components/Modal/Modal';

// Importa TODOS os formulários que esta página pode precisar abrir
import AddAssetForm from '../../components/Inventory/AddAssetForm'; 
import AddPrinterForm from '../../components/Inventory/AddPrinterForm';
import EditAssetForm from '../../components/Inventory/EditAssetForm'; 
import EditPrinterForm from '../../components/Inventory/EditPrinterForm';

/**
 * Helper de UI para mostrar o ícone correto baseado no tipo.
 */
const TypeIcon = ({ type }) => {
  if (type === 'computador') return <Laptop size={20} />;
  if (type === 'impressora') return <Printer size={20} />;
  return <HardDrive size={20} />; 
};

/**
 * Página reutilizável para listar e gerenciar ativos de um tipo específico
 * (ex: Computadores ou Impressoras).
 * @param {object} props
 * @param {'computador' | 'impressora'} props.type - O tipo de ativo a ser gerenciado.
 * @param {string} props.title - O título da página (ex: "Computadores").
 */
const AssetModelPage = ({ type, title }) => {
  // Estado para controlar o modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Estado para o item em edição (null = modo de registro)
  const [editingAssetDoc, setEditingAssetDoc] = useState(null); 
  // Estado para o filtro de busca
  const [searchTerm, setSearchTerm] = useState("");

  // Consulta ao Firestore (Princípio 2: Performance Total)
  // Busca apenas os 'assets' do 'type' correto
  const q = query(
    collection(db, 'assets'), 
    where('type', '==', type), 
    orderBy('createdAt', 'desc')
  );
  
  const [assets, loading, error] = useCollection(q);

  // Filtro de Busca (UI/UX)
  // 'useMemo' otimiza a performance, só re-filtra se a busca ou os dados mudarem
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    if (!searchTerm) return assets.docs; 

    const search = searchTerm.toLowerCase();
    return assets.docs.filter(doc => {
      const data = doc.data();
      return (
        doc.id.toLowerCase().includes(search) || // Busca por Tombamento (ID)
        (data.serial && data.serial.toLowerCase().includes(search)) ||
        (data.setor && data.setor.toLowerCase().includes(search)) ||
        (data.hostname && data.hostname.toLowerCase().includes(search))
      );
    });
  }, [assets, searchTerm]);
  
  // --- Funções de Controle do Modal (UI/UX) ---

  const handleOpenAddNew = () => {
    setEditingAssetDoc(null); // Garante que está em modo "novo"
    setIsModalOpen(true);
  };

  const handleOpenEdit = (assetDoc) => {
    setEditingAssetDoc(assetDoc); // Define o ativo a ser editado
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Limpa o estado de edição após a animação de fechar
    setTimeout(() => setEditingAssetDoc(null), 300);
  };

  // Helper de Estilo
  const getStatusClass = (status) => {
    if (status === 'Em uso') return styles.statusUsage;
    if (status === 'Em manutenção') return styles.statusMaintenance;
    if (status === 'Estoque') return styles.statusStock;
    if (status === 'Inativo') return styles.statusInactive;
    return '';
  };
  
  // Lógica de Renderização do Modal (Princípio 1: Arquitetura Escalável)
  const renderModalContent = () => {
    const isEditing = !!editingAssetDoc;

    if (type === 'computador') {
      return isEditing ? (
        // Modo Edição de Computador
        <EditAssetForm 
          onClose={handleCloseModal} 
          assetId={editingAssetDoc.id}
          existingData={editingAssetDoc.data()}
        />
      ) : (
        // Modo Registro de Computador
        <AddAssetForm 
          onClose={handleCloseModal} 
          // 'onBack' não é necessário aqui
        />
      );
    }
    
    if (type === 'impressora') {
      return isEditing ? (
        // Modo Edição de Impressora
        <EditPrinterForm 
          onClose={handleCloseModal}
          assetId={editingAssetDoc.id}
          existingData={editingAssetDoc.data()}
        />
      ) : (
        // Modo Registro de Impressora
        <AddPrinterForm 
          onClose={handleCloseModal}
          // 'onBack' não é necessário aqui
        />
      );
    }
    return <p className={styles.errorText}>Erro: Tipo de formulário não reconhecido.</p>;
  };

  return (
    <div className={styles.page}>
      
      {/* --- O Modal --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        // Título dinâmico (Editar vs. Registrar)
        title={
          editingAssetDoc ? 
          `Editar ${title.slice(0, -1)}` : 
          `Registrar Novo ${title.slice(0, -1)}`
        }
      >
        {renderModalContent()}
      </Modal>

      {/* --- Cabeçalho da Página --- */}
      <header className={styles.header}>
        <h1 className={styles.title}>Cadastro de {title}</h1>
        <button className={styles.primaryButton} onClick={handleOpenAddNew}>
          <Plus size={18} /> Registrar Novo {title.slice(0, -1)}
        </button>
      </header>

      {/* --- Barra de Filtro --- */}
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

      {/* --- Conteúdo da Lista (Tabela Responsiva) --- */}
      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Carregando {title.toLowerCase()}...</p>
          </div>
        )}
        
        {error && (
          <div className={styles.errorState}>
             <h3>⚠️ Erro ao Carregar Dados</h3>
             <p>{error.message}</p>
             <p className={styles.errorTextSmall}>Verifique se o Firestore precisa de um índice (veja o console F12).</p>
           </div>
        )}

        {/* Tabela de Ativos Físicos */}
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
                    <td data-label="Modelo" className={styles.hideMobile}>{asset.modelo}</td>
                    <td data-label="Serial" className={styles.hideMobile}>{asset.serial}</td>
                    
                    <td className={styles.actionCell}>
                      {/* Link para a página de Detalhes */}
                      <Link to={`/inventory/${doc.id}`} className={styles.detailsButton}>
                        Ver <ChevronRight size={16} />
                      </Link>
                      
                      {/* Botão de Edição Rápida */}
                      <button 
                        className={styles.iconButton} 
                        title="Editar"
                        onClick={() => handleOpenEdit(doc)} // Abre o modal em modo de edição
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Feedback para lista vazia */}
        {!loading && !error && filteredAssets?.length === 0 && (
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