import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, setDoc, serverTimestamp, query, orderBy, writeBatch, getDoc } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import styles from './AssetForms.module.css';
import { useOptions } from '../../hooks/useOptions';

/**
 * Schema de validação Zod para um novo ativo (Computador).
 * (Princípio 5: Código de Alta Qualidade)
 */
const assetSchema = z.object({
  // Seção "Dados"
  tipoAtivo: z.string().optional().or(z.literal('')),
  marca: z.string().optional().or(z.literal('')),
  modelo: z.string().optional().or(z.literal('')),
  hostname: z.string().optional().or(z.literal('')), 
  serial: z.string().optional().or(z.literal('')), 
  tombamento: z.string().optional().or(z.literal('')), 
  serviceTag: z.string().optional().or(z.literal('')), 
  macAddress: z.string()
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, "Formato de MAC inválido (ex: 00:1A:2B:3C:4D:5E)")
    .optional().or(z.literal('')),
  posse: z.string().optional().or(z.literal('')), 
  status: z.string().optional().or(z.literal('')), 
  
  // Seção "Configuração"
  memoria: z.string().optional().or(z.literal('')), 
  hdSsd: z.string().optional().or(z.literal('')), 
  processador: z.string().optional().or(z.literal('')), 
  antivirus: z.string().optional().or(z.literal('')), 
  so: z.string().optional().or(z.literal('')),
  soVersao: z.string().optional().or(z.literal('')), 
  
  // Seção "Localização"
  unitId: z.string().optional().or(z.literal('')), 
  pavimento: z.string().optional().or(z.literal('')),
  setor: z.string().optional().or(z.literal('')), 
  sala: z.string().optional().or(z.literal('')),
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

  const { options, loading: loadingOptions } = useOptions([
    'tipos_ativos_computador',
    'marcas',
    'modelos',
    'memorias',
    'hd_ssd',
    'processadores',
    'sistemas_operacionais',
    'versoes_so',
    'setores',
    'pavimentos',
    'salas',
    'posse',
    'status'
  ]);

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
      if (data.tombamento && data.tombamento.length >= 3) {
        const exists = await checkTombamentoExists(data.tombamento);
        if (exists) {
          setError('tombamento', { message: "Tombamento já existe no sistema" });
          toast.error("Tombamento já cadastrado!", { id: toastId });
          setIsChecking(false);
          return;
        }
      }

      toast.loading("Registrando...", { id: toastId });
      const batch = writeBatch(db);

      const docId = data.tombamento || data.serial || null;
      const assetRef = docId ? doc(db, 'assets', docId) : doc(db, 'assets');
      const newAsset = {
        ...data,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        type: 'computador'
      };
      batch.set(assetRef, newAsset); 

      const historyRef = doc(collection(assetRef, 'history'));
      batch.set(historyRef, {
        type: "Registro",
        details: `Ativo registrado no sistema com status "${data.status || 'Sem status'}".`,
        timestamp: serverTimestamp(),
        user: auth.currentUser.displayName || auth.currentUser.email,
        unitId: data.unitId,
      });
      
      await batch.commit();
      
      toast.success(`Computador ${docId || 'sem tombamento'} registrado!`, { id: toastId });
      onClose();
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
              {(options.tipos_ativos_computador || []).map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
            {errors.tipoAtivo && <p className={styles.errorMessage}>{errors.tipoAtivo.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="marca">Marca</label>
            <select id="marca" {...register("marca")} className={errors.marca ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.marcas || []).map(marca => <option key={marca} value={marca}>{marca}</option>)}
            </select>
            {errors.marca && <p className={styles.errorMessage}>{errors.marca.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="modelo">Modelo</label>
            <select id="modelo" {...register("modelo")} className={errors.modelo ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.modelos || []).map(modelo => <option key={modelo} value={modelo}>{modelo}</option>)}
            </select>
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
              {(options.posse || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.posse && <p className={styles.errorMessage}>{errors.posse.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select id="status" {...register("status")} className={errors.status ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.status || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
            <select id="processador" {...register("processador")} className={errors.processador ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.processadores || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.processador && <p className={styles.errorMessage}>{errors.processador.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="memoria">Memória</label>
            <select id="memoria" {...register("memoria")} className={errors.memoria ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.memorias || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.memoria && <p className={styles.errorMessage}>{errors.memoria.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="hdSsd">HD/SSD</label>
            <select id="hdSsd" {...register("hdSsd")} className={errors.hdSsd ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.hd_ssd || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.hdSsd && <p className={styles.errorMessage}>{errors.hdSsd.message}</p>}
          </div>
        </div>
        
        <div className={styles.grid3}>
          <div className={styles.formGroup}>
            <label htmlFor="so">Sistema Operacional</label>
            <select id="so" {...register("so")} className={errors.so ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.sistemas_operacionais || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.so && <p className={styles.errorMessage}>{errors.so.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="soVersao">Versão do S.O.</label>
            <select id="soVersao" {...register("soVersao")} className={errors.soVersao ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.versoes_so || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.soVersao && <p className={styles.errorMessage}>{errors.soVersao.message}</p>}
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
              {(options.pavimentos || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.pavimento && <p className={styles.errorMessage}>{errors.pavimento.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="setor">Setor</label>
            <select id="setor" {...register("setor")} className={errors.setor ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.setores || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.setor && <p className={styles.errorMessage}>{errors.setor.message}</p>}
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label htmlFor="sala">Sala</label>
            <select id="sala" {...register("sala")} className={errors.sala ? styles.inputError : ''}>
              <option value="">Selecione...</option>
              {(options.salas || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
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