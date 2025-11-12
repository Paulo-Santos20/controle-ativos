import React from 'react';
import styles from './Header.module.css';
import { LuMenu, LuBell, LuSearch, LuCircleUserRound } from 'react-icons/lu';

// O Header recebe a função para abrir o menu mobile
const Header = ({ onToggleMobileMenu }) => {
  return (
    <header className={styles.header}>
      {/* Botão de Menu (Apenas Mobile) */}
      <button 
        className={`${styles.iconButton} ${styles.mobileOnly}`}
        onClick={onToggleMobileMenu}
        aria-label="Abrir menu"
      >
        <LuMenu size={24} />
      </button>

      {/* Logo (Apenas Mobile) */}
      <div className={`${styles.logoMobile} ${styles.mobileOnly}`}>
        ITAM Hospitalar
      </div>

      {/* Ações do Lado Direito (Desktop) */}
      <div className={styles.desktopActions}>
        {/* Futuramente: <div className={styles.searchBar}>...</div> */}
        <button className={styles.iconButton} aria-label="Notificações">
          <LuBell size={22} />
        </button>
        <button className={styles.iconButton} aria-label="Meu Perfil">
          <LuCircleUserRound size={22} />
        </button>
      </div>
    </header>
  );
};

export default Header;