import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

import { 
    LayoutDashboard, 
    HardDrive, 
    PieChart, 
    Users, 
    LogOut,
    Hospital,
    Database, // Ícone para "Cadastros"
    Building, // Ícone para "Unidades"
    ChevronDown,
    Laptop,   // <-- NOVO Ícone
    Printer   // <-- NOVO Ícone
} from 'lucide-react'; 

import { auth } from '/src/lib/firebase.js';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

const Sidebar = () => {
    const [isCadastrosOpen, setIsCadastrosOpen] = useState(false);

    const handleLogout = () => {
        signOut(auth).then(() => {
            toast.success("Você saiu com segurança.");
        }).catch((error) => {
            toast.error("Erro ao sair: " + error.message);
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
                    {/* Links Normais... */}
                    <li>
                        <NavLink to="/" className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }>
                            <LayoutDashboard size={20} />
                            <span>Dashboard</span>
                        </NavLink>
                    </li>
                     {/* Menu "Cadastros" Colapsível ATUALIZADO */}
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
                                {/* Link de Unidades (sem mudança) */}
                                <li>
                                    <NavLink to="/cadastros/unidades" className={({ isActive }) =>
                                        isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                    }>
                                        <Building size={18} />
                                        <span>Unidades</span>
                                    </NavLink>
                                </li>

                                {/* NOVO: Link de Computadores */}
                                <li>
                                    <NavLink to="/cadastros/computadores" className={({ isActive }) =>
                                        isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                    }>
                                        <Laptop size={18} />
                                        <span>Computadores</span>
                                    </NavLink>
                                </li>
                                
                                {/* NOVO: Link de Impressoras */}
                                <li>
                                    <NavLink to="/cadastros/impressoras" className={({ isActive }) =>
                                        isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                    }>
                                        <Printer size={18} />
                                        <span>Impressoras</span>
                                    </NavLink>
                                </li>
                            </ul>
                        )}
                    </li>
                    <li>
                        <NavLink to="/inventory" className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }>
                            <HardDrive size={20} />
                            <span>Inventário</span>
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/reports" className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }>
                            <PieChart size={20} />
                            <span>Relatórios</span>
                        </NavLink>
                    </li>

                   

                    {/* Link de Usuários */}
                    <li>
                        <NavLink to="/users" className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }>
                            <Users size={20} />
                            <span>Usuários</span>
                        </NavLink>
                    </li>
                </ul>
            </nav>

            {/* Seção do Usuário */}
            <div className={styles.userSection}>
                <NavLink to="/profile" className={styles.userProfileLink}>
                    <span className={styles.userName}>{user?.displayName || 'Técnico'}</span>
                </NavLink>
                <button onClick={handleLogout} className={styles.logoutButton} title="Sair">
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;