import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import styles from './AssetForms.module.css';

// Reutiliza as opções de status
const opcoesStatus = [
  "Em manutenção", "Manutenção agendada", "Devolução agendada", 
  "Devolvido", "Reativação agendada", "Em uso", "Inativo"
];

// Schema simples
const maintenanceSchema = z.object({
  newStatus: z.string().min(1, "O novo status é obrigatório"),
  details: z.string().min(5, "Os detalhes são obrigatórios"),
});

const MaintenanceAssetForm = ({ onClose, assetId, currentData }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      newStatus: "Em manutenção" // Padrão
    }
  });

  const onSubmit = async (data) => {
    const toastId = toast.loading("Atualizando status...");
    try {
      const batch = writeBatch(db);

      // 1. Atualiza o documento principal
      const assetRef = doc(db, 'assets', assetId);
      batch.update(assetRef, {
        status: data.newStatus,
        lastSeen: serverTimestamp()
      });

      // 2. Cria o log de histórico
      const historyRef = doc(collection(db, 'assets', assetId, 'history'));
      batch.set(historyRef, {
        type: "Manutenção/Preventiva",
        details: data.details,
        oldStatus: currentData.status,
        newStatus: data.newStatus,
        timestamp: serverTimestamp(),
        user: auth.currentUser.displayName || auth.currentUser.email,
      });

      await batch.commit();
      
      toast.success("Status do ativo atualizado!", { id: toastId });
      onClose();
    } catch (error) {
      toast.error("Erro: " + error.message, { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Registro de Manutenção</legend>
        <div className={styles.formGroup}>
          <label htmlFor="newStatus">Novo Status do Ativo</label>
          <select id="newStatus" {...register("newStatus")} className={errors.newStatus ? styles.inputError : ''}>
            {opcoesStatus.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {errors.newStatus && <p className={styles.errorMessage}>{errors.newStatus.message}</p>}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="details">Detalhes (Ex: Enviado para CompPrint, Troca de tela)</label>
          <textarea id="details" {...register("details")} rows={4} className={`${styles.textarea} ${errors.details ? styles.inputError : ''}`}></textarea>
          {errors.details && <p className={styles.errorMessage}>{errors.details.message}</p>}
        </div>
      </fieldset>
      
      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Registro"}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceAssetForm;