import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, List } from 'lucide-react';
import styles from './OptionManager.module.css'; // Vamos criar este CSS abaixo

/**
 * Gerencia uma lista de strings dentro de um documento do Firestore.
 * @param {string} docId - O ID do documento na coleção 'systemOptions' (ex: 'setores', 'os')
 * @param {string} title - O título amigável (ex: 'Setores do Hospital')
 * @param {string} placeholder - Texto de ajuda do input
 */
const OptionManager = ({ docId, title, placeholder }) => {
  const [newItem, setNewItem] = useState("");
  
  // Referência ao documento: systemOptions/{docId}
  const docRef = doc(db, 'systemOptions', docId);
  const [data, loading, error] = useDocumentData(docRef);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const itemToAdd = newItem.trim();

    // Evita duplicatas visualmente (o arrayUnion também evita no backend)
    if (data?.values?.includes(itemToAdd)) {
      toast.error("Este item já existe na lista.");
      return;
    }

    try {
      // Verifica se o documento existe, se não, cria
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(docRef, { values: [itemToAdd] });
      } else {
        await updateDoc(docRef, {
          values: arrayUnion(itemToAdd)
        });
      }
      
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
      toast.success("Item removido.");
    } catch (error) {
      toast.error("Erro ao remover item.");
    }
  };

  if (loading) return <div className={styles.loading}><Loader2 className={styles.spinner} /> Carregando lista...</div>;
  if (error) return <p className={styles.error}>Erro ao carregar lista.</p>;

  // Ordena a lista alfabeticamente
  const items = data?.values?.sort() || [];

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{title}</h3>
      
      {/* Formulário de Adição */}
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

      {/* Lista de Itens */}
      <div className={styles.listContainer}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <List size={40} />
            <p>Nenhum item cadastrado.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((item, index) => (
              <li key={index} className={styles.listItem}>
                <span>{item}</span>
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