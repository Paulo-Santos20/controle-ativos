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
import { auth } from '/src/lib/firebase.js'; // Caminho absoluto
import { toast } from 'sonner';
import { Hospital, Eye, EyeOff, AlertCircle } from 'lucide-react'; // Novos ícones

import styles from './Login.module.css';

// Schema de validação (Segurança: Input Sanitization)
const loginSchema = z.object({
  email: z.string()
    .min(1, "O e-mail é obrigatório")
    .email("Formato de e-mail inválido")
    .trim() // Remove espaços acidentais
    .toLowerCase(),
  password: z.string()
    .min(1, "A senha é obrigatória"), 
});

const Login = () => {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false); // Estado para mostrar senha
  const [loginError, setLoginError] = useState(""); // Estado para erro geral

  const { 
    register, 
    handleSubmit, 
    getValues,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(loginSchema)
  });

  // Helper para traduzir erros do Firebase
  const getFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        // Segurança: Não revelar qual dos dois está errado
        return "E-mail ou senha incorretos.";
      case 'auth/too-many-requests':
        // Segurança: Proteção contra força bruta
        return "Muitas tentativas falhas. O acesso foi bloqueado temporariamente. Tente novamente mais tarde.";
      case 'auth/user-disabled':
        return "Esta conta foi desativada pelo administrador.";
      case 'auth/network-request-failed':
        return "Erro de conexão. Verifique sua internet.";
      default:
        return "Ocorreu um erro inesperado. Tente novamente.";
    }
  };

  const onSubmit = async (data) => {
    setLoginError(""); // Limpa erros anteriores
    try {
      // Define persistência
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      
      // Tenta logar
      await signInWithEmailAndPassword(auth, data.email, data.password);
      
      toast.success("Bem-vindo ao sistema!");
      navigate('/'); 
    } catch (error) {
      console.error("Login Error:", error.code);
      const msg = getFriendlyErrorMessage(error.code);
      setLoginError(msg); // Mostra o erro no formulário
      toast.error(msg); // Mostra o toast também
    }
  };

  const handlePasswordReset = async () => {
    const email = getValues("email");
    // Validação rápida de e-mail antes de enviar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
      toast.error("Por favor, digite um e-mail válido no campo acima para redefinir.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("E-mail de redefinição enviado! Verifique sua caixa de entrada.");
    } catch (error) {
      const msg = getFriendlyErrorMessage(error.code);
      toast.error(msg);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer}>
        <div className={styles.header}>
          <div className={styles.logoCircle}>
            <Hospital size={40} color="var(--color-primary)" />
          </div>
          <h1 className={styles.title}>ITAM HCP Gestão</h1>
          <p className={styles.subtitle}>Acesso ao Sistema de Ativos</p>
        </div>

        {/* Exibe erro de login global se houver */}
        {loginError && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          
          <div className={styles.formGroup}>
            <label htmlFor="email">E-mail Corporativo</label>
            <input
              id="email"
              type="email"
              placeholder="seu.nome@hcp.com.br"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              {...register("email")}
              autoComplete="email"
            />
            {errors.email && <p className={styles.errorMessage}>{errors.email.message}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Senha</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                {...register("password")}
                autoComplete="current-password"
              />
              {/* Botão para mostrar/esconder senha */}
              <button 
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1" // Pula o tab para focar direto no botão entrar
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className={styles.errorMessage}>{errors.password.message}</p>}
          </div>

          <div className={styles.formActions}>
            <label className={styles.checkboxGroup}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Lembrar de mim</span>
            </label>
            
            <button
              type="button"
              className={styles.forgotPassword}
              onClick={handlePasswordReset}
            >
              Esqueceu a senha?
            </button>
          </div>

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Autenticando..." : "Acessar Sistema"}
          </button>
        </form>
      </div>
      
      <footer className={styles.footer}>
        &copy; {new Date().getFullYear()} HCP Gestão • TI
      </footer>
    </div>
  );
};

export default Login;