import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { initializeApp } from 'firebase/app'; 
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '/src/lib/firebase.js'; 
import { toast } from 'sonner';
import styles from '../Settings/AddUnitForm.module.css'; 
import { Loader2 } from 'lucide-react';

// --- 1. IMPORTA O LOGGER ---
import { logAudit } from '/src/utils/auditLogger';

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
      // 1. Cria instância secundária para não deslogar o admin
      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Cria no Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        data.email, 
        data.password
      );
      const newUser = userCredential.user;

      // 3. Cria no Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        assignedUnits: [],
        isActive: true, // Importante: Já nasce ativo
        createdAt: serverTimestamp(),
      });

      // 4. Desloga a secundária
      await signOut(secondaryAuth);

      // --- 5. REGISTRA O LOG DE AUDITORIA (CORREÇÃO) ---
      await logAudit(
        "Criação de Usuário",
        `O usuário "${data.displayName}" (${data.email}) foi criado com o perfil "${data.role}".`,
        `Usuário: ${data.email}`
      );
      // ------------------------------------------------

      toast.success(`Usuário ${data.displayName} criado com sucesso!`, { id: toastId });
      reset();
      onClose();

    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está cadastrado.";
      toast.error(`Erro: ${msg}`, { id: toastId });
    } finally {
      if (secondaryApp) {
        // Limpeza (opcional, garbage collector cuida)
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
            <legend className={styles.subtitle}>Novo Usuário</legend>
            
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

            <div className={styles.formGroup}>
              <label htmlFor="password">Senha Inicial</label>
              <input 
                id="password" 
                type="text" 
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