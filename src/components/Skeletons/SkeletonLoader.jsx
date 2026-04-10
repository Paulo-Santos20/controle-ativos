import React from 'react';
import styles from './SkeletonLoader.module.css';

const SkeletonLoader = ({ 
  type = 'text', 
  width = '100%', 
  height = '20px', 
  count = 1,
  className = '' 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'circle':
        return <div className={styles.circle} style={{ width, height }} />;
      case 'card':
        return (
          <div className={styles.card} style={{ width }}>
            <div className={styles.cardHeader} style={{ height: '24px' }} />
            <div className={styles.cardBody} style={{ height: '100px' }} />
          </div>
        );
      case 'table':
        return (
          <div className={styles.table} style={{ width }}>
            <div className={styles.tableHeader}>
              <div style={{ width: '20%' }} />
              <div style={{ width: '30%' }} />
              <div style={{ width: '20%' }} />
              <div style={{ width: '30%' }} />
            </div>
            <div className={styles.tableRow}>
              <div style={{ width: '20%' }} />
              <div style={{ width: '30%' }} />
              <div style={{ width: '20%' }} />
              <div style={{ width: '30%' }} />
            </div>
            <div className={styles.tableRow}>
              <div style={{ width: '20%' }} />
              <div style={{ width: '30%' }} />
              <div style={{ width: '20%' }} />
              <div style={{ width: '30%' }} />
            </div>
            <div className={styles.tableRow}>
              <div style={{ width: '20%' }} />
              <div style={{ width: '30%' }} />
              <div style={{ width: '20%' }} />
              <div style={{ width: '30%' }} />
            </div>
          </div>
        );
      case 'chart':
        return (
          <div className={styles.chart} style={{ width, height }}>
            <div className={styles.chartBar} style={{ width: '40px', height: '60%' }} />
            <div className={styles.chartBar} style={{ width: '40px', height: '80%' }} />
            <div className={styles.chartBar} style={{ width: '40px', height: '40%' }} />
            <div className={styles.chartBar} style={{ width: '40px', height: '90%' }} />
          </div>
        );
      default:
        return <div className={styles.text} style={{ width, height }} />;
    }
  };

  return (
    <div className={`${styles.skeletonContainer} ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>{renderSkeleton()}</React.Fragment>
      ))}
    </div>
  );
};

export default SkeletonLoader;