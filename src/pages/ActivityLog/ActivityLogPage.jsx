import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collectionGroup, query, orderBy, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, PackageSearch, Filter, History, Truck, Wrench, FilePlus, Edit } from 'lucide-react';

import { useAuth } from '/src/hooks/useAuth.js'; // Importa o hook atualizado
import styles from './ActivityLogPage.module.css';

const filterOptions = [
  { value: "all", label: "Todos os Tipos" },
  { value: "Registro", label: "Registro" },
  { value: "Atualização de Status", label: "Atualização de Status" },
  { value: "Movimentação", label: "Movimentação" },
  { value: "Manutenção/Preventiva", label: "Manutenção/Preventiva" },
];

const LogIcon = ({ type }) => {
  if (type === 'Movimentação') return <Truck size={18} />;
  if (type === 'Atualização de Status') return <Edit size={18} />;
  if (type === 'Manutenção/Preventiva') return <Wrench size={18} />;
  if (type === 'Registro') return <FilePlus size={18} />;
  return <History size={18} />;
};

const ActivityLogPage = () => {
  // Pega o isAdmin do hook atualizado
  const { isAdmin, loading: authLoading } = useAuth();

  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState(""); 

  // --- CONSULTA AO BANCO ---
  const historyQuery = useMemo(() => {
    let constraints = [orderBy('timestamp', 'desc')];
    if (filterType !== "all") {
      constraints.push(where("type", "==", filterType));
    }
    return query(collectionGroup(db, 'history'), ...constraints);
  }, [filterType]); 

  const [history, loading, error] = useCollection(historyQuery);

  // --- FILTRAGEM NO CLIENTE (CORRIGIDA) ---
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    
    let docs = history.docs;

    // 1. REGRA DE SEGURANÇA: 
    // Se NÃO for admin, vê apenas logs onde o usuário é ele mesmo.
    // (Isso é uma medida de segurança paliativa até termos unitId no log)
    if (!isAdmin && !authLoading) {
       const currentUserEmail = auth.currentUser?.email;
       const currentUserName = auth.currentUser?.displayName;
       
       docs = docs.filter(doc => {
         const logUser = doc.data().user;
         // Verifica se o log foi feito por este usuário
         return logUser === currentUserEmail || logUser === currentUserName;
       });
    }

    // 2. Filtro de Texto da UI (Busca por nome de quem fez)
    if (filterUser) {
      const search = filterUser.toLowerCase();
      docs = docs.filter(doc => 
        doc.data().user && doc.data().user.toLowerCase().includes(search)
      );
    }
    
    return docs;
  }, [history, filterUser, isAdmin, authLoading]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Log de Atividades</h1>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <span>Filtrar por:</span>
        </div>
        
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>
          {filterOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className={styles.searchBox}>
          <input 
            type="text" 
            placeholder="Filtrar por usuário (ex: tecnico@...)" 
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        {(loading || authLoading) && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Carregando histórico...</p>
          </div>
        )}
        
        {error && (
          <div className={styles.errorState}>
             <h3>⚠️ Erro ao Carregar Histórico</h3>
             <p>{error.message}</p>
             <p className={styles.errorTextSmall}>Se for erro de índice, clique no link no Console (F12).</p>
           </div>
        )}

        {!loading && !error && filteredHistory.length === 0 && (
          <div className={styles.emptyState}>
            <PackageSearch size={50} />
            <h3>Nenhum registro encontrado</h3>
            <p>{isAdmin ? "Nenhuma atividade registrada no sistema." : "Nenhuma atividade realizada por você."}</p>
          </div>
        )}

        <ul className={styles.historyList}>
          {filteredHistory.map(doc => {
            const log = doc.data();
            const date = log.timestamp?.toDate();
            const assetId = doc.ref.parent?.parent?.id || "Desconhecido";
            
            return (
              <li key={doc.id} className={styles.historyItem}>
                <div className={styles.historyIcon}>
                  <LogIcon type={log.type} />
                </div>
                <div className={styles.historyContent}>
                  <strong>{log.type}</strong>
                  <small className={styles.historyTime}>
                    {date ? format(date, "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR }) : '...'}
                  </small>
                  <Link to={`/inventory/${assetId}`} className={styles.assetLink}>
                    Ativo: {assetId}
                  </Link>
                  <p>{log.details}</p>
                  <small>Usuário: {log.user}</small>
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