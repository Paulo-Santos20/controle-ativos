import React from 'react';
import Skeleton from '../UI/Skeleton';
import styles from '../../pages/Dashboard/Dashboard.module.css'; // Reutiliza layout

const DashboardSkeleton = () => {
  return (
    <div className={styles.dashboard}>
      {/* Header Fake */}
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '24px'}}>
         <Skeleton width="200px" height="40px" />
         <div style={{display: 'flex', gap: '10px'}}>
            <Skeleton width="150px" height="40px" />
            <Skeleton width="150px" height="40px" />
         </div>
      </div>

      {/* Cards Grid */}
      <div className={styles.cardGrid}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.card}>
            {/* Ícone */}
            <Skeleton width="50px" height="50px" borderRadius="50%" style={{gridArea: 'icon'}} />
            {/* Título */}
            <Skeleton width="100px" height="16px" style={{gridArea: 'title', alignSelf: 'end'}} />
            {/* Valor */}
            <Skeleton width="60px" height="32px" style={{gridArea: 'value'}} />
          </div>
        ))}
      </div>

      <div className={styles.contentRow}>
        {/* Chart Skeleton */}
        <div className={styles.chartContainer} style={{justifyContent: 'center', alignItems: 'center'}}>
           <div style={{width: '100%', marginBottom: '20px'}}><Skeleton width="150px" height="24px" /></div>
           {/* Círculo do gráfico */}
           <Skeleton width="200px" height="200px" borderRadius="50%" />
        </div>

        {/* Feed Skeleton */}
        <div className={styles.feedContainer}>
           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
              <Skeleton width="180px" height="24px" />
              <Skeleton width="60px" height="20px" />
           </div>
           <div className={styles.feedList}>
             {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className={styles.feedItem} style={{alignItems: 'center'}}>
                  <Skeleton width="20px" height="20px" borderRadius="50%" />
                  <div style={{flex: 1, marginLeft: '10px'}}>
                     <Skeleton width="40%" height="16px" style={{marginBottom: '4px'}} />
                     <Skeleton width="80%" height="14px" />
                  </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;