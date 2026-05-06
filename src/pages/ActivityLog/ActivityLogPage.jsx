import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collectionGroup, query, orderBy, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Loader2, PackageSearch, Filter, History, Truck, Wrench, FilePlus, Edit,
  Trash2, ShieldAlert, Settings, UserX, Clock
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import styles from './ActivityLogPage.module.css';

const filterOptions = [
  { value: "all", label: "Todas as Ações" },
  { value: "Registro", label: "Registro de Ativo" },
  { value: "Movimentação", label: "Movimentação" },
  { value: "Atualização de Status", label: "Status de Ativo" },
  { value: "Manutenção/Preventiva", label: "Manutenção" },
  { value: "Exclusão de Usuário", label: "Exclusão de Usuário" },
  { value: "Alteração de Permissões", label: "Alteração de Permissões" },
  { value: "Exclusão de Perfil", label: "Exclusão de Perfil" },
  { value: "Configuração do Sistema", label: "Configurações" },
];

const LogIcon = ({ type }) => {
  switch (type) {
    case 'Registro': return <FilePlus size={20} />;
    case 'Movimentação': return <Truck size={20} />;
    case 'Atualização de Status': return <Edit size={20} />;
    case 'Manutenção/Preventiva': return <Wrench size={20} />;
    case 'Exclusão de Usuário': return <UserX size={20} />;
    case 'Alteração de Permissões': return <ShieldAlert size={20} />;
    case 'Exclusão de Perfil': return <Trash2 size={20} />;
    case 'Configuração do Sistema': return <Settings size={20} />;
    default: return <History size={20} />;
  }
};

const getIconClass = (type) => {
  switch (type) {
    case 'Registro': return styles.iconRegistro;
    case 'Movimentação': return styles.iconMovimentacao;
    case 'Atualização de Status': return styles.iconStatus;
    case 'Manutenção/Preventiva': return styles.iconManutencao;
    case 'Exclusão de Usuário': return styles.iconExclusaoUsuario;
    case 'Exclusão de Perfil': return styles.iconExclusaoPerfil;
    case 'Alteração de Permissões': return styles.iconAuditoria;
    case 'Configuração do Sistema': return styles.iconConfiguracao;
    default: return styles.iconDefault;
  }
};

const ActivityLogPage = () => {
  const { isAdmin } = useAuth();
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState("");

  const historyQuery = useMemo(() => {
    const constraints = [orderBy('timestamp', 'desc')];
    if (filterType !== "all") {
      constraints.push(where("type", "==", filterType));
    }
    return query(collectionGroup(db, 'history'), ...constraints);
  }, [filterType]);

  const [history, loading, error] = useCollection(historyQuery);

  const filteredHistory = useMemo(() => {
    if (!history) return [];

    let docs = history.docs;

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
        <h1 className={styles.title}>Log de Auditoria</h1>
        <p className={styles.subtitle}>Rastreamento de todas as ações operacionais e administrativas.</p>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolbarTop}>
          <div className={styles.filterGroup}>
            <Filter size={16} />
            <span>Filtrar:</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
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
      </div>

      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={40} />
            <p>Carregando auditoria...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <ShieldAlert size={48} />
            <h3>Erro ao Carregar Histórico</h3>
            <p>{error.message}</p>
          </div>
        )}

        {!loading && !error && filteredHistory.length === 0 && (
          <div className={styles.emptyState}>
            <PackageSearch size={48} />
            <h3>Nenhum registro encontrado</h3>
            <p>Não há registros correspondentes aos filtros selecionados.</p>
          </div>
        )}

        {!loading && !error && filteredHistory.length > 0 && (
          <div className={styles.timeline}>
            <ul className={styles.historyList}>
              {filteredHistory.map(doc => {
                const log = doc.data();
                const date = log.timestamp?.toDate();
                const isSystemLog = log.category === 'admin';
                const assetId = isSystemLog ? null : (doc.ref.parent?.parent?.id || null);

                return (
                  <li key={doc.id} className={styles.historyItem}>
                    <div className={`${styles.historyIcon} ${getIconClass(log.type)}`}>
                      <LogIcon type={log.type} />
                    </div>
                    <div className={styles.historyContent}>
                      <div className={styles.historyHeader}>
                        <strong>{log.type}</strong>
                        <span className={styles.historyTime}>
                          <Clock size={12} />
                          {date ? format(date, "dd MMM yyyy, HH:mm", { locale: ptBR }) : '...'}
                        </span>
                      </div>

                      {isSystemLog ? (
                        <span className={styles.systemTarget}>
                          Alvo: <strong>{log.target || "Sistema"}</strong>
                        </span>
                      ) : assetId ? (
                        <Link to={`/inventory/${assetId}`} className={styles.assetLink}>
                          Ativo: {log.assetName || log.tombamento || assetId}
                        </Link>
                      ) : null}

                      {log.details && (
                        <p className={styles.detailsText}>{log.details}</p>
                      )}

                      <div className={styles.userBadge}>
                        <span>Por:</span>
                        <strong>{log.user}</strong>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPage;