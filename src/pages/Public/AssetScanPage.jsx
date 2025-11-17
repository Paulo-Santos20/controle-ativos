import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '../../lib/firebase'; 
import { 
  Loader2, PackageSearch, MapPin, Cpu, Tag, Box, LogIn, 
  Monitor, Wifi, Droplet, FileText, ShieldCheck, HardDrive, Server
} from 'lucide-react';
import styles from './AssetScanPage.module.css';

const AssetScanPage = () => {
  const { assetId } = useParams();
  
  // Busca apenas os dados do documento (sem histórico)
  const [asset, loading, error] = useDocumentData(doc(db, 'assets', assetId));

  const getStatusColor = (status) => {
    if (status === 'Em uso') return '#10b981'; // Verde
    if (status === 'Em manutenção') return '#f59e0b'; // Laranja
    if (status === 'Devolvido' || status === 'Descartado') return '#ef4444'; // Vermelho
    if (status === 'Estoque') return '#3b82f6'; // Azul
    return '#6b7280'; // Cinza
  };

  if (loading) {
    return (
      <div className={styles.centerScreen}>
        <Loader2 className={styles.spinner} size={48} />
        <p>Carregando ficha técnica...</p>
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
  const isComputer = asset.type === 'computador';
  const isPrinter = asset.type === 'impressora';

  // Componente auxiliar para linhas de dados
  const InfoRow = ({ label, value, icon: Icon }) => {
    if (!value) return null;
    return (
      <div className={styles.infoRow}>
        {Icon && <div className={styles.rowIcon}><Icon size={16} /></div>}
        <div className={styles.rowData}>
          <span className={styles.label}>{label}</span>
          <span className={styles.value}>{value}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      
      {/* --- CABEÇALHO VISUAL --- */}
      <div className={styles.header} style={{ borderTopColor: statusColor }}>
        <div className={styles.statusBadge} style={{ backgroundColor: statusColor }}>
          {asset.status}
        </div>
        <h1 className={styles.title}>{asset.modelo || "Modelo Desconhecido"}</h1>
        <p className={styles.subtitle}>
          {asset.tipoAtivo || asset.type} • {asset.marca}
        </p>
        {asset.hostname && <div className={styles.hostnameBadge}>{asset.hostname}</div>}
      </div>

      {/* --- 1. IDENTIFICAÇÃO --- */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Identificação</h3>
        <div className={styles.grid2}>
          <InfoRow label="Tombamento (ID)" value={asset.tombamento || assetId} icon={Tag} />
          <InfoRow label="Número de Série" value={asset.serial} icon={Box} />
          <InfoRow label="Service Tag" value={asset.serviceTag} icon={Tag} />
          <InfoRow label="Endereço MAC" value={asset.macAddress} icon={Wifi} />
          <InfoRow label="Propriedade" value={asset.propriedade || asset.posse} icon={FileText} />
        </div>
      </div>

      {/* --- 2. LOCALIZAÇÃO --- */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Localização Atual</h3>
        <div className={styles.locationBox}>
          <div className={styles.locRow}>
            <span>Unidade:</span>
            <strong>{asset.unitId}</strong>
          </div>
          <div className={styles.locRow}>
            <span>Pavimento:</span>
            <strong>{asset.pavimento}</strong>
          </div>
          <div className={styles.locRow}>
            <span>Setor:</span>
            <strong>{asset.setor}</strong>
          </div>
          <div className={styles.locRow}>
            <span>Sala:</span>
            <strong>{asset.sala}</strong>
          </div>
          <hr className={styles.divider} />
          <div className={styles.locRow}>
            <span>Responsável:</span>
            <strong>{asset.funcionario || 'Não atribuído'}</strong>
          </div>
        </div>
      </div>

      {/* --- 3. DETALHES TÉCNICOS (COMPUTADOR) --- */}
      {isComputer && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Configuração de Hardware</h3>
          <div className={styles.grid2}>
            <InfoRow label="Processador" value={asset.processador} icon={Cpu} />
            <InfoRow label="Memória RAM" value={asset.memoria} icon={Server} />
            <InfoRow label="Armazenamento" value={asset.hdSsd} icon={HardDrive} />
            <InfoRow label="Sistema Op." value={asset.so} icon={Monitor} />
            <InfoRow label="Versão S.O." value={asset.soVersao} />
            <InfoRow label="Anti-vírus" value={asset.antivirus} icon={ShieldCheck} />
          </div>
        </div>
      )}

      {/* --- 3. DETALHES TÉCNICOS (IMPRESSORA) --- */}
      {isPrinter && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Configuração & Insumos</h3>
          <div className={styles.grid2}>
            <InfoRow label="Conectividade" value={asset.conectividade} icon={Wifi} />
            <InfoRow label="Frente e Verso" value={asset.frenteVerso} />
            <InfoRow label="Tipo Cartucho" value={asset.cartucho} icon={Droplet} />
            <InfoRow label="Colorida?" value={asset.colorido} />
            <InfoRow label="Cartucho Preto" value={asset.cartuchoPreto} />
            <InfoRow label="Cartucho Color" value={asset.cartuchoColorido} />
            <InfoRow label="Cilindro/DR" value={asset.drCilindro} />
          </div>
        </div>
      )}

      {/* --- 4. OBSERVAÇÕES --- */}
      {asset.observacao && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Observações</h3>
          <p className={styles.obsText}>{asset.observacao}</p>
        </div>
      )}

      {/* --- RODAPÉ (Login) --- */}
      <div className={styles.loginAction}>
        <Link to={`/inventory/${assetId}`} className={styles.adminLink}>
          <LogIn size={16} />
          Acesso Técnico (Editar)
        </Link>
      </div>

      <footer className={styles.footer}>ITAM Hospitalar • Ficha Digital</footer>
    </div>
  );
};

export default AssetScanPage;