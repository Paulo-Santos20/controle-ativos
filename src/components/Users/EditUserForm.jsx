import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js'; // Caminho absoluto
import { toast } from 'sonner';
// Reutiliza o CSS de formulário mais complexo
import styles from '../Settings/AddUnitForm.module.css'; 
import { Loader2 } from 'lucide-react';

/**
 * Schema de validação para a edição de um usuário.
 */
const userSchema = z.object({
  displayName: z.string().min(1, "O nome é obrigatório"),
  role: z.string().min(1, "A 'Role' é obrigatória"),
  assignedUnits: z.array(z.string()).optional(), 
});

/**
 * Formulário para editar as permissões (Role, Unidades) de um usuário.
 * @param {object} props
 * @param {() => void} props.onClose - Função para fechar o modal.
 * @param {DocumentSnapshot} props.userDoc - O documento do usuário a ser editado.
 */
const EditUserForm = ({ onClose, userDoc }) => {
  // Busca as 'Roles' disponíveis (admin_geral, tecnico_local, etc.)
  const [roles, loadingRoles] = useCollection(
    query(collection(db, 'roles'), orderBy('name', 'asc'))
  );
  
  // Busca as 'Unidades' disponíveis (HMR, HSS, etc.)
  const [units, loadingUnits] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  const { 
    register, 
    handleSubmit, 
    control, // Necessário para os checkboxes
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      displayName: "",
      role: "",
      assignedUnits: [] // Inicia como array vazio
    }
  });

  // UI/UX: Preenche o formulário com os dados existentes
  useEffect(() => {
    if (userDoc) {
      const data = userDoc.data();
      reset({
        displayName: data.displayName || "",
        role: data.role || "",
        assignedUnits: data.assignedUnits || []
      }); 
    }
  }, [userDoc, reset]);

  /**
   * Salva as alterações no documento do usuário no Firestore.
   */
  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando permissões...");
    try {
      const userRef = doc(db, 'users', userDoc.id);

      await updateDoc(userRef, {
        displayName: data.displayName,
        role: data.role,
        assignedUnits: data.assignedUnits
      });
      
      toast.success("Usuário atualizado com sucesso!", { id: toastId });
      onClose(); // Fecha o modal
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
            <legend className={styles.subtitle}>Informações do Usuário</legend>

            <div className={styles.formGroup}>
              <label>E-mail (Não editável)</label>
              <input defaultValue={userDoc.data().email} disabled className={styles.inputDisabled} />
            </div>

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

          <fieldset className={styles.fieldset}>
            <legend className={styles.subtitle}>Unidades Atribuídas</legend>
            
            <div className={styles.checkboxGrid}>
              <Controller
                name="assignedUnits"
                control={control}
                render={({ field }) => (
                  <>
                    {units?.docs.map(unitDoc => {
                      const unitId = unitDoc.id;
                      const unitName = unitDoc.data().name;
                      return (
                        <div key={unitId} className={styles.checkboxGroup}>
                          <input
                            type="checkbox"
                            id={unitId}
                            checked={field.value.includes(unitId)}
                            onChange={(e) => {
                              const selectedUnits = field.value;
                              if (e.target.checked) {
                                field.onChange([...selectedUnits, unitId]);
                              } else {
                                field.onChange(selectedUnits.filter(id => id !== unitId));
                              }
                            }}
                          />
                          <label htmlFor={unitId}>{unitName} ({unitDoc.data().sigla})</label>
                        </div>
                      );
                    })}
                  </>
                )}
              />
            </div>
          </fieldset>
        </>
      )}

      {/* --- Botões de Ação --- */}
      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>
          Cancelar
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting || isLoading}>
          {isSubmitting ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </form>
  );
};


export default EditUserForm;