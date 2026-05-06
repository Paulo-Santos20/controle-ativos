import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { auth } from '/src/lib/firebase.js';
import { toast, Toaster } from 'sonner';
import { Hospital, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'; 

import styles from './Login.module.css';

// Schema de validação
const loginSchema = z.object({
  email: z.string()
    .min(1, "O e-mail é obrigatório")
    .email("Formato de e-mail inválido")
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, "A senha é obrigatória"), 
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isResetting, setIsResetting] = useState(false); // Loading do reset

  // Verifica se veio de redefinição de senha bem sucedida
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('reset') === 'success') {
      toast.success("Senha redefinida com sucesso! Faça login com sua nova senha.");
      // Limpa a URL removendo o parametro
      navigate('/login', { replace: true });
    }
  }, [location, navigate]);

  const { 
    register, 
    handleSubmit, 
    getValues, // Para pegar o e-mail sem submeter o form
    trigger,   // Para validar o campo de e-mail isoladamente
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
        return "E-mail ou senha incorretos.";
      case 'auth/too-many-requests':
        return "Muitas tentativas falhas. O acesso foi bloqueado temporariamente.";
      case 'auth/user-disabled':
        return "Esta conta foi desativada pelo administrador.";
      case 'auth/network-request-failed':
        return "Erro de conexão. Verifique sua internet.";
      case 'auth/invalid-email':
        return "O formato do e-mail é inválido.";
      default:
        return "Ocorreu um erro inesperado (" + errorCode + ").";
    }
  };

  const onSubmit = async (data) => {
    setLoginError(""); 
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithEmailAndPassword(auth, data.email, data.password);
      
      toast.success("Bem-vindo ao sistema!");
      navigate('/'); 
    } catch (error) {
      console.error("Login Error:", error.code);
      const msg = getFriendlyErrorMessage(error.code);
      setLoginError(msg); 
      toast.error(msg); 
    }
  };

  // --- LÓGICA DE RECUPERAÇÃO DE SENHA ---
  const handlePasswordReset = async () => {
    const email = getValues("email");
    
    // 1. Valida se o campo e-mail tem algo escrito
    const isValidEmail = await trigger("email");
    
    if (!isValidEmail || !email) {
      toast.warning("Por favor, digite seu e-mail no campo 'E-mail Corporativo' primeiro.");
      // Foca no input de e-mail visualmente
      document.getElementById("email")?.focus();
      return;
    }

    setIsResetting(true);

    try {
      // 2. Envia o link do Firebase
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      });

      toast.success("E-mail de recuperação enviado!", {
        description: "Verifique sua caixa de entrada e spam. O link expira em 1 hora.",
        duration: 8000,
      });
      setLoginError("");
    } catch (error) {
      console.error("Reset Error:", error.code);
      let msg = getFriendlyErrorMessage(error.code);

      if (error.code === 'auth/user-not-found') {
        msg = "Este e-mail não está cadastrado no sistema.";
      }

      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Toaster position="top-right" richColors closeButton />
      <div className={styles.formContainer}>
        <div className={styles.header}>
          <div className={styles.logoCircle}>
            <Hospital size={40} color="var(--color-primary)" />
          </div>
          <h1 className={styles.title}>ATIVOS HCP Gestão</h1>
          <p className={styles.subtitle}>Acesso ao Sistema de Ativos</p>
        </div>

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
              <button 
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1" 
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
            
            {/* Botão de Esqueci Senha */}
            <button
              type="button"
              className={styles.forgotPassword}
              onClick={handlePasswordReset}
              disabled={isResetting || isSubmitting}
            >
              {isResetting ? <span style={{display:'flex', gap:4, alignItems:'center'}}><Loader2 size={12} className={styles.spinner}/> Enviando...</span> : "Esqueceu a senha?"}
            </button>
          </div>

          <button type="submit" className={styles.submitButton} disabled={isSubmitting || isResetting}>
            {isSubmitting ? <span style={{display:'flex', gap:6, justifyContent:'center', alignItems:'center'}}><Loader2 className={styles.spinner} /> Entrando...</span> : "Acessar Sistema"}
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