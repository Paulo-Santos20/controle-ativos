import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom'; // <-- A CORREÇÃO ESTÁ AQUI
import { collectionGroup, query, orderBy, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, PackageSearch, Filter, History, Truck, Wrench, FilePlus, Edit } from 'lucide-react';

import styles from './ActivityLogPage.module.css';

// Constantes para os filtros
const filterOptions = [
  { value: "all", label: "Todos os Tipos" },
  { value: "Registro", label: "Registro" },
  { value: "Atualização de Status", label: "Atualização de Status" },
  { value: "Movimentação", label: "Movimentação" },
  { value: "Manutenção/Preventiva", label: "Manutenção/Preventiva" },
];

// Helper de Ícone (UI/UX)
const LogIcon = ({ type }) => {
  if (type === 'Movimentação') return <Truck size={18} />;
  if (type === 'Atualização de Status') return <Edit size={18} />;
  if (type === 'Manutenção/Preventiva') return <Wrench size={18} />;
  if (type === 'Registro') return <FilePlus size={18} />;
  return <History size={18} />;
};

/**
 * Página para exibir o log de histórico completo de todos os ativos.
 */
const ActivityLogPage = () => {
  // Estados para os filtros
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState(""); // Filtro de texto

  // Hook de Query Dinâmica (Princípio 2: Performance Total)
  const historyQuery = useMemo(() => {
    let constraints = [orderBy('timestamp', 'desc')];

    // Adiciona filtros de servidor
    if (filterType !== "all") {
      constraints.push(where("type", "==", filterType));
    }
    
    return query(collectionGroup(db, 'history'), ...constraints);
  }, [filterType]); // Dependência: filterType

  const [history, loading, error] = useCollection(historyQuery);

  // Filtro de Cliente (para o 'user', que é um campo de texto)
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (!filterUser) return history.docs;

    const search = filterUser.toLowerCase();
    return history.docs.filter(doc => 
      doc.data().user.toLowerCase().includes(search)
    );
  }, [history, filterUser]);

  return (
    <div className={styles.page}>
      {/* --- Cabeçalho da Página --- */}
      <header className={styles.header}>
        <h1 className={styles.title}>Log de Atividades</h1>
      </header>

      {/* --- Barra de Filtros (UI/UX) --- */}
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
            onChange={(e) => setFilterUser(e.gexet.value)}
          />
        </div>
      </div>

      {/* --- Conteúdo da Lista (Responsivo) --- */}
      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Carregando histórico...</p>
          </div>
        )}
        
        {error && (
          <div className={styles.errorState}>
             <h3>⚠️ Erro ao Carregar Histórico</h3>
             <p>{error.message}</p>
             <p className={styles.errorTextSmall}>Verifique se o Firestore precisa de um índice (veja o console F12).</p>
           </div>
        )}

        {!loading && !error && filteredHistory.length === 0 && (
          <div className={styles.emptyState}>
            <PackageSearch size={50} />
            <h3>Nenhum registro encontrado</h3>
            <p>Tente ajustar seus filtros.</p>
          </div>
        )}

        <ul className={styles.historyList}>
          {filteredHistory.map(doc => {
            const log = doc.data();
            const date = log.timestamp?.toDate();
            // Acessa o ID do Ativo "Pai" (ex: "PAT-123")
            const assetId = doc.ref.parent.parent.id; 
            
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
                  {/* UI/UX: Link para o ativo */}
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