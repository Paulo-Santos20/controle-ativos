import React, { useState } from 'react';
import styles from './Layout.module.css';

// Importando os novos componentes
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import MobileNav from '../MobileNav/MobileNav';

const Layout = ({ children }) => {
  // Estado para controlar o menu mobile (Mobile-First)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prevState => !prevState);
  };

  return (
    <>
      {/* 1. Menu Mobile (controlado por estado) */}
      <MobileNav 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* 2. Layout Principal (Grid) */}
      <div className={styles.layoutContainer}>
        
        {/* Sidebar (só aparece em desktop) */}
        <Sidebar />

        {/* Wrapper de Conteúdo (ocupa o espaço certo no grid) */}
        <div className={styles.contentWrapper}>
          
          {/* Header (sempre visível) */}
          <Header onToggleMobileMenu={toggleMobileMenu} />

          {/* Conteúdo da Página */}
          <main className={styles.mainContent}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;