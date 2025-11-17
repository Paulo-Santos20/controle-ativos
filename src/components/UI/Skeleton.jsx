import React from 'react';
import styles from './Skeleton.module.css';

const Skeleton = ({ width, height, borderRadius = '4px', className = '' }) => {
  const style = {
    width,
    height,
    borderRadius,
  };

  return (
    <div 
      className={`${styles.skeleton} ${className}`} 
      style={style} 
    />
  );
};

export default Skeleton;