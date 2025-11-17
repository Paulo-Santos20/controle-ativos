import React from 'react';
import { useParams, Link } from 'react-router-dom'; // Import Link
import { doc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '../../lib/firebase'; 
import { Loader2, PackageSearch, MapPin, Calendar, Tag, Box, LogIn } from 'lucide-react';
import styles from './AssetScanPage.module.css';

const AssetScanPage = () => {
  const { assetId } = useParams();
  const [asset, loading, error] = useDocumentData(doc(db, 'assets', assetId));

  const getStatusColor = (status) => {
    if (status === 'Em uso') return '#10b981';
    if (status === 'Em manutenção') return '#f59e0b';
    if (status === 'Devolvido') return '#ef4444';
    return '#3b82f6';
  };

  if (loading) return <div className={styles.centerScreen}><Loader2 className={styles.spinner} size={48} /><p>Lendo etiqueta...</p></div>;
  if (error || !asset) return <div className={styles.centerScreen}><PackageSearch size={64} color="#9ca3af" /><h2>Ativo não encontrado</h2></div>;

  const statusColor = getStatusColor(asset.status);

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ borderTopColor: statusColor }}>
        <div className={styles.statusBadge} style={{ backgroundColor: statusColor }}>
          {asset.status}
        </div>
        <h1 className={styles.title}>{asset.modelo}</h1>
        <p className={styles.subtitle}>{asset.tipoAtivo} - {asset.marca}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.row}>
          <div className={styles.iconBox}><Tag size={20} /></div>
          <div><label>Tombamento</label><strong>{asset.tombamento || assetId}</strong></div>
        </div>
        <div className={styles.row}>
          <div className={styles.iconBox}><Box size={20} /></div>
          <div><label>Serial</label><strong>{asset.serial || 'N/A'}</strong></div>
        </div>
      </div>

      <div className={styles.section}>
        <h3><MapPin size={18} /> Localização</h3>
        <div className={styles.locationBox}>
          <div className={styles.locRow}><span>Unidade:</span><strong>{asset.unitId}</strong></div>
          <div className={styles.locRow}><span>Setor:</span><strong>{asset.setor}</strong></div>
          <div className={styles.locRow}><span>Sala:</span><strong>{asset.sala}</strong></div>
          <div className={styles.locRow}><span>Resp.:</span><strong>{asset.funcionario || '-'}</strong></div>
        </div>
      </div>

      {/* --- BOTÃO DE ACESSO RESTRITO --- */}
      <div style={{textAlign: 'center', marginTop: '30px'}}>
        <Link to={`/inventory/${assetId}`} className={styles.adminLink}>
          <LogIn size={16} />
          Sou Técnico (Editar)
        </Link>
      </div>

      <footer className={styles.footer}>ITAM Hospitalar • {new Date().getFullYear()}</footer>
    </div>
  );
};

export default AssetScanPage;