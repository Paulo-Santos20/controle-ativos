import React from 'react';
import { Laptop, Printer } from 'lucide-react';
import styles from './AssetTypeSelector.module.css';

/**
 * Componente que permite ao usuário escolher o tipo de ativo a ser registrado.
 * @param {object} props
 * @param {(type: 'computer' | 'printer') => void} props.onSelectType
 */
const AssetTypeSelector = ({ onSelectType }) => {
  return (
    <div className={styles.selectorContainer}>
      <h2 className={styles.title}>O que você deseja registrar?</h2>
      <div className={styles.buttonGrid}>
        
        <button 
          className={styles.typeButton} 
          onClick={() => onSelectType('computer')}
        >
          <Laptop size={48} />
          <span>Computador</span>
          <small>(Desktop, Notebook, etc.)</small>
        </button>

        <button 
          className={styles.typeButton}
          onClick={() => onSelectType('printer')}
        >
          <Printer size={48} />
          <span>Impressora</span>
          <small>(Térmica, Multifuncional, etc.)</small>
        </button>

      </div>
    </div>
  );
};

export default AssetTypeSelector;