import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { LockKeyhole, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

import styles from './Login.module.css';

const schema = z.object({
  newPassword: z.string()
    .min(6, "A senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string()
    .min(6, "Confirme a senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

const PasswordResetPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState('loading'); // loading | ready | success | error
  const [errorMessage, setErrorMessage] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    const validateCode = async () => {
      if (!oobCode || mode !== 'resetPassword') {
        setErrorMessage("Link de redefinição inválido ou expirado.");
        setStatus('error');
        return;
      }

      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        setEmail(email);
        setStatus('ready');
      } catch (error) {
        console.error("Erro ao validar código:", error);

        switch (error.code) {
          case 'auth/expired-action-code':
            setErrorMessage("Este link expirou. Solicite um novo e-mail de recuperação.");
            break;
          case 'auth/invalid-action-code':
            setErrorMessage("Este link já foi usado ou é inválido. Solicite um novo e-mail.");
            break;
          case 'auth/user-disabled':
            setErrorMessage("Esta conta foi desativada. Entre em contato com o administrador.");
            break;
          default:
            setErrorMessage("Não foi possível validar este link. Solicite um novo e-mail.");
        }
        setStatus('error');
      }
    };

    validateCode();
  }, [oobCode, mode]);

  const onSubmit = async (data) => {
    if (!oobCode) return;

    const toastId = toast.loading("Salvando nova senha...");

    try {
      await confirmPasswordReset(auth, oobCode, data.newPassword);
      toast.success("Senha redefinida com sucesso!", { id: toastId });
      setStatus('success');

      setTimeout(() => {
        navigate('/login?reset=success');
      }, 1500);

    } catch (error) {
      console.error("Erro ao redefinir senha:", error);

      switch (error.code) {
        case 'auth/expired-action-code':
          setErrorMessage("Este link expirou. Solicite um novo e-mail de recuperação.");
          break;
        case 'auth/invalid-action-code':
          setErrorMessage("Este link já foi usado ou é inválido. Solicite um novo e-mail.");
          break;
        case 'auth/weak-password':
          setErrorMessage("A senha é muito fraca. Use pelo menos 6 caracteres.");
          break;
        default:
          setErrorMessage("Erro ao salvar a nova senha. Tente novamente.");
      }

      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleGoBack = () => {
    navigate('/login');
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.formContainer} style={{ maxWidth: 450 }}>
          <div className={styles.header}>
            <div className={styles.logoCircle}>
              <Loader2 size={40} className={styles.spinner} style={{ color: 'var(--color-primary)' }} />
            </div>
            <h1 className={styles.title}>Validando Link...</h1>
            <p className={styles.subtitle}>Aguarde enquanto verificamos a segurança do link.</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.formContainer} style={{ maxWidth: 450 }}>
          <div className={styles.header}>
            <div className={styles.logoCircle} style={{ backgroundColor: '#fef2f2' }}>
              <XCircle size={40} color="#991b1b" />
            </div>
            <h1 className={styles.title}>Link Inválido</h1>
            <p className={styles.subtitle}>{errorMessage}</p>
          </div>

          <div className={styles.errorBanner} style={{ marginTop: 16 }}>
            <XCircle size={18} />
            <span>{errorMessage}</span>
          </div>

          <button
            onClick={handleGoBack}
            className={styles.submitButton}
            style={{ marginTop: 24 }}
          >
            <ArrowLeft size={18} />
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.formContainer} style={{ maxWidth: 450 }}>
          <div className={styles.header}>
            <div className={styles.logoCircle} style={{ backgroundColor: '#dcfce7' }}>
              <CheckCircle size={40} color="#166534" />
            </div>
            <h1 className={styles.title}>Senha Redefinida!</h1>
            <p className={styles.subtitle}>
              Sua senha foi alterada com sucesso. Você será redirecionado para fazer login.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Ready state - show form
  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer} style={{ maxWidth: 450 }}>
        <div className={styles.header}>
          <div className={styles.logoCircle}>
            <LockKeyhole size={40} color="var(--color-primary)" />
          </div>
          <h1 className={styles.title}>Definir Nova Senha</h1>
          <p className={styles.subtitle}>
            Olá! Defina uma nova senha para sua conta <strong>{email}</strong>
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
              autoComplete="new-password"
            />
            {errors.newPassword && (
              <p className={styles.errorMessage}>{errors.newPassword.message}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repita a nova senha"
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              {...register("confirmPassword")}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className={styles.errorMessage}>{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className={styles.spinner} size={18} />
                Salvando...
              </>
            ) : (
              <>
                <LockKeyhole size={18} />
                Salvar Nova Senha
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: 20,
          textAlign: 'center',
          borderTop: '1px solid var(--color-border)',
          paddingTop: 20
        }}>
          <button
            onClick={handleGoBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: '0 auto',
              fontSize: '0.9rem'
            }}
          >
            <ArrowLeft size={16} />
            Voltar para o Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;