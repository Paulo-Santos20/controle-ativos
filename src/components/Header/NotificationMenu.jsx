import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Bell, Check, AlertTriangle, Users, Clock, Loader2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import styles from './NotificationMenu.module.css';

// --- 1. IMPORTA O HOOK DE SEGURANÇA ---
import { useAuth } from '/src/hooks/useAuth.js';

const NotificationMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastReadTime, setLastReadTime] = useState(
    localStorage.getItem('notifications_last_read') || 0
  );
  const menuRef = useRef(null);

  // --- 2. PEGA DADOS DO USUÁRIO ---
  const { isAdmin, allowedUnits, loading: authLoading } = useAuth();

  // --- 3. LÓGICA DE GERAÇÃO DE NOTIFICAÇÕES (FILTRADA) ---
  useEffect(() => {
    if (authLoading) return;

    const generateNotifications = async () => {
      setLoading(true);
      const alerts = [];
      const now = new Date();

      try {
        let q;
        const assetsRef = collection(db, 'assets');

        // --- FILTRO DE SEGURANÇA ---
        if (isAdmin) {
          // Admin vê tudo
          q = query(assetsRef);
        } else if (allowedUnits.length > 0) {
          // Usuário vê apenas suas unidades
          // (Nota: 'in' suporta max 10 unidades. Para mais, precisaria de lógica extra)
          q = query(assetsRef, where('unitId', 'in', allowedUnits));
        } else {
          // Sem permissão, sem notificações
          setNotifications([]);
          setLoading(false);
          return;
        }

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
          
          // ANÁLISE EXTRA: Computador com defeito há muito tempo (Status 'Inativo' ou similar)
          if (asset.status === 'Inativo' && asset.lastSeen) {
             const daysInactive = differenceInDays(now, asset.lastSeen.toDate());
             if (daysInactive > 30) {
                alerts.push({
                  id: `inactive_${asset.id}`,
                  type: 'alert',
                  title: 'Ativo Parado',
                  message: `O ativo ${asset.id} está inativo há mais de 30 dias.`,
                  time: asset.lastSeen.toDate().getTime()
                });
             }
          }
        });

        // ANÁLISE 2: Usuário com Múltiplos Computadores
        const userAssets = {};
        assets.forEach(asset => {
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
              time: now.getTime()
            });
          }
        });

        // Ordena por mais recente
        alerts.sort((a, b) => b.time - a.time);
        setNotifications(alerts);

      } catch (error) {
        console.error("Erro ao gerar notificações:", error);
      } finally {
        setLoading(false);
      }
    };

    generateNotifications();
  }, [isAdmin, allowedUnits, authLoading]);

  // --- RESTO DO CÓDIGO (Sem alterações de lógica) ---
  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.time > lastReadTime).length;
  }, [notifications, lastReadTime]);

  const handleMarkAllAsRead = () => {
    const now = Date.now();
    setLastReadTime(now);
    localStorage.setItem('notifications_last_read', now);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type) => {
    if (type === 'delay') return <Clock size={18} className={styles.iconDelay} />;
    if (type === 'duplicate') return <Users size={18} className={styles.iconUser} />;
    return <AlertTriangle size={18} className={styles.iconAlert} />;
  };

  if (authLoading) return null; // Não mostra nada enquanto carrega auth

  return (
    <div className={styles.container} ref={menuRef}>
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
            {loading ? (
               <div className={styles.emptyState}><Loader2 className={styles.spinner} /></div>
            ) : notifications.length === 0 ? (
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