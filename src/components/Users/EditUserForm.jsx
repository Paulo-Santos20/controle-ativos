import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, collection, query, orderBy, getDoc } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import styles from '../Settings/AddUnitForm.module.css';
import { Loader2, Shield } from 'lucide-react';
import { logAudit } from '../../utils/AuditLogger';
import PermissionMatrix from './PermissionMatrix';

const userSchema = z.object({
  displayName: z.string().min(1, "O nome é obrigatório"),
  email: z.string().email("E-mail inválido").min(1, "O e-mail é obrigatório"),
  role: z.string().min(1, "A 'Role' é obrigatória"),
  isActive: z.boolean(),
  assignedUnits: z.array(z.string()).optional(),
  customPermissions: z.any().optional(),
});

const EditUserForm = ({ onClose, userDoc }) => {
  const [roles, loadingRoles] = useCollection(query(collection(db, 'roles'), orderBy('name', 'asc')));
  const [units, loadingUnits] = useCollection(query(collection(db, 'units'), orderBy('name', 'asc')));
  const [profilePermissions, setProfilePermissions] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { displayName: "", email: "", role: "", isActive: true, assignedUnits: [], customPermissions: {} }
  });

  const selectedRole = watch("role");

  useEffect(() => {
    if (userDoc) {
      const data = userDoc.data();
      reset({
        displayName: data.displayName || "",
        email: data.email || "",
        role: data.role || "",
        isActive: data.isActive !== false,
        assignedUnits: Array.isArray(data.assignedUnits) ? data.assignedUnits : [],
        customPermissions: data.customPermissions || {}
      });
    }
  }, [userDoc, reset]);

  useEffect(() => {
    const loadProfilePermissions = async () => {
      if (!selectedRole) return;

      setLoadingProfile(true);
      try {
        const roleDocRef = doc(db, 'roles', selectedRole);
        const roleSnap = await getDoc(roleDocRef);
        if (roleSnap.exists()) {
          setProfilePermissions(roleSnap.data().permissions || null);
        } else {
          setProfilePermissions(null);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        setProfilePermissions(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfilePermissions();
  }, [selectedRole]);

  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando alterações...");
    try {
      const userRef = doc(db, 'users', userDoc.id);

      const updateData = {
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
        assignedUnits: Array.isArray(data.assignedUnits) ? data.assignedUnits : [],
      };

      const customPerms = data.customPermissions;
      let hasCustomPermissions = false;
      let cleanCustomPerms = {};

      if (customPerms && typeof customPerms === 'object') {
        Object.keys(customPerms).forEach(key => {
          const modulePerms = customPerms[key];
          if (modulePerms && typeof modulePerms === 'object') {
            let hasAnyValue = false;
            const cleanModulePerms = {};
            Object.keys(modulePerms).forEach(action => {
              const value = modulePerms[action];
              if (value !== undefined && value !== null) {
                cleanModulePerms[action] = value;
                hasAnyValue = true;
              }
            });
            if (hasAnyValue) {
              cleanCustomPerms[key] = cleanModulePerms;
            }
          }
        });
      }

      hasCustomPermissions = Object.keys(cleanCustomPerms).length > 0;

      if (hasCustomPermissions) {
        updateData.customPermissions = cleanCustomPerms;
      }

      await updateDoc(userRef, updateData);

      const oldData = userDoc.data();
      let details = "Dados do usuário atualizados.";

      if (oldData.role !== data.role) details = `Perfil alterado de "${oldData.role}" para "${data.role}".`;
      if (oldData.isActive !== data.isActive) details = `Status alterado para ${data.isActive ? 'Ativo' : 'Inativo'}.`;

      await logAudit(
        "Gestão de Usuários",
        details,
        `Usuário: ${data.email}`
      );

      toast.success("Dados do usuário atualizados!", { id: toastId });

      if (data.email !== userDoc.data().email) {
        toast.info("Nota: O e-mail de login deve ser alterado pelo próprio usuário.", { duration: 5000 });
      }

      setTimeout(() => onClose(), 500);
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message, { id: toastId });
      console.error("Erro ao salvar usuário:", error);
    }
  };

  const handleResetAllPermissions = () => {
    const currentPerms = watch('customPermissions') || {};
    Object.keys(currentPerms).forEach(key => {
      setValue(`customPermissions.${key}`, null);
    });
    setValue('customPermissions', {});
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
              <label htmlFor="role">Perfil Base</label>
              <select id="role" {...register("role")} className={errors.role ? styles.inputError : ''}>
                <option value="">Selecione...</option>
                {roles?.docs.map(doc => <option key={doc.id} value={doc.id}>{doc.data().name}</option>)}
              </select>
              {profilePermissions && (
                <small style={{color: 'var(--color-text-secondary)', marginTop: '4px'}}>
                  Permissões padrão do perfil serão herdadas se não modificadas.
                </small>
              )}
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
                        <input
                          type="checkbox"
                          id={unitDoc.id}
                          checked={field.value.includes(unitDoc.id)}
                          onChange={(e) => {
                              const selectedUnits = field.value || [];
                              if (e.target.checked) field.onChange([...selectedUnits, unitDoc.id]);
                              else field.onChange(selectedUnits.filter(id => id !== unitDoc.id));
                            }}
                        />
                        <label htmlFor={unitDoc.id}>{unitDoc.data().name}</label>
                      </div>
                    ))}
                  </>
                )}
              />
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.subtitle} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Shield size={16} />
              Personalização de Permissões
            </legend>
            {loadingProfile ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 className={styles.spinner} size={20} />
                <span style={{marginLeft: '8px'}}>Carregando permissões do perfil...</span>
              </div>
            ) : (
              <PermissionMatrix
                control={control}
                profilePermissions={profilePermissions}
                onResetAll={handleResetAllPermissions}
              />
            )}
          </fieldset>
        </>
      )}

      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting || isLoading}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
};

export default EditUserForm;