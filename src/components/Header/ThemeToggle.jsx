import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

// Ele precisa disto para usar a classe 'iconButton':
import styles from './Header.module.css'; 

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme} 
      className={styles.iconButton} // Usa o estilo do Header
      title={`Mudar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
      style={{ color: theme === 'dark' ? '#fbbf24' : 'var(--color-text-secondary)' }}
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};

export default ThemeToggle;