import React from 'react'
import styles from './Layout.module.css'
// Você vai criar e importar seus componentes Sidebar e Header
// import Sidebar from '../Sidebar/Sidebar'
// import Header from '../Header/Header'

const Layout = ({ children }) => {
  return (
    <div className={styles.layoutContainer}>
      {/* <Sidebar /> */}
      
      {/* Marcador temporário para a Sidebar */}
      <aside className={styles.sidebar}>
        Sidebar Aqui
      </aside>

      <div className={styles.contentWrapper}>
        {/* <Header /> */}
        
        {/* Marcador temporário para o Header */}
        <header className={styles.header}>
          Header Aqui
        </header>

        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout;