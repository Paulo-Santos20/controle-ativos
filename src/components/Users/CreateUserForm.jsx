import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, functions } from '/src/lib/firebase.js'; // Importa 'functions'
import { httpsCallable } from 'firebase/functions'; // Importa o HttpsCallable
import { toast } from 'sonner';
// Reutiliza o CSS de formulário complexo
import styles from '../Settings/AddUnitForm.module.css'; 
import { Loader2 } from 'lucide-react';

/**
 * Schema de validação para a criação de um usuário.
 */
const createUserSchema = z.object({
  displayName: z.string().min(3, "O nome é obrigatório"),
  email: z.string().email("O e-mail é inválido"),
  role: z.string().min(1, "A 'Role' é obrigatória"),
  // (Você pode adicionar 'unidades' aqui se quiser que o admin já as atribua)
});

/**
 * Formulário para CRIAR um novo usuário (chama uma Cloud Function).
 * @param {object} props
 * @param {() => void} props.onClose - Função para fechar o modal.
 */
const CreateUserForm = ({ onClose }) => {
  // Busca as 'Roles' disponíveis
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

  /**
   * CHAMA A FIREBASE FUNCTION (BACKEND)
   * Esta função 'createNewUser' deve ser criada por você no backend.
   */
  const onSubmit = async (data) => {
    const toastId = toast.loading("Criando usuário...");
    
    try {
      // 1. Aponta para a sua Cloud Function
      const createUser = httpsCallable(functions, 'createNewUser');
      
      // 2. Chama a função e passa os dados
      const result = await createUser({
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        // (Você pode passar a senha ou deixar a função criar uma aleatória)
      });
      
      // 3. Processa o resultado
      if (result.data.success) {
        toast.success(`Usuário ${data.email} criado!`, { id: toastId });
        reset();
        onClose(); // Fecha o modal
      } else {
        throw new Error(result.data.error);
      }
      
    } catch (error) {
      toast.error(`Erro: ${error.message}`, { id: toastId });
      console.error(error);
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
            <legend className={styles.subtitle}>Informações do Novo Usuário</legend>
            <p className={styles.description}>
              Isso criará a conta de usuário (Firebase Auth) e o perfil (Firestore)
              e enviará um e-mail de redefinição de senha para o usuário.
            </p>

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
              <label htmlFor="role">Role (Permissão) Inicial</label>
              <select 
                id="role" 
                {...register("role")} 
                className={errors.role ? styles.inputError : ''}
              >
                <option value="">Selecione uma permissão...</option>
                {roles?.docs.map(doc => (
                  // Não permite criar um "gestor" por aqui por segurança
                  doc.id !== 'admin_geral' && (
                     <option key={doc.id} value={doc.id}>{doc.data().name}</option>
                  )
                ))}
              </select>
              {errors.role && <p className={styles.errorMessage}>{errors.role.message}</p>}
            </div>
          </fieldset>
        </>
      )}

      {/* --- Botões de Ação --- */}
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