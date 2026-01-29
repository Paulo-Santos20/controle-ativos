import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './MobileNav.module.css';
import { 
  LuLayoutDashboard, 
  LuHardDrive, 
  LuChartLine, 
  LuSettings, 
  LuUsers, 
  LuX,
  LuHospital
} from 'react-icons/lu';

// Recebe 'isOpen' para saber se deve ser exibido
// Recebe 'onClose' para fechar (clicando no 'X' ou no backdrop)
const MobileNav = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Parar a propagação para evitar que clicar no menu feche o menu
  const onMenuClick = (e) => e.stopPropagation();

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <nav className={styles.menuPanel} onClick={onMenuClick}>
        <header className={styles.header}>
          <div className={styles.logoContainer}>
            <LuHospital size={26} />
            <h1>ATIVOS Hospitalar</h1>
          </div>
          <button onClick={onClose} className={styles.closeButton} aria-label="Fechar menu">
            <LuX size={24} />
          </button>
        </header>

        <ul className={styles.navList}>
          <li>
            <NavLink to="/" onClick={onClose} className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }>
              <LuLayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/inventory" onClick={onClose} className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }>
              <LuHardDrive size={20} />
              <span>Inventário</span>
            </NavLink>
          </li>
          {/* Adicione os outros links aqui... */}
          <li>
            <NavLink to="/settings" onClick={onClose} className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }>
              <LuSettings size={20} />
              <span>Configurações</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default MobileNav;