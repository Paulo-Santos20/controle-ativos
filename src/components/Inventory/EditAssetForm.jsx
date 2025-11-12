import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, setDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import styles from './AssetForms.module.css'; // Reutiliza o CSS

// Constantes (copiadas do AddAssetForm)
const tiposAtivo = ["Desktop", "All in One", "Notebook", "Tablet"];
const opcoesPosse = ["Própria", "Alugado", "Doação", "Empréstimo"];
const opcoesStatus = [
  "Em uso", "Manutenção", "Inativo", "Estoque", 
  "Manutenção agendada", "Devolução agendada", "Devolvido", "Reativação agendada"
];
const opcoesSO = [
  "Windows 11 Pro", "Windows 11 Home", "Windows 10 Pro", "Windows 10 Home",
  "Ubuntu", "Linux (Outro)", "macOS", "Não possui"
];
const opcoesPavimento = ["Subsolo", "Térreo", "1º Andar", "2º Andar", "3º Andar", "4º Andar", "Outro"];
const opcoesSetor = [
  "Recepção", "Triagem", "Emergência", "UTI Adulto", "UTI Neonatal", "UTI Pediátrica",
  "Bloco Cirúrgico", "Centro Obstétrico", "Enfermaria", "Apartamentos", "Centro de Diagnóstico (CDI)", 
  "Laboratório", "Farmácia", "Almoxarifado", "TI", "Administração", "Faturamento", 
  "Manutenção", "Nutrição (SND)", "Higienização (SHL)", "Outro"
];
const opcoesSala = [
  "Bloco", "Central", "Laudos", "Emergência",
  ...Array.from({ length: 10 }, (_, i) => `Consultório ${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `CPD ${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `Recepção ${i + 1}`),
  ...Array.from({ length: 2 }, (_, i) => `Posto ${i + 1}`),
];

// Schema (igual ao AddAssetForm, mas o 'tombamento' não é mais necessário)
const assetSchema = z.object({
  tipoAtivo: z.string().min(1), marca: z.string().min(1), modelo: z.string().min(1),
  hostname: z.string().optional().or(z.literal('')), serial: z.string().min(3),
  serviceTag: z.string().optional().or(z.literal('')), posse: z.string().min(1),
  status: z.string().min(1), memoria: z.string().optional().or(z.literal('')),
  hdSsd: z.string().optional().or(z.literal('')), processador: z.string().optional().or(z.literal('')),
  antivirus: z.string().optional().or(z.literal('')), so: z.string().min(1),
  soVersao: z.string().optional().or(z.literal('')), unitId: z.string().min(1),
  pavimento: z.string().min(1), setor: z.string().min(1),
  sala: z.string().min(1), funcionario: z.string().optional().or(z.literal('')),
  observacao: z.string().optional().or(z.literal('')),
  // Tombamento não está aqui porque não é editável
});

const EditAssetForm = ({ onClose, assetId, existingData }) => {
  const [units, loadingUnits] = useCollection(query(collection(db, 'units'), orderBy('name', 'asc')));

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

  // Salva no backend (ATUALIZA)
  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando alterações...");
    try {
      const assetRef = doc(db, 'assets', assetId); // Usa o ID (Tombamento)
      
      const updatedAsset = {
        ...data,
        lastSeen: serverTimestamp() // Atualiza a data de "visto por último"
      };

      // setDoc com 'merge: true' atualiza os campos, não sobrescreve o doc inteiro
      // Isso preserva o 'createdAt'
      await setDoc(assetRef, updatedAsset, { merge: true });
      
      toast.success(`Ativo ${assetId} atualizado!`, { id: toastId });
      onClose(); // Fecha o modal
    } catch (error) {
      toast.error("Erro ao atualizar: " + error.message, { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      {/* === SEÇÃO DADOS === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Dados do Ativo</legend>
        
        {/* Tombamento (ID) - Mostrado mas desabilitado (UI/UX) */}
        <div className={styles.formGroup}>
            <label>Tombamento (ID)</label>
            <input defaultValue={assetId} disabled className={styles.inputDisabled} />
            <small>O Tombamento (ID) não pode ser editado.</small>
        </div>
        
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="tipoAtivo">Tipo Ativo</label>
            <select id="tipoAtivo" {...register("tipoAtivo")} className={errors.tipoAtivo ? styles.inputError : ''}>
              {tiposAtivo.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="marca">Marca</label>
            <input id="marca" {...register("marca")} className={errors.marca ? styles.inputError : ''} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="modelo">Modelo</label>
            <input id="modelo" {...register("modelo")} className={errors.modelo ? styles.inputError : ''} />
          </div>
        </div>
        
        {/* ... (Todos os outros campos, idênticos ao AddAssetForm.jsx) ... */}
        
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="serial">Serial</label>
            <input id="serial" {...register("serial")} className={errors.serial ? styles.inputError : ''} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="serviceTag">Service Tag</label>
            <input id="serviceTag" {...register("serviceTag")} />
          </div>
           <div className={styles.formGroup}>
            <label htmlFor="hostname">Hostname</label>
            <input id="hostname" {...register("hostname")} />
          </div>
        </div>
        
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="posse">Posse</label>
            <select id="posse" {...register("posse")} className={errors.posse ? styles.inputError : ''}>
              {opcoesPosse.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select id="status" {...register("status")} className={errors.status ? styles.inputError : ''}>
              {opcoesStatus.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      {/* === SEÇÃO CONFIGURAÇÃO === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Configuração</legend>
         {/* ... (Todos os campos de Configuração) ... */}
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
              {opcoesSO.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
        {/* ... (Todos os campos de Localização) ... */}
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
              {opcoesPavimento.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="setor">Setor</label>
            <select id="setor" {...register("setor")} className={errors.setor ? styles.inputError : ''}>
              {opcoesSetor.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="sala">Sala</label>
            <select id="sala" {...register("sala")} className={errors.sala ? styles.inputError : ''}>
              {opcoesSala.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
        <button type="button" onClick={onClose} className={styles.secondaryButton}>
          Cancelar
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </form>
  );
};

export default EditAssetForm;