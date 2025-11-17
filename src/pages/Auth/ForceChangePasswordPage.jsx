import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updatePassword, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '/src/lib/firebase.js';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LockKeyhole, LogOut, Loader2, ShieldAlert } from 'lucide-react';

// Reutiliza o CSS do Login para manter a identidade visual
import styles from './Login.module.css'; 

const schema = z.object({
  newPassword: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme a senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

const ForceChangePasswordPage = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  });

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const onSubmit = async (data) => {
    if (!user) return;
    const toastId = toast.loading("Atualizando senha e liberando acesso...");

    try {
      // 1. Atualiza a senha no Authentication
      await updatePassword(user, data.newPassword);

      // 2. Remove a flag de bloqueio no Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        mustChangePassword: false
      });

      toast.success("Senha atualizada com sucesso!", { id: toastId });
      navigate('/'); // Redireciona para o Dashboard
      
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar: " + error.message, { id: toastId });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer} style={{maxWidth: 450}}>
        <div className={styles.header}>
          <div className={styles.logoCircle} style={{backgroundColor: '#fff7ed'}}>
             <ShieldAlert size={40} color="#ea580c" />
          </div>
          <h1 className={styles.title}>Redefinição Obrigatória</h1>
          <p className={styles.subtitle}>
            Por segurança, você precisa definir uma nova senha pessoal antes de acessar o sistema.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          
          <div className={styles.formGroup}>
            <label htmlFor="newPassword">Nova Senha</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Mínimo 6 caracteres"
              className={`${styles.input} ${errors.newPassword ? styles.inputError : ''}`}
              {...register("newPassword")}
            />
            {errors.newPassword && <p className={styles.errorMessage}>{errors.newPassword.message}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && <p className={styles.errorMessage}>{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="spinner" /> : <><LockKeyhole size={18} /> Definir Senha e Entrar</>}
          </button>
        </form>

        <div style={{marginTop: 20, textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 20}}>
          <button 
            onClick={handleLogout}
            style={{background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto', fontSize: '0.9rem'}}
          >
            <LogOut size={16} /> Cancelar e Sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForceChangePasswordPage;