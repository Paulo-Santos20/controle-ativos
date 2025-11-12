import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, setDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import styles from './AssetForms.module.css'; // Reutiliza o CSS

// --- Constantes (idênticas ao AddPrinterForm) ---
const tiposAtivo = ["Multifuncional", "Comum", "Etiquetadora", "Pulseira", "Térmica", "Outro"];
const opcoesMarca = ["Brother", "HP", "Epson", "Gainscha", "Dascom", "GODEX", "Konica Minolta", "Ricoh", "Samsung", "Outra"];
const opcoesPropriedade = ["Própria", "Alugada", "Doação"];
const opcoesStatus = ["Em uso", "Manutenção", "Inativo", "Estoque", "Manutenção agendada", "Devolução agendada", "Devolvido", "Reativação agendada"];
const opcoesConectividade = ["Rede/USB", "Rede", "USB", "Wi-Fi", "Bluetooth", "Outro"];
const opcoesFrenteVerso = ["Sim", "Não", "Não se aplica"];
const opcoesCartucho = ["Laser (Toner)", "Jato de Tinta", "Térmica (Ribbon)", "Térmica (Direta)", "Matricial (Fita)", "Outro"];
const opcoesColorido = ["Sim", "Não"];
const opcoesPavimento = ["Subsolo", "Térreo", "1º Andar", "2º Andar", "3º Andar", "4º Andar", "Outro"];
const opcoesSetor = ["Recepção", "Triagem", "Emergência", "UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "Bloco Cirúrgico", "Centro Obstétrico", "Enfermaria", "Apartamentos", "Centro de Diagnóstico (CDI)", "Laboratório", "Farmácia", "Almoxarifado", "TI", "Administração", "Faturamento", "Manutenção", "Nutrição (SND)", "Higienização (SHL)", "Outro"];
const opcoesSala = ["Bloco", "Central", "Laudos", "Emergência", ...Array.from({ length: 10 }, (_, i) => `Consultório ${i + 1}`), ...Array.from({ length: 3 }, (_, i) => `CPD ${i + 1}`), ...Array.from({ length: 3 }, (_, i) => `Recepção ${i + 1}`), ...Array.from({ length: 2 }, (_, i) => `Posto ${i + 1}`)];

// Schema (idêntico ao AddPrinterForm, mas 'tombamento' não é necessário na validação de dados)
const printerSchema = z.object({
  tipoAtivo: z.string().min(1), marca: z.string().min(1), modelo: z.string().min(1),
  serial: z.string().min(3), propriedade: z.string().min(1), status: z.string().min(1),
  conectividade: z.string().min(1), frenteVerso: z.string().min(1), cartucho: z.string().min(1),
  colorido: z.string().min(1), cartuchoColorido: z.string().optional().or(z.literal('')),
  cartuchoPreto: z.string().optional().or(z.literal('')), drCilindro: z.string().optional().or(z.literal('')),
  unitId: z.string().min(1), pavimento: z.string().min(1), setor: z.string().min(1),
  sala: z.string().min(1), funcionario: z.string().optional().or(z.literal('')),
  observacao: z.string().optional().or(z.literal('')),
});

const EditPrinterForm = ({ onClose, assetId, existingData }) => {
  const [units, loadingUnits] = useCollection(query(collection(db, 'units'), orderBy('name', 'asc')));

  const { 
    register, 
    handleSubmit, 
    reset,
    watch,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(printerSchema)
  });

  // UI/UX: Preenche o formulário com os dados existentes
  useEffect(() => {
    if (existingData) {
      reset(existingData); // 'reset' preenche todos os campos
    }
  }, [existingData, reset]);

  const isColorida = watch("colorido") === "Sim";

  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando alterações...");
    try {
      const assetRef = doc(db, 'assets', assetId); // Usa o ID (Tombamento)
      const updatedAsset = {
        ...data,
        lastSeen: serverTimestamp() // Atualiza "visto por último"
      };

      // setDoc com 'merge: true' atualiza, preservando 'createdAt'
      await setDoc(assetRef, updatedAsset, { merge: true });
      
      toast.success(`Impressora ${assetId} atualizada!`, { id: toastId });
      onClose();
    } catch (error) {
      toast.error("Erro ao atualizar: ".concat(error.message), { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      {/* === SEÇÃO DADOS === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Dados da Impressora</legend>
        
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
            <select id="marca" {...register("marca")} className={errors.marca ? styles.inputError : ''}>
              {opcoesMarca.map(marca => <option key={marca} value={marca}>{marca}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="modelo">Modelo</label>
            <input id="modelo" {...register("modelo")} className={errors.modelo ? styles.inputError : ''} />
          </div>
        </div>

        <div className={styles.grid3}>
           <div className={styles.formGroup}>
            <label htmlFor="serial">Serial</label>
            <input id="serial" {...register("serial")} className={errors.serial ? styles.inputError : ''} />
           </div>
           <div className={styles.formGroup}>
            <label htmlFor="propriedade">Propriedade</label>
            <select id="propriedade" {...register("propriedade")} className={errors.propriedade ? styles.inputError : ''}>
              {opcoesPropriedade.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="conectividade">Conectividade</label>
            <select id="conectividade" {...register("conectividade")} className={errors.conectividade ? styles.inputError : ''}>
              {opcoesConectividade.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="frenteVerso">Frente e Verso (Duplex)</label>
            <select id="frenteVerso" {...register("frenteVerso")} className={errors.frenteVerso ? styles.inputError : ''}>
              {opcoesFrenteVerso.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      {/* === SEÇÃO INSUMOS === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Insumos</legend>
        {/* ... (Todos os campos de Insumos) ... */}
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="cartucho">Tipo de Insumo (Cartucho)</label>
            <select id="cartucho" {...register("cartucho")} className={errors.cartucho ? styles.inputError : ''}>
              {opcoesCartucho.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="colorido">Colorido?</label>
            <select id="colorido" {...register("colorido")} className={errors.colorido ? styles.inputError : ''}>
              {opcoesColorido.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="cartuchoPreto">Modelo Cartucho Preto</label>
            <input id="cartuchoPreto" {...register("cartuchoPreto")} />
          </div>
          {isColorida && (
            <div className={styles.formGroup}>
              <label htmlFor="cartuchoColorido">Modelo Cartucho Colorido</label>
              <input id="cartuchoColorido" {...register("cartuchoColorido")} />
            </div>
          )}
          <div className={styles.formGroup}>
            <label htmlFor="drCilindro">Modelo DR/Cilindro</label>
            <input id="drCilindro" {...register("drCilindro")} />
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
        <button type="button" onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </form>
  );
};

export default EditPrinterForm;