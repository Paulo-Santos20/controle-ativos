import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase'; 
import { Plus, Building, Loader2, Search, MapPin, Pencil, Lock } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth'; 

import styles from './CadastroPages.module.css';
import Modal from '../../components/Modal/Modal';
import AddUnitForm from '../../components/Settings/AddUnitForm';

const UnidadesPage = () => {
  const { permissions, isAdmin } = useAuth();
  const canManage = isAdmin || permissions?.cadastros_unidades?.create;

  // Estados
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnitDoc, setEditingUnitDoc] = useState(null); 
  
  // --- NOVO ESTADO PARA O MAPA ---
  const [mapUrl, setMapUrl] = useState(null); // Se tiver valor, o modal do mapa abre
  
  const [searchTerm, setSearchTerm] = useState("");

  const q = query(collection(db, 'units'), orderBy('name', 'asc'));
  const [units, loading, error] = useCollection(q);

  const filteredUnits = units?.docs.filter(doc => {
    if (!searchTerm) return true;
    const data = doc.data();
    const search = searchTerm.toLowerCase();
    return (
      data.name.toLowerCase().includes(search) ||
      data.sigla.toLowerCase().includes(search) ||
      doc.id.toLowerCase().includes(search)
    );
  });

  const handleOpenAddNew = () => {
    setEditingUnitDoc(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unitDoc) => {
    setEditingUnitDoc(unitDoc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingUnitDoc(null), 300); 
  };

  // --- NOVA FUNÇÃO INTELIGENTE DE MAPA ---
  const handleOpenMap = (e, url) => {
    e.preventDefault(); // Impede abrir link padrão
    if (!url) return;

    // Verifica se é um link de Embed (que contém '/embed')
    if (url.includes('/embed')) {
      setMapUrl(url); // Abre no Modal interno
    } else {
      // Se for link normal (compartilhar), abre nova aba
      window.open(url, '_blank');
    }
  };
  
  const renderList = () => {
    if (loading) return <div className={styles.loadingState}><Loader2 className={styles.spinner} /><p>Carregando unidades...</p></div>;
    if (error) return <p className={styles.errorText}>Erro: {error.message}</p>;

    return (
      <div className={styles.list}>
        {filteredUnits?.map(doc => {
          const unit = doc.data();
          return (
            <div key={doc.id} className={styles.listItem}>
              <div className={styles.listItemIcon}>
                <Building size={24} />
              </div>
              <div className={styles.listItemContent}>
                <strong>{unit.name} ({unit.sigla})</strong>
                <small>CNPJ: {doc.id} | {unit.cidade}-{unit.estado}</small>
              </div>
              <div className={styles.listItemActions}>
                
                {/* --- BOTÃO DE MAPA CORRIGIDO --- */}
                {unit.geolocalizacao && (
                  <button 
                    className={styles.iconButton} 
                    onClick={(e) => handleOpenMap(e, unit.geolocalizacao)}
                    title="Ver Localização"
                  >
                    <MapPin size={18} />
                  </button>
                )}
                
                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleOpenEdit(doc)}
                  disabled={!canManage}
                  style={{ opacity: !canManage ? 0.5 : 1, cursor: !canManage ? 'not-allowed' : 'pointer' }}
                >
                  {canManage ? <Pencil size={16} /> : <Lock size={16} />}
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* --- MODAL PRINCIPAL (CADASTRO) --- */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUnitDoc ? "Editar Unidade" : "Registrar Nova Unidade"}>
        <AddUnitForm onClose={handleCloseModal} existingUnitDoc={editingUnitDoc} />
      </Modal>

      {/* --- NOVO: MODAL DE MAPA (IFRAME) --- */}
      {/* Só aparece se mapUrl tiver valor */}
      <Modal 
        isOpen={!!mapUrl} 
        onClose={() => setMapUrl(null)} 
        title="Localização da Unidade"
      >
        <div style={{ width: '100%', height: '400px', overflow: 'hidden', borderRadius: '8px' }}>
          <iframe 
            src={mapUrl} 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa da Unidade"
          ></iframe>
        </div>
        <div style={{textAlign: 'center', marginTop: '10px'}}>
            <button className={styles.secondaryButton} onClick={() => setMapUrl(null)}>Fechar Mapa</button>
        </div>
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Cadastro de Unidades</h1>
        <button 
          className={styles.primaryButton} 
          onClick={handleOpenAddNew}
          disabled={!canManage}
          style={{ opacity: !canManage ? 0.5 : 1, cursor: !canManage ? 'not-allowed' : 'pointer' }}
        >
          <Plus size={18} /> Registrar Nova Unidade
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className={styles.content}>
        {renderList()}
      </div>
    </div>
  );
};

export default UnidadesPage;