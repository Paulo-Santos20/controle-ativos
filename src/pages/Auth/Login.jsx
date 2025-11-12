import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  signInWithEmailAndPassword, 
  setPersistence,           
  browserLocalPersistence,  
  browserSessionPersistence,
  sendPasswordResetEmail    
} from 'firebase/auth';

// ------------ A CORREÇÃO ESTÁ AQUI ------------
import { auth } from '/src/lib/firebase.js'; // Use o caminho absoluto
// ------------------------------------------

import { toast } from 'sonner';
import { Hospital } from 'lucide-react'; 

import styles from './Login.module.css';

// Schema de validação (sem alterações)
const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

const Login = () => {
  const navigate = useNavigate();
  
  const [rememberMe, setRememberMe] = useState(true);

  const { 
    register, 
    handleSubmit, 
    getValues, 
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    try {
      const persistence = rememberMe 
        ? browserLocalPersistence 
        : browserSessionPersistence;
      
      await setPersistence(auth, persistence);
      
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast.success("Login realizado com sucesso!");
      navigate('/'); 
    } catch (error) {
      console.error("Erro de login:", error.code);
      let errorMessage = "Ocorreu um erro ao tentar fazer login.";
      
      // Ajuste para o erro de API Key (caso ainda ocorra)
      if (error.code === 'auth/invalid-api-key') {
         errorMessage = "Erro de configuração: A chave da API é inválida.";
      }
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "E-mail ou senha incorretos.";
      }
      toast.error(errorMessage);
    }
  };

  const handlePasswordReset = async () => {
    const email = getValues("email");
    if (!email) {
      toast.error("Por favor, digite seu e-mail no campo acima para redefinir a senha.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Link de redefinição de senha enviado para o seu e-mail!");
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      toast.error("Erro ao enviar e-mail. Verifique se o e-mail está correto.");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer}>
        <div className={styles.header}>
          <Hospital size={40} color="var(--color-primary)" />
          <h1 className={styles.title}>ITAM HCP Gestão</h1>
          <p className={styles.subtitle}>Gestão de Ativos de TI</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="tecnico@hcp.com.br"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              {...register("email")}
            />
            {errors.email && <p className={styles.errorMessage}>{errors.email.message}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Senha</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              {...register("password")}
            />
            {errors.password && <p className={styles.errorMessage}>{errors.password.message}</p>}
          </div>

          <div className={styles.formActions}>
            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="rememberMe" className={styles.checkboxLabel}>
                Lembrar de mim
              </label>
            </div>
            
            <button
              type="button" 
              className={styles.forgotPassword}
              onClick={handlePasswordReset}
            >
              Esqueceu a senha?
            </button>
          </div>

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;