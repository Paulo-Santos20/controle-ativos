import React, { useState } from 'react';
import { Search } from 'lucide-react';
import styles from './AssetForms.module.css';

const AdvancedAssetList = ({ assets, onSelect }) => {
  const [term, setTerm] = useState('');

  // Filtro local para o modal avançado
  const filtered = assets.filter(asset => {
    const search = term.toLowerCase();
    return (
      asset.id.toLowerCase().includes(search) ||
      (asset.modelo && asset.modelo.toLowerCase().includes(search)) ||
      (asset.serial && asset.serial.toLowerCase().includes(search)) ||
      (asset.hostname && asset.hostname.toLowerCase().includes(search))
    );
  });

  return (
    <div className={styles.form}>
      <div className={styles.formGroup}>
        <div className={styles.inputWithIcon}>
          <Search size={18} className={styles.inputIconInside} />
          <input 
            className={styles.autocompleteInput}
            placeholder="Filtrar lista..."
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.simpleTable}>
          <thead>
            <tr>
              <th>Tombamento</th>
              <th>Modelo</th>
              <th>Serial</th>
              <th>Setor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="4" style={{textAlign:'center'}}>Nenhum item encontrado.</td></tr>
            ) : (
              filtered.map(asset => (
                <tr key={asset.id} onClick={() => onSelect(asset)}>
                  <td><strong>{asset.id}</strong></td>
                  <td>{asset.modelo || asset.hostname || '-'}</td>
                  <td>{asset.serial || '-'}</td>
                  <td>{asset.setor || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p style={{fontSize:'0.8rem', color:'#666', marginTop:'5px'}}>
        Clique em um item para selecionar.
      </p>
    </div>
  );
};

export default AdvancedAssetList;