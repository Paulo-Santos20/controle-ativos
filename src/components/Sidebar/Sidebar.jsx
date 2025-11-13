import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

// --- A CORREÇÃO ESTÁ AQUI ---
// 'Pencil' foi adicionado à lista de importação.
import { 
    LayoutDashboard, 
    HardDrive, 
    PieChart, 
    Users, 
    LogOut,
    Hospital,
    Database, 
    Building, 
    ChevronDown,
    Laptop,   
    Printer,
    History,
    UserCog,
    Pencil,
    Briefcase
} from 'lucide-react'; 

import { auth } from '/src/lib/firebase.js'; // Caminho absoluto
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

/**
 * Componente da barra lateral de navegação principal.
 * (Princípios: UI/UX de Excelência, Design Responsivo)
 */
const Sidebar = () => {
    // Estado para os submenus colapsíveis
    const [isCadastrosOpen, setIsCadastrosOpen] = useState(false);
    const [isUsuariosOpen, setIsUsuariosOpen] = useState(false);

    /**
     * Lida com o logout do usuário.
     */
    const handleLogout = () => {
        signOut(auth).then(() => {
            toast.success("Você saiu com segurança.");
        }).catch((error) => {
            toast.error("Erro ao sair: ".concat(error.message));
        });
    };

    const user = auth.currentUser;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <Hospital size={30} /> 
                <h1>ITAM Hospitalar</h1>
            </div>

            <nav className={styles.nav}>
                <ul className={styles.navList}>
                    {/* Link do Dashboard */}
                    <li>
                        <NavLink to="/" className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }>
                            <LayoutDashboard size={20} />
                            <span>Dashboard</span>
                        </NavLink>
                    </li>
                    
                    {/* Link do Inventário */}
                    <li>
                        <NavLink to="/inventory" className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }>
                            <HardDrive size={20} />
                            <span>Inventário</span>
                        </NavLink>
                    </li>
                    
                    {/* Link de Atividades */}
                    <li>
                        <NavLink to="/atividades" className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }>
                            <History size={20} />
                            <span>Atividades</span>
                        </NavLink>
                    </li>
                    
                    {/* Link de Relatórios */}
                    <li>
                        <NavLink to="/reports" className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }>
                            <PieChart size={20} />
                            <span>Relatórios</span>
                        </NavLink>
                    </li>

                    {/* Menu "Cadastros" Colapsível */}
                    <li className={styles.submenuItem}>
                        <button 
                            type="button" 
                            className={`${styles.navLink} ${styles.submenuToggle}`} 
                            onClick={() => setIsCadastrosOpen(!isCadastrosOpen)}
                        >
                            <Database size={20} />
                            <span>Cadastros</span>
                            <ChevronDown 
                                size={16} 
                                className={`${styles.submenuIcon} ${isCadastrosOpen ? styles.open : ''}`} 
                            />
                        </button>
                        
                        {isCadastrosOpen && (
                            <ul className={styles.submenu}>
                                <li>
                                    <NavLink to="/cadastros/unidades" className={({ isActive }) =>
                                        isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                    }>
                                        <Building size={18} />
                                        <span>Unidades</span>
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/cadastros/computadores" className={({ isActive }) =>
                                        isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                    }>
                                        <Laptop size={18} />
                                        <span>Computadores</span>
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/cadastros/impressoras" className={({ isActive }) =>
                                        isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                    }>
                                        <Printer size={18} />
                                        <span>Impressoras</span>
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/cadastros/empresas" className={({ isActive }) =>
                                        isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                    }>
                                        <Briefcase size={18} />
                                        <span>Empresas</span>
                                    </NavLink>
                                </li>
                            </ul>
                        )}
                    </li>

                    {/* Menu "Usuários" Colapsível */}
                    <li className={styles.submenuItem}>
                        <button 
                            type="button" 
                            className={`${styles.navLink} ${styles.submenuToggle}`} 
                            onClick={() => setIsUsuariosOpen(!isUsuariosOpen)}
                        >
                            <UserCog size={20} />
                            <span>Usuários</span>
                            <ChevronDown 
                                size={16} 
                                className={`${styles.submenuIcon} ${isUsuariosOpen ? styles.open : ''}`} 
                            />
                        </button>
                        
                        {isUsuariosOpen && (
                            <ul className={styles.submenu}>
                                <li>
                                    <NavLink to="/usuarios/lista" className={({ isActive }) =>
                                        isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                    }>
                                        <Users size={18} />
                                        <span>Lista de Usuários</span>
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/usuarios/perfis" className={({ isActive }) =>
                                        isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                    }>
                                        <Pencil size={18} />
                                        <span>Gerenciar Perfis</span>
                                    </NavLink>
                                </li>
                            </ul>
                        )}
                    </li>
                </ul>
            </nav>

          
        </aside>
    );
};

export default Sidebar;