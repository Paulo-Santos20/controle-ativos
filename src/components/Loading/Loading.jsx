import React from 'react';
import styles from './Loading.module.css';
import { LuLoader } from 'react-icons/lu';

const Loading = () => {
  return (
    <div className={styles.container}>
      <LuLoader className={styles.spinner} size={40} />
      <p>Carregando...</p>
    </div>
  );
};

export default Loading;