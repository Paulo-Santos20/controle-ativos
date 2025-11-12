import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { toast } from 'sonner';
// Reutiliza o CSS de formulário complexo
import styles from '../Settings/AddUnitForm.module.css'; 

/**
 * Define uma ação CRUD (Create, Read, Update, Delete)
 */
const crudSchema = z.object({
  create: z.boolean(),
  read: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
});

/**
 * Estrutura de permissões que será salva no documento.
 * (Princípio 1: Arquitetura Escalável)
 */
const permissionsSchema = z.object({
  dashboard: z.object({ read: z.boolean() }),
  // Permissões de Ativos (Inventário)
  ativos: crudSchema,
  // Permissões de Cadastros (Admin)
  cadastros_unidades: crudSchema,
  cadastros_modelos: crudSchema,
  // Permissões de Ações (Logs)
  movimentacao: z.object({ create: z.boolean() }),
  preventiva: z.object({ create: z.boolean() }),
  // Permissões de Gerenciamento de Usuários
  usuarios: crudSchema,
  perfis: crudSchema,
  // (Você pode adicionar 'relatorios: crudSchema' aqui no futuro)
});

/**
 * Schema de validação do formulário completo (ID, Nome + Permissões).
 */
const roleSchema = z.object({
  id: z.string().min(3, "O ID é obrigatório (ex: gestor, tecnico_local)"),
  name: z.string().min(3, "O Nome do Perfil é obrigatório"),
  permissions: permissionsSchema,
});

// Helper para criar um objeto CRUD padrão (tudo false)
const defaultCrud = { create: false, read: false, update: false, delete: false };

/**
 * Formulário para Criar ou Editar um Perfil (Role).
 * @param {object} props
 * @param {() => void} props.onClose - Função para fechar o modal.
 * @param {DocumentSnapshot} [props.existingRoleDoc] - O doc para editar.
 */
const AddRoleForm = ({ onClose, existingRoleDoc }) => {
  const isEditing = !!existingRoleDoc;

  // (Princípio 5: Código de Alta Qualidade)
  // Define todos os valores padrão como 'false'
  const defaultValues = {
    id: "",
    name: "",
    permissions: {
      dashboard: { read: false },
      ativos: { ...defaultCrud },
      cadastros_unidades: { ...defaultCrud },
      cadastros_modelos: { ...defaultCrud },
      movimentacao: { create: false },
      preventiva: { create: false },
      usuarios: { ...defaultCrud },
      perfis: { ...defaultCrud },
    }
  };

  const { 
    register, 
    handleSubmit, 
    control, // Para os checkboxes
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: defaultValues
  });

  // UI/UX: Preenche o formulário se estiver em modo de edição
  useEffect(() => {
    if (isEditing && existingRoleDoc) {
      const data = existingRoleDoc.data();
      // 'merge' profundo dos valores padrão com os dados salvos
      // Isso garante que se uma nova permissão for adicionada ao código,
      // o formulário não quebre ao editar um perfil antigo.
      const mergedPermissions = {
        ...defaultValues.permissions,
        ...data.permissions,
        // Garante que os sub-objetos também sejam mesclados
        dashboard: { ...defaultValues.permissions.dashboard, ...data.permissions?.dashboard },
        ativos: { ...defaultValues.permissions.ativos, ...data.permissions?.ativos },
        cadastros_unidades: { ...defaultValues.permissions.cadastros_unidades, ...data.permissions?.cadastros_unidades },
        cadastros_modelos: { ...defaultValues.permissions.cadastros_modelos, ...data.permissions?.cadastros_modelos },
        movimentacao: { ...defaultValues.permissions.movimentacao, ...data.permissions?.movimentacao },
        preventiva: { ...defaultValues.permissions.preventiva, ...data.permissions?.preventiva },
        usuarios: { ...defaultValues.permissions.usuarios, ...data.permissions?.usuarios },
        perfis: { ...defaultValues.permissions.perfis, ...data.permissions?.perfis },
      };

      reset({
        id: existingRoleDoc.id,
        name: data.name,
        permissions: mergedPermissions,
      }); 
    } else {
      reset(defaultValues); // Limpa para o padrão ao criar novo
    }
  }, [existingRoleDoc, isEditing, reset]);

  /**
   * Salva o Perfil (Role) no Firestore.
   */
  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando perfil...");
    try {
      const roleRef = doc(db, 'roles', data.id);

      await setDoc(roleRef, {
        name: data.name,
        permissions: data.permissions,
      });
      
      toast.success("Perfil salvo com sucesso!", { id: toastId });
      onClose(); // Fecha o modal
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message, { id: toastId });
      console.error(error);
    }
  };
  
  // Helper de UI para criar um checkbox
  const Checkbox = ({ name }) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <input 
          type="checkbox" 
          checked={!!field.value} // Garante que é booleano
          onChange={field.onChange} 
        />
      )}
    />
  );

  // Helper de UI para Célula Desabilitada
  const DisabledCell = () => <td className={styles.disabledCell}></td>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Informações do Perfil</legend>
        <div className={styles.formGroup}>
          <label htmlFor="id">ID (ex: gestor, tecnico_local)</label>
          <input 
            id="id" 
            {...register("id")} 
            className={errors.id ? styles.inputError : ''}
            disabled={isEditing} // Não pode editar o ID
          />
          {errors.id && <p className={styles.errorMessage}>{errors.id.message}</p>}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="name">Nome (ex: Gestor, Técnico Local)</label>
          <input 
            id="name" 
            {...register("name")} 
            className={errors.name ? styles.inputError : ''}
          />
          {errors.name && <p className={styles.errorMessage}>{errors.name.message}</p>}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Permissões (O que pode fazer?)</legend>
        
        {/* --- Tabela de Permissões CORRIGIDA (UI/UX) --- */}
        <table className={styles.permissionsTable}>
          <thead>
            <tr>
              <th>Módulo</th>
              <th>Ver (read)</th>
              <th>Criar (create)</th>
              <th>Editar (update)</th>
              <th>Excluir (delete)</th>
            </tr>
          </thead>
          <tbody>
            {/* Dashboard */}
            <tr>
              <td>Dashboard</td>
              <td><Checkbox name="permissions.dashboard.read" /></td>
              <DisabledCell />
              <DisabledCell />
              <DisabledCell />
            </tr>
            {/* Inventário (Ativos) */}
            <tr>
              <td>Inventário (Ativos)</td>
              <td><Checkbox name="permissions.ativos.read" /></td>
              <td><Checkbox name="permissions.ativos.create" /></td>
              <td><Checkbox name="permissions.ativos.update" /></td>
              <td><Checkbox name="permissions.ativos.delete" /></td>
            </tr>
            {/* Movimentação */}
            <tr>
              <td>Movimentação (Log)</td>
              <td>(incluído em "Ver Ativos")</td>
              <td><Checkbox name="permissions.movimentacao.create" /></td>
              <DisabledCell />
              <DisabledCell />
            </tr>
             {/* Preventiva */}
            <tr>
              <td>Preventiva (Log)</td>
              <td>(incluído em "Ver Ativos")</td>
              <td><Checkbox name="permissions.preventiva.create" /></td>
              <DisabledCell />
              <DisabledCell />
            </tr>
            {/* Cadastros: Unidades */}
            <tr>
              <td>Cadastro: Unidades</td>
              <td><Checkbox name="permissions.cadastros_unidades.read" /></td>
              <td><Checkbox name="permissions.cadastros_unidades.create" /></td>
              <td><Checkbox name="permissions.cadastros_unidades.update" /></td>
              <td><Checkbox name="permissions.cadastros_unidades.delete" /></td>
            </tr>
            {/* Cadastros: Modelos */}
            <tr>
              <td>Cadastro: Modelos (PC/Imp)</td>
              <td><Checkbox name="permissions.cadastros_modelos.read" /></td>
              <td><Checkbox name="permissions.cadastros_modelos.create" /></td>
              <td><Checkbox name="permissions.cadastros_modelos.update" /></td>
              <td><Checkbox name="permissions.cadastros_modelos.delete" /></td>
            </tr>
            {/* Gerenciamento: Usuários */}
            <tr>
              <td>Gerenciamento: Usuários</td>
              <td><Checkbox name="permissions.usuarios.read" /></td>
              <td><Checkbox name="permissions.usuarios.create" /></td>
              <td><Checkbox name="permissions.usuarios.update" /> (Nome)</td>
              <td><Checkbox name="permissions.usuarios.delete" /></td>
            </tr>
            {/* Gerenciamento: Perfis */}
            <tr>
              <td>Gerenciamento: Perfis (Roles)</td>
              <td><Checkbox name="permissions.perfis.read" /></td>
              <td><Checkbox name="permissions.perfis.create" /></td>
              <td><Checkbox name="permissions.perfis.update" /></td>
              <td><Checkbox name="permissions.perfis.delete" /></td>
            </tr>
          </tbody>
        </table>

      </fieldset>

      {/* --- Botões de Ação --- */}
      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>
          Cancelar
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Perfil"}
        </button>
      </div>
    </form>
  );
};

export default AddRoleForm;