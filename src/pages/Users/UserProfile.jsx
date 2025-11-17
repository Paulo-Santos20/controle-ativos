import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateProfile, signOut } from 'firebase/auth';
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
import { db, auth } from '../../lib/firebase'; 
import { toast } from 'sonner';
import { UAParser } from 'ua-parser-js'; 
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  User, Mail, Save, Loader2, Monitor, Smartphone, ShieldAlert, Globe, LockKeyhole 
} from 'lucide-react';

// Importa os utilitários e componentes
import { getLocalIP } from '../../utils/getInternalIp';
import Modal from '../../components/Modal/Modal';
import ChangePasswordModal from '../../components/Users/ChangePasswordModal';

import styles from './UserProfile.module.css'; 

// Schema de validação do perfil básico
const profileSchema = z.object({
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

const UserProfile = () => {
  const user = auth.currentUser;
  
  // Estados
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false); // Controle do Modal de Senha

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

  // --- 1. RASTREAMENTO DE SESSÃO (IP Local + Público) ---
  useEffect(() => {
    if (!user) return;

    const trackSession = async () => {
      // Identificador único para este navegador
      let sessionId = localStorage.getItem('device_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('device_session_id', sessionId);
      }
      setCurrentSessionId(sessionId);

      // Coleta dados do User Agent
      const parser = new UAParser();
      const result = parser.getResult();
      
      const os = `${result.os.name || 'OS'} ${result.os.version || ''}`.trim();
      const browser = `${result.browser.name || 'Nav'} ${result.browser.version || ''}`.trim();
      const deviceType = result.device.type || 'desktop';

      // 1. Tenta pegar IP Local (WebRTC)
      let localIp = await getLocalIP();

      // 2. Tenta pegar IP Público (API Externa)
      let publicIp = '';
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        publicIp = data.ip;
      } catch (err) {
        console.error("Erro ao obter IP Público", err);
      }

      // Formata o IP para exibição
      let displayIp = localIp || (publicIp ? `${publicIp} (WAN)` : 'Desconhecido');

      // Salva no Firestore
      const sessionRef = doc(db, 'users', user.uid, 'sessions', sessionId);
      await setDoc(sessionRef, {
        os,
        browser,
        deviceType,
        ip: displayIp,
        localIp: localIp || null,
        publicIp: publicIp || null,
        lastActive: serverTimestamp(),
        isCurrent: true,
        // Recupera nome personalizado do localStorage se existir
        deviceName: localStorage.getItem('device_custom_name') || null 
      }, { merge: true });
    };

    trackSession();
  }, [user]);

  // --- 2. LISTAR SESSÕES EM TEMPO REAL ---
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

  // --- 3. ATUALIZAR PERFIL (Nome) ---
  const onSubmit = async (data) => {
    try {
      // Atualiza no Auth
      await updateProfile(user, { displayName: data.displayName });
      // Sincroniza no Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { displayName: data.displayName });
      
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar perfil: " + error.message);
    }
  };

  // --- 4. AÇÕES DE SESSÃO ---

  const handleSignOutAll = async () => {
    if (!window.confirm("Isso desconectará todos os dispositivos, inclusive este. Continuar?")) return;
    const toastId = toast.loading("Encerrando sessões...");
    try {
      const batch = writeBatch(db);
      sessions.forEach((session) => batch.delete(session.ref));
      await batch.commit();
      await signOut(auth);
      toast.success("Desconectado com segurança.", { id: toastId });
    } catch (error) {
      toast.error("Erro: " + error.message, { id: toastId });
    }
  };

  const handleRenameDevice = async () => {
    const name = prompt("Dê um nome para este computador (ex: PC Recepção):");
    if (name) {
      localStorage.setItem('device_custom_name', name);
      const sessionRef = doc(db, 'users', user.uid, 'sessions', currentSessionId);
      await updateDoc(sessionRef, { deviceName: name });
      toast.success("Dispositivo renomeado!");
    }
  };

  const getDeviceIcon = (type) => {
    if (type === 'mobile' || type === 'tablet') return <Smartphone size={24} />;
    return <Monitor size={24} />;
  };

  return (
    <div className={styles.page}>
      {/* --- MODAL DE TROCA DE SENHA --- */}
      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        title="Redefinir Senha"
      >
        <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
      </Modal>

      <header className={styles.header}>
        <h1 className={styles.title}>Meu Perfil</h1>
      </header>

      <div className={styles.grid}>
        
        {/* COLUNA ESQUERDA (Formulário) */}
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
                <label>E-mail (Login)</label>
                <div className={`${styles.inputWrapper} ${styles.disabled}`}>
                  <Mail size={18} className={styles.inputIcon} />
                  <input value={user?.email || ''} disabled />
                </div>
                <small className={styles.hint}>O e-mail não pode ser alterado aqui.</small>
              </div>

              {/* --- BOTÃO ALTERAR SENHA --- */}
              <div style={{marginTop: '10px', marginBottom: '10px'}}>
                <button 
                  type="button" 
                  className={styles.secondaryButton}
                  onClick={() => setIsPasswordModalOpen(true)}
                  style={{width: '100%', justifyContent: 'center'}}
                >
                  <LockKeyhole size={18} /> 
                  Alterar Senha
                </button>
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

        {/* COLUNA DIREITA (Sessões) */}
        <div className={styles.column}>
          <div className={styles.card}>
            
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>Sessões Ativas ({sessions.length})</h2>
              {sessions.length > 0 && (
                <button onClick={handleSignOutAll} className={styles.dangerButton}>
                  <ShieldAlert size={14} /> Sair de Todos
                </button>
              )}
            </div>

            <p className={styles.cardDescription}>
              Dispositivos conectados à sua conta.
            </p>

            <div className={styles.sessionList}>
              {loadingSessions && <div style={{textAlign:'center', padding: 20}}><Loader2 className={styles.spinner}/></div>}
              
              {sessions.map((session) => {
                const isThisDevice = session.id === currentSessionId;
                const lastActive = session.lastActive?.toDate();

                return (
                  <div key={session.id} className={`${styles.sessionItem} ${isThisDevice ? styles.activeItem : ''}`}>
                    <div className={styles.deviceIcon}>{getDeviceIcon(session.deviceType)}</div>
                    
                    <div className={styles.sessionInfo}>
                      <div className={styles.sessionHeader}>
                        {/* Mostra Nome Personalizado ou Info do Sistema */}
                        <strong>{session.deviceName || `${session.os} • ${session.browser}`}</strong>
                        {isThisDevice && (
                           <span 
                             className={styles.badge} 
                             onClick={handleRenameDevice} 
                             style={{cursor: 'pointer'}}
                             title="Clique para renomear este dispositivo"
                           >
                             Este dispositivo (Renomear)
                           </span>
                        )}
                      </div>
                      
                      <div className={styles.sessionDetails}>
                        <span style={{display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace'}}>
                           <Globe size={12}/> {session.ip}
                        </span>
                        <span className={styles.dot}>•</span>
                        <span>
                          {isThisDevice 
                            ? <span style={{color: '#10b981', fontWeight: 600}}>Online agora</span> 
                            : lastActive 
                              ? format(lastActive, "dd/MM HH:mm", { locale: ptBR }) 
                              : "..."
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