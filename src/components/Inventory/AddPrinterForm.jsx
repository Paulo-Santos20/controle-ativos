import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, setDoc, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import styles from './AssetForms.module.css';
import { useOptions } from '../../hooks/useOptions';

/**
 * Schema de validação Zod para uma nova Impressora.
 */
const printerSchema = z.object({
  // --- Seção "Dados" ---
  tipoAtivo: z.string().optional().or(z.literal('')),
  marca: z.string().optional().or(z.literal('')),
  modelo: z.string().optional().or(z.literal('')),
  serial: z.string().optional().or(z.literal('')),
  tombamento: z.string().optional().or(z.literal('')),
  propriedade: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('')),
  
  // --- Seção "Configuração" ---
  conectividade: z.string().optional().or(z.literal('')),
  frenteVerso: z.string().optional().or(z.literal('')),
  
  // --- Seção "Insumos" ---
  cartucho: z.string().optional().or(z.literal('')),
  colorido: z.string().optional().or(z.literal('')),
  cartuchoColorido: z.string().optional().or(z.literal('')),
  cartuchoPreto: z.string().optional().or(z.literal('')),
  drCilindro: z.string().optional().or(z.literal('')),
  
  // --- Seção "Localização" ---
  unitId: z.string().optional().or(z.literal('')),
  pavimento: z.string().optional().or(z.literal('')),
  setor: z.string().optional().or(z.literal('')),
  sala: z.string().optional().or(z.literal('')),
  funcionario: z.string().optional().or(z.literal('')),
  observacao: z.string().optional().or(z.literal('')),
});

/**
 * Formulário para registrar um novo ativo (Impressora).
 * @param {object} props
 * @param {() => void} props.onClose - Função para fechar o modal.
 * @param {() => void} props.onBack - Função para voltar ao seletor de tipo.
 */
const AddPrinterForm = ({ onClose, onBack }) => {
  // Busca 'units' (Hospitais) para o dropdown de Localização
  const [units, loadingUnits] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  const { options: opts } = useOptions([
    'tipos_ativos_impressora',
    'marcas_impressora',
    'modelos_impressora',
    'propriedade',
    'conectividade',
    'frente_verso',
    'tipos_insumo',
    'setores',
    'pavimentos',
    'salas',
    'status'
  ]);

  const { 
    register, 
    handleSubmit, 
    reset,
    watch, // Para observar o campo "Colorido"
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(printerSchema),
    defaultValues: {
      colorido: "Não",
      frenteVerso: "Não se aplica"
    }
  });

  // UI/UX: Observa o campo 'colorido' para mostrar/ocultar o input
  const isColorida = watch("colorido") === "Sim";

  // Salva no backend do Firebase
  const onSubmit = async (data) => {
    const toastId = toast.loading("Registrando impressora...");
    try {
      const docId = data.tombamento || data.serial || null;
      const assetRef = docId ? doc(db, 'assets', docId) : doc(db, 'assets');
      
      const newAsset = {
        ...data,
        tombamento: data.tombamento || "", 
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        type: 'impressora' 
      };

      await setDoc(assetRef, newAsset);
      
      toast.success(`Impressora ${docId || 'sem identificação'} registrada com sucesso!`, { id: toastId });
      onClose();
    } catch (error) {
      console.error("Erro ao registrar ativo:", error);
      toast.error("Erro ao registrar ativo: " + error.message, { id: toastId });
    }
  };

  const handleClear = () => {
    reset(); // Limpa o formulário
    toast.info("Formulário limpo.");
  };

  return (
    // Reutiliza o CSS (AssetForms.module.css)
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      {/* === SEÇÃO DADOS (UI/UX) === */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.subtitle}>Dados da Impressora</legend>
        
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="tipoAtivo">Tipo Ativo</label>
            <select id="tipoAtivo" {...register("tipoAtivo")} className={errors.tipoAtivo ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(opts.tipos_ativos_impressora || []).map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
            {errors.tipoAtivo && <p className={styles.errorMessage}>{errors.tipoAtivo.message}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="marca">Marca</label>
            <select id="marca" {...register("marca")} className={errors.marca ? styles.inputError : ''}>
              <option value="">Selecione a marca...</option>
              {(opts.marcas_impressora || []).map(marca => <option key={marca} value={marca}>{marca}</option>)}
            </select>
            {errors.marca && <p className={styles.errorMessage}>{errors.marca.message}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="modelo">Modelo</label>
            <select id="modelo" {...register("modelo")} className={errors.modelo ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(opts.modelos_impressora || []).map(modelo => <option key={modelo} value={modelo}>{modelo}</option>)}
            </select>
            {errors.modelo && <p className={styles.errorMessage}>{errors.modelo.message}</p>}
          </div>
        </div>

        <div className={styles.grid3}>
           <div className={styles.formGroup}>
            <label htmlFor="tombamento">Tombamento (Opcional)</label>
            <input id="tombamento" {...register("tombamento")} placeholder="Se vazio, será gerado automaticamente" className={errors.tombamento ? styles.inputError : ''} />
            {errors.tombamento && <p className={styles.errorMessage}>{errors.tombamento.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="serial">Serial</label>
            <input id="serial" {...register("serial")} placeholder="Digite o serial..." className={errors.serial ? styles.inputError : ''} />
            {errors.serial && <p className={styles.errorMessage}>{errors.serial.message}</p>}
          </div>
           <div className={styles.formGroup}>
            <label htmlFor="propriedade">Propriedade</label>
            <select id="propriedade" {...register("propriedade")} className={errors.propriedade ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(opts.propriedade || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.propriedade && <p className={styles.errorMessage}>{errors.propriedade.message}</p>}
          </div>
        </div>
        
        <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select id="status" {...register("status")} className={errors.status ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(opts.status || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.status && <p className={styles.errorMessage}>{errors.status.message}</p>}
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
              {(opts.conectividade || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.conectividade && <p className={styles.errorMessage}>{errors.conectividade.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="frenteVerso">Frente e Verso (Duplex)</label>
            <select id="frenteVerso" {...register("frenteVerso")} className={errors.frenteVerso ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(opts.frente_verso || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
            <label htmlFor="cartucho">Tipo de Insumo</label>
            <select id="cartucho" {...register("cartucho")} className={errors.cartucho ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(opts.tipos_insumo || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.cartucho && <p className={styles.errorMessage}>{errors.cartucho.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="colorido">Colorido?</label>
            <select id="colorido" {...register("colorido")} className={errors.colorido ? styles.inputError : ''}>
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
            {errors.colorido && <p className={styles.errorMessage}>{errors.colorido.message}</p>}
          </div>
        </div>

        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="cartuchoPreto">Modelo Cartucho Preto/Insumo</label>
            <input id="cartuchoPreto" {...register("cartuchoPreto")} placeholder="Ex: TN-3472 ou Ribbon" />
          </div>
          
          {isColorida && (
            <div className={styles.formGroup}>
              <label htmlFor="cartuchoColorido">Modelo Cartucho Colorido</label>
              <input id="cartuchoColorido" {...register("cartuchoColorido")} placeholder="Ex: TN-3472C/M/Y" />
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label htmlFor="drCilindro">Modelo DR/Cilindro (Opcional)</label>
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
              {(opts.pavimentos || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.pavimento && <p className={styles.errorMessage}>{errors.pavimento.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="setor">Setor</label>
            <select id="setor" {...register("setor")} className={errors.setor ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(opts.setores || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.setor && <p className={styles.errorMessage}>{errors.setor.message}</p>}
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="sala">Sala</label>
            <select id="sala" {...register("sala")} className={errors.sala ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(opts.salas || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
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

      {/* --- Botões de Ação --- */}
      <div className={styles.buttonContainer}>
        <button type="button" onClick={onBack} className={styles.secondaryButton}>
          Voltar
        </button>
        <button type="button" onClick={handleClear} className={styles.tertiaryButton}>
          Limpar Formulário
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Registrar Impressora"}
        </button>
      </div>
    </form>
  );
};

export default AddPrinterForm;