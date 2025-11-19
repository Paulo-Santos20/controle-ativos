import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, collection, query, orderBy, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { db } from '../../lib/firebase'; 
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Truck, Wrench, History, Loader2, HardDrive, Printer, Laptop, ShieldAlert, Trash2, QrCode, Tag } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { generateQrCodePdf } from '../../utils/qrCodeGenerator'; 
import { logAudit } from '../../utils/AuditLogger';
import QrCodeModal from '../../components/Inventory/QrCodeModal';

import styles from './AssetDetail.module.css'; 
import Modal from '../../components/Modal/Modal';
import EditAssetForm from '../../components/Inventory/EditAssetForm'; 
import MoveAssetForm from '../../components/Inventory/MoveAssetForm'; 
import MaintenanceAssetForm from '../../components/Inventory/MaintenanceAssetForm'; 
import EditPrinterForm from '../../components/Inventory/EditPrinterForm'; 

const TypeIcon = ({ type }) => {
  if (type === 'computador') return <Laptop size={24} />;
  if (type === 'impressora') return <Printer size={24} />;
  return <HardDrive size={24} />; 
};

const getStatusClass = (status) => {
  if (!status) return '';
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
  const [modalView, setModalView] = useState(null); 
  const [isDeleting, setIsDeleting] = useState(false);

  const { isAdmin, allowedUnits, permissions, loading: authLoading } = useAuth();

  // Se o ID for "importar" (erro de rota), não busca nada
  const docId = assetId === 'importar' ? 'invalid' : assetId;
  const assetRef = doc(db, 'assets', docId);
  const [asset, loadingAsset, errorAsset] = useDocumentData(assetRef);

  const historyQuery = query(
    collection(db, 'assets', docId, 'history'),
    orderBy('timestamp', 'desc')
  );
  const [history, loadingHistory, errorHistory] = useCollection(historyQuery);

  // 1. Loading
  if (loadingAsset || authLoading) {
    return <div className={styles.loadingState}><Loader2 className={styles.spinner} /><p>Carregando...</p></div>;
  }

  // 2. Erro ou Não Encontrado
  if (errorAsset || !asset) {
    return (
      <div className={styles.errorState}>
        <h3>Ativo não encontrado</h3>
        <p>O ID <strong>{assetId}</strong> não existe ou foi excluído.</p>
        <button onClick={() => navigate('/inventory')} className={styles.secondaryButton}>Voltar</button>
      </div>
    );
  }

  // 3. Segurança
  if (!isAdmin && asset.unitId && !allowedUnits.includes(asset.unitId)) {
    return (
      <div className={styles.loadingState}>
        <ShieldAlert size={48} color="#ef4444" />
        <h2>Acesso Negado</h2>
        <Link to="/inventory" className={styles.primaryButton}>Voltar</Link>
      </div>
    );
  }

  // ... Funções de ação (handleOpenModal, handleDelete, etc.) ...
  const handleOpenModal = (view) => setModalView(view);
  const handleCloseModal = () => setModalView(null);

  const handleDeleteAsset = async () => {
    if (!window.confirm(`Excluir ${asset.tombamento}?`)) return;
    setIsDeleting(true);
    try {
      const historySnapshot = await getDocs(collection(db, 'assets', assetId, 'history'));
      const batch = writeBatch(db);
      historySnapshot.forEach((doc) => batch.delete(doc.ref));
      batch.delete(doc(db, 'assets', assetId));
      await batch.commit();
      await logAudit("Exclusão", `Ativo ${asset.tombamento} excluído.`, `Ativo: ${asset.tombamento}`);
      toast.success("Excluído!");
      navigate('/inventory');
    } catch (error) {
      toast.error("Erro: " + error.message);
      setIsDeleting(false);
    }
  };

  const renderModalContent = () => {
    switch (modalView) {
      case 'edit': 
        return asset.type === 'computador' 
          ? <EditAssetForm onClose={handleCloseModal} assetId={assetId} existingData={asset} />
          : <EditPrinterForm onClose={handleCloseModal} assetId={assetId} existingData={asset} />;
      case 'move': return <MoveAssetForm onClose={handleCloseModal} assetId={assetId} currentData={asset} />;
      case 'maintenance': return <MaintenanceAssetForm onClose={handleCloseModal} assetId={assetId} currentData={asset} />;
      case 'qr': return <QrCodeModal assetId={assetId} assetName={asset.modelo || assetId} />;
      default: return null;
    }
  };

  return (
    <div className={styles.page}>
      <Modal isOpen={!!modalView} onClose={handleCloseModal} title="Gerenciar Ativo">
        {renderModalContent()}
      </Modal>

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => navigate(-1)} className={styles.backButton}><ArrowLeft size={20} /> Voltar</button>
          <div className={styles.titleWrapper}>
            <h1 className={styles.title}>Detalhes do Ativo</h1>
            {/* BLINDAGEM: Uso do ?. para evitar o erro */}
            <span className={`${styles.statusBadge} ${getStatusClass(asset?.status)}`}>{asset?.status}</span>
          </div>
        </div>

        <div className={styles.actions}>
          {permissions?.ativos?.read && <button className={styles.iconButton} onClick={() => handleOpenModal('qr')}><QrCode size={20} /></button>}
          {permissions?.ativos?.update && (
            <>
              <button className={styles.actionButton} onClick={() => handleOpenModal('move')}><Truck size={18} /> Movimentar</button>
              <button className={styles.actionButtonSecondary} onClick={() => handleOpenModal('maintenance')}><Wrench size={18} /> Preventiva</button>
              <button className={styles.primaryButton} onClick={() => handleOpenModal('edit')}><Pencil size={18} /> Editar</button>
            </>
          )}
          {permissions?.ativos?.delete && (
            <button className={styles.deleteButton} onClick={handleDeleteAsset} disabled={isDeleting}>
              {isDeleting ? <Loader2 className={styles.spinner} size={18} /> : <Trash2 size={18} />}
            </button>
          )}
        </div>
      </header>

      <div className={styles.contentGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoTitle}>
            <div className={styles.titleIcon}><TypeIcon type={asset?.type} /></div>
            <div>
              <span className={styles.assetType}>{asset?.tipoAtivo} ({asset?.marca})</span>
              <h1 className={styles.assetName}>{asset?.hostname || asset?.modelo}</h1>
              <p className={styles.assetId}>Tombamento: <strong>{assetId}</strong></p>
            </div>
          </div>

          <h3 className={styles.detailSubtitle}>Dados Principais</h3>
          <div className={styles.infoGrid}>
            <div><span>Modelo</span><strong>{asset?.modelo}</strong></div>
            <div><span>Serial</span><strong>{asset?.serial}</strong></div>
            <div><span>Propriedade</span><strong>{asset?.propriedade || asset?.posse}</strong></div>
            {asset?.serviceTag && <div><span>Service Tag</span><strong>{asset.serviceTag}</strong></div>}
            {asset?.macAddress && <div><span>MAC Address</span><strong>{asset.macAddress}</strong></div>}
          </div>

          <h3 className={styles.detailSubtitle}>Localização Atual</h3>
          <div className={styles.infoGrid}>
            <div><span>Unidade</span><strong>{asset?.unitId}</strong></div>
            <div><span>Pavimento</span><strong>{asset?.pavimento}</strong></div>
            <div><span>Setor</span><strong>{asset?.setor}</strong></div>
            <div><span>Sala</span><strong>{asset?.sala}</strong></div>
            <div><span>Funcionário</span><strong>{asset?.funcionario || "---"}</strong></div>
          </div>
          
          {asset?.type === 'computador' && (
            <>
              <h3 className={styles.detailSubtitle}>Configuração Técnica</h3>
              <div className={styles.infoGrid}>
                <div><span>Processador</span><strong>{asset.processador}</strong></div>
                <div><span>Memória</span><strong>{asset.memoria}</strong></div>
                <div><span>HD/SSD</span><strong>{asset.hdSsd}</strong></div>
                <div><span>S.O.</span><strong>{asset.so}</strong></div>
                <div><span>Versão S.O.</span><strong>{asset.soVersao}</strong></div>
                <div><span>Anti-vírus</span><strong>{asset.antivirus}</strong></div>
              </div>
            </>
          )}

          {asset?.type === 'impressora' && (
            <>
              <h3 className={styles.detailSubtitle}>Configuração de Rede</h3>
              <div className={styles.infoGrid}>
                <div><span>Conectividade</span><strong>{asset.conectividade}</strong></div>
                <div><span>Frente e Verso</span><strong>{asset.frenteVerso}</strong></div>
              </div>
              <h3 className={styles.detailSubtitle}>Insumos</h3>
              <div className={styles.infoGrid}>
                <div><span>Tipo de Insumo</span><strong>{asset.cartucho}</strong></div>
                <div><span>Colorido</span><strong>{asset.colorido}</strong></div>
                <div><span>Cartucho Preto</span><strong>{asset.cartuchoPreto}</strong></div>
                {asset.colorido === 'Sim' && <div><span>Cartucho Colorido</span><strong>{asset.cartuchoColorido}</strong></div>}
                <div><span>Cilindro/DR</span><strong>{asset.drCilindro}</strong></div>
              </div>
            </>
          )}
          
          {asset?.observacao && (
            <>
              <h3 className={styles.detailSubtitle}>Observação</h3>
              <p className={styles.obsText}>{asset.observacao}</p>
            </>
          )}
        </div>

        <div className={styles.historyCard}>
          <h2 className={styles.sectionTitle}><History size={18} /> Histórico do Ativo</h2>
          {loadingHistory && <div className={styles.loadingState}><Loader2 className={styles.spinner} /></div>}
          {history && history.docs.length === 0 && <div className={styles.emptyHistory}><Tag size={32} /><p>Nenhum histórico.</p></div>}
          
          <ul className={styles.historyList}>
            {history?.docs.map(doc => {
              const log = doc.data();
              const date = log.timestamp?.toDate();
              return (
                <li key={doc.id} className={styles.historyItem}>
                  <div className={styles.historyIcon}>
                    {log.type === 'Movimentação' ? <Truck size={16} /> : <Wrench size={16} />}
                  </div>
                  <div className={styles.historyContent}>
                    <strong>{log.type}</strong>
                    <small>{date ? format(date, "dd/MM/yyyy HH:mm", { locale: ptBR }) : '...'}</small>
                    <p>{log.details}</p>
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