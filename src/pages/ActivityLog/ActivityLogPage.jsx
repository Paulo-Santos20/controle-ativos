import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collectionGroup, query, orderBy, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Loader2, PackageSearch, Filter, History, Truck, Wrench, FilePlus, Edit, 
  Trash2, ShieldAlert, Settings, UserX 
} from 'lucide-react';

import { useAuth } from '/src/hooks/useAuth.js';
import styles from './ActivityLogPage.module.css';

// Filtros Atualizados
const filterOptions = [
  { value: "all", label: "Todas as Ações" },
  { value: "Registro", label: "Registro de Ativo" },
  { value: "Movimentação", label: "Movimentação" },
  { value: "Atualização de Status", label: "Status de Ativo" },
  { value: "Manutenção/Preventiva", label: "Manutenção" },
  // Novos Filtros de Auditoria
  { value: "Gestão de Usuários", label: "Gestão de Usuários" },
  { value: "Exclusão de Perfil", label: "Exclusão de Perfil" },
  { value: "Configuração do Sistema", label: "Configurações" },
];

// Helper de Ícone Expandido
const LogIcon = ({ type }) => {
  switch (type) {
    case 'Movimentação': return <Truck size={18} />;
    case 'Atualização de Status': return <Edit size={18} />;
    case 'Manutenção/Preventiva': return <Wrench size={18} />;
    case 'Registro': return <FilePlus size={18} />;
    
    // Novos Ícones de Auditoria
    case 'Exclusão de Usuário': return <UserX size={18} color="#ef4444" />;
    case 'Alteração de Permissões': return <ShieldAlert size={18} color="#f59e0b" />;
    case 'Exclusão de Perfil': return <Trash2 size={18} color="#ef4444" />;
    case 'Configuração do Sistema': return <Settings size={18} />;
    
    default: return <History size={18} />;
  }
};

const ActivityLogPage = () => {
  const { isAdmin } = useAuth();
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState(""); 

  const historyQuery = useMemo(() => {
    let constraints = [orderBy('timestamp', 'desc')];
    if (filterType !== "all") {
      constraints.push(where("type", "==", filterType));
    }
    // Busca em TODAS as coleções chamadas 'history' (Ativos + Sistema)
    return query(collectionGroup(db, 'history'), ...constraints);
  }, [filterType]); 

  const [history, loading, error] = useCollection(historyQuery);

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    
    let docs = history.docs;

    // Filtro de Segurança: Não-Admins veem apenas suas próprias ações
    if (!isAdmin) {
       const currentUserEmail = auth.currentUser?.email;
       const currentUserName = auth.currentUser?.displayName;
       
       docs = docs.filter(doc => {
         const logUser = doc.data().user;
         return logUser === currentUserEmail || logUser === currentUserName;
       });
    }

    if (filterUser) {
      const search = filterUser.toLowerCase();
      docs = docs.filter(doc => 
        doc.data().user && doc.data().user.toLowerCase().includes(search)
      );
    }
    
    return docs;
  }, [history, filterUser, isAdmin]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Log de Auditoria Global</h1>
          <p className={styles.subtitle}>Rastreamento de todas as ações operacionais e administrativas.</p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <span>Filtrar:</span>
        </div>
        
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>
          {filterOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className={styles.searchBox}>
          <input 
            type="text" 
            placeholder="Buscar por usuário..." 
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Carregando auditoria...</p>
          </div>
        )}
        
        {error && (
          <div className={styles.errorState}>
             <h3>⚠️ Erro ao Carregar Histórico</h3>
             <p>{error.message}</p>
           </div>
        )}

        {!loading && !error && filteredHistory.length === 0 && (
          <div className={styles.emptyState}>
            <PackageSearch size={50} />
            <h3>Nenhum registro encontrado</h3>
          </div>
        )}

        <ul className={styles.historyList}>
          {filteredHistory.map(doc => {
            const log = doc.data();
            const date = log.timestamp?.toDate();
            
            // Verifica se é um log de Ativo ou de Sistema
            const isSystemLog = log.category === 'admin';
            
            // Se for ativo, pega o ID do pai. Se for sistema, usa o campo 'target' ou 'Sistema'
            const assetId = isSystemLog ? null : (doc.ref.parent?.parent?.id || "---");
            
            return (
              <li key={doc.id} className={styles.historyItem}>
                <div className={styles.historyIcon}>
                  <LogIcon type={log.type} />
                </div>
                <div className={styles.historyContent}>
                  <div className={styles.historyHeader}>
                    <strong>{log.type}</strong>
                    <span className={styles.historyTime}>
                      {date ? format(date, "dd MMM yyyy, HH:mm", { locale: ptBR }) : '...'}
                    </span>
                  </div>
                  
                  {/* Renderização Condicional do Alvo */}
                  {isSystemLog ? (
                    <span className={styles.systemTarget}>
                      Alvo: <strong>{log.target || "Sistema"}</strong>
                    </span>
                  ) : (
                    <Link to={`/inventory/${assetId}`} className={styles.assetLink}>
                      Ativo: {assetId}
                    </Link>
                  )}

                  <p className={styles.detailsText}>{log.details}</p>
                  
                  <div className={styles.userBadge}>
                    Feito por: <strong>{log.user}</strong>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ActivityLogPage;