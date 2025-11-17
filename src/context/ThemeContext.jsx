import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // 1. Verifica preferência salva ou do sistema
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) return savedTheme;
    
    // Se não tiver salvo, usa a preferência do sistema operacional
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // 2. Aplica o tema ao HTML sempre que mudar
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook customizado para facilitar o uso
export const useTheme = () => useContext(ThemeContext);