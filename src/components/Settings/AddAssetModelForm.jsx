import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js'; // Caminho absoluto
import { toast } from 'sonner';
import styles from './AddAssetModelForm.module.css';

// Schema de validação (Código de Alta Qualidade)
const modelSchema = z.object({
  id: z.string().min(3, "ID (SKU) é obrigatório (ex: opti_3080)"),
  name: z.string().min(3, "Nome do modelo é obrigatório"),
  manufacturer: z.string().min(2, "Fabricante é obrigatório"),
  type: z.string().min(3, "Tipo é obrigatório"),
});

/**
 * Formulário para adicionar um novo Modelo de Ativo (Computador, Impressora, etc.)
 * @param {object} props
 * @param {() => void} props.onClose - Função para fechar o modal.
 * @param {string} [props.defaultType=""] - O tipo de ativo padrão (ex: "computador").
 */
const AddAssetModelForm = ({ onClose, defaultType = "" }) => {

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(modelSchema),
    // UI/UX: Pré-popula o formulário com o tipo padrão vindo da página
    defaultValues: {
      type: defaultType
    }
  });

  // Handler do Submit (Salvar no Firebase)
  const onSubmit = async (data) => {
    const toastId = toast.loading("Salvando modelo...");
    try {
      // Usamos o ID (SKU) manual como ID do documento
      const modelRef = doc(db, 'assetModels', data.id);
      
      // O 'id' (SKU) é o ID do doc, não um campo
      const newModel = {
        name: data.name,
        manufacturer: data.manufacturer,
        type: data.type,
      };

      await setDoc(modelRef, newModel);
      toast.success("Modelo registrado com sucesso!", { id: toastId });
      onClose(); // Fecha o modal
    } catch (error) {
      toast.error("Erro ao salvar modelo.", { id: toastId });
      console.error(error);
    }
  };

  // Handler para o botão "Limpar"
  const handleClear = () => {
    // Reseta o formulário, mas mantém o tipo padrão
    reset({
      id: "",
      name: "",
      manufacturer: "",
      type: defaultType 
    });
    toast.info("Formulário limpo.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      <div className={styles.formGroup}>
        <label htmlFor="id">ID Único (SKU)</label>
        <input 
          id="id" 
          {...register("id")} 
          placeholder="Ex: opti_3080, hp_m107" 
          className={errors.id ? styles.inputError : ''} 
        />
        {errors.id && <p className={styles.errorMessage}>{errors.id.message}</p>}
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="name">Nome do Modelo</label>
        <input 
          id="name" 
          {...register("name")} 
          placeholder="Ex: Optiplex 3080" 
          className={errors.name ? styles.inputError : ''} 
        />
        {errors.name && <p className={styles.errorMessage}>{errors.name.message}</p>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="manufacturer">Fabricante</label>
        <input 
          id="manufacturer" 
          {...register("manufacturer")} 
          placeholder="Ex: Dell, HP, Samsung" 
          className={errors.manufacturer ? styles.inputError : ''} 
        />
        {errors.manufacturer && <p className={styles.errorMessage}>{errors.manufacturer.message}</p>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="type">Tipo</label>
        <select 
          id="type" 
          {...register("type")} 
          className={errors.type ? styles.inputError : ''}
          // UI/UX: Desabilita o campo se o tipo foi passado pela página
          disabled={!!defaultType} 
        >
          <option value="">Selecione o tipo...</option>
          <option value="computador">Computador</option>
          <option value="impressora">Impressora</option>
          <option value="monitor">Monitor</option>
          <option value="nobreak">NoBreak</option>
          <option value="outro">Outro</option>
        </select>
        {errors.type && <p className={styles.errorMessage}>{errors.type.message}</p>}
      </div>

      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>
          Voltar
        </button>
        <button type="button" onClick={handleClear} className={styles.tertiaryButton}>
          Limpar
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Modelo"}
        </button>
      </div>
    </form>
  );
};

export default AddAssetModelForm;