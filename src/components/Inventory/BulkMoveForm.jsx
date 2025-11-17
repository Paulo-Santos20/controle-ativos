import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import styles from './AssetForms.module.css'; // Reutiliza CSS

// As opções (copiadas dos outros forms para consistência)
const opcoesPavimento = ["Subsolo", "Térreo", "1º Andar", "2º Andar", "3º Andar", "4º Andar", "Outro"];
const opcoesSetor = ["Recepção", "Triagem", "Emergência", "UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "Bloco Cirúrgico", "Centro Obstétrico", "Enfermaria", "Apartamentos", "Centro de Diagnóstico (CDI)", "Laboratório", "Farmácia", "Almoxarifado", "TI", "Administração", "Faturamento", "Manutenção", "Nutrição (SND)", "Higienização (SHL)", "Outro"];
const opcoesSala = ["Bloco", "Central", "Laudos", "Emergência", ...Array.from({ length: 10 }, (_, i) => `Consultório ${i + 1}`), ...Array.from({ length: 3 }, (_, i) => `CPD ${i + 1}`), ...Array.from({ length: 3 }, (_, i) => `Recepção ${i + 1}`), ...Array.from({ length: 2 }, (_, i) => `Posto ${i + 1}`)];

const bulkMoveSchema = z.object({
  pavimento: z.string().min(1, "O novo pavimento é obrigatório"),
  setor: z.string().min(1, "O novo setor é obrigatório"),
  sala: z.string().min(1, "A nova sala é obrigatória"),
  funcionario: z.string().optional(),
  details: z.string().min(5, "Justificativa é obrigatória para ações em massa"),
});

const BulkMoveForm = ({ onClose, selectedIds, onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(bulkMoveSchema)
  });

  const onSubmit = async (data) => {
    if (!selectedIds || selectedIds.length === 0) return;

    const toastId = toast.loading(`Movimentando ${selectedIds.length} ativos...`);

    try {
      // O Firestore permite max 500 operações por batch.
      // Cada movimento gera 2 escritas (update asset + create history).
      // Logo, podemos mover no máximo 250 itens por vez com segurança.
      if (selectedIds.length > 250) {
        throw new Error("Por segurança, selecione no máximo 250 itens por vez.");
      }

      const batch = writeBatch(db);
      const user = auth.currentUser.displayName || auth.currentUser.email;
      const timestamp = serverTimestamp();

      selectedIds.forEach(assetId => {
        // 1. Atualizar Ativo
        const assetRef = doc(db, 'assets', assetId);
        batch.update(assetRef, {
          pavimento: data.pavimento,
          setor: data.setor,
          sala: data.sala,
          funcionario: data.funcionario || "", // Pode limpar o funcionário se vazio
          lastSeen: timestamp
        });

        // 2. Criar Log de Histórico
        const historyRef = doc(collection(db, 'assets', assetId, 'history'));
        batch.set(historyRef, {
          type: "Movimentação em Massa",
          details: `Movimentação em lote (${selectedIds.length} itens). Para: ${data.setor} - ${data.sala}.\nMotivo: ${data.details}`,
          unitId: "N/A", // Idealmente pegaria do ativo, mas em massa simplificamos ou buscamos antes
          timestamp: timestamp,
          user: user,
          newData: {
            pavimento: data.pavimento,
            setor: data.setor,
            sala: data.sala
          }
        });
      });

      await batch.commit();
      
      toast.success(`${selectedIds.length} ativos movimentados com sucesso!`, { id: toastId });
      onSuccess(); // Limpa a seleção na lista pai
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro na movimentação em massa: " + error.message, { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.alertBox} style={{backgroundColor: '#fffbeb', padding: '10px', borderRadius: '8px', border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
        <AlertTriangle size={18} />
        <span>Você está prestes a mover <strong>{selectedIds.length}</strong> itens. Esta ação não pode ser desfeita em lote.</span>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Novo Destino (Para Todos)</legend>
        
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label>Novo Pavimento</label>
            <select {...register("pavimento")} className={errors.pavimento ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesPavimento.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Novo Setor</label>
            <select {...register("setor")} className={errors.setor ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesSetor.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Nova Sala</label>
            <select {...register("sala")} className={errors.sala ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesSala.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Responsável (Opcional)</label>
          <input {...register("funcionario")} placeholder="Deixe em branco para remover responsável atual" />
          <small style={{color:'#666'}}>Se deixar em branco, o campo funcionário será limpo nos ativos.</small>
        </div>

        <div className={styles.formGroup}>
          <label>Justificativa (Obrigatória)</label>
          <textarea {...register("details")} rows={2} className={styles.textarea} placeholder="Ex: Mudança de layout do setor de RH"></textarea>
          {errors.details && <p className={styles.errorMessage}>{errors.details.message}</p>}
        </div>
      </fieldset>

      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className={styles.spinner} /> : `Mover ${selectedIds.length} Ativos`}
        </button>
      </div>
    </form>
  );
};

export default BulkMoveForm;