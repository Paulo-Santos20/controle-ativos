import React, { useState } from 'react';
import { Layers, Monitor, Server, Map, Box, Database } from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';

import styles from './OptionsPage.module.css';
import OptionManager from '../../components/Settings/OptionManager';

const CATEGORIES = [
  { 
    id: 'setores', 
    label: 'Setores', 
    icon: <Layers size={18} />, 
    placeholder: "Ex: UTI Adulto, Recepção...",
    defaults: [
      "Recepção", "Triagem", "Emergência", "UTI Adulto", "UTI Neonatal", 
      "UTI Pediátrica", "Bloco Cirúrgico", "Centro Obstétrico", "Enfermaria", 
      "Apartamentos", "Centro de Diagnóstico (CDI)", "Laboratório", "Farmácia", 
      "Almoxarifado", "TI", "Administração", "Faturamento", "Manutenção", 
      "Nutrição (SND)", "Higienização (SHL)", "Laudos"
    ]
  },
  { 
    id: 'tipos_ativos', 
    label: 'Tipos de Ativo', 
    icon: <Monitor size={18} />, 
    placeholder: "Ex: Desktop, Notebook...",
    defaults: ["Desktop", "All in One", "Notebook", "Tablet", "Impressora", "Monitor", "Nobreak"]
  },
  { 
    id: 'sistemas_operacionais', 
    label: 'Sistemas Operacionais', 
    icon: <Server size={18} />, 
    placeholder: "Ex: Windows 11...",
    defaults: ["Windows 11 Pro", "Windows 11 Home", "Windows 10 Pro", "Windows 10 Home", "Ubuntu", "Linux", "macOS"]
  },
  { 
    id: 'pavimentos', 
    label: 'Pavimentos', 
    icon: <Map size={18} />, 
    placeholder: "Ex: Térreo...",
    defaults: ["Subsolo", "Térreo", "1º Andar", "2º Andar", "3º Andar", "4º Andar"]
  },
  { 
    id: 'salas', 
    label: 'Salas', 
    icon: <Box size={18} />, 
    placeholder: "Ex: Sala 01...",
    defaults: [
      "Bloco", "Central", "Laudos", "Emergência", "Sala de TI", 
      "Consultório 01", "Consultório 02", "Consultório 03", "Consultório 04", "Consultório 05",
      "CPD 01", "CPD 02", "Recepção 01", "Recepção 02", "Posto 01", "Posto 02"
    ]
  },
];

const OptionsPage = () => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [isSeeding, setIsSeeding] = useState(false);

  const handlePopulateDefaults = async () => {
    if (!window.confirm("Isso irá sobrescrever/criar as listas padrão no banco de dados. Continuar?")) return;
    setIsSeeding(true);
    const toastId = toast.loading("Criando opções padrão...");
    try {
      const batch = writeBatch(db);
      CATEGORIES.forEach(cat => {
        const docRef = doc(db, 'systemOptions', cat.id);
        batch.set(docRef, { values: cat.defaults }, { merge: true });
      });
      await batch.commit();
      toast.success("Todas as opções foram criadas!", { id: toastId });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar opções: " + error.message, { id: toastId });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gerenciamento de Opções</h1>
          <p style={{color: 'var(--color-text-secondary)'}}>
            Cadastre as opções padrão (Setores, Locais, etc) usadas nos formulários.
          </p>
        </div>
        
      </header>

      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column', marginTop: '20px' }}>
        <div className={styles.tabsContainer}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat)}
              className={`${styles.tabButton} ${activeCategory.id === cat.id ? styles.active : ''}`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
        <div>
          <OptionManager 
            key={activeCategory.id} 
            docId={activeCategory.id}
            title={`Gerenciar ${activeCategory.label}`}
            placeholder={activeCategory.placeholder}
          />
        </div>
      </div>
    </div>
  );
};

export default OptionsPage;