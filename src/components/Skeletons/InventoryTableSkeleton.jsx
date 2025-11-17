import React from 'react';
import Skeleton from '../UI/Skeleton';
// Reutiliza o CSS da tabela real para garantir que o layout seja idêntico
import styles from '../../pages/Inventory/InventoryList.module.css';

const InventoryTableSkeleton = () => {
  // Cria 10 linhas falsas para preencher a tela
  const rows = Array.from({ length: 10 });

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {/* Checkbox */}
            <th style={{width: '50px', textAlign: 'center'}}><Skeleton width="20px" height="20px" /></th>
            {/* Tombamento */}
            <th><Skeleton width="80px" height="16px" /></th>
            {/* Tipo */}
            <th><Skeleton width="60px" height="16px" /></th>
            {/* Status */}
            <th><Skeleton width="60px" height="16px" /></th>
            {/* Unidade (Mobile Hide) */}
            <th className={styles.hideMobile}><Skeleton width="100px" height="16px" /></th>
            {/* Setor (Mobile Hide) */}
            <th className={styles.hideMobile}><Skeleton width="80px" height="16px" /></th>
            {/* Serial (Mobile Hide) */}
            <th className={styles.hideMobile}><Skeleton width="120px" height="16px" /></th>
            {/* Ações */}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((_, index) => (
            <tr key={index}>
              <td style={{textAlign: 'center'}}><Skeleton width="20px" height="20px" /></td>
              <td><Skeleton width="100px" height="20px" /></td>
              <td><Skeleton width="80px" height="20px" /></td>
              <td><Skeleton width="90px" height="24px" borderRadius="12px" /></td>
              <td className={styles.hideMobile}><Skeleton width="60px" height="20px" /></td>
              <td className={styles.hideMobile}><Skeleton width="100px" height="20px" /></td>
              <td className={styles.hideMobile}><Skeleton width="140px" height="20px" /></td>
              <td><Skeleton width="40px" height="20px" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTableSkeleton;