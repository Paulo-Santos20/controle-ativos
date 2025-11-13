import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { UserCircle, LogOut, ChevronDown, User, Loader2 } from 'lucide-react';
import styles from './UserMenu.module.css';
// --- 1. IMPORTA O HOOK DE AUTENTICAÇÃO ---
import { useAuth } from '/src/hooks/useAuth.js'; 

/**
 * Componente do menu de usuário no Header.
 * Mostra o nome do usuário logado e as opções de Perfil/Sair.
 */
const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  
  // --- 2. USA O HOOK REATIVO ---
  // Substitui o 'auth.currentUser' estático
  const { user, loading } = useAuth();

  /**
   * Lida com o logout do usuário.
   */
  const handleLogout = () => {
    signOut(auth)
      .then(() => toast.success("Você saiu com segurança."))
      .catch((error) => toast.error("Erro ao sair: " + error.message));
  };

  // Fecha o menu se clicar fora dele (UI/UX)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 3. LÓGICA DE EXIBIÇÃO ---
  // Define o que será exibido, com fallbacks
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
  const email = user?.email || '...';

  return (
    <div className={styles.container} ref={menuRef}>
      {/* Botão Gatilho (Foto + Nome + Seta) */}
      <button 
        className={`${styles.trigger} ${isOpen ? styles.active : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.avatar}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="User" />
          ) : (
            <UserCircle size={24} />
          )}
        </div>
        
        {/* Mostra "..." se estiver carregando, ou o nome real */}
        <span className={styles.userName}>
          {loading ? '...' : displayName}
        </span>

        <ChevronDown size={16} className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={styles.dropdown}>
          {/* Mostra nome e e-mail no mobile */}
          <div className={styles.userInfoMobile}>
            <strong>{loading ? '...' : displayName}</strong>
            <small>{loading ? '...' : email}</small>
          </div>
          
          <Link 
            to="/profile" 
            className={styles.menuItem} 
            onClick={() => setIsOpen(false)}
          >
            <User size={18} />
            Meu Perfil
          </Link>
          
          <button onClick={handleLogout} className={`${styles.menuItem} ${styles.logout}`}>
            <LogOut size={18} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;