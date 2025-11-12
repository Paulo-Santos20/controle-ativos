import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '/src/lib/firebase.js'; // Importa 'auth'
import { toast } from 'sonner';
import styles from './AssetForms.module.css'; // Reutiliza o CSS

// --- COPIADO DO 'AddAssetForm.jsx' PARA CONSISTÊNCIA (Princípio 5) ---
// (Idealmente, isso viveria em um arquivo 'constants.js' compartilhado)
const opcoesPavimento = ["Subsolo", "Térreo", "1º Andar", "2º Andar", "3º Andar", "4º Andar", "Outro"];
const opcoesSetor = [
  "Recepção", "Triagem", "Emergência", "UTI Adulto", "UTI Neonatal", "UTI Pediátrica",
  "Bloco Cirúrgico", "Centro Obstétrico", "Enfermaria", "Apartamentos", 
  "Centro de Diagnóstico (CDI)", "Laboratório", "Farmácia", "Almoxarifado", 
  "TI", "Administração", "Faturamento", "Manutenção", "Nutrição (SND)", "Higienização (SHL)", "Outro"
];
const opcoesSala = [
  "Bloco", "Central", "Laudos", "Emergência",
  ...Array.from({ length: 10 }, (_, i) => `Consultório ${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `CPD ${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `Recepção ${i + 1}`),
  ...Array.from({ length: 2 }, (_, i) => `Posto ${i + 1}`),
];

// Schema Zod atualizado
const moveSchema = z.object({
  pavimento: z.string().min(1, "O novo pavimento é obrigatório"),
  setor: z.string().min(1, "O novo setor é obrigatório"),
  sala: z.string().min(1, "A nova sala é obrigatória"),
  funcionario: z.string().optional().or(z.literal('')),
  details: z.string().min(5, "Detalhes/Motivo são obrigatórios"),
});

const MoveAssetForm = ({ onClose, assetId, currentData }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(moveSchema),
    // UI/UX de Excelência: Pré-preenche o formulário com os dados atuais
    defaultValues: {
      pavimento: currentData.pavimento || "",
      setor: currentData.setor || "",
      sala: currentData.sala || "",
      funcionario: currentData.funcionario || "",
    }
  });

  const onSubmit = async (data) => {
    const toastId = toast.loading("Movimentando ativo...");
    
    // UI/UX: Verifica se algo realmente mudou
    if (data.pavimento === currentData.pavimento &&
        data.setor === currentData.setor &&
        data.sala === currentData.sala &&
        data.funcionario === currentData.funcionario) 
    {
      toast.error("Nenhuma alteração detectada. A localização é a mesma.", { id: toastId });
      return;
    }

    try {
      // Código de Alta Qualidade: Transação em Lote
      const batch = writeBatch(db);

      // 1. Referência ao documento principal do ativo
      const assetRef = doc(db, 'assets', assetId);
      batch.update(assetRef, {
        pavimento: data.pavimento,
        setor: data.setor,
        sala: data.sala,
        funcionario: data.funcionario,
        lastSeen: serverTimestamp() // Atualiza "visto por último"
      });

      // 2. Referência ao novo documento no histórico (Log)
      const historyRef = doc(collection(db, 'assets', assetId, 'history'));
      
      // Monta uma string de detalhes mais rica
      const detailsLog = `
        De: ${currentData.pavimento}, ${currentData.setor}, ${currentData.sala || 'N/A'}
        Para: ${data.pavimento}, ${data.setor}, ${data.sala || 'N/A'}.
        Motivo: ${data.details}
      `;
      
      batch.set(historyRef, {
        type: "Movimentação",
        details: detailsLog,
        timestamp: serverTimestamp(),
        user: auth.currentUser.displayName || auth.currentUser.email,
        // Salva os dados antigos e novos para auditoria
        oldData: {
          pavimento: currentData.pavimento || "",
          setor: currentData.setor || "",
          sala: currentData.sala || "",
        },
        newData: {
          pavimento: data.pavimento,
          setor: data.setor,
          sala: data.sala,
        }
      });

      // 3. Executa a transação
      await batch.commit();
      
      toast.success("Ativo movimentado com sucesso!", { id: toastId });
      onClose();
    } catch (error) {
      toast.error("Erro: " + error.message, { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Nova Localização</legend>
        
        {/* --- CAMPOS ATUALIZADOS PARA <select> --- */}
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="pavimento">Novo Pavimento</label>
            <select id="pavimento" {...register("pavimento")} className={errors.pavimento ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesPavimento.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.pavimento && <p className={styles.errorMessage}>{errors.pavimento.message}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="setor">Novo Setor</label>
            <select id="setor" {...register("setor")} className={errors.setor ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesSetor.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.setor && <p className={styles.errorMessage}>{errors.setor.message}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="sala">Nova Sala</label>
            <select id="sala" {...register("sala")} className={errors.sala ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesSala.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.sala && <p className={styles.errorMessage}>{errors.sala.message}</p>}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="funcionario">Novo Funcionário (Usuário)</label>
          <input 
            id="funcionario" 
            {...register("funcionario")} 
            placeholder="Opcional. Ex: dr.paulo, recepcao.uti" 
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="details">Motivo / Detalhes da Movimentação</label>
          <textarea 
            id="details" 
            {...register("details")} 
            rows={3} 
            className={`${styles.textarea} ${errors.details ? styles.inputError : ''}`}
            placeholder="Ex: Movido para cobrir leito 05, Devolvido para TI"
          ></textarea>
          {errors.details && <p className={styles.errorMessage}>{errors.details.message}</p>}
        </div>
      </fieldset>
      
      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Movimentando..." : "Confirmar Movimentação"}
        </button>
      </div>
    </form>
  );
};

export default MoveAssetForm;