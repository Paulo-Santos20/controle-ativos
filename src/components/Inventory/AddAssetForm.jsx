import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, setDoc, serverTimestamp, query, orderBy, writeBatch, getDoc } from 'firebase/firestore';
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
 * Schema de validação Zod para um novo ativo (Computador).
 * (Princípio 5: Código de Alta Qualidade)
 */
const assetSchema = z.object({
  // Seção "Dados"
  tipoAtivo: z.string().min(1, "O Tipo de Ativo é obrigatório"),
  marca: z.string().min(1, "A Marca é obrigatória"),
  modelo: z.string().min(1, "O Modelo é obrigatório"),
  hostname: z.string().optional().or(z.literal('')), 
  serial: z.string().min(3, "O Serial é obrigatório"), 
  tombamento: z.string().min(3, "O Tombamento (ID do Doc) é obrigatório"), 
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
 * Formulário para registrar um novo ativo (Computador).
 * É chamado pelo Modal principal.
 * @param {object} props
 * @param {() => void} props.onClose - Função para fechar o modal.
 * @param {() => void} props.onBack - Função para voltar ao seletor de tipo.
 */
const AddAssetForm = ({ onClose, onBack }) => {
  const [units, loadingUnits] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );
  const [isChecking, setIsChecking] = useState(false);

  const { 
    register, 
    handleSubmit, 
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(assetSchema)
  });

  const checkTombamentoExists = async (tombamento) => {
    if (!tombamento || tombamento.length < 3) return false;
    const docRef = doc(db, 'assets', tombamento);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  };

  const onSubmit = async (data) => {
    setIsChecking(true);
    clearErrors('tombamento');
    
    const toastId = toast.loading("Verificando tombamento...");
    try {
      const exists = await checkTombamentoExists(data.tombamento);
      if (exists) {
        setError('tombamento', { message: "Tombamento já existe no sistema" });
        toast.error("Tombamento já cadastrado!", { id: toastId });
        setIsChecking(false);
        return;
      }

      toast.loading("Registrando...", { id: toastId });
      const batch = writeBatch(db);

      // 2. Define o documento principal do ativo
      const assetRef = doc(db, 'assets', data.tombamento);
      const newAsset = {
        ...data,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        type: 'computador' // Define o tipo "pai" para filtros
      };
      batch.set(assetRef, newAsset); 

      // 3. Define o PRIMEIRO log de histórico (Princípio 1: Arquitetura Escalável)
      const historyRef = doc(collection(assetRef, 'history'));
      batch.set(historyRef, {
        type: "Registro",
        details: `Ativo registrado no sistema com status "${data.status}".`,
        timestamp: serverTimestamp(),
        user: auth.currentUser.displayName || auth.currentUser.email,
        unitId: data.unitId,
      });
      
      // 4. Executa ambas as operações
      await batch.commit();
      
      toast.success(`Computador ${data.tombamento} registrado!`, { id: toastId });
      onClose(); // Fecha o modal
    } catch (error) {
      console.error("Erro ao registrar ativo:", error);
      toast.error("Erro ao registrar ativo: " + error.message, { id: toastId });
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Limpa todos os campos do formulário.
   */
  const handleClear = () => {
    reset(); 
    toast.info("Formulário limpo.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      {/* === SEÇÃO DADOS === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Dados do Ativo</legend>
        
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
            <label htmlFor="tombamento">Tombamento (ID)</label>
            <input id="tombamento" {...register("tombamento")} placeholder="Digite o tombamento..." className={errors.tombamento ? styles.inputError : ''} />
            {errors.tombamento && <p className={styles.errorMessage}>{errors.tombamento.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="serial">Serial</label>
            <input id="serial" {...register("serial")} placeholder="Digite o serial..." className={errors.serial ? styles.inputError : ''} />
            {errors.serial && <p className={styles.errorMessage}>{errors.serial.message}</p>}
          </div>
        </div>
        
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="serviceTag">Service Tag</label>
            <input id="serviceTag" {...register("serviceTag")} placeholder="Digite o Service Tag..." />
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
            {errors.posse && <p className={styles.errorMessage}>{errors.posse.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select id="status" {...register("status")} className={errors.status ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_STATUS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.status && <p className={styles.errorMessage}>{errors.status.message}</p>}
          </div>
        </div>
         <div className={styles.formGroup}>
            <label htmlFor="hostname">Hostname</label>
            <input id="hostname" {...register("hostname")} placeholder="Ex: HMR-TI01, PAT-12345" />
          </div>
      </fieldset>

      {/* === SEÇÃO CONFIGURAÇÃO === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Configuração</legend>
        
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="processador">Processador</label>
            <input id="processador" {...register("processador")} placeholder="Ex: Core i5 10400" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="memoria">Memória</label>
            <input id="memoria" {...register("memoria")} placeholder="Ex: 8GB DDR4" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="hdSsd">HD/SSD</label>
            <input id="hdSsd" {...register("hdSsd")} placeholder="Ex: 256GB SSD" />
          </div>
        </div>
        
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="so">Sistema Operacional</label>
            <select id="so" {...register("so")} className={errors.so ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_SO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.so && <p className={styles.errorMessage}>{errors.so.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="soVersao">Versão do S.O.</label>
            <input id="soVersao" {...register("soVersao")} placeholder="Ex: 23H2" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="antivirus">Anti-virus</label>
            <input id="antivirus" {...register("antivirus")} placeholder="Ex: Kaspersky" />
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
              <option value="">Selecione a unidade...</option>
              {loadingUnits && <option>Carregando...</option>}
              {units?.docs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.data().name} ({doc.data().sigla})</option>
              ))}
            </select>
            {errors.unitId && <p className={styles.errorMessage}>{errors.unitId.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="pavimento">Pavimento</label>
            <select id="pavimento" {...register("pavimento")} className={errors.pavimento ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_PAVIMENTO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.pavimento && <p className={styles.errorMessage}>{errors.pavimento.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="setor">Setor</label>
            <select id="setor" {...register("setor")} className={errors.setor ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_SETOR.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.setor && <p className={styles.errorMessage}>{errors.setor.message}</p>}
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="sala">Sala</label>
            <select id="sala" {...register("sala")} className={errors.sala ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {OPCOES_SALA.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.sala && <p className={styles.errorMessage}>{errors.sala.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="funcionario">Funcionário (Usuário)</label>
            <input id="funcionario" {...register("funcionario")} placeholder="Ex: dr.paulo, recepcao.uti" />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="observacao">Observação</label>
          <textarea id="observacao" {...register("observacao")} rows={3} className={styles.textarea}></textarea>
        </div>
      </fieldset>

      {/* === Botões de Ação === */}
      <div className={styles.buttonContainer}>
        <button type="button" onClick={onBack} className={styles.secondaryButton}>
          Voltar
        </button>
        <button type="button" onClick={handleClear} className={styles.tertiaryButton}>
          Limpar Formulário
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting || isChecking}>
          {isChecking ? "Verificando..." : isSubmitting ? "Salvando..." : "Registrar Computador"}
        </button>
      </div>
    </form>
  );
};

export default AddAssetForm;