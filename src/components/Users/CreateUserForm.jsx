import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
// Importamos initializeApp para criar a instancia secundária (Workaround para não deslogar Admin)
import { initializeApp } from 'firebase/app'; 
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '/src/lib/firebase.js'; 
import { toast } from 'sonner';
import styles from '../Settings/AddUnitForm.module.css'; // Reutiliza CSS de formulários
import { Loader2, AlertTriangle } from 'lucide-react';

// Importa o Logger de Auditoria
import { logAudit } from '/src/utils/auditLogger';

// Precisamos da config pura para criar a app secundária
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const createUserSchema = z.object({
  displayName: z.string().min(3, "O nome é obrigatório"),
  email: z.string().email("O e-mail é inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  role: z.string().min(1, "A 'Role' é obrigatória"),
});

const CreateUserForm = ({ onClose }) => {
  // Busca os perfis para o dropdown
  const [roles, loadingRoles] = useCollection(
    query(collection(db, 'roles'), orderBy('name', 'asc'))
  );

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(createUserSchema)
  });

  const onSubmit = async (data) => {
    const toastId = toast.loading("Criando usuário...");
    let secondaryApp = null;

    try {
      // 1. Cria instância secundária do Firebase
      // Isso permite criar um usuário novo sem derrubar a sessão do Admin atual
      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Cria o usuário na autenticação (Auth)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        data.email, 
        data.password
      );
      const newUser = userCredential.user;

      // 3. Cria o perfil no Firestore (Database)
      // Usamos o 'db' principal aqui, pois já estamos autenticados nele como Admin
      await setDoc(doc(db, "users", newUser.uid), {
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        assignedUnits: [], // Começa sem unidades, deve ser editado depois
        isActive: true, // Já nasce ativo
        mustChangePassword: true, // <--- FORÇA A TROCA DE SENHA
        createdAt: serverTimestamp(),
      });

      // 4. Desloga a instância secundária para limpar a memória
      await signOut(secondaryAuth);

      // 5. Registra no Log de Auditoria
      await logAudit(
        "Criação de Usuário",
        `Usuário "${data.displayName}" (${data.email}) criado com perfil "${data.role}".`,
        `Usuário: ${data.email}`
      );

      toast.success(`Usuário criado com sucesso!`, { id: toastId });
      reset();
      onClose();

    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está cadastrado.";
      if (error.code === 'auth/weak-password') msg = "A senha é muito fraca.";
      toast.error(`Erro: ${msg}`, { id: toastId });
    } finally {
      // Opcional: Limpeza da app secundária (garbage collector geralmente resolve)
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      {loadingRoles ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Loader2 className={styles.spinner} />
        </div>
      ) : (
        <>
          <div className={styles.alertBox} style={{backgroundColor: '#fffbeb', padding: '10px', borderRadius: '8px', border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
            <AlertTriangle size={16} />
            <span>O usuário será obrigado a redefinir a senha no primeiro acesso.</span>
          </div>

          <fieldset className={styles.fieldset}>
            <legend className={styles.subtitle}>Novo Usuário</legend>
            
            <div className={styles.formGroup}>
              <label htmlFor="displayName">Nome Completo</label>
              <input 
                id="displayName" 
                {...register("displayName")} 
                className={errors.displayName ? styles.inputError : ''}
                placeholder="Ex: João Silva"
              />
              {errors.displayName && <p className={styles.errorMessage}>{errors.displayName.message}</p>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">E-mail (Login)</label>
              <input 
                id="email" 
                type="email"
                {...register("email")} 
                className={errors.email ? styles.inputError : ''}
                placeholder="usuario@hospital.com.br"
              />
              {errors.email && <p className={styles.errorMessage}>{errors.email.message}</p>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Senha Temporária</label>
              <input 
                id="password" 
                type="text" // Texto visível para o admin copiar e enviar
                {...register("password")} 
                className={errors.password ? styles.inputError : ''}
                placeholder="Defina uma senha inicial"
              />
              {errors.password && <p className={styles.errorMessage}>{errors.password.message}</p>}
              <small style={{color: '#666', fontSize: '0.8rem', marginTop: '4px'}}>
                Copie e envie esta senha para o usuário.
              </small>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="role">Perfil de Acesso (Role)</label>
              <select 
                id="role" 
                {...register("role")} 
                className={errors.role ? styles.inputError : ''}
              >
                <option value="">Selecione uma permissão...</option>
                {roles?.docs.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.data().name}</option>
                ))}
              </select>
              {errors.role && <p className={styles.errorMessage}>{errors.role.message}</p>}
            </div>
          </fieldset>
        </>
      )}

      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>
          Cancelar
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting || loadingRoles}>
          {isSubmitting ? "Criando..." : "Criar Usuário"}
        </button>
      </div>
    </form>
  );
};

export default CreateUserForm;