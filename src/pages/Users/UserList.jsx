import React from 'react';
import styles from './UserList.module.css';
import { LuPlus } from 'react-icons/lu';

const UserList = () => {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gestão de Usuários</h1>
        <button className={styles.primaryButton}>
          <LuPlus /> Novo Usuário
        </button>
      </header>

      <div className={styles.toolbar}>
        <input type="text" placeholder="Buscar por nome ou e-mail..." className={styles.searchInput} />
        {/* Filtros de Role ou Unidade podem vir aqui */}
      </div>

      <div className={styles.content}>
        {/* Tabela de Usuários virá aqui */}
        <p>Tabela de usuários (Admin, Técnico Local, etc.)...</p>
      </div>
    </div>
  );
};

export default UserList;