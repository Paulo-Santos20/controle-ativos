import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { 
  Search, Clock, AlertTriangle, CheckCircle, Filter, ArrowRight, Loader2, ShieldAlert 
} from 'lucide-react';
import { format, differenceInDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

import { useAuth } from '/src/hooks/useAuth.js';
import styles from './MonitoringPage.module.css';

// --- ALTERAÇÃO 1: Removido "Devolvido" da lista padrão ---
// Estes são os itens que aparecem automaticamente ao abrir a página
const ATTENTION_STATUSES = [
  "Manutenção agendada", 
  "Em manutenção", 
  "Devolução agendada"
  // "Devolvido" foi removido daqui para não poluir a vista padrão
];

// --- ALTERAÇÃO 2: Adicionada opção específica para ver Devolvidos ---
const filterOptions = [
  { value: "attention", label: "⚠️ Em Atenção (Padrão)" },
  { value: "all", label: "Todos os Ativos" },
  { value: "Em uso", label: "Em uso" },
  { value: "Estoque", label: "Estoque" },
  { value: "Devolvido", label: "📦 Devolvidos / Arquivados" } // <-- Nova Opção
];

const MonitoringPage = () => {
  const { isAdmin, allowedUnits, loading: authLoading } = useAuth();
  
  const [filterStatus, setFilterStatus] = useState("attention"); 
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. QUERY INTELIGENTE ---
  const assetsQuery = useMemo(() => {
    if (authLoading) return null;
    
    const collectionRef = collection(db, 'assets');
    
    // Ordena pelos mais antigos primeiro (prioridade)
    const constraints = [orderBy('lastSeen', 'asc')]; 

    // Filtro de Unidade (Segurança)
    if (!isAdmin) {
      if (allowedUnits.length > 0) constraints.push(where('unitId', 'in', allowedUnits));
      else return null;
    }

    // Filtro de Status
    if (filterStatus === 'attention') {
      // Busca apenas os status críticos (sem devolvidos)
      constraints.push(where('status', 'in', ATTENTION_STATUSES));
    } else if (filterStatus !== 'all') {
      // Busca um status específico (Aqui entra o "Devolvido" se selecionado)
      constraints.push(where('status', '==', filterStatus));
    }

    return query(collectionRef, ...constraints);
  }, [filterStatus, isAdmin, allowedUnits, authLoading]);

  const [assets, loading, error] = useCollection(assetsQuery);

  // --- 2. PROCESSAMENTO E FILTRO DE TEXTO ---
  const processedAssets = useMemo(() => {
    if (!assets) return [];

    let data = assets.docs.map(doc => {
      const asset = doc.data();
      const lastSeenDate = asset.lastSeen?.toDate() || new Date();
      const daysElapsed = differenceInDays(new Date(), lastSeenDate);
      
      return {
        id: doc.id,
        ...asset,
        lastSeenDate,
        daysElapsed,
        // Flag de Alerta: Se estiver nos status de atenção E > 5 dias
        isOverdue: ATTENTION_STATUSES.includes(asset.status) && daysElapsed > 5
      };
    });

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      data = data.filter(asset => 
        asset.id.toLowerCase().includes(search) ||
        (asset.modelo && asset.modelo.toLowerCase().includes(search)) ||
        (asset.serial && asset.serial.toLowerCase().includes(search))
      );
    }

    // Ordenação secundária: Atrasados primeiro
    return data.sort((a, b) => b.daysElapsed - a.daysElapsed);
  }, [assets, searchTerm]);

  const alertsCount = processedAssets.filter(a => a.isOverdue).length;

  // --- 3. RENDERIZAÇÃO DE ERRO ---
  if (error) {
    console.error("ERRO MONITORAMENTO:", error);
    
    if (error.code === 'failed-precondition') {
      return (
        <div className={styles.page}>
          <div className={styles.emptyState} style={{color: '#b91c1c', borderColor: '#fca5a5', backgroundColor: '#fef2f2'}}>
            <AlertTriangle size={48} />
            <h3>Índice Necessário</h3>
            <p>O Firestore precisa de um índice para esta combinação de filtros.</p>
            <p style={{marginTop: 10}}><strong>Abra o Console (F12) e clique no link do Firebase para criar.</strong></p>
          </div>
        </div>
      );
    }
    
    if (error.code === 'permission-denied') {
       return (
        <div className={styles.page}>
          <div className={styles.emptyState}>
            <ShieldAlert size={48} color="red"/>
            <h3>Permissão Negada</h3>
            <p>Suas regras de segurança estão bloqueando esta consulta.</p>
          </div>
        </div>
      );
    }

    return <div className={styles.page}><p className={styles.errorText}>Erro desconhecido: {error.message}</p></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Painel de Monitoramento</h1>
          <p className={styles.subtitle}>Acompanhe o tempo de permanência dos ativos.</p>
        </div>
        
        {alertsCount > 0 && (
          <div className={styles.alertBadge}>
            <AlertTriangle size={20} />
            <span><strong>{alertsCount}</strong> ativos parados há +5 dias</span>
          </div>
        )}
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar Tombamento, Modelo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <Filter size={16} />
          <span>Mostrar:</span>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            {filterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}><Loader2 className={styles.spinner} /><p>Calculando tempos...</p></div>
        ) : processedAssets.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle size={48} color="#10b981" />
            <h3>Nenhum item encontrado</h3>
            <p>Nenhum ativo corresponde aos filtros selecionados.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tombamento</th>
                  <th>Modelo / Tipo</th>
                  <th>Status Atual</th>
                  <th>Última Atualização</th>
                  <th>Tempo Decorrido</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {processedAssets.map(asset => (
                  <tr key={asset.id} className={asset.isOverdue ? styles.rowOverdue : ''}>
                    <td>
                      <strong>{asset.tombamento || asset.id}</strong>
                      {asset.isOverdue && <span className={styles.tagAlert}>ATRASADO</span>}
                    </td>
                    <td>
                      <div className={styles.colFlex}>
                        <span>{asset.modelo || 'N/A'}</span>
                        <small>{asset.tipoAtivo || asset.type}</small>
                      </div>
                    </td>
                    <td>
                      <span className={styles.statusPill} data-status={asset.status}>
                        {asset.status}
                      </span>
                    </td>
                    <td>
                      {format(asset.lastSeenDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td>
                      <div className={styles.durationBox} data-alert={asset.isOverdue}>
                        <Clock size={16} />
                        <strong>{asset.daysElapsed} dias</strong>
                      </div>
                      <small className={styles.timeAgo}>
                        {formatDistanceToNow(asset.lastSeenDate, { locale: ptBR })}
                      </small>
                    </td>
                    <td>
                      <Link to={`/inventory/${asset.id}`} className={styles.actionButton}>
                        Resolver <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringPage;