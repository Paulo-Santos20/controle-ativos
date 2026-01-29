import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  collection, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy, 
  writeBatch // Importa o writeBatch para transações atômicas (Edição + Histórico)
} from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from '/src/lib/firebase.js'; 
import { toast } from 'sonner';
import styles from './AssetForms.module.css'; 

// --- Constantes Atualizadas ---
const tiposAtivo = [
  "Multifuncional", 
  "Comum", 
  "Etiquetadora", 
  "Pulseira", 
  "Térmica", 
  "Outro"
];
const opcoesMarca = [
  "Brother", "HP", "Epson", "Gainscha", "Dascom", 
  "GODEX", "Konica Minolta", "Ricoh", "Samsung", "Outra"
];
const opcoesPropriedade = ["Própria", "Alugada", "Doação"];
const opcoesStatus = [
  "Em uso", "Manutenção", "Inativo", "Estoque", 
  "Manutenção agendada", "Devolução agendada", "Devolvido", "Reativação agendada"
];
const opcoesConectividade = ["Rede/USB", "Rede", "USB", "Wi-Fi", "Bluetooth", "Outro"];
const opcoesFrenteVerso = ["Sim", "Não", "Não se aplica"];

// --- ATUALIZADO: Opção 'Etiqueta' incluída ---
const opcoesCartucho = [
  "Laser (Toner)", 
  "Jato de Tinta", 
  "Térmica (Ribbon)", 
  "Térmica (Direta)", 
  "Matricial (Fita)", 
  "Etiqueta", 
  "Outro"
];
const opcoesColorido = ["Sim", "Não"];

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

/**
 * Schema de validação Zod para EDITAR.
 * OBS: O campo 'tombamento' NÃO está aqui pois ele é o ID do documento
 * e não deve ser alterado na edição, apenas visualizado.
 */
const printerSchema = z.object({
  // Seção "Dados"
  tipoAtivo: z.string().min(1, "O Tipo de Ativo é obrigatório"),
  marca: z.string().min(1, "A Marca é obrigatória"),
  modelo: z.string().min(1, "O Modelo é obrigatório"),
  serial: z.string().min(3, "O Serial é obrigatório"),
  propriedade: z.string().min(1, "A Propriedade é obrigatória"),
  status: z.string().min(1, "O Status é obrigatório"),
  
  // Seção "Configuração"
  conectividade: z.string().min(1, "A Conectividade é obrigatória"),
  frenteVerso: z.string().min(1, "Frente e Verso é obrigatório"),
  
  // Seção "Insumos"
  cartucho: z.string().min(1, "O tipo de Insumo é obrigatório"),
  colorido: z.string().min(1, "Informe se é colorido"),
  cartuchoColorido: z.string().optional().or(z.literal('')),
  cartuchoPreto: z.string().optional().or(z.literal('')),
  drCilindro: z.string().optional().or(z.literal('')),
  
  // Seção "Localização"
  unitId: z.string().min(1, "A Unidade é obrigatória"),
  pavimento: z.string().min(1, "O Pavimento é obrigatório"),
  setor: z.string().min(1, "O Setor é obrigatório"),
  sala: z.string().min(1, "A Sala é obrigatória"),
  funcionario: z.string().optional().or(z.literal('')),
  observacao: z.string().optional().or(z.literal('')),
});

/**
 * Formulário para EDITAR um Ativo (Impressora) existente.
 */
const EditPrinterForm = ({ onClose, assetId, existingData }) => {
  // Busca 'units' (Hospitais) para o dropdown de Localização
  const [units, loadingUnits] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  const { 
    register, 
    handleSubmit, 
    reset,
    watch,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(printerSchema)
  });

  // Preenche o formulário com os dados existentes ao abrir
  useEffect(() => {
    if (existingData) {
      reset(existingData); 
    }
  }, [existingData, reset]);

  // UI/UX: Observa o campo 'colorido' para mostrar/ocultar o input
  const isColorida = watch("colorido") === "Sim";

  /**
   * Salva as alterações e gera histórico se necessário
   */
  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando alterações...");
    try {
      // 1. Inicia o Lote (Batch)
      const batch = writeBatch(db);

      // 2. Define a atualização do documento principal
      const assetRef = doc(db, 'assets', assetId);
      
      const updatedAsset = { 
        ...data, 
        lastSeen: serverTimestamp() // Atualiza data de modificação
      };
      
      // O 'tombamento' (ID) não é alterado aqui, pois ele é a chave do documento
      batch.set(assetRef, updatedAsset, { merge: true });

      // 3. Verifica se o status mudou para criar log
      const statusHasChanged = existingData.status !== data.status;
      
      if (statusHasChanged) {
        const historyRef = doc(collection(assetRef, 'history')); 
        batch.set(historyRef, {
          type: "Atualização de Status",
          details: `Status alterado de "${existingData.status}" para "${data.status}".`,
          oldStatus: existingData.status,
          newStatus: data.status,
          timestamp: serverTimestamp(),
          user: auth.currentUser?.email || "Sistema",
        });
      }
      
      // 4. Efetiva as mudanças
      await batch.commit();
      
      toast.success(`Impressora atualizada com sucesso!`, { id: toastId });
      onClose(); 
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar: " + error.message, { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      {/* === SEÇÃO DADOS === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Dados da Impressora</legend>
        
        {/* UI/UX: Mostra o ID (Tombamento) mas desabilitado */}
        <div className={styles.formGroup}>
            <label>Tombamento (ID)</label>
            <input defaultValue={assetId} disabled className={styles.inputDisabled} />
            <small style={{color: '#666', fontSize: '0.8em'}}>O Tombamento (ID) não pode ser alterado na edição.</small>
        </div>

        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="tipoAtivo">Tipo Ativo</label>
            <select id="tipoAtivo" {...register("tipoAtivo")} className={errors.tipoAtivo ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {tiposAtivo.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
            {errors.tipoAtivo && <p className={styles.errorMessage}>{errors.tipoAtivo.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="marca">Marca</label>
            <select id="marca" {...register("marca")} className={errors.marca ? styles.inputError : ''}>
              <option value="">Selecione a marca...</option>
              {opcoesMarca.map(marca => <option key={marca} value={marca}>{marca}</option>)}
            </select>
            {errors.marca && <p className={styles.errorMessage}>{errors.marca.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="modelo">Modelo</label>
            <input id="modelo" {...register("modelo")} placeholder="Ex: HL-L5102DW" className={errors.modelo ? styles.inputError : ''} />
            {errors.modelo && <p className={styles.errorMessage}>{errors.modelo.message}</p>}
          </div>
        </div>

        <div className={styles.grid3}>
           <div className={styles.formGroup}>
            <label htmlFor="serial">Serial</label>
            <input id="serial" {...register("serial")} className={errors.serial ? styles.inputError : ''} />
            {errors.serial && <p className={styles.errorMessage}>{errors.serial.message}</p>}
          </div>
           <div className={styles.formGroup}>
            <label htmlFor="propriedade">Propriedade</label>
            <select id="propriedade" {...register("propriedade")} className={errors.propriedade ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesPropriedade.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.propriedade && <p className={styles.errorMessage}>{errors.propriedade.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select id="status" {...register("status")} className={errors.status ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesStatus.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.status && <p className={styles.errorMessage}>{errors.status.message}</p>}
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
              <option value="">Selecione...</option>
              {opcoesConectividade.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.conectividade && <p className={styles.errorMessage}>{errors.conectividade.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="frenteVerso">Frente e Verso (Duplex)</label>
            <select id="frenteVerso" {...register("frenteVerso")} className={errors.frenteVerso ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesFrenteVerso.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.frenteVerso && <p className={styles.errorMessage}>{errors.frenteVerso.message}</p>}
          </div>
        </div>
      </fieldset>

      {/* === SEÇÃO INSUMOS === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Insumos</legend>
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="cartucho">Tipo de Insumo (Cartucho)</label>
            <select id="cartucho" {...register("cartucho")} className={errors.cartucho ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesCartucho.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.cartucho && <p className={styles.errorMessage}>{errors.cartucho.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="colorido">Colorido?</label>
            <select id="colorido" {...register("colorido")} className={errors.colorido ? styles.inputError : ''}>
              {opcoesColorido.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.colorido && <p className={styles.errorMessage}>{errors.colorido.message}</p>}
          </div>
        </div>
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="cartuchoPreto">Modelo Cartucho Preto</label>
            <input id="cartuchoPreto" {...register("cartuchoPreto")} placeholder="Ex: TN-3472" />
          </div>
          {isColorida && (
            <div className={styles.formGroup}>
              <label htmlFor="cartuchoColorido">Modelo Cartucho Colorido</label>
              <input id="cartuchoColorido" {...register("cartuchoColorido")} placeholder="Ex: TN-3472C/M/Y" />
            </div>
          )}
          <div className={styles.formGroup}>
            <label htmlFor="drCilindro">Modelo DR/Cilindro</label>
            <input id="drCilindro" {...register("drCilindro")} placeholder="Ex: DR-3440" />
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
            {errors.unitId && <p className={styles.errorMessage}>{errors.unitId.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="pavimento">Pavimento</label>
            <select id="pavimento" {...register("pavimento")} className={errors.pavimento ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesPavimento.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.pavimento && <p className={styles.errorMessage}>{errors.pavimento.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="setor">Setor</label>
            <select id="setor" {...register("setor")} className={errors.setor ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesSetor.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.setor && <p className={styles.errorMessage}>{errors.setor.message}</p>}
          </div>
        </div>
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="sala">Sala</label>
            <select id="sala" {...register("sala")} className={errors.sala ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {opcoesSala.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.sala && <p className={styles.errorMessage}>{errors.sala.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="funcionario">Funcionário (Usuário)</label>
            <input id="funcionario" {...register("funcionario")} placeholder="Ex: recepcao.uti" />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="observacao">Observação</label>
          <textarea id="observacao" {...register("observacao")} rows={3} className={styles.textarea}></textarea>
        </div>
      </fieldset>

      {/* === Botões de Ação === */}
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