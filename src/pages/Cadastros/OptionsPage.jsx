import React, { useState } from 'react';
import { Layers, Monitor, Server, Map, Box, Cpu, HardDrive, Tag, Globe, MonitorCheck, CheckCircle } from 'lucide-react';
import { doc } from 'firebase/firestore';
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
    id: 'status',
    label: 'Status',
    icon: <CheckCircle size={18} />,
    placeholder: "Ex: Em uso, Estoque...",
    defaults: ["Em uso", "Estoque", "Em manutenção", "Inativo", "Devolvido", "Manutenção agendada", "Devolução agendada", "Reativação agendada"]
  },
  {
    id: 'tipos_ativos_computador',
    label: 'Tipos Computador',
    icon: <Monitor size={18} />,
    placeholder: "Ex: Desktop, Notebook...",
    defaults: ["Desktop", "All in One", "Notebook", "Tablet"]
  },
  { 
    id: 'tipos_ativos_impressora', 
    label: 'Tipos Impressora', 
    icon: <MonitorCheck size={18} />, 
    placeholder: "Ex: Multifuncional, Térmica...",
    defaults: ["Multifuncional", "Comum", "Etiquetadora", "Pulseira", "Térmica", "Outro"]
  },
  { 
    id: 'marcas', 
    label: 'Marcas', 
    icon: <Tag size={18} />, 
    placeholder: "Ex: Dell, HP, Lenovo...",
    defaults: ["Dell", "HP", "Lenovo", "Samsung", "Apple", "ASUS", "Acer", "Positivo", "Outra"]
  },
  { 
    id: 'marcas_impressora', 
    label: 'Marcas Impressora', 
    icon: <Tag size={18} />, 
    placeholder: "Ex: Brother, HP, Epson...",
    defaults: ["Brother", "HP", "Epson", "Gainscha", "Dascom", "GODEX", "Konica Minolta", "Ricoh", "Samsung", "Outra"]
  },
  { 
    id: 'modelos', 
    label: 'Modelos', 
    icon: <Monitor size={18} />, 
    placeholder: "Ex: OptiPlex 7080, ProDesk 400...",
    defaults: []
  },
  { 
    id: 'modelos_impressora', 
    label: 'Modelos Impressora', 
    icon: <MonitorCheck size={18} />, 
    placeholder: "Ex: HL-L6402DW, MF634Cdw...",
    defaults: []
  },
  { 
    id: 'sistemas_operacionais', 
    label: 'Sistemas Operacionais', 
    icon: <Globe size={18} />, 
    placeholder: "Ex: Windows 11, Ubuntu...",
    defaults: ["Windows 11 Pro", "Windows 11 Home", "Windows 10 Pro", "Windows 10 Home", "Ubuntu", "Linux", "macOS", "Não possui"]
  },
  {
    id: 'versoes_so',
    label: 'Versões S.O.',
    icon: <Server size={18} />,
    placeholder: "Ex: 22H2, 23H2, 20.04 LTS...",
    defaults: ["22H2", "23H2", "24H2", "20.04 LTS", "22.04 LTS", "Sonoma", "Sequoia"]
  },
  {
    id: 'windows_builds',
    label: 'Windows Builds',
    icon: <Server size={18} />,
    placeholder: "Ex: 22H2, 23H2, 24H2...",
    defaults: ["22H2", "23H2", "24H2", "25H2"]
  },
  { 
    id: 'memorias', 
    label: 'Memórias RAM', 
    icon: <Cpu size={18} />, 
    placeholder: "Ex: 4GB, 8GB, 16GB DDR4...",
    defaults: ["4GB", "8GB", "16GB", "32GB", "64GB"]
  },
  { 
    id: 'hd_ssd', 
    label: 'HD_SSD', 
    icon: <HardDrive size={18} />, 
    placeholder: "Ex: SSD 256GB, HDD 500GB...",
    defaults: ["SSD 128GB", "SSD 256GB", "SSD 512GB", "SSD 1TB", "HDD 320GB", "HDD 500GB", "HDD 1TB", "HDD 2TB"]
  },
  { 
    id: 'processadores', 
    label: 'Processadores', 
    icon: <Cpu size={18} />, 
    placeholder: "Ex: i3, i5, i7, Ryzen 5...",
    defaults: ["i3", "i5", "i7", "i9", "Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9", "Celeron", "Pentium"]
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
  {
    id: 'posse',
    label: 'Posse',
    icon: <Tag size={18} />,
    placeholder: "Ex: Própria, Alugada...",
    defaults: ["Própria", "Alugado", "Doação", "Empréstimo"]
  },
  {
    id: 'conectividade',
    label: 'Conectividade',
    icon: <Globe size={18} />,
    placeholder: "Ex: Rede, USB, Wi-Fi...",
    defaults: ["Rede/USB", "Rede", "USB", "Wi-Fi", "Bluetooth", "Outro"]
  },
  {
    id: 'tipos_insumo',
    label: 'Tipos Insumo',
    icon: <HardDrive size={18} />,
    placeholder: "Ex: Laser (Toner), Jato de Tinta...",
    defaults: ["Laser (Toner)", "Jato de Tinta", "Térmica (Ribbon)", "Térmica (Direta)", "Matricial (Fita)", "Etiqueta", "Outro"]
  },
  {
    id: 'frente_verso',
    label: 'Frente/Verso',
    icon: <Server size={18} />,
    placeholder: "Ex: Sim, Não...",
    defaults: ["Sim", "Não", "Não se aplica"]
  },
];

const OptionsPage = () => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gerenciamento de Opções</h1>
          <p className={styles.subtitle}>
            Gerencie as opções usadas nos formulários de cadastro de ativos.
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat)}
                className={`${styles.navButton} ${activeCategory.id === cat.id ? styles.active : ''}`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.content}>
          <div className={styles.contentHeader}>
            <h2 className={styles.contentTitle}>
              {activeCategory.icon}
              {activeCategory.label}
            </h2>
          </div>
          <OptionManager 
            key={activeCategory.id} 
            docId={activeCategory.id}
            title={`Gerenciar ${activeCategory.label}`}
            placeholder={activeCategory.placeholder}
          />
        </main>
      </div>
    </div>
  );
};

export default OptionsPage;
