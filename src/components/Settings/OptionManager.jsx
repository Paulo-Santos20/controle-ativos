import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { logAudit } from '../../utils/AuditLogger';
import { sortOptions } from '../../utils/sortOptions';
import { Plus, Trash2, Loader2, List, Check, Square, X } from 'lucide-react';
import styles from './OptionManager.module.css';

const OptionManager = ({ docId, title, placeholder }) => {
  const [newItem, setNewItem] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  
  const docRef = doc(db, 'systemOptions', docId);
  const [data, loading, error] = useDocumentData(docRef);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const itemToAdd = newItem.trim();

    if (data?.values?.includes(itemToAdd)) {
      toast.error("Este item já existe na lista.");
      return;
    }

    try {
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(docRef, { values: [itemToAdd] });
      } else {
        await updateDoc(docRef, {
          values: arrayUnion(itemToAdd)
        });
      }
      
      await logAudit(
        "Criação de Opção",
        `Opção "${itemToAdd}" adicionada à lista "${title}".`,
        title
      );
      toast.success("Item adicionado!");
      setNewItem("");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar item.");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Deseja remover "${item}" da lista?`)) return;

    try {
      await updateDoc(docRef, {
        values: arrayRemove(item)
      });
      await logAudit(
        "Remoção de Opção",
        `Opção "${item}" removida da lista "${title}".`,
        title
      );
      toast.success("Item removido.");
      setSelectedItems(prev => prev.filter(i => i !== item));
    } catch (error) {
      toast.error("Erro ao remover item.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Deseja remover ${selectedItems.length} itens selecionados?`)) return;

    try {
      await updateDoc(docRef, {
        values: arrayRemove(...selectedItems)
      });
      await logAudit(
        "Remoção em Massa de Opções",
        `${selectedItems.length} opções removidas da lista "${title}".`,
        title
      );
      toast.success(`${selectedItems.length} itens removidos.`);
      setSelectedItems([]);
    } catch (error) {
      toast.error("Erro ao remover itens.");
    }
  };

  const toggleItem = (item) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const toggleAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...items]);
    }
  };

  if (loading) return <div className={styles.loading}><Loader2 className={styles.spinner} /> Carregando lista...</div>;
  if (error) return <p className={styles.error}>Erro ao carregar lista.</p>;

  const items = data?.values ? sortOptions(data.values) : [];
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{title}</h3>
      
      <form onSubmit={handleAdd} className={styles.form}>
        <input 
          type="text" 
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
        />
        <button type="submit" className={styles.addButton} disabled={!newItem.trim()}>
          <Plus size={18} /> Adicionar
        </button>
      </form>

      {selectedItems.length > 0 && (
        <div className={styles.bulkActions}>
          <span>{selectedItems.length} selecionado(s)</span>
          <button onClick={handleBulkDelete} className={styles.bulkDeleteButton}>
            <Trash2 size={16} /> Excluir Selecionados
          </button>
          <button onClick={() => setSelectedItems([])} className={styles.cancelButton}>
            <X size={16} /> Cancelar
          </button>
        </div>
      )}

      <div className={styles.listContainer}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <List size={40} />
            <p>Nenhum item cadastrado.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            <li className={styles.headerRow}>
              <input 
                type="checkbox" 
                checked={allSelected}
                onChange={toggleAll}
                className={styles.checkbox}
              />
              <span className={styles.headerLabel}>Selecionar todos</span>
            </li>
            {items.map((item, index) => (
              <li key={index} className={`${styles.listItem} ${selectedItems.includes(item) ? styles.selected : ''}`}>
                <input 
                  type="checkbox" 
                  checked={selectedItems.includes(item)}
                  onChange={() => toggleItem(item)}
                  className={styles.checkbox}
                />
                <span className={styles.itemText}>{item}</span>
                <button 
                  onClick={() => handleDelete(item)} 
                  className={styles.deleteButton}
                  title="Remover"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className={styles.footerInfo}>
        Total de registros: {items.length}
      </div>
    </div>
  );
};

export default OptionManager;