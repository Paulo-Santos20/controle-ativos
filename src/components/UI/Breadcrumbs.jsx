import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import styles from './Breadcrumbs.module.css';

// Mapa de Tradução de Rotas (URL -> Nome Legível)
const routeNameMap = {
  'inventory': 'Inventário',
  'atividades': 'Log de Atividades',
  'reports': 'Relatórios',
  'profile': 'Meu Perfil',
  'cadastros': 'Cadastros',
  'unidades': 'Unidades',
  'computadores': 'Computadores',
  'impressoras': 'Impressoras',
  'empresas': 'Empresas',
  'opcoes': 'Opções do Sistema',
  'usuarios': 'Usuários',
  'lista': 'Lista Geral',
  'perfis': 'Gerenciar Perfis',
};

const Breadcrumbs = () => {
  const location = useLocation();
  
  // Divide a URL em partes (ex: /cadastros/computadores -> ['', 'cadastros', 'computadores'])
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Não mostrar breadcrumbs no Dashboard (Home)
  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav aria-label="breadcrumb" className={styles.breadcrumbs}>
      <ul className={styles.list}>
        
        {/* Link para Home */}
        <li className={styles.item}>
          <Link to="/" className={styles.link}>
            <Home size={16} />
          </Link>
        </li>

        {pathnames.map((value, index) => {
          const isLast = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          
          // Traduz o nome ou usa o próprio valor (para IDs como 'PAT-123')
          // Se for um ID longo (provavelmente Firebase ID), encurta ou mostra "Detalhes"
          let displayName = routeNameMap[value];
          
          if (!displayName) {
            // Lógica simples para detectar se é um ID (se não estiver no mapa)
            displayName = value.length > 20 ? 'Detalhes' : value; 
            // Ou mostre o valor real: displayName = value;
          }

          return (
            <li key={to} className={styles.item}>
              <ChevronRight size={14} className={styles.separator} />
              
              {isLast ? (
                <span className={styles.current} aria-current="page">
                  {displayName}
                </span>
              ) : (
                <Link to={to} className={styles.link}>
                  {displayName}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Breadcrumbs;