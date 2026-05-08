import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '../../lib/firebase'; 
import { 
  Search, Clock, AlertTriangle, CheckCircle, Filter, ArrowRight, Loader2, ShieldAlert 
} from 'lucide-react';
import { format, differenceInDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { ATTENTION_STATUSES } from '../../constants/options';
import styles from './MonitoringPage.module.css';

const filterOptions = [
  { value: "attention", label: "⚠️ Em Atenção (Padrão)" },
  { value: "all", label: "Todos os Ativos" },
  { value: "Em uso", label: "Em uso" },
  { value: "Estoque", label: "Estoque" },
  { value: "Devolvido", label: "📦 Devolvidos / Arquivados" }
];

const MonitoringPage = () => {
  const { isAdmin, allowedUnits, loading: authLoading } = useAuth();
  
  const [filterStatus, setFilterStatus] = useState("attention"); 
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. QUERY AO BANCO DE DADOS (SEGURANÇA ESTRITA) ---
  const assetsQuery = useMemo(() => {
    if (authLoading) return null;
    
    const collectionRef = collection(db, 'assets');
    // Ordenação padrão (necessária índice se combinada com where)
    const constraints = [orderBy('lastSeen', 'asc')]; 

    // A. FILTRO DE UNIDADE (PRIORIDADE 1)
    // Se tem unidades na lista, filtra por elas (Mesmo se for Admin)
    if (allowedUnits && allowedUnits.length > 0) {
        constraints.push(where('unitId', 'in', allowedUnits));
    } 
    // Se NÃO tem unidades e NÃO é Admin, bloqueia.
    else if (!isAdmin) {
        return null; // Bloqueio total
    }
    // Se não tem unidades e É Admin, passa direto (vê tudo)

    // B. FILTRO DE STATUS (SIMPLES)
    // Só aplicamos no banco se for um valor único. 
    // Se for "attention" (lista), filtramos no Javascript para evitar erro de "double IN".
    if (filterStatus !== 'attention' && filterStatus !== 'all') {
      constraints.push(where('status', '==', filterStatus));
    }

    return query(collectionRef, ...constraints);
  }, [filterStatus, isAdmin, allowedUnits, authLoading]);

  const [assets, loading, error] = useCollection(assetsQuery);

  // --- 2. PROCESSAMENTO E FILTRAGEM LOCAL (BLINDAGEM) ---
  const processedAssets = useMemo(() => {
    if (!assets) return [];

    let data = assets.docs.map(doc => {
      const asset = doc.data();
      const lastSeenDate = asset.lastSeen?.toDate ? asset.lastSeen.toDate() : new Date();
      const daysElapsed = differenceInDays(new Date(), lastSeenDate);
      
      return {
        id: doc.id,
        ...asset,
        lastSeenDate,
        daysElapsed,
        isOverdue: ATTENTION_STATUSES.includes(asset.status) && daysElapsed > 5
      };
    });

    // 2.1 FILTRO DE SEGURANÇA VISUAL (Reforço)
    // Garante que não mostre nada fora da lista permitida
    if (allowedUnits && allowedUnits.length > 0) {
        const safeAllowed = allowedUnits.map(u => String(u).trim());
        data = data.filter(item => {
            const itemUnit = String(item.unitId || '').trim();
            return safeAllowed.includes(itemUnit);
        });
    } else if (!isAdmin) {
        // Se não tem lista e não é admin, limpa tudo
        return [];
    }

    // 2.2 FILTRO DE STATUS (Lógica de Aplicação)
    if (filterStatus === 'attention') {
      data = data.filter(asset => ATTENTION_STATUSES.includes(asset.status));
    } 
    // Se for 'all' ou específico, o filtro do banco já cuidou (ou 'all' mostra tudo que passou na segurança)

    // 2.3 FILTRO DE TEXTO
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      data = data.filter(asset => 
        asset.id.toLowerCase().includes(search) ||
        (asset.modelo && asset.modelo.toLowerCase().includes(search)) ||
        (asset.serial && asset.serial.toLowerCase().includes(search))
      );
    }

    // C. ORDENAÇÃO FINAL (Atrasados primeiro)
    return data.sort((a, b) => b.daysElapsed - a.daysElapsed);
  }, [assets, searchTerm, filterStatus, isAdmin, allowedUnits]);

  const alertsCount = processedAssets.filter(a => a.isOverdue).length;

  // --- 3. UI DE ESTADOS ---
  if (authLoading || loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 className={styles.spinner} size={48} />
        <p style={{marginTop: 10}}>Calculando...</p>
      </div>
    );
  }

  // Tratamento de Erro Amigável
  if (error) {
    console.error("ERRO MONITORAMENTO:", error);
    
    if (error.code === 'failed-precondition') {
       return (
         <div className={styles.errorPage}>
             <AlertTriangle size={64} color="var(--color-danger)" />
            <h2>Índice Necessário</h2>
            <p>O banco de dados precisa ser otimizado para esta consulta.</p>
            <p className={styles.techInfo}>Abra o Console (F12) e clique no link do Firebase.</p>
         </div>
       );
    }

    return (
      <div className={styles.errorPage}>
         <ShieldAlert size={64} color="var(--color-danger)" />
        <h2>Erro de Acesso</h2>
        <p>{error.message}</p>
      </div>
    );
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
        {processedAssets.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle size={48} color="var(--color-success)" />
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