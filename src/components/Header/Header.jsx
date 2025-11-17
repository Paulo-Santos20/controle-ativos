import React from 'react';
import styles from './Header.module.css';
// ----------------------------------------------------------

import { Menu } from 'lucide-react';
import UserMenu from './UserMenu';
import NotificationMenu from './NotificationMenu';
import ThemeToggle from './ThemeToggle'; 

const Header = ({ onToggleMobileMenu }) => {
  return (
    <header className={styles.header}>
      
      {/* Lado Esquerdo */}
      <div className={styles.leftSection}>
        <button 
          className={`${styles.iconButton} ${styles.mobileOnly}`}
          onClick={onToggleMobileMenu}
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Lado Direito */}
      <div className={styles.rightSection}>
        
        {/* 1. Botão de Tema (Sol/Lua) */}
        <ThemeToggle />

        {/* 2. Notificações (Sino) */}
        <NotificationMenu />
        
        <div className={styles.separator}></div>

        {/* 3. Menu de Usuário (Foto/Nome) */}
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;