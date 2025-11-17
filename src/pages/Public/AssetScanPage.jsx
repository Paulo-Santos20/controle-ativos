import React from 'react';
import { useParams } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '../../lib/firebase';
import { Loader2, PackageSearch, MapPin, Calendar, Tag, CheckCircle, AlertTriangle, Box } from 'lucide-react';
import styles from './AssetScanPage.module.css'; // Vamos criar este CSS

const AssetScanPage = () => {
  const { assetId } = useParams();
  
  // Busca direta do ativo (Leitura rápida)
  const [asset, loading, error] = useDocumentData(doc(db, 'assets', assetId));

  // Helper de Status
  const getStatusColor = (status) => {
    if (status === 'Em uso') return '#10b981'; // Verde
    if (status === 'Em manutenção') return '#f59e0b'; // Laranja
    if (status === 'Devolvido') return '#ef4444'; // Vermelho
    return '#3b82f6'; // Azul
  };

  if (loading) {
    return (
      <div className={styles.centerScreen}>
        <Loader2 className={styles.spinner} size={48} />
        <p>Lendo etiqueta...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className={styles.centerScreen}>
        <PackageSearch size={64} color="#9ca3af" />
        <h2>Ativo não encontrado</h2>
        <p>Verifique se o código está correto ou se o item foi excluído.</p>
      </div>
    );
  }

  const statusColor = getStatusColor(asset.status);

  return (
    <div className={styles.container}>
      {/* Cabeçalho Visual */}
      <div className={styles.header} style={{ borderTopColor: statusColor }}>
        <div className={styles.statusBadge} style={{ backgroundColor: statusColor }}>
          {asset.status}
        </div>
        <h1 className={styles.title}>{asset.modelo}</h1>
        <p className={styles.subtitle}>{asset.tipoAtivo} - {asset.marca}</p>
      </div>

      {/* Cartão de Identificação */}
      <div className={styles.card}>
        <div className={styles.row}>
          <div className={styles.iconBox}><Tag size={20} /></div>
          <div>
            <label>Tombamento (ID)</label>
            <strong>{asset.tombamento || assetId}</strong>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.iconBox}><Box size={20} /></div>
          <div>
            <label>Número de Série</label>
            <strong>{asset.serial || 'N/A'}</strong>
          </div>
        </div>
      </div>

      {/* Localização Atual */}
      <div className={styles.section}>
        <h3><MapPin size={18} /> Localização Atual</h3>
        <div className={styles.locationBox}>
          <div className={styles.locRow}>
            <span>Unidade:</span>
            <strong>{asset.unitId}</strong>
          </div>
          <div className={styles.locRow}>
            <span>Setor:</span>
            <strong>{asset.setor}</strong>
          </div>
          <div className={styles.locRow}>
            <span>Sala:</span>
            <strong>{asset.sala}</strong>
          </div>
          <div className={styles.locRow}>
            <span>Responsável:</span>
            <strong>{asset.funcionario || 'Não atribuído'}</strong>
          </div>
        </div>
      </div>

      {/* Configuração Resumida */}
      <div className={styles.section}>
        <h3><Calendar size={18} /> Detalhes Técnicos</h3>
        <div className={styles.techGrid}>
          {asset.processador && <div className={styles.techItem}><small>CPU</small><span>{asset.processador}</span></div>}
          {asset.memoria && <div className={styles.techItem}><small>RAM</small><span>{asset.memoria}</span></div>}
          {asset.so && <div className={styles.techItem}><small>Sistema</small><span>{asset.so}</span></div>}
          {asset.ip && <div className={styles.techItem}><small>IP</small><span>{asset.ip}</span></div>}
          {asset.cartucho && <div className={styles.techItem}><small>Insumo</small><span>{asset.cartucho}</span></div>}
        </div>
      </div>

      <footer className={styles.footer}>
        ITAM Hospitalar • {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default AssetScanPage;