import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

const NotFound = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.subtitle}>Página Não Encontrada</p>
      <p className={styles.message}>Desculpe, a página que você está procurando não existe.</p>
      <Link to="/" className={styles.button}>
        Voltar ao Dashboard
      </Link>
    </div>
  );
};

export default NotFound;