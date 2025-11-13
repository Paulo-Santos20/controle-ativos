import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { Search, Loader2, Building2, Monitor, List } from 'lucide-react';
import { toast } from 'sonner';
import styles from './AssetForms.module.css';

// Importa o Modal para a busca avançada
import Modal from '../Modal/Modal';
import AdvancedAssetList from './AdvancedAssetList';

const AssetSearchForm = ({ onAssetFound, onCancel }) => {
  // Estados
  const [selectedUnit, setSelectedUnit] = useState('');
  
  // Estados para o Autocomplete
  const [inputValue, setInputValue] = useState('');
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null); // O objeto completo do ativo escolhido
  
  // Estados para os Dados
  const [allAssetsList, setAllAssetsList] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  // Estado para o Modal Avançado
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 1. Busca as Unidades
  const [units, loadingUnits] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  // 2. Busca ativos quando a Unidade muda
  useEffect(() => {
    if (!selectedUnit) {
      setAllAssetsList([]);
      setFilteredAssets([]);
      setInputValue('');
      setSelectedAsset(null);
      return;
    }

    const fetchUnitAssets = async () => {
      setLoadingAssets(true);
      try {
        const q = query(collection(db, 'assets'), where('unitId', '==', selectedUnit));
        const snapshot = await getDocs(q);
        
        const validAssets = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(asset => !['Devolvido', 'Descartado', 'Inativo'].includes(asset.status));

        setAllAssetsList(validAssets);
        setFilteredAssets(validAssets); // Inicialmente mostra todos (ou limitados)
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar ativos.");
      } finally {
        setLoadingAssets(false);
      }
    };

    fetchUnitAssets();
  }, [selectedUnit]);

  // 3. Filtra a lista conforme o usuário digita
  const handleInputChange = (e) => {
    const term = e.target.value;
    setInputValue(term);
    setSelectedAsset(null); // Limpa seleção se digitar
    setShowDropdown(true);

    if (!term) {
      setFilteredAssets(allAssetsList);
      return;
    }

    const lowerTerm = term.toLowerCase();
    const filtered = allAssetsList.filter(asset => 
      asset.id.toLowerCase().includes(lowerTerm) ||
      (asset.modelo && asset.modelo.toLowerCase().includes(lowerTerm)) ||
      (asset.serial && asset.serial.toLowerCase().includes(lowerTerm)) ||
      (asset.hostname && asset.hostname.toLowerCase().includes(lowerTerm))
    );
    setFilteredAssets(filtered);
  };

  // Seleção via Dropdown ou Modal Avançado
  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    // Formata o texto para o input: MODELO - SERIAL
    setInputValue(`${asset.modelo || 'Sem Modelo'} - ${asset.serial || asset.id}`);
    setShowDropdown(false);
    setShowAdvanced(false); // Fecha modal avançado se estiver aberto
  };

  // Envio Final
  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedAsset) {
      onAssetFound(selectedAsset);
    } else {
      toast.error("Por favor, selecione um ativo da lista.");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.subtitle}>Localizar Ativo</legend>
          
          {/* Seleção de Unidade */}
          <div className={styles.formGroup}>
            <label htmlFor="unitSelect">1. Selecione a Unidade</label>
            <div className={styles.inputWithIcon}>
              <Building2 size={18} className={styles.inputIconInside} />
              <select 
                id="unitSelect"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className={styles.autocompleteInput}
              >
                <option value="">Selecione...</option>
                {loadingUnits ? <option>Carregando...</option> : 
                  units?.docs.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.data().name} ({doc.data().sigla})</option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Campo de Busca Inteligente */}
          <div className={styles.formGroup}>
            <label>2. Busque o Ativo</label>
            
            <div className={styles.searchGroup}>
              <div className={styles.autocompleteWrapper}>
                {/* Ícone dentro do input */}
                <Monitor size={18} className={styles.inputIconInside} />
                
                <input 
                  type="text"
                  className={styles.autocompleteInput}
                  placeholder={!selectedUnit ? "Selecione a unidade..." : "Digite Serial, Tombamento ou Modelo..."}
                  value={inputValue}
                  onChange={handleInputChange}
                  onFocus={() => setShowDropdown(true)}
                  disabled={!selectedUnit || loadingAssets}
                />

                {/* Dropdown Flutuante */}
                {showDropdown && filteredAssets.length > 0 && (
                  <ul className={styles.dropdownList}>
                    {filteredAssets.slice(0, 6).map(asset => ( // Mostra max 6 para não poluir
                      <li 
                        key={asset.id} 
                        className={styles.dropdownItem}
                        onClick={() => handleSelectAsset(asset)}
                      >
                        <strong>{asset.modelo || asset.hostname || "Sem Modelo"}</strong>
                        <small>ID: {asset.id} | S/N: {asset.serial || '-'}</small>
                      </li>
                    ))}
                    {/* Se tiver muitos itens, sugere a busca avançada */}
                    {filteredAssets.length > 6 && (
                      <li className={styles.dropdownItem} onClick={() => setShowAdvanced(true)} style={{textAlign:'center', color:'var(--color-primary)'}}>
                        Ver todos os resultados...
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Botão de Busca Avançada (Modal) */}
              <button 
                type="button" 
                className={styles.searchButtonSquare}
                onClick={() => setShowAdvanced(true)}
                disabled={!selectedUnit || loadingAssets}
                title="Abrir lista completa"
              >
                <List size={20} />
              </button>
            </div>
            
            {/* Status Text */}
            {loadingAssets && <small style={{display:'block', marginTop:4, color:'#666'}}>Carregando ativos...</small>}
          </div>

        </fieldset>

        <div className={styles.buttonContainer}>
          <button type="button" onClick={onCancel} className={styles.secondaryButton}>
            Cancelar
          </button>
          <button 
            type="submit" 
            className={styles.primaryButton} 
            disabled={!selectedAsset}
          >
            Continuar
          </button>
        </div>
      </form>

      {/* --- MODAL DE BUSCA AVANÇADA --- */}
      <Modal 
        isOpen={showAdvanced} 
        onClose={() => setShowAdvanced(false)}
        title={`Todos os ativos de ${selectedUnit}`}
      >
        <AdvancedAssetList 
          assets={allAssetsList} 
          onSelect={handleSelectAsset} 
        />
      </Modal>
    </>
  );
};

export default AssetSearchForm;