import React from 'react';
import styles from './Header.module.css';
import { Menu, Bell } from 'lucide-react';
import UserMenu from './UserMenu'; // <-- Importa o novo componente

// O Header recebe a função para abrir o menu mobile
const Header = ({ onToggleMobileMenu }) => {
  return (
    <header className={styles.header}>
      
      {/* Lado Esquerdo: Menu Mobile e Título (opcional) */}
      <div className={styles.leftSection}>
        <button 
          className={`${styles.iconButton} ${styles.mobileOnly}`}
          onClick={onToggleMobileMenu}
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
        
        {/* Você pode colocar um título ou breadcrumb aqui se quiser */}
        {/* <h2 className={styles.pageTitle}>ITAM</h2> */}
      </div>

      {/* Lado Direito: Ações e Perfil */}
      <div className={styles.rightSection}>
        {/* Ações Rápidas */}
        <button className={styles.iconButton} aria-label="Notificações">
          <Bell size={20} />
          {/* <span className={styles.badge}>3</span> Exemplo de badge */}
        </button>

        <div className={styles.separator}></div>

        {/* O Novo Menu de Usuário */}
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;