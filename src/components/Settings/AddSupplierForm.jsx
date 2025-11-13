import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import styles from './AddUnitForm.module.css'; // Reutiliza o CSS de formulários

const supplierSchema = z.object({
  name: z.string().min(3, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(14, "CNPJ inválido").optional().or(z.literal('')),
  contactName: z.string().min(3, "Nome do contato é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Telefone é obrigatório"),
  serviceType: z.string().min(3, "Tipo de serviço é obrigatório (ex: Locação, Garantia)"),
  contractNumber: z.string().optional(),
  notes: z.string().optional(),
});

const AddSupplierForm = ({ onClose, existingData }) => {
  const isEditing = !!existingData;

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(supplierSchema)
  });

  useEffect(() => {
    if (isEditing && existingData) {
      reset(existingData);
    }
  }, [existingData, isEditing, reset]);

  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando empresa...");
    try {
      // Se editando, usa o ID existente. Se novo, gera um ID baseado no nome (slug) ou aleatório.
      // Aqui vamos gerar um ID aleatório se for novo para evitar conflitos de nomes iguais.
      const docId = isEditing ? existingData.id : doc(collection(db, 'suppliers')).id;
      const supplierRef = doc(db, 'suppliers', docId);

      await setDoc(supplierRef, {
        ...data,
        updatedAt: serverTimestamp(),
        createdAt: isEditing ? existingData.createdAt : serverTimestamp()
      });
      
      toast.success("Empresa salva com sucesso!", { id: toastId });
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message, { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Dados da Empresa</legend>
        
        <div className={styles.formGroup}>
          <label htmlFor="name">Razão Social / Nome Fantasia</label>
          <input id="name" {...register("name")} className={errors.name ? styles.inputError : ''} placeholder="Ex: Tech Solutions Ltda" />
          {errors.name && <p className={styles.errorMessage}>{errors.name.message}</p>}
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="cnpj">CNPJ</label>
            <input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0001-00" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="serviceType">Tipo de Serviço</label>
            <input id="serviceType" {...register("serviceType")} placeholder="Ex: Locação de Impressoras" className={errors.serviceType ? styles.inputError : ''} />
            {errors.serviceType && <p className={styles.errorMessage}>{errors.serviceType.message}</p>}
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Contato e Contrato</legend>
        
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="contactName">Nome do Contato</label>
            <input id="contactName" {...register("contactName")} placeholder="Ex: João Silva" className={errors.contactName ? styles.inputError : ''} />
            {errors.contactName && <p className={styles.errorMessage}>{errors.contactName.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="phone">Telefone / WhatsApp</label>
            <input id="phone" {...register("phone")} placeholder="(00) 00000-0000" className={errors.phone ? styles.inputError : ''} />
            {errors.phone && <p className={styles.errorMessage}>{errors.phone.message}</p>}
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="email">E-mail de Suporte</label>
            <input id="email" type="email" {...register("email")} placeholder="suporte@empresa.com" className={errors.email ? styles.inputError : ''} />
            {errors.email && <p className={styles.errorMessage}>{errors.email.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="contractNumber">Nº do Contrato (Opcional)</label>
            <input id="contractNumber" {...register("contractNumber")} placeholder="Ex: CTR-2024/001" />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="notes">Observações</label>
          <textarea id="notes" {...register("notes")} rows={2} className={styles.textarea}></textarea>
        </div>
      </fieldset>

      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Empresa"}
        </button>
      </div>
    </form>
  );
};

export default AddSupplierForm;