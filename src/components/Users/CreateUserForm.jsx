import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
// Importamos initializeApp para criar a instancia secundária
import { initializeApp } from 'firebase/app'; 
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '/src/lib/firebase.js'; 
import { toast } from 'sonner';
import styles from '../Settings/AddUnitForm.module.css'; 
import { Loader2 } from 'lucide-react';

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
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"), // Campo Obrigatório no plano Free
  role: z.string().min(1, "A 'Role' é obrigatória"),
});

const CreateUserForm = ({ onClose }) => {
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
      // 1. TRUQUE: Criar uma instância secundária do Firebase
      // Isso evita que o Admin (você) seja deslogado ao criar um novo usuário
      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Criar o usuário na autenticação (Auth)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        data.email, 
        data.password
      );
      const newUser = userCredential.user;

      // 3. Criar o perfil no Firestore (Database)
      // Usamos o 'db' principal aqui, pois já estamos autenticados nele como Admin
      await setDoc(doc(db, "users", newUser.uid), {
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        assignedUnits: [],
        createdAt: serverTimestamp(),
      });

      // 4. Deslogar a instância secundária para limpar a memória
      await signOut(secondaryAuth);

      toast.success(`Usuário ${data.displayName} criado com sucesso!`, { id: toastId });
      reset();
      onClose();

    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está cadastrado.";
      toast.error(`Erro: ${msg}`, { id: toastId });
    } finally {
      // Limpeza: Deleta a instância secundária se ela foi criada
      if (secondaryApp) {
        // O delete() é uma promise, mas não precisamos esperar bloquear a UI
        // secondaryApp.delete(); // (Opcional em versões recentes do SDK, o garbage collector resolve)
      }
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
          <fieldset className={styles.fieldset}>
            <legend className={styles.subtitle}>Novo Usuário (Plano Free)</legend>
            
            <div className={styles.formGroup}>
              <label htmlFor="displayName">Nome</label>
              <input 
                id="displayName" 
                {...register("displayName")} 
                className={errors.displayName ? styles.inputError : ''}
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
              />
              {errors.email && <p className={styles.errorMessage}>{errors.email.message}</p>}
            </div>

            {/* Campo de Senha Adicionado Obrigatóriamente */}
            <div className={styles.formGroup}>
              <label htmlFor="password">Senha Inicial</label>
              <input 
                id="password" 
                type="text" // Mostra a senha para o admin copiar/anotar
                placeholder="Defina uma senha (min 6 chars)"
                {...register("password")} 
                className={errors.password ? styles.inputError : ''}
              />
              {errors.password && <p className={styles.errorMessage}>{errors.password.message}</p>}
              <small style={{color: '#666'}}>Anote esta senha e passe para o usuário.</small>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="role">Role (Permissão)</label>
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