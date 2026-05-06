import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, writeBatch, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import styles from './AssetForms.module.css';

const bulkDeleteSchema = z.object({
  details: z.string().min(10, "Justificativa é obrigatória (mínimo 10 caracteres)"),
  confirm: z.boolean().refine(val => val === true, "Confirmação é obrigatória")
});

const BulkDeleteForm = ({ onClose, selectedIds, onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(bulkDeleteSchema),
    defaultValues: {
      confirm: false
    }
  });

  const onSubmit = async (data) => {
    if (!selectedIds || selectedIds.length === 0) return;

    const toastId = toast.loading(`Excluindo ${selectedIds.length} ativos...`);

    try {
      if (selectedIds.length > 100) {
        throw new Error("Por segurança, selecione no máximo 100 itens por vez.");
      }

      const batch = writeBatch(db);
      const user = auth.currentUser.displayName || auth.currentUser.email;
      const timestamp = serverTimestamp();

      selectedIds.forEach(assetId => {
        const assetRef = doc(db, 'assets', assetId);
        batch.delete(assetRef);

        const historyRef = doc(collection(db, 'system_logs', 'audit', 'history'));
        batch.set(historyRef, {
          action: 'BULK_DELETE',
          assetId: assetId,
          details: `Exclusão em massa (${selectedIds.length} itens). Motivo: ${data.details}`,
          timestamp: timestamp,
          user: user,
          userId: auth.currentUser.uid
        });
      });

      await batch.commit();

      toast.success(`${selectedIds.length} ativos excluídos com sucesso!`, { id: toastId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro na exclusão em massa: " + error.message, { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.alertBox} style={{backgroundColor: 'var(--color-danger-light, #fee2e2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-danger, #dc2626)', color: 'var(--color-danger)', fontSize: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px'}}>
        <AlertTriangle size={20} style={{flexShrink: 0, marginTop: 2}} />
        <div>
          <strong>Atenção!</strong> Você está prestes a excluir <strong>{selectedIds.length}</strong> ativo(s) permanentemente. Esta ação <strong>não pode ser desfeita</strong>.
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Justificativa para Exclusão *</label>
        <textarea
          {...register("details")}
          rows={3}
          className={styles.textarea}
          placeholder="Ex: Ativos duplicados, ativos em desuso, etc."
        />
        {errors.details && <p className={styles.errorMessage}>{errors.details.message}</p>}
      </div>

      <div className={styles.formGroup}>
        <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
          <input
            type="checkbox"
            {...register("confirm")}
            style={{width: '18px', height: '18px', cursor: 'pointer'}}
          />
          <span>Confirmo que desejo excluir {selectedIds.length} ativo(s) permanentemente</span>
        </label>
        {errors.confirm && <p className={styles.errorMessage}>{errors.confirm.message}</p>}
      </div>

      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting} style={{backgroundColor: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '6px'}}>
          {isSubmitting ? <Loader2 className={styles.spinner} size={16} /> : <Trash2 size={16} />}
          Excluir {selectedIds.length} Ativo(s)
        </button>
      </div>
    </form>
  );
};

export default BulkDeleteForm;