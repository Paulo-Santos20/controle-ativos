import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { Bell, Check, AlertTriangle, ArrowRight, Wrench, RotateCcw, Package, Loader2, Plus, Clock } from 'lucide-react';
import { differenceInDays, differenceInHours, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import styles from './NotificationMenu.module.css';

import { useAuth } from '/src/hooks/useAuth.js';

const BATCH_SIZE = 10; // Processar em lotes para evitar sobrecarga
const MAX_ASSETS = 100; // Limitar número de ativos por consulta
const CACHE_DURATION = 1000 * 60 * 2; // 2 minutos de cache

const NotificationMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastReadTime, setLastReadTime] = useState(() => {
    const saved = localStorage.getItem('notifications_last_read');
    return saved ? parseInt(saved) : Date.now();
  });
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const menuRef = useRef(null);

  const { isAdmin, allowedUnits, loading: authLoading } = useAuth();

  const generateNotifications = useCallback(async () => {
    if (authLoading) return;
    if (lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const alerts = [];
    const now = Date.now();

    try {
      let assetsQuery;
      const assetsRef = collection(db, 'assets');

      if (isAdmin) {
        assetsQuery = query(assetsRef, limit(MAX_ASSETS));
      } else if (allowedUnits && allowedUnits.length > 0) {
        assetsQuery = query(assetsRef, where('unitId', 'in', allowedUnits), limit(MAX_ASSETS));
      } else {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const snapshot = await getDocs(assetsQuery);
      const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Processar em lotes para evitar muitas requisições simultâneas
      for (let i = 0; i < assets.length; i += BATCH_SIZE) {
        const batch = assets.slice(i, i + BATCH_SIZE);
        const batchAlerts = await processBatch(batch, now);
        alerts.push(...batchAlerts);

        // Small delay between batches to avoid Firestore rate limits
        if (i + BATCH_SIZE < assets.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Ativos com manutenção atrasada
      assets.forEach(asset => {
        if (asset.status === 'Em manutenção' && asset.lastSeen) {
          const lastSeenDate = asset.lastSeen instanceof Timestamp
            ? asset.lastSeen.toDate()
            : new Date(asset.lastSeen);
          const daysInMaintenance = differenceInDays(now, lastSeenDate);

          if (daysInMaintenance > 5) {
            alerts.push({
              id: `maint_delay_${asset.id}`,
              type: 'alert',
              title: 'Manutenção Atrasada',
              message: `${asset.tombamento || asset.id} em manutenção há ${daysInMaintenance} dias.`,
              subMessage: 'Verificar necessidade de peças',
              time: lastSeenDate.getTime()
            });
          }
        }
      });

      alerts.sort((a, b) => b.time - a.time);
      setNotifications(alerts.slice(0, 20));
      setLastFetchTime(Date.now());

    } catch (error) {
      console.error('Erro ao gerar notificações:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, allowedUnits, authLoading, lastFetchTime]);

  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  const processBatch = async (assets, now) => {
    const alerts = [];

    // Buscar histórico de todos os ativos do batch em paralelo
    const historyPromises = assets.map(async (asset) => {
      try {
        const historyRef = collection(db, 'assets', asset.id, 'history');
        const historyQuery = query(
          historyRef,
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const historySnap = await getDocs(historyQuery);

        if (historySnap.empty) return [];

        const historyItems = historySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          assetId: asset.id,
          assetName: asset.tombamento || asset.id
        }));

        return historyItems;
      } catch (e) {
        console.warn('Erro ao buscar histórico:', asset.id);
        return [];
      }
    });

    const historyResults = await Promise.all(historyPromises);
    const allHistoryItems = historyResults.flat();

    // Processar itens do histórico
    for (const hist of allHistoryItems) {
      if (!hist.timestamp) continue;

      const histTime = hist.timestamp instanceof Timestamp
        ? hist.timestamp.toDate().getTime()
        : hist.timestamp;

      const hoursAgo = differenceInHours(now, histTime);

      // Só mostra notificações das últimas 48 horas
      if (hoursAgo > 48) continue;

      const type = hist.type || '';
      const assetName = hist.assetName;

      // Novo ativo cadastrado
      if (type === 'Registro' || type.includes('registrado')) {
        alerts.push({
          id: `new_${hist.assetId}_${histTime}`,
          type: 'new',
          title: 'Novo Ativo Cadastrado',
          message: `${assetName} foi adicionado ao sistema.`,
          subMessage: formatDistanceToNow(histTime, { locale: ptBR, addSuffix: true }),
          time: histTime
        });
      }

      // Movimentação/Transferência
      if (type === 'Movimentação' || type.includes('movido') || type.includes('transferência')) {
        alerts.push({
          id: `move_${hist.assetId}_${histTime}`,
          type: 'move',
          title: 'Ativo Movimentado',
          message: `${assetName} foi transferido.`,
          details: hist.details || `De: ${hist.fromSector || '?'} → Para: ${hist.setor || hist.toSector || '?'}`,
          subMessage: formatDistanceToNow(histTime, { locale: ptBR, addSuffix: true }),
          time: histTime
        });
      }

      // Entrada em manutenção
      if (type === 'Manutenção' || type.includes('manutenção') || type === 'Atualização de Status') {
        if (hist.newStatus === 'Em manutenção' || hist.details?.includes('manutenção')) {
          alerts.push({
            id: `maint_${hist.assetId}_${histTime}`,
            type: 'maintenance',
            title: 'Entrada em Manutenção',
            message: `${assetName} entrou em manutenção.`,
            details: hist.details,
            subMessage: formatDistanceToNow(histTime, { locale: ptBR, addSuffix: true }),
            time: histTime
          });
        }
      }

      // Devolução
      if (type === 'Devolução' || type.includes('devolu')) {
        alerts.push({
          id: `return_${hist.assetId}_${histTime}`,
          type: 'return',
          title: 'Ativo Devolvido',
          message: `${assetName} foi devolvido.`,
          details: hist.details,
          subMessage: formatDistanceToNow(histTime, { locale: ptBR, addSuffix: true }),
          time: histTime
        });
      }

      // Alteração de status
      if (type === 'Atualização de Status' || type.includes('status')) {
        alerts.push({
          id: `status_${hist.assetId}_${histTime}`,
          type: 'status',
          title: 'Status Atualizado',
          message: `${assetName}: ${hist.oldStatus || 'Anterior'} → ${hist.newStatus || 'Atual'}`,
          details: hist.details,
          subMessage: formatDistanceToNow(histTime, { locale: ptBR, addSuffix: true }),
          time: histTime
        });
      }
    }

    return alerts;
  };

  const handleMarkAsRead = () => {
    setLastReadTime(Date.now());
    localStorage.setItem('notifications_last_read', Date.now().toString());
  };

  const unreadCount = notifications.filter(n => n.time > lastReadTime).length;

  const getIcon = (type) => {
    switch (type) {
      case 'new': return <Plus size={16} />;
      case 'move': return <ArrowRight size={16} />;
      case 'maintenance': return <Wrench size={16} />;
      case 'return': return <RotateCcw size={16} />;
      case 'status': return <Clock size={16} />;
      case 'alert': return <AlertTriangle size={16} />;
      default: return <Package size={16} />;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      new: 'var(--color-success)',
      move: 'var(--color-primary)',
      maintenance: 'var(--color-warning)',
      return: 'var(--color-secondary)',
      status: 'var(--color-text-secondary)',
      alert: 'var(--color-danger)'
    };
    return colors[type] || 'var(--color-text-secondary)';
  };

  if (authLoading) return null;

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={`${styles.trigger} ${unreadCount > 0 ? styles.hasUnread : ''}`}
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) handleMarkAsRead(); }}
        aria-label={`Notificações ${unreadCount > 0 ? `(${unreadCount} não lidas)` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.menu} role="menu">
          <div className={styles.header}>
            <h3>Notificações</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAsRead} className={styles.markReadBtn}>
                <Check size={14} /> Marcar tudo como lido
              </button>
            )}
          </div>

          <div className={styles.content}>
            {loading ? (
              <div className={styles.loading}>
                <Loader2 className={styles.spinner} />
                <span>Carregando...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>
                <Bell size={24} />
                <span>Nenhuma notificação recente</span>
              </div>
            ) : (
              <ul className={styles.list}>
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`${styles.item} ${notif.time > lastReadTime ? styles.unread : ''}`}
                    style={{ borderLeftColor: getTypeColor(notif.type) }}
                  >
                    <div className={styles.itemIcon} style={{ color: getTypeColor(notif.type) }}>
                      {getIcon(notif.type)}
                    </div>
                    <div className={styles.itemContent}>
                      <strong>{notif.title}</strong>
                      <p>{notif.message}</p>
                      {notif.details && <small>{notif.details}</small>}
                      <span className={styles.time}>{notif.subMessage || formatDistanceToNow(notif.time, { locale: ptBR, addSuffix: true })}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;