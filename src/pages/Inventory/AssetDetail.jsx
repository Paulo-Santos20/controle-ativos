import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  deleteDoc, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js'; 
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  ArrowLeft, Pencil, Truck, Wrench, History, Loader2, 
  HardDrive, Printer, Laptop, ShieldAlert, Trash2, QrCode, Tag
} from 'lucide-react';

import { useAuth } from '/src/hooks/useAuth.js';
// REMOVIDO: import { generateQrCodePdf } from '/src/utils/qrCodeGenerator.jsx';
import { logAudit } from '/src/utils/auditLogger';

import styles from './AssetDetail.module.css'; 
import Modal from '../../components/Modal/Modal';
import EditAssetForm from '../../components/Inventory/EditAssetForm'; 
import MoveAssetForm from '../../components/Inventory/MoveAssetForm'; 
import MaintenanceAssetForm from '../../components/Inventory/MaintenanceAssetForm'; 
import EditPrinterForm from '../../components/Inventory/EditPrinterForm'; 
// --- NOVO: Importa o modal de exibição do QR Code ---
import QrCodeModal from '../../components/Inventory/QrCodeModal.jsx'; 

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
  if (status === 'Devolvido') return styles.statusReturned;
  return '';
};

const AssetDetail = () => {
  const { assetId } = useParams(); 
  const navigate = useNavigate();
  // --- ATUALIZADO: Estado do Modal ---
  const [modalView, setModalView] = useState(null); // 'edit', 'maintenance', 'movement', 'qr'
  const [isDeleting, setIsDeleting] = useState(false);

  const { isAdmin, allowedUnits, permissions, loading: authLoading } = useAuth();

  // Hooks de busca de dados
  const assetRef = doc(db, 'assets', assetId);
  const [asset, loadingAsset, errorAsset] = useDocumentData(assetRef);
  const historyQuery = query(
    collection(db, 'assets', assetId, 'history'),
    orderBy('timestamp', 'desc')
  );
  const [history, loadingHistory, errorHistory] = useCollection(historyQuery);

  // Estados de Carregamento
  if (loadingAsset || authLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 className={styles.spinner} />
        <p>Carregando dados do ativo...</p>
      </div>
    );
  }
  if (errorAsset || !asset) {
    // ... (código de erro não encontrado)
  }

  // --- BLOQUEIO DE SEGURANÇA (Sem alteração) ---
  if (!isAdmin && !allowedUnits.includes(asset.unitId)) {
    return (
      <div className={styles.loadingState}>
        <ShieldAlert size={48} color="#ef4444" />
        <h2 style={{marginTop: 16, fontSize: '1.5rem', color: '#1f2937'}}>Acesso Negado</h2>
        <p>Você não tem permissão para visualizar este ativo.</p>
        <Link to="/inventory" className={styles.primaryButton} style={{marginTop: 16, width: 'auto'}}>
          Voltar ao Inventário
        </Link>
      </div>
    );
  }

  // --- FUNÇÕES DE AÇÃO ---
  const handleOpenModal = (view) => setModalView(view);
  const handleCloseModal = () => setModalView(null);

  // Função de Deletar (sem alteração)
  const handleDeleteAsset = async () => {
    if (!window.confirm(`ATENÇÃO: Tem certeza que deseja EXCLUIR PERMANENTEMENTE o ativo ${asset.tombamento}?`)) return;
    setIsDeleting(true);
    const toastId = toast.loading("Excluindo ativo...");
    try {
      // (lógica de exclusão com writeBatch...)
      const historySnapshot = await getDocs(collection(db, 'assets', assetId, 'history'));
      const batch = writeBatch(db);
      historySnapshot.forEach((doc) => batch.delete(doc.ref));
      batch.delete(doc(db, 'assets', assetId));
      await batch.commit();
      await logAudit("Exclusão de Ativo", `Ativo "${asset.tombamento}" excluído.`, `Ativo: ${asset.tombamento}`);
      toast.success("Ativo excluído!", { id: toastId });
      navigate('/inventory');
    } catch (error) {
      toast.error("Erro ao excluir: " + error.message, { id: toastId });
      setIsDeleting(false);
    }
  };

  // --- RENDERIZAÇÃO ---

  const renderEditForm = () => {
    if (asset.type === 'computador') {
      return <EditAssetForm onClose={handleCloseModal} assetId={assetId} existingData={asset} />;
    }
    if (asset.type === 'impressora') {
      return <EditPrinterForm onClose={handleCloseModal} assetId={assetId} existingData={asset} />;
    }
    return <p>Este tipo de ativo não possui formulário de edição.</p>;
  };

  // --- ATUALIZADO: Renderização do Modal ---
  const renderModalContent = () => {
    switch (modalView) {
      case 'edit': return renderEditForm();
      case 'move': return <MoveAssetForm onClose={handleCloseModal} assetId={assetId} currentData={asset} />;
      case 'maintenance': return <MaintenanceAssetForm onClose={handleCloseModal} assetId={assetId} currentData={asset} />;
      case 'qr': // Novo caso
        return <QrCodeModal assetId={assetId} assetName={asset.modelo || assetId} />;
      default: return null;
    }
  };
  
  // --- ATUALIZADO: Título do Modal ---
  const getModalTitle = () => {
    switch (modalView) {
      case 'edit': return "Editar Ativo";
      case 'move': return "Movimentar Ativo";
      case 'maintenance': return "Registrar Manutenção";
      case 'qr': return "QR Code do Ativo";
      default: return "";
    }
  };

  return (
    <div className={styles.page}>
      <Modal 
        isOpen={!!modalView} 
        onClose={handleCloseModal}
        title={getModalTitle()}
      >
        {renderModalContent()}
      </Modal>

      {/* Cabeçalho */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </button>
          <div className={styles.titleWrapper}>
            <h1 className={styles.title}>Detalhes do Ativo</h1>
            <span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>{asset.status}</span>
          </div>
        </div>

        <div className={styles.actions}>
          {/* --- ATUALIZADO: Botão Gerar QR Code --- */}
          {permissions?.ativos?.read && (
            <button 
              className={styles.iconButton} 
              onClick={() => handleOpenModal('qr')} // <-- Chama o modal 'qr'
              title="Gerar QR Code"
            >
              <QrCode size={20} />
            </button>
          )}

          {permissions?.ativos?.update && (
            <>
              <button className={styles.actionButton} onClick={() => handleOpenModal('move')}>
                <Truck size={18} /> Movimentar
              </button>
              <button className={styles.actionButtonSecondary} onClick={() => handleOpenModal('maintenance')}>
                <Wrench size={18} /> Preventiva
              </button>
              <button className={styles.primaryButton} onClick={() => handleOpenModal('edit')}>
                <Pencil size={18} /> Editar
              </button>
            </>
          )}

          {permissions?.ativos?.delete && (
            <button 
              className={styles.deleteButton} 
              onClick={handleDeleteAsset} 
              disabled={isDeleting}
              title="Excluir Ativo"
            >
              {isDeleting ? <Loader2 className={styles.spinner} size={18} /> : <Trash2 size={18} />}
            </button>
          )}
        </div>
      </header>

      {/* Grid de Conteúdo (sem alteração) */}
      <div className={styles.contentGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoTitle}>
            <div className={styles.titleIcon}><TypeIcon type={asset.type} /></div>
            <div>
              <span className={styles.assetType}>{asset.tipoAtivo} ({asset.marca})</span>
              <h1 className={styles.assetName}>{asset.hostname || asset.modelo}</h1>
              <p className={styles.assetId}>Tombamento: <strong>{assetId}</strong></p>
            </div>
          </div>
          <h3 className={styles.detailSubtitle}>Dados Principais</h3>
          <div className={styles.infoGrid}>
            <div><span>Modelo</span><strong>{asset.modelo}</strong></div>
            <div><span>Serial</span><strong>{asset.serial}</strong></div>
            <div><span>Propriedade</span><strong>{asset.propriedade || asset.posse}</strong></div>
            {asset.serviceTag && <div><span>Service Tag</span><strong>{asset.serviceTag}</strong></div>}
            {asset.macAddress && <div><span>MAC Address</span><strong>{asset.macAddress}</strong></div>}
          </div>
          <h3 className={styles.detailSubtitle}>Localização Atual</h3>
          <div className={styles.infoGrid}>
            <div><span>Unidade</span><strong>{asset.unitId}</strong></div>
            <div><span>Pavimento</span><strong>{asset.pavimento}</strong></div>
            <div><span>Setor</span><strong>{asset.setor}</strong></div>
            <div><span>Sala</span><strong>{asset.sala}</strong></div>
            <div><span>Funcionário</span><strong>{asset.funcionario || "---"}</strong></div>
          </div>
          {asset.type === 'computador' && (
            <>
              <h3 className={styles.detailSubtitle}>Configuração Técnica</h3>
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
          {asset.type === 'impressora' && (
            <>
              <h3 className={styles.detailSubtitle}>Configuração de Rede</h3>
              <div className={styles.infoGrid}>
                <div><span>Conectividade</span><strong>{asset.conectividade || "---"}</strong></div>
                <div><span>Frente e Verso</span><strong>{asset.frenteVerso || "---"}</strong></div>
              </div>
              <h3 className={styles.detailSubtitle}>Insumos</h3>
              <div className={styles.infoGrid}>
                <div><span>Tipo de Insumo</span><strong>{asset.cartucho || "---"}</strong></div>
                <div><span>Colorido</span><strong>{asset.colorido || "---"}</strong></div>
                <div><span>Cartucho Preto</span><strong>{asset.cartuchoPreto || "---"}</strong></div>
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

        {/* Card de Histórico */}
        <div className={styles.historyCard}>
          <h2 className={styles.sectionTitle}><History size={18} /> Histórico do Ativo</h2>
          {loadingHistory && <div className={styles.loadingState}><Loader2 className={styles.spinner} /></div>}
          {errorHistory && <p className={styles.errorText}>Erro ao carregar histórico.</p>}
          {history && history.docs.length === 0 && (
            <div className={styles.emptyHistory}>
              <Tag size={32} />
              <p>Nenhum histórico registrado.</p>
            </div>
          )}
          <ul className={styles.historyList}>
            {history && history.docs.map(doc => {
              const log = doc.data();
              const date = log.timestamp?.toDate();
              return (
                <li key={doc.id} className={styles.historyItem}>
                  <div className={styles.historyIcon}>
                    {log.type === 'Movimentação' ? <Truck size={16} /> : 
                     log.type === 'Registro' ? <Pencil size={16} /> : 
                     log.type === 'Atualização de Status' ? <ShieldAlert size={16} /> :
                     <Wrench size={16} />}
                  </div>
                  <div className={styles.historyContent}>
                    <strong>{log.type}</strong>
                    <small>{date ? format(date, "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR }) : '...'} (por {log.user})</small>
                    <p>{log.details}</p>
                    {log.newStatus && <small>Novo Status: <strong>{log.newStatus}</strong></small>}
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

export default AssetDetail;