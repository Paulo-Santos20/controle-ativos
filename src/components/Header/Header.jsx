import React from 'react';
import styles from './Header.module.css';
import { Menu } from 'lucide-react'; // Removemos 'Bell' daqui
import UserMenu from './UserMenu';
import NotificationMenu from './NotificationMenu'; // <-- 1. Importa o novo componente

const Header = ({ onToggleMobileMenu }) => {
  return (
    <header className={styles.header}>
      
      <div className={styles.leftSection}>
        <button 
          className={`${styles.iconButton} ${styles.mobileOnly}`}
          onClick={onToggleMobileMenu}
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className={styles.rightSection}>
        
        {/* --- 2. SUBSTITUI O BOTÃO SIMPLES PELO COMPONENTE --- */}
        <NotificationMenu />
        
        <div className={styles.separator}></div>

        <UserMenu />
      </div>
    </header>
  );
};

export default Header;