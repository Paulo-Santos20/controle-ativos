import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateProfile, signOut } from 'firebase/auth'; // Importei signOut
import { 
  doc, 
  updateDoc, 
  collection, 
  setDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot,
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { UAParser } from 'ua-parser-js'; 
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  User, 
  Mail, 
  Save, 
  Loader2, 
  Monitor, 
  Smartphone, 
  ShieldAlert,
  LogOut // Ícone novo
} from 'lucide-react';

import styles from './UserProfile.module.css'; 

const profileSchema = z.object({
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

const UserProfile = () => {
  const user = auth.currentUser;
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
    }
  });

  // --- 1. RASTREAMENTO DE SESSÃO ---
  useEffect(() => {
    if (!user) return;

    const trackSession = async () => {
      let sessionId = localStorage.getItem('device_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('device_session_id', sessionId);
      }
      setCurrentSessionId(sessionId);

      const parser = new UAParser();
      const result = parser.getResult();
      
      // Tratamento seguro para valores nulos
      const osName = result.os.name || 'OS Desconhecido';
      const osVersion = result.os.version || '';
      const browserName = result.browser.name || 'Navegador';
      
      const os = `${osName} ${osVersion}`.trim();
      const browser = `${browserName}`.trim(); // Simplificado
      const deviceType = result.device.type || 'desktop';

      let ip = 'Oculto pelo Navegador';
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ip = data.ip; 
      } catch (err) {
        console.error("Erro IP", err);
      }

      const sessionRef = doc(db, 'users', user.uid, 'sessions', sessionId);
      await setDoc(sessionRef, {
        os,
        browser,
        deviceType,
        ip,
        lastActive: serverTimestamp(),
        isCurrent: true 
      }, { merge: true });
    };

    trackSession();
  }, [user]);

  // --- 2. BUSCAR LISTA ---
  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'users', user.uid, 'sessions'), orderBy('lastActive', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ref: doc.ref, 
        ...doc.data()
      }));
      setSessions(sessionsData);
      setLoadingSessions(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- 3. ATUALIZAR PERFIL ---
  const onSubmit = async (data) => {
    try {
      await updateProfile(user, { displayName: data.displayName });
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { displayName: data.displayName });
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar perfil: " + error.message);
    }
  };

  // --- 4. AÇÃO: SAIR DE TODOS ---
  const handleSignOutAll = async () => {
    if (!window.confirm("Isso irá desconectar você e limpar o histórico de todos os dispositivos. Continuar?")) {
      return;
    }

    const toastId = toast.loading("Encerrando sessões...");

    try {
      const batch = writeBatch(db);
      
      // Deleta TODAS as sessões do banco
      sessions.forEach((session) => {
        batch.delete(session.ref);
      });

      await batch.commit();
      
      // Desloga o usuário atual
      await signOut(auth);
      
      toast.success("Desconectado com segurança.", { id: toastId });
      // O ProtectedRoute irá redirecionar para o login automaticamente
    } catch (error) {
      toast.error("Erro ao limpar sessões: " + error.message, { id: toastId });
    }
  };

  const getDeviceIcon = (type) => {
    if (type === 'mobile' || type === 'tablet') return <Smartphone size={24} />;
    return <Monitor size={24} />;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Meu Perfil</h1>
      </header>

      <div className={styles.grid}>
        
        {/* COLUNA ESQUERDA */}
        <div className={styles.column}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Informações Pessoais</h2>
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="displayName">Nome de Exibição</label>
                <div className={styles.inputWrapper}>
                  <User size={18} className={styles.inputIcon} />
                  <input id="displayName" {...register("displayName")} className={errors.displayName ? styles.inputError : ''} />
                </div>
                {errors.displayName && <p className={styles.errorMessage}>{errors.displayName.message}</p>}
              </div>

              <div className={styles.formGroup}>
                <label>E-mail (Não editável)</label>
                <div className={`${styles.inputWrapper} ${styles.disabled}`}>
                  <Mail size={18} className={styles.inputIcon} />
                  <input value={user?.email || ''} disabled />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className={styles.spinner} /> : <Save size={18} />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: SESSÕES */}
        <div className={styles.column}>
          <div className={styles.card}>
            
            {/* Cabeçalho do Card com Botão SEMPRE VISÍVEL se houver sessões */}
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>Sessões Ativas</h2>
              
              {sessions.length > 0 && (
                <button 
                  onClick={handleSignOutAll} 
                  className={styles.dangerButton}
                  title="Limpar histórico e sair"
                >
                  <ShieldAlert size={14} />
                  Sair de Todos
                </button>
              )}
            </div>

            <p className={styles.cardDescription}>
              Dispositivos que acessaram sua conta recentemente.
            </p>

            <div className={styles.sessionList}>
              {loadingSessions && <p>Carregando sessões...</p>}
              
              {sessions.map((session) => {
                const isThisDevice = session.id === currentSessionId;
                const lastActive = session.lastActive?.toDate();

                return (
                  <div key={session.id} className={`${styles.sessionItem} ${isThisDevice ? styles.activeItem : ''}`}>
                    <div className={styles.deviceIcon}>
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    
                    <div className={styles.sessionInfo}>
                      <div className={styles.sessionHeader}>
                        <strong>{session.os} - {session.browser}</strong>
                        {isThisDevice && <span className={styles.badge}>Este dispositivo</span>}
                      </div>
                      
                      <div className={styles.sessionDetails}>
                        <span>IP: {session.ip}</span>
                        <span className={styles.dot}>•</span>
                        <span>
                          {isThisDevice 
                            ? "Ativo agora" 
                            : lastActive 
                              ? `Visto há ${formatDistanceToNow(lastActive, { locale: ptBR })}` 
                              : "Desconhecido"
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserProfile;