import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js'; // Caminho absoluto
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Pencil, Truck, Wrench, History, Loader2, HardDrive, Printer, Laptop } from 'lucide-react';

import styles from './AssetDetail.module.css'; 
import Modal from '../../components/Modal/Modal';
import EditAssetForm from '../../components/Inventory/EditAssetForm'; 
import MoveAssetForm from '../../components/Inventory/MoveAssetForm'; 
import MaintenanceAssetForm from '../../components/Inventory/MaintenanceAssetForm'; 
// NOVO: Importa o formulário de impressora para edição
import EditPrinterForm from '../../components/Inventory/EditPrinterForm'; 

// Helper de Ícone
const TypeIcon = ({ type }) => {
  if (type === 'computador') return <Laptop size={24} />;
  if (type === 'impressora') return <Printer size={24} />;
  return <HardDrive size={24} />; 
};

// Helper de Status (UI/UX)
const getStatusClass = (status) => {
  if (status === 'Em uso') return styles.statusUsage;
  if (status === 'Em manutenção') return styles.statusMaintenance;
  if (status === 'Estoque') return styles.statusStock;
  if (status === 'Inativo') return styles.statusInactive;
  return '';
};


const AssetDetail = () => {
  const { assetId } = useParams(); // Pega o Tombamento (ID) da URL
  const [modalView, setModalView] = useState(null); 

  const assetRef = doc(db, 'assets', assetId);
  const [asset, loadingAsset, errorAsset] = useDocumentData(assetRef);

  const historyQuery = query(
    collection(db, 'assets', assetId, 'history'),
    orderBy('timestamp', 'desc')
  );
  const [history, loadingHistory, errorHistory] = useCollection(historyQuery);

  if (loadingAsset) {
    return (
      <div className={styles.loadingState}>
        <Loader2 className={styles.spinner} />
        <p>Carregando dados do ativo...</p>
      </div>
    );
  }

  if (errorAsset || !asset) {
    return <p className={styles.errorText}>Erro: Ativo não encontrado.</p>;
  }

  const handleOpenModal = (view) => setModalView(view);
  const handleCloseModal = () => setModalView(null);

  // Renderiza o formulário de edição correto (Computador ou Impressora)
  const renderEditForm = () => {
    if (asset.type === 'computador') {
      return <EditAssetForm onClose={handleCloseModal} assetId={assetId} existingData={asset} />;
    }
    if (asset.type === 'impressora') {
      return <EditPrinterForm onClose={handleCloseModal} assetId={assetId} existingData={asset} />;
    }
    return <p>Este tipo de ativo não pode ser editado.</p>;
  };

  const renderModalContent = () => {
    switch (modalView) {
      case 'edit':
        return renderEditForm();
      case 'move':
        return <MoveAssetForm onClose={handleCloseModal} assetId={assetId} currentData={asset} />;
      case 'maintenance':
        return <MaintenanceAssetForm onClose={handleCloseModal} assetId={assetId} currentData={asset} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.page}>
      <Modal 
        isOpen={!!modalView} 
        onClose={handleCloseModal}
        title={
          modalView === 'edit' ? "Editar Ativo" :
          modalView === 'move' ? "Movimentar Ativo" :
          "Enviar para Manutenção/Preventiva"
        }
      >
        {renderModalContent()}
      </Modal>

      <header className={styles.header}>
        <Link to="/inventory" className={styles.backButton}>
          <ArrowLeft size={18} /> Voltar ao Inventário
        </Link>
        <div className={styles.actions}>
          <button className={styles.actionButton} onClick={() => handleOpenModal('move')}>
            <Truck size={16} /> Movimentar
          </button>
          <button className={styles.actionButtonSecondary} onClick={() => handleOpenModal('maintenance')}>
            <Wrench size={16} /> Preventiva
          </button>
          <button className={styles.primaryButton} onClick={() => handleOpenModal('edit')}>
            <Pencil size={16} /> Editar
          </button>
        </div>
      </header>

      {/* Grid de Conteúdo Responsivo */}
      <div className={styles.contentGrid}>
        
        {/* === CARD DE INFORMAÇÕES (O "PRIMEIRO CARD DA ESQUERDA") === */}
        <div className={styles.infoCard}>
          {/* --- Seção 1: Título e ID --- */}
          <div className={styles.infoTitle}>
            <div className={styles.titleIcon}><TypeIcon type={asset.type} /></div>
            <div>
              <span className={styles.assetType}>{asset.tipoAtivo} ({asset.marca})</span>
              <h1 className={styles.assetName}>{asset.hostname || asset.modelo}</h1>
              <p className={styles.assetId}>Tombamento: <strong>{assetId}</strong></p>
            </div>
          </div>

          {/* --- Seção 2: Dados Principais --- */}
          <h3 className={styles.detailSubtitle}>Dados Principais</h3>
          <div className={styles.infoGrid}>
            <div><span>Status</span><strong className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>{asset.status}</strong></div>
            <div><span>Modelo</span><strong>{asset.modelo}</strong></div>
            <div><span>Serial</span><strong>{asset.serial}</strong></div>
            <div><span>Propriedade</span><strong>{asset.propriedade || asset.posse}</strong></div>
            {asset.serviceTag && <div><span>Service Tag</span><strong>{asset.serviceTag}</strong></div>}
          </div>

          {/* --- Seção 3: Localização --- */}
          <h3 className={styles.detailSubtitle}>Localização Atual</h3>
          <div className={styles.infoGrid}>
            <div><span>Unidade</span><strong>{asset.unitId}</strong></div>
            <div><span>Pavimento</span><strong>{asset.pavimento}</strong></div>
            <div><span>Setor</span><strong>{asset.setor}</strong></div>
            <div><span>Sala</span><strong>{asset.sala}</strong></div>
            <div><span>Funcionário</span><strong>{asset.funcionario || "---"}</strong></div>
          </div>
          
          {/* --- SEÇÃO 4: RENDERIZAÇÃO CONDICIONAL (A SUA SOLICITAÇÃO) --- */}
          
          {/* SE FOR COMPUTADOR */}
          {asset.type === 'computador' && (
            <>
              <h3 className={styles.detailSubtitle}>Configuração do Computador</h3>
              <div className={styles.infoGrid}>
                <div><span>Processador</span><strong>{asset.processador || "---"}</strong></div>
                <div><span>Memória</span><strong>{asset.memoria || "---"}</strong></div>
                <div><span>HD/SSD</span><strong>{asset.hdSsd || "---"}</strong></div>
                <div><span>S.O.</span><strong>{asset.so || "---"}</strong></div>
                <div><span>Versão S.O.</span><strong>{asset.soVersao || "---"}</strong></div>
                <div><span>Anti-vírus</span><strong>{asset.antivirus || "---"}</strong></div>
              </div>
            </>
          )}

          {/* SE FOR IMPRESSORA */}
          {asset.type === 'impressora' && (
            <>
              <h3 className={styles.detailSubtitle}>Configuração da Impressora</h3>
              <div className={styles.infoGrid}>
                <div><span>Conectividade</span><strong>{asset.conectividade || "---"}</strong></div>
                <div><span>Frente e Verso</span><strong>{asset.frenteVerso || "---"}</strong></div>
              </div>
              <h3 className={styles.detailSubtitle}>Insumos</h3>
              <div className={styles.infoGrid}>
                <div><span>Tipo de Insumo</span><strong>{asset.cartucho || "---"}</strong></div>
                <div><span>Colorido</span><strong>{asset.colorido || "---"}</strong></div>
                <div><span>Cartucho Preto</span><strong>{asset.cartuchoPreto || "---"}</strong></div>
                {/* UI/UX: Só mostra o campo de colorido se for 'Sim' */}
                {asset.colorido === 'Sim' && <div><span>Cartucho Colorido</span><strong>{asset.cartuchoColorido || "---"}</strong></div>}
                <div><span>Cilindro/DR</span><strong>{asset.drCilindro || "---"}</strong></div>
              </div>
            </>
          )}
          
          {asset.observacao && (
            <>
              <h3 className={styles.detailSubtitle}>Observação</h3>
              <p className={styles.obsText}>{asset.observacao}</p>
            </>
          )}

        </div>

        {/* --- Card de Histórico (Sem alteração) --- */}
        <div className={styles.historyCard}>
          <h2 className={styles.sectionTitle}><History size={18} /> Histórico do Ativo</h2>
          {/* ... (o restante do seu código de histórico) ... */}
        </div>
      </div>
    </div>
  );
};

export default AssetDetail;