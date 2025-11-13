import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js'; 
import { toast } from 'sonner';
import styles from '../Settings/AddUnitForm.module.css'; 
import { Loader2 } from 'lucide-react';

// --- 1. IMPORTA O LOGGER ---
import { logAudit } from '/src/utils/auditLogger';

const userSchema = z.object({
  displayName: z.string().min(1, "O nome é obrigatório"),
  email: z.string().email("E-mail inválido").min(1, "O e-mail é obrigatório"),
  role: z.string().min(1, "A 'Role' é obrigatória"),
  isActive: z.boolean(),
  assignedUnits: z.array(z.string()).optional(), 
});

const EditUserForm = ({ onClose, userDoc }) => {
  const [roles, loadingRoles] = useCollection(query(collection(db, 'roles'), orderBy('name', 'asc')));
  const [units, loadingUnits] = useCollection(query(collection(db, 'units'), orderBy('name', 'asc')));

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { displayName: "", email: "", role: "", isActive: true, assignedUnits: [] }
  });

  useEffect(() => {
    if (userDoc) {
      const data = userDoc.data();
      reset({
        displayName: data.displayName || "",
        email: data.email || "",
        role: data.role || "",
        isActive: data.isActive !== false,
        assignedUnits: data.assignedUnits || []
      }); 
    }
  }, [userDoc, reset]);

  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando alterações...");
    try {
      const userRef = doc(db, 'users', userDoc.id);

      await updateDoc(userRef, {
        displayName: data.displayName,
        email: data.email, 
        role: data.role,
        isActive: data.isActive,
        assignedUnits: data.assignedUnits
      });
      
      // --- 2. REGISTRA O LOG DE AUDITORIA (CORREÇÃO) ---
      // Detecta mudanças importantes para logar
      const oldData = userDoc.data();
      let details = "Dados do usuário atualizados.";
      
      if (oldData.role !== data.role) details = `Perfil alterado de "${oldData.role}" para "${data.role}".`;
      if (oldData.isActive !== data.isActive) details = `Status alterado para ${data.isActive ? 'Ativo' : 'Inativo'}.`;

      await logAudit(
        "Gestão de Usuários",
        details,
        `Usuário: ${data.email}`
      );
      // ------------------------------------------------

      toast.success("Dados do usuário atualizados!", { id: toastId });
      if (data.email !== userDoc.data().email) {
        toast.info("Nota: O e-mail de login deve ser alterado pelo próprio usuário.", { duration: 5000 });
      }
      
      onClose(); 
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message, { id: toastId });
      console.error(error);
    }
  };

  const isLoading = loadingRoles || loadingUnits;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Loader2 className={styles.spinner} />
        </div>
      ) : (
        <>
          <fieldset className={styles.fieldset}>
            <legend className={styles.subtitle}>Status da Conta</legend>
            <div className={styles.checkboxGroup} style={{marginBottom: 0}}>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <input type="checkbox" id="isActive" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                )}
              />
              <label htmlFor="isActive">Usuário Ativo (Desmarque para bloquear acesso)</label>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.subtitle}>Informações</legend>
            <div className={styles.formGroup}>
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" {...register("email")} className={errors.email ? styles.inputError : ''} />
              {errors.email && <p className={styles.errorMessage}>{errors.email.message}</p>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="displayName">Nome</label>
              <input id="displayName" {...register("displayName")} className={errors.displayName ? styles.inputError : ''} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="role">Role</label>
              <select id="role" {...register("role")} className={errors.role ? styles.inputError : ''}>
                <option value="">Selecione...</option>
                {roles?.docs.map(doc => <option key={doc.id} value={doc.id}>{doc.data().name}</option>)}
              </select>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.subtitle}>Unidades Atribuídas</legend>
            <div className={styles.checkboxGrid}>
              <Controller
                name="assignedUnits"
                control={control}
                render={({ field }) => (
                  <>
                    {units?.docs.map(unitDoc => (
                      <div key={unitDoc.id} className={styles.checkboxGroup}>
                        <input type="checkbox" id={unitDoc.id} checked={field.value.includes(unitDoc.id)} onChange={(e) => {
                              const selectedUnits = field.value;
                              if (e.target.checked) field.onChange([...selectedUnits, unitDoc.id]);
                              else field.onChange(selectedUnits.filter(id => id !== unitDoc.id));
                            }} />
                        <label htmlFor={unitDoc.id}>{unitDoc.data().name}</label>
                      </div>
                    ))}
                  </>
                )}
              />
            </div>
          </fieldset>
        </>
      )}

      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting || isLoading}>Salvar</button>
      </div>
    </form>
  );
};

export default EditUserForm;