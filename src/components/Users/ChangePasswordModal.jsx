import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

// Reutilizamos o CSS do formulário de ativos para consistência
import styles from '../Settings/AddUnitForm.module.css'; 

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme a nova senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

const ChangePasswordModal = ({ onClose }) => {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(passwordSchema)
  });

  const onSubmit = async (data) => {
    const user = auth.currentUser;
    const toastId = toast.loading("Atualizando senha...");

    try {
      // 1. Reautenticar o usuário (Segurança do Firebase)
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Atualizar a senha
      await updatePassword(user, data.newPassword);

      toast.success("Senha alterada com sucesso!", { id: toastId });
      onClose();
    } catch (error) {
      console.error(error);
      let msg = "Erro ao alterar senha.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        msg = "A senha atual está incorreta.";
      } else if (error.code === 'auth/weak-password') {
        msg = "A nova senha é muito fraca.";
      }
      toast.error(msg, { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Segurança</legend>
        
        <div className={styles.formGroup}>
          <label htmlFor="currentPassword">Senha Atual</label>
          <input 
            id="currentPassword" 
            type="password" 
            {...register("currentPassword")} 
            className={errors.currentPassword ? styles.inputError : ''}
            placeholder="Digite sua senha atual"
          />
          {errors.currentPassword && <p className={styles.errorMessage}>{errors.currentPassword.message}</p>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="newPassword">Nova Senha</label>
          <input 
            id="newPassword" 
            type="password" 
            {...register("newPassword")} 
            className={errors.newPassword ? styles.inputError : ''}
            placeholder="Mínimo 6 caracteres"
          />
          {errors.newPassword && <p className={styles.errorMessage}>{errors.newPassword.message}</p>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
          <input 
            id="confirmPassword" 
            type="password" 
            {...register("confirmPassword")} 
            className={errors.confirmPassword ? styles.inputError : ''}
            placeholder="Repita a nova senha"
          />
          {errors.confirmPassword && <p className={styles.errorMessage}>{errors.confirmPassword.message}</p>}
        </div>
      </fieldset>

      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>
          Cancelar
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className={styles.spinner} /> : "Confirmar Alteração"}
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordModal;