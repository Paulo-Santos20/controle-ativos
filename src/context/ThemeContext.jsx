import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  
  // --- LÓGICA DE INICIALIZAÇÃO ---
  const getInitialTheme = () => {
    // 1. Verifica se o usuário já clicou no botão antes
    const savedTheme = localStorage.getItem('app_theme');
    
    if (savedTheme) {
      return savedTheme; // Respeita a escolha anterior (mesmo que seja dark)
    }
    
    // 2. Se não tiver nada salvo, o PADRÃO é CLARO (Light)
    // Removemos a verificação do sistema operacional (window.matchMedia)
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // Aplica a classe ao HTML sempre que o tema mudar
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

// Hook para usar o tema em qualquer lugar
export const useTheme = () => useContext(ThemeContext);