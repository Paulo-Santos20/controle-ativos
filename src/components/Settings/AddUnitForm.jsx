import React, { useState, useEffect } from 'react'; // Importar useEffect
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore'; 
import { ref, getDownloadURL } from 'firebase/storage'; // Importar getDownloadURL
import { useUploadFile } from 'react-firebase-hooks/storage';
import { db, storage } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { Upload, Search, Link } from 'lucide-react';
import styles from './AddUnitForm.module.css';

// Schema (sem alteração)
const unitSchema = z.object({
  cnpj: z.string().length(14, "CNPJ deve ter 14 dígitos"),
  name: z.string().min(3, "Nome é obrigatório"),
  sigla: z.string().min(2, "Sigla é obrigatória"),
  cep: z.string().length(8, "CEP deve ter 8 dígitos"),
  logradouro: z.string().min(3, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro é obrigatório"),
  cidade: z.string().min(2, "Cidade é obrigatória"),
  estado: z.string().length(2, "Estado (UF) é obrigatório"),
  geolocalizacao: z.string().url("Link do Google Maps inválido").optional().or(z.literal('')),
});

// --- COMPONENTE ATUALIZADO ---
const AddUnitForm = ({ onClose, existingUnitDoc }) => {
  // Define se está em modo de edição
  const isEditing = !!existingUnitDoc;

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null); // Para novos uploads
  const [existingLogoUrl, setExistingLogoUrl] = useState(null); // Para logos existentes
  
  const [uploadFile, uploading] = useUploadFile();

  const { 
    register, 
    handleSubmit, 
    setValue, 
    reset, // Usado para preencher o formulário
    getValues,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(unitSchema)
  });

  // --- NOVO: Efeito para preencher o formulário no modo de edição ---
  useEffect(() => {
    if (isEditing && existingUnitDoc) {
      // Preenche todos os campos do formulário
      const data = existingUnitDoc.data();
      reset({ ...data, cnpj: existingUnitDoc.id }); // 'reset' preenche o form
      
      // Busca a URL de download do logo existente para mostrar no preview
      if (data.logo) {
        const logoRef = ref(storage, data.logo);
        getDownloadURL(logoRef)
          .then(url => setExistingLogoUrl(url))
          .catch(err => console.error("Erro ao buscar logo:", err));
      }
    } else {
      // Garante que o formulário está limpo ao "Registrar Novo"
      reset();
      setExistingLogoUrl(null);
      setLogoPreview(null);
    }
  }, [existingUnitDoc, isEditing, reset]); // Roda quando o 'existingUnitDoc' muda

  // Função de busca de CEP (sem alteração)
  const handleCepSearch = async () => {
    // ... (código idêntico ao anterior)
    const cep = getValues("cep");
    if (cep.length !== 8) {
      toast.error("Por favor, digite um CEP válido com 8 dígitos.");
      return;
    }
    const toastId = toast.loading("Buscando CEP...");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast.error("CEP não encontrado.", { id: toastId });
      } else {
        setValue("logradouro", data.logradouro, { shouldValidate: true });
        setValue("bairro", data.bairro, { shouldValidate: true });
        setValue("cidade", data.localidade, { shouldValidate: true });
        setValue("estado", data.uf, { shouldValidate: true });
        toast.success("Endereço preenchido!", { id: toastId });
      }
    } catch (error) {
      toast.error("Erro ao buscar CEP.", { id: toastId });
    }
  };

  // Handler do logo (atualizado para limpar o logo antigo)
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file); // Novo arquivo para upload
      setLogoPreview(URL.createObjectURL(file)); // Preview do novo arquivo
      setExistingLogoUrl(null); // Limpa o preview do logo antigo
    }
  };

  // --- ONSUBMIT ATUALIZADO (lógica de 'logo') ---
  const onSubmit = async (data) => {
    let logoPath = existingUnitDoc?.data().logo || ""; // Começa com o logo antigo, se houver

    // 1. Fazer upload de um NOVO logo (se um novo foi selecionado)
    if (logoFile) {
      const storageRef = ref(storage, `logos/${data.cnpj}/${logoFile.name}`);
      try {
        const uploadTask = await uploadFile(storageRef, logoFile, {
          contentType: logoFile.type
        });
        logoPath = uploadTask.metadata.fullPath; // Salva o NOVO caminho
      } catch (error) {
        toast.error("Erro ao fazer upload do novo logo.");
        console.error(error);
        return;
      }
    }

    // 2. Preparar os dados
    const newUnit = {
      ...data,
      logo: logoPath, // Salva o caminho novo ou o antigo
      // 'createdAt' só deve ser definido ao criar
    };
    // Adiciona/atualiza campos de timestamp
    if (isEditing) {
      newUnit.updatedAt = new Date(); // Adiciona data de atualização
    } else {
      newUnit.createdAt = new Date(); // Adiciona data de criação
    }

    // 3. Salvar no Firestore (A LÓGICA 'setDoc' FUNCIONA PARA AMBOS!)
    // 'setDoc' com o ID (CNPJ) cria um novo ou sobrescreve um existente.
    const toastId = toast.loading(isEditing ? "Salvando alterações..." : "Registrando unidade...");
    try {
      const unitRef = doc(db, 'units', data.cnpj);
      // Usamos 'merge: true' para não sobrescrever 'createdAt' em edições
      await setDoc(unitRef, newUnit, { merge: true }); 
      
      toast.success(isEditing ? "Unidade atualizada!" : "Unidade registrada!", { id: toastId });
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar unidade.", { id: toastId });
      console.error(error);
    }
  };

  const handleClear = () => {
    reset({ cnpj: isEditing ? getValues("cnpj") : "" }); // Limpa, mas mantém o CNPJ se estiver editando
    setLogoFile(null);
    setLogoPreview(null);
    setExistingLogoUrl(null); // Limpa todos os logos
    toast.info("Formulário limpo.");
  };
  
  // Determina qual imagem de preview mostrar
  const logoSource = logoPreview || existingLogoUrl;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      
      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label htmlFor="cnpj">CNPJ (Será o ID)</label>
          {/* --- CAMPO CNPJ TRAVADO EM MODO DE EDIÇÃO --- */}
          <input 
            id="cnpj" 
            {...register("cnpj")} 
            className={errors.cnpj ? styles.inputError : ''} 
            disabled={isEditing} // Trava o campo
          />
          {errors.cnpj && <p className={styles.errorMessage}>{errors.cnpj.message}</p>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="sigla">Sigla</label>
          <input id="sigla" {...register("sigla")} placeholder="Ex: HMR, HSS" className={errors.sigla ? styles.inputError : ''} />
          {errors.sigla && <p className={styles.errorMessage}>{errors.sigla.message}</p>}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="name">Nome Completo</label>
        <input id="name" {...register("name")} placeholder="Ex: Hospital Miguel Arraes" className={errors.name ? styles.inputError : ''} />
        {errors.name && <p className={styles.errorMessage}>{errors.name.message}</p>}
      </div>

      <hr className={styles.divider} />
      <h3 className={styles.subtitle}>Endereço</h3>

      {/* --- Campos de Endereço (sem alteração) --- */}
      <div className={styles.cepGroup}>
        <div className={styles.formGroup}>
          <label htmlFor="cep">CEP</label>
          <input id="cep" {...register("cep")} className={errors.cep ? styles.inputError : ''} />
          {errors.cep && <p className={styles.errorMessage}>{errors.cep.message}</p>}
        </div>
        <button type="button" className={styles.cepButton} onClick={handleCepSearch}>
          <Search size={16} /> Buscar
        </button>
      </div>
      <div className={styles.grid2}>
        <div className={styles.formGroup} style={{ gridColumn: '1 / 3' }}>
          <label htmlFor="logradouro">Logradouro</label>
          <input id="logradouro" {...register("logradouro")} className={errors.logradouro ? styles.inputError : ''} />
          {errors.logradouro && <p className={styles.errorMessage}>{errors.logradouro.message}</p>}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="numero">Número</label>
          <input id="numero" {...register("numero")} className={errors.numero ? styles.inputError : ''} />
          {errors.numero && <p className={styles.errorMessage}>{errors.numero.message}</p>}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="complemento">Complemento</label>
          <input id="complemento" {...register("complemento")} />
        </div>
      </div>
      <div className={styles.grid3}>
        <div className={styles.formGroup}>
          <label htmlFor="bairro">Bairro</label>
          <input id="bairro" {...register("bairro")} className={errors.bairro ? styles.inputError : ''} />
          {errors.bairro && <p className={styles.errorMessage}>{errors.bairro.message}</p>}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="cidade">Cidade</label>
          <input id="cidade" {...register("cidade")} className={errors.cidade ? styles.inputError : ''} />
          {errors.cidade && <p className={styles.errorMessage}>{errors.cidade.message}</p>}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="estado">Estado (UF)</label>
          <input id="estado" {...register("estado")} className={errors.estado ? styles.inputError : ''} />
          {errors.estado && <p className={styles.errorMessage}>{errors.estado.message}</p>}
        </div>
      </div>

      <hr className={styles.divider} />
      <h3 className={styles.subtitle}>Outros</h3>

      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label>Logo (Clique para alterar)</label>
          {/* --- LOGO ATUALIZADO (mostra logo novo ou existente) --- */}
          <label htmlFor="logo" className={styles.fileLabel}>
            {logoSource ? <img src={logoSource} alt="Preview" className={styles.logoPreview} /> : <Upload size={20} />}
            <span>{logoFile ? logoFile.name : (existingUnitDoc?.data().logo || "Clique para selecionar um arquivo")}</span>
          </label>
          <input type="file" id="logo" onChange={handleLogoChange} accept="image/*" className={styles.fileInput} />
        </div>

        {/* --- Campo de Geolocalização (sem alteração) --- */}
        <div className={styles.formGroup}>
          <label htmlFor="geolocalizacao">Link do Google Maps (Opcional)</label>
          <div className={styles.inputWithIcon}>
            <Link size={16} />
            <input 
              id="geolocalizacao" 
              {...register("geolocalizacao")} 
              placeholder="https://maps.app.goo.gl/..."
              className={errors.geolocalizacao ? styles.inputError : ''}
            />
          </div>
          {errors.geolocalizacao && <p className={styles.errorMessage}>{errors.geolocalizacao.message}</p>}
        </div>
      </div>

      {/* --- BOTÕES ATUALIZADOS --- */}
      <div className={styles.buttonContainer}>
        <button type="button" onClick={onClose} className={styles.secondaryButton}>
          Cancelar
        </button>
        {/* Não mostra "Limpar" no modo de edição para evitar confusão */}
        {!isEditing && (
          <button type="button" onClick={handleClear} className={styles.tertiaryButton}>
            Limpar Formulário
          </button>
        )}
        <button type="submit" className={styles.primaryButton} disabled={isSubmitting || uploading}>
          {uploading ? "Enviando logo..." : (isSubmitting ? "Salvando..." : (isEditing ? "Salvar Alterações" : "Registrar Unidade"))}
        </button>
      </div>
    </form>
  );
};

export default AddUnitForm;