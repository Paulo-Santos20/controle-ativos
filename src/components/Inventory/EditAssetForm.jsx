import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  writeBatch
} from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import styles from './AssetForms.module.css';
import {
  TIPOS_ATIVO_COMPUTADOR,
  OPCOES_POSSE,
  OPCOES_STATUS,
  OPCOES_SO,
  OPCOES_PAVIMENTO,
  OPCOES_SETOR,
  OPCOES_SALA
} from '../../constants/options';

/**
 * Schema de validação Zod para editar um Computador.
 * (Não valida 'tombamento' pois é o ID e não é editável).
 */
const assetSchema = z.object({
  // Seção "Dados"
  tipoAtivo: z.string().min(1, "O Tipo de Ativo é obrigatório"),
  marca: z.string().min(1, "A Marca é obrigatória"),
  modelo: z.string().min(1, "O Modelo é obrigatório"),
  hostname: z.string().optional().or(z.literal('')), 
  serial: z.string().min(3, "O Serial é obrigatório"), 
  serviceTag: z.string().optional().or(z.literal('')), 
  macAddress: z.string()
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, "Formato de MAC inválido (ex: 00:1A:2B:3C:4D:5E)")
    .optional().or(z.literal('')),
  posse: z.string().min(1, "A posse é obrigatória"), 
  status: z.string().min(1, "O status é obrigatório"), 
  
  // Seção "Configuração"
  memoria: z.string().optional().or(z.literal('')), 
  hdSsd: z.string().optional().or(z.literal('')), 
  processador: z.string().optional().or(z.literal('')), 
  antivirus: z.string().optional().or(z.literal('')), 
  so: z.string().min(1, "O S.O. é obrigatório"),
  soVersao: z.string().optional().or(z.literal('')), 
  
  // Seção "Localização"
  unitId: z.string().min(1, "A Unidade é obrigatória"), 
  pavimento: z.string().min(1, "O Pavimento é obrigatório"),
  setor: z.string().min(1, "O Setor é obrigatório"), 
  sala: z.string().min(1, "A Sala é obrigatória"),
  funcionario: z.string().optional().or(z.literal('')), 
  observacao: z.string().optional().or(z.literal('')),
});

/**
 * Formulário para EDITAR um Ativo (Computador) existente.
 * @param {object} props
 * @param {() => void} props.onClose - Função para fechar o modal.
 * @param {string} props.assetId - O ID (Tombamento) do ativo.
 * @param {object} props.existingData - Os dados atuais do ativo para pré-preencher.
 */
const EditAssetForm = ({ onClose, assetId, existingData }) => {
  // Busca 'units' (Hospitais) para o dropdown de Localização
  const [units, loadingUnits] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(assetSchema)
  });

  // UI/UX: Preenche o formulário com os dados existentes
  useEffect(() => {
    if (existingData) {
      reset(existingData); // 'reset' do react-hook-form preenche todos os campos
    }
  }, [existingData, reset]);

  /**
   * Salva as alterações no ativo e, se o status mudou,
   * cria um log de histórico em uma transação.
   */
  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando alterações...");
    try {
      // 1. Inicia o Lote (Princípio 5: Código de Alta Qualidade)
      const batch = writeBatch(db);

      // 2. Define a atualização do documento principal
      const assetRef = doc(db, 'assets', assetId);
      const updatedAsset = { 
        ...data, 
        lastSeen: serverTimestamp() // Atualiza "visto por último"
      };
      // 'merge: true' preserva campos como 'createdAt'
      batch.set(assetRef, updatedAsset, { merge: true });

      // 3. (A CORREÇÃO) Verifica se o status mudou e cria o log
      const statusHasChanged = existingData.status !== data.status;
      
      if (statusHasChanged) {
        const historyRef = doc(collection(assetRef, 'history')); // Cria log na subcoleção
        batch.set(historyRef, {
          type: "Atualização de Status",
          details: `Status alterado de "${existingData.status}" para "${data.status}".`,
          oldStatus: existingData.status,
          newStatus: data.status,
          timestamp: serverTimestamp(),
          user: auth.currentUser.displayName || auth.currentUser.email,
        });
      }
      
      // 4. Executa a transação
      await batch.commit();
      
      toast.success(`Ativo ${assetId} atualizado!`, { id: toastId });
      onClose(); // Fecha o modal
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar: " + error.message, { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      {/* === SEÇÃO DADOS === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Dados do Ativo</legend>
        
        {/* UI/UX: Mostra o ID (Tombamento) mas não permite edição */}
        <div className={styles.formGroup}>
            <label>Tombamento (ID)</label>
            <input defaultValue={assetId} disabled className={styles.inputDisabled} />
            <small>O Tombamento (ID) não pode ser editado.</small>
        </div>
        
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="tipoAtivo">Tipo Ativo</label>
            <select id="tipoAtivo" {...register("tipoAtivo")} className={errors.tipoAtivo ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {TIPOS_ATIVO_COMPUTADOR.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
            {errors.tipoAtivo && <p className={styles.errorMessage}>{errors.tipoAtivo.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="marca">Marca</label>
            <input id="marca" {...register("marca")} placeholder="Ex: Dell, HP, Lenovo" className={errors.marca ? styles.inputError : ''} />
            {errors.marca && <p className={styles.errorMessage}>{errors.marca.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="modelo">Modelo</label>
            <input id="modelo" {...register("modelo")} placeholder="Ex: Optiplex 3080" className={errors.modelo ? styles.inputError : ''} />
            {errors.modelo && <p className={styles.errorMessage}>{errors.modelo.message}</p>}
          </div>
        </div>
        
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="serial">Serial</label>
            <input id="serial" {...register("serial")} className={errors.serial ? styles.inputError : ''} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="hostname">Hostname</label>
            <input id="hostname" {...register("hostname")} />
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="serviceTag">Service Tag</label>
            <input id="serviceTag" {...register("serviceTag")} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="macAddress">Endereço MAC</label>
            <input id="macAddress" {...register("macAddress")} placeholder="Ex: 00:1A:2B:3C:4D:5E" className={errors.macAddress ? styles.inputError : ''} />
            {errors.macAddress && <p className={styles.errorMessage}>{errors.macAddress.message}</p>}
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="posse">Posse</label>
            <select id="posse" {...register("posse")} className={errors.posse ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_POSSE.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select id="status" {...register("status")} className={errors.status ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_STATUS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      {/* === SEÇÃO CONFIGURAÇÃO === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Configuração</legend>
         <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="processador">Processador</label>
            <input id="processador" {...register("processador")} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="memoria">Memória</label>
            <input id="memoria" {...register("memoria")} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="hdSsd">HD/SSD</label>
            <input id="hdSsd" {...register("hdSsd")} />
          </div>
        </div>
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="so">Sistema Operacional</label>
            <select id="so" {...register("so")} className={errors.so ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_SO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="soVersao">Versão do S.O.</label>
            <input id="soVersao" {...register("soVersao")} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="antivirus">Anti-virus</label>
            <input id="antivirus" {...register("antivirus")} />
          </div>
        </div>
      </fieldset>

      {/* === SEÇÃO LOCALIZAÇÃO === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Localização</legend>
         <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="unitId">Unidade</label>
            <select id="unitId" {...register("unitId")} className={errors.unitId ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {loadingUnits && <option>Carregando...</option>}
              {units?.docs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.data().name} ({doc.data().sigla})</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="pavimento">Pavimento</label>
            <select id="pavimento" {...register("pavimento")} className={errors.pavimento ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_PAVIMENTO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="setor">Setor</label>
            <select id="setor" {...register("setor")} className={errors.setor ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_SETOR.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="sala">Sala</label>
            <select id="sala" {...register("sala")} className={errors.sala ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_SALA.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="funcionario">Funcionário (Usuário)</label>
            <input id="funcionario" {...register("funcionario")} />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="observacao">Observação</label>
          <textarea id="observacao" {...register("observacao")} rows={3} className={styles.textarea}></textarea>
        </div>
      </fieldset>

      {/* --- Botões de Ação --- */}
      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </form>
  );
};

export default EditAssetForm;