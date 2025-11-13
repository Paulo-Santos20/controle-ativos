import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Bell, Check, AlertTriangle, Users, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import styles from './NotificationMenu.module.css';

const NotificationMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastReadTime, setLastReadTime] = useState(
    localStorage.getItem('notifications_last_read') || 0
  );
  const menuRef = useRef(null);

  // --- 1. LÓGICA DE GERAÇÃO DE NOTIFICAÇÕES ---
  useEffect(() => {
    const generateNotifications = async () => {
      const alerts = [];
      const now = new Date();

      try {
        // Busca todos os ativos (para análise)
        // Nota: Em produção com milhares de itens, isso deveria ser paginado ou feito no backend.
        const q = query(collection(db, 'assets'));
        const snapshot = await getDocs(q);
        const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // ANÁLISE 1: Manutenção Atrasada (> 5 dias)
        assets.forEach(asset => {
          if (asset.status === 'Em manutenção' && asset.lastSeen) {
            const daysInMaintenance = differenceInDays(now, asset.lastSeen.toDate());
            
            if (daysInMaintenance > 5) {
              alerts.push({
                id: `maint_${asset.id}`,
                type: 'delay',
                title: 'Manutenção Atrasada',
                message: `O ativo ${asset.tombamento || asset.id} está em manutenção há ${daysInMaintenance} dias.`,
                time: asset.lastSeen.toDate().getTime()
              });
            }
          }
        });

        // ANÁLISE 2: Usuário com Múltiplos Computadores
        const userAssets = {};
        assets.forEach(asset => {
          // Filtra apenas computadores e ignora ativos sem funcionário
          if (asset.type === 'computador' && asset.funcionario && asset.status === 'Em uso') {
            const funcLower = asset.funcionario.toLowerCase();
            if (!userAssets[funcLower]) userAssets[funcLower] = [];
            userAssets[funcLower].push(asset.tombamento || asset.id);
          }
        });

        Object.entries(userAssets).forEach(([user, assetIds]) => {
          if (assetIds.length > 1) {
            alerts.push({
              id: `user_${user}`,
              type: 'duplicate',
              title: 'Usuário com Múltiplos Ativos',
              message: `O funcionário "${user}" possui ${assetIds.length} computadores: ${assetIds.join(', ')}.`,
              time: now.getTime() // Alerta atual
            });
          }
        });

        // Ordena por mais recente (simulado)
        setNotifications(alerts);

      } catch (error) {
        console.error("Erro ao gerar notificações:", error);
      }
    };

    generateNotifications();
  }, []);

  // --- 2. CONTROLE DE "NÃO LIDOS" ---
  // Conta quantas notificações têm timestamp maior que a última leitura
  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.time > lastReadTime).length;
  }, [notifications, lastReadTime]);

  const handleMarkAllAsRead = () => {
    const now = Date.now();
    setLastReadTime(now);
    localStorage.setItem('notifications_last_read', now);
    setIsOpen(false); // Opcional: fechar ao marcar como lido
  };

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper de Ícone
  const getIcon = (type) => {
    if (type === 'delay') return <Clock size={18} className={styles.iconDelay} />;
    if (type === 'duplicate') return <Users size={18} className={styles.iconUser} />;
    return <AlertTriangle size={18} />;
  };

  return (
    <div className={styles.container} ref={menuRef}>
      {/* Botão do Sino */}
      <button 
        className={`${styles.trigger} ${isOpen ? styles.active : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notificações</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className={styles.markReadButton}>
                <Check size={14} /> Marcar lidas
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>Nenhuma notificação pendente.</div>
            ) : (
              notifications.map((notif) => {
                const isUnread = notif.time > lastReadTime;
                return (
                  <div key={notif.id} className={`${styles.item} ${isUnread ? styles.unread : ''}`}>
                    <div className={styles.itemIcon}>{getIcon(notif.type)}</div>
                    <div className={styles.itemContent}>
                      <strong>{notif.title}</strong>
                      <p>{notif.message}</p>
                    </div>
                    {isUnread && <div className={styles.unreadDot} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;