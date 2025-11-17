import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import styles from '../Settings/AddUnitForm.module.css'; 

const crudSchema = z.object({
  create: z.boolean(),
  read: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
});

const permissionsSchema = z.object({
  dashboard: z.object({ read: z.boolean() }),
  ativos: crudSchema,
  cadastros_unidades: crudSchema,
  cadastros_modelos: crudSchema,
  cadastros_empresas: crudSchema,
  cadastros_opcoes: crudSchema,
  // --- NOVO: Monitoramento ---
  monitoramento: z.object({ read: z.boolean() }),
  // ---------------------------
  movimentacao: z.object({ create: z.boolean() }),
  preventiva: z.object({ create: z.boolean() }),
  usuarios: crudSchema,
  perfis: crudSchema,
});

const roleSchema = z.object({
  id: z.string().min(3, "O ID é obrigatório"),
  name: z.string().min(3, "O Nome do Perfil é obrigatório"),
  permissions: permissionsSchema,
});

const defaultCrud = { create: false, read: false, update: false, delete: false };

const AddRoleForm = ({ onClose, existingRoleDoc }) => {
  const isEditing = !!existingRoleDoc;

  const defaultValues = {
    id: "",
    name: "",
    permissions: {
      dashboard: { read: false },
      ativos: { ...defaultCrud },
      cadastros_unidades: { ...defaultCrud },
      cadastros_modelos: { ...defaultCrud },
      cadastros_empresas: { ...defaultCrud },
      cadastros_opcoes: { ...defaultCrud },
      monitoramento: { read: false }, // <-- NOVO DEFAULT
      movimentacao: { create: false },
      preventiva: { create: false },
      usuarios: { ...defaultCrud },
      perfis: { ...defaultCrud },
    }
  };

  const { 
    register, 
    handleSubmit, 
    control, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: defaultValues
  });

  useEffect(() => {
    if (isEditing && existingRoleDoc) {
      const data = existingRoleDoc.data();
      const mergedPermissions = {
        ...defaultValues.permissions,
        ...data.permissions,
        monitoramento: { ...defaultValues.permissions.monitoramento, ...data.permissions?.monitoramento },
      };

      reset({
        id: existingRoleDoc.id,
        name: data.name,
        permissions: mergedPermissions,
      }); 
    } else {
      reset(defaultValues);
    }
  }, [existingRoleDoc, isEditing, reset]);

  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando perfil...");
    try {
      const roleRef = doc(db, 'roles', data.id);
      await setDoc(roleRef, {
        name: data.name,
        permissions: data.permissions,
      });
      toast.success("Perfil salvo com sucesso!", { id: toastId });
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message, { id: toastId });
    }
  };
  
  const Checkbox = ({ name }) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <input type="checkbox" checked={!!field.value} onChange={field.onChange} />
      )}
    />
  );

  const DisabledCell = () => <td className={styles.disabledCell}></td>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Informações do Perfil</legend>
        <div className={styles.formGroup}>
          <label htmlFor="id">ID (ex: gestor, tecnico_local)</label>
          <input id="id" {...register("id")} className={errors.id ? styles.inputError : ''} disabled={isEditing} />
          {errors.id && <p className={styles.errorMessage}>{errors.id.message}</p>}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="name">Nome (ex: Técnico Local)</label>
          <input id="name" {...register("name")} className={errors.name ? styles.inputError : ''} />
          {errors.name && <p className={styles.errorMessage}>{errors.name.message}</p>}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Permissões</legend>
        
        <table className={styles.permissionsTable}>
          <thead>
            <tr>
              <th>Módulo</th>
              <th>Ver</th>
              <th>Criar</th>
              <th>Editar</th>
              <th>Excluir</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dashboard</td>
              <td><Checkbox name="permissions.dashboard.read" /></td>
              <DisabledCell /><DisabledCell /><DisabledCell />
            </tr>
            <tr>
              <td>Inventário</td>
              <td><Checkbox name="permissions.ativos.read" /></td>
              <td><Checkbox name="permissions.ativos.create" /></td>
              <td><Checkbox name="permissions.ativos.update" /></td>
              <td><Checkbox name="permissions.ativos.delete" /></td>
            </tr>
            {/* --- NOVO: MONITORAMENTO --- */}
            <tr>
              <td>Monitoramento (SLA)</td>
              <td><Checkbox name="permissions.monitoramento.read" /></td>
              <DisabledCell /><DisabledCell /><DisabledCell />
            </tr>
            {/* --------------------------- */}
            <tr>
              <td>Movimentação</td>
              <td>(Ver Ativos)</td>
              <td><Checkbox name="permissions.movimentacao.create" /></td>
              <DisabledCell /><DisabledCell />
            </tr>
             <tr>
              <td>Preventiva</td>
              <td>(Ver Ativos)</td>
              <td><Checkbox name="permissions.preventiva.create" /></td>
              <DisabledCell /><DisabledCell />
            </tr>
            
            <tr>
              <td>Cad: Unidades</td>
              <td><Checkbox name="permissions.cadastros_unidades.read" /></td>
              <td><Checkbox name="permissions.cadastros_unidades.create" /></td>
              <td><Checkbox name="permissions.cadastros_unidades.update" /></td>
              <td><Checkbox name="permissions.cadastros_unidades.delete" /></td>
            </tr>
            <tr>
              <td>Cad: Modelos</td>
              <td><Checkbox name="permissions.cadastros_modelos.read" /></td>
              <td><Checkbox name="permissions.cadastros_modelos.create" /></td>
              <td><Checkbox name="permissions.cadastros_modelos.update" /></td>
              <td><Checkbox name="permissions.cadastros_modelos.delete" /></td>
            </tr>
            <tr>
              <td>Cad: Empresas</td>
              <td><Checkbox name="permissions.cadastros_empresas.read" /></td>
              <td><Checkbox name="permissions.cadastros_empresas.create" /></td>
              <td><Checkbox name="permissions.cadastros_empresas.update" /></td>
              <td><Checkbox name="permissions.cadastros_empresas.delete" /></td>
            </tr>
            <tr>
              <td>Cad: Opções</td>
              <td><Checkbox name="permissions.cadastros_opcoes.read" /></td>
              <td><Checkbox name="permissions.cadastros_opcoes.create" /></td>
              <td><Checkbox name="permissions.cadastros_opcoes.update" /></td>
              <td><Checkbox name="permissions.cadastros_opcoes.delete" /></td>
            </tr>

            <tr>
              <td>Usuários</td>
              <td><Checkbox name="permissions.usuarios.read" /></td>
              <td><Checkbox name="permissions.usuarios.create" /></td>
              <td><Checkbox name="permissions.usuarios.update" /></td>
              <td><Checkbox name="permissions.usuarios.delete" /></td>
            </tr>
            <tr>
              <td>Perfis (Roles)</td>
              <td><Checkbox name="permissions.perfis.read" /></td>
              <td><Checkbox name="permissions.perfis.create" /></td>
              <td><Checkbox name="permissions.perfis.update" /></td>
              <td><Checkbox name="permissions.perfis.delete" /></td>
            </tr>
          </tbody>
        </table>
      </fieldset>

      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>Salvar Perfil</button>
      </div>
    </form>
  );
};

export default AddRoleForm;