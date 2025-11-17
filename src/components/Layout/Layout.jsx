import React, { useState } from 'react';
import styles from './Layout.module.css';

// Componentes de Estrutura
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import MobileNav from '../MobileNav/MobileNav';

// --- NOVO: Importa o Breadcrumbs ---
import Breadcrumbs from '../UI/Breadcrumbs';

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prevState => !prevState);
  };

  return (
    <>
      {/* Menu Mobile (Overlay) */}
      <MobileNav 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* Grid Principal */}
      <div className={styles.layoutContainer}>
        
        {/* Sidebar (Desktop) */}
        <Sidebar />

        {/* Área de Conteúdo */}
        <div className={styles.contentWrapper}>
          
          {/* Header (Topo) */}
          <Header onToggleMobileMenu={toggleMobileMenu} />

          {/* Conteúdo Principal */}
          <main className={styles.mainContent}>
            {/* --- BREADCRUMBS ADICIONADO AQUI --- */}
            <Breadcrumbs />
            
            {/* Onde as páginas são renderizadas */}
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;