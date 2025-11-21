import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs'; 
import { saveAs } from 'file-saver'; 
import { writeBatch, doc, serverTimestamp, collection, query, orderBy, where, documentId } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from '../../lib/firebase'; 
import { toast } from 'sonner';
import { 
  Loader2, UploadCloud, AlertTriangle, CheckCircle, 
  FileSpreadsheet, Download, RefreshCw, Laptop, Printer, Building2, Lock, Ban 
} from 'lucide-react';
import styles from './BulkImportPage.module.css';
import { useAuth } from '../../hooks/useAuth';

// Status fixos do sistema (Enum)
const VALID_STATUSES = ["Em uso", "Estoque", "Em manutenção", "Inativo", "Devolvido", "Manutenção agendada", "Devolução agendada", "Reativação agendada"];

const BulkImportPage = () => {
  const { isAdmin, allowedUnits, loading: authLoading } = useAuth();
  const [importType, setImportType] = useState('computador');
  
  // Estados de Dados
  const [allParsedData, setAllParsedData] = useState([]); 
  const [detectedUnits, setDetectedUnits] = useState([]); 
  const [selectedUnits, setSelectedUnits] = useState([]); 
  const [fileData, setFileData] = useState([]); 
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importStats, setImportStats] = useState({ count: 0 });

  // 1. BUSCA UNIDADES (Para validar e gerar abas)
  const unitsQuery = useMemo(() => {
    if (authLoading) return null;
    if (isAdmin) return query(collection(db, 'units'), orderBy('name', 'asc'));
    if (allowedUnits.length > 0) return query(collection(db, 'units'), where(documentId(), 'in', allowedUnits));
    return null;
  }, [isAdmin, allowedUnits, authLoading]);

  const [unitsSnapshot, loadingUnits] = useCollection(unitsQuery);

  // 2. BUSCA OPÇÕES DO SISTEMA (Para validar Dropdowns dinâmicos)
  // Traz: setores, salas, pavimentos, sistemas_operacionais
  const [optionsSnapshot, loadingOptions] = useCollection(collection(db, 'systemOptions'));

  // --- HELPER: Extrai listas do banco de forma segura ---
  const getSystemOptions = useCallback((key) => {
    if (!optionsSnapshot) return [];
    const doc = optionsSnapshot.docs.find(d => d.id === key);
    // Retorna array ou vazio. Normaliza para garantir comparação.
    return doc ? (doc.data().values || []) : [];
  }, [optionsSnapshot]);

  const clearAll = () => {
    setFileData([]);
    setAllParsedData([]);
    setDetectedUnits([]);
    setSelectedUnits([]);
    setValidationErrors([]);
    setImportStats({ count: 0 });
  };

  const canImportToUnit = useCallback((unitId) => {
    if (!unitId) return false;
    if (isAdmin) return true;
    return allowedUnits.includes(unitId.trim());
  }, [isAdmin, allowedUnits]);

  const getUnitLabel = (unitId) => {
     const unitDoc = unitsSnapshot?.docs.find(d => d.id === unitId);
     return unitDoc ? (unitDoc.data().sigla || unitDoc.data().name) : unitId;
  };

  // --- 3. VALIDAÇÃO RIGOROSA (MATCH COM DROPDOWN) ---
  const validateData = (data) => {
    const errors = [];
    
    // Carrega as listas oficiais do banco para comparação
    const validSetores = getSystemOptions('setores');
    const validPavimentos = getSystemOptions('pavimentos');
    const validSalas = getSystemOptions('salas');
    const validSOs = getSystemOptions('sistemas_operacionais');

    data.forEach((row, index) => {
      const ref = `Linha ${index + 2}`;
      
      // A. Campos Obrigatórios Básicos
      if (!row.tombamento) errors.push(`${ref}: Falta Tombamento`);
      
      // B. Validação de Unidade
      if (!row.unitId) {
          errors.push(`${ref}: Unidade não identificada.`);
      } else if (!canImportToUnit(row.unitId)) {
          errors.push(`${ref}: Sem permissão na unidade '${getUnitLabel(row.unitId)}'.`);
      }

      // C. Validação de STATUS (Lista Fixa)
      if (!row.status) errors.push(`${ref}: Falta Status`);
      else if (!VALID_STATUSES.includes(row.status)) {
          errors.push(`${ref}: Status '${row.status}' inválido. Use o dropdown.`);
      }

      // D. Validação de SETOR (Lista Dinâmica)
      if (!row.setor) errors.push(`${ref}: Falta Setor`);
      else if (!validSetores.includes(row.setor)) {
          errors.push(`${ref}: Setor '${row.setor}' não cadastrado no sistema.`);
      }

      // E. Validação de PAVIMENTO (Lista Dinâmica)
      // Pavimento pode ser opcional dependendo da regra, aqui estou tratando como obrigatório se veio na planilha
      if (row.pavimento && !validPavimentos.includes(row.pavimento)) {
          errors.push(`${ref}: Pavimento '${row.pavimento}' não cadastrado.`);
      }

      // F. Validação de SALA (Lista Dinâmica)
      if (row.sala && !validSalas.includes(row.sala)) {
           errors.push(`${ref}: Sala '${row.sala}' não cadastrada.`);
      }

      // G. Validação Específica de PC
      if (importType === 'computador') {
         if (!row.hostname) errors.push(`${ref}: Falta Hostname`);
         if (!row.processador) errors.push(`${ref}: Falta Processador`);
         
         // Validação de S.O.
         if (row.so && !validSOs.includes(row.so)) {
             errors.push(`${ref}: S.O. '${row.so}' não cadastrado.`);
         }
      }
    });

    setValidationErrors(errors);
    if (errors.length === 0) toast.success(`${data.length} itens validados com sucesso!`);
    else toast.warning(`${errors.length} erros encontrados. Importação bloqueada.`);
  };

  // --- 4. PROCESSAMENTO ---
  const processRow = (row, sheetName) => {
    const normalizedRow = {};
    Object.keys(row).forEach(key => { normalizedRow[key.trim().toLowerCase()] = row[key]; });

    let unitRaw = normalizedRow['unidade'] ? String(normalizedRow['unidade']).trim() : sheetName.trim();
    let realUnitId = unitRaw;
    if (unitsSnapshot) {
        const found = unitsSnapshot.docs.find(d => d.id === unitRaw || d.data().sigla === unitRaw || d.data().name === unitRaw);
        if (found) realUnitId = found.id;
    }

    const baseData = {
      tombamento: String(normalizedRow['tombamento'] || '').trim(),
      type: importType,
      unitId: realUnitId,
      status: normalizedRow['status'] || 'Estoque',
      setor: normalizedRow['setor'] || '',
      sala: normalizedRow['sala'] || '',
      pavimento: normalizedRow['pavimento'] || '',
      funcionario: normalizedRow['funcionario'] || '',
      marca: normalizedRow['marca'] || '',
      modelo: normalizedRow['modelo'] || '',
      serial: normalizedRow['serial'] || '',
      observacao: normalizedRow['observacao'] || '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      importedBy: auth.currentUser?.email,
      isImported: true
    };

    if (importType === 'computador') {
      return {
        ...baseData,
        hostname: normalizedRow['hostname'] || '',
        processador: normalizedRow['processador'] || '',
        memoria: normalizedRow['memoria'] || '',
        hdSsd: normalizedRow['hd_ssd'] || normalizedRow['hd/ssd'] || '',
        so: normalizedRow['so'] || '',
        antivirus: normalizedRow['antivirus'] || '',
        macAddress: normalizedRow['mac'] || '',
        serviceTag: normalizedRow['service_tag'] || ''
      };
    } else {
      return {
        ...baseData,
        ip: normalizedRow['ip'] || '',
        conectividade: normalizedRow['conectividade'] || '',
        cartucho: normalizedRow['cartucho'] || '',
        colorido: normalizedRow['colorido'] || 'Não',
        frenteVerso: normalizedRow['frente_verso'] || 'Não'
      };
    }
  };

  // --- 5. LEITURA DO ARQUIVO ---
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        let allRows = [];

        workbook.SheetNames.forEach(sheetName => {
          if (sheetName.toLowerCase().includes('valid') || sheetName.toLowerCase().includes('instru')) return;
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          const processedRows = json.map(row => processRow(row, sheetName));
          allRows = [...allRows, ...processedRows];
        });
        
        if (allRows.length === 0) {
          toast.error("A planilha está vazia.");
          return;
        }

        const uniqueUnits = [...new Set(allRows.map(item => item.unitId))].filter(Boolean).sort();
        setDetectedUnits(uniqueUnits);
        setAllParsedData(allRows);

        if (uniqueUnits.length === 1 && canImportToUnit(uniqueUnits[0])) {
            handleConfirmSelection([uniqueUnits[0]], allRows);
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao ler arquivo.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [importType, unitsSnapshot, canImportToUnit]); // Depende do snapshot para validação

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    disabled: (!isAdmin && allowedUnits.length === 0)
  });

  const toggleUnit = (unitId) => {
    if (!canImportToUnit(unitId)) {
        toast.error(`Sem permissão.`);
        return;
    }
    if (selectedUnits.includes(unitId)) {
      setSelectedUnits(selectedUnits.filter(u => u !== unitId));
    } else {
      setSelectedUnits([...selectedUnits, unitId]);
    }
  };

  const handleConfirmSelection = (unitsToProcess = selectedUnits, sourceData = allParsedData) => {
    const validUnits = unitsToProcess.filter(u => canImportToUnit(u));
    if (validUnits.length === 0) { toast.error("Selecione uma unidade válida."); return; }
    
    const filtered = sourceData.filter(item => validUnits.includes(item.unitId));
    validateData(filtered); // Valida os dados filtrados
    setImportStats({ count: filtered.length });
    setFileData(filtered);
    if (unitsToProcess !== selectedUnits) setSelectedUnits(validUnits);
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) return toast.error("Corrija os erros antes de importar.");
    setIsUploading(true);
    const toastId = toast.loading("Importando...");

    try {
      const chunkSize = 400; 
      const chunks = [];
      for (let i = 0; i < fileData.length; i += chunkSize) chunks.push(fileData.slice(i, i + chunkSize));

      let processedCount = 0;
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const { unitNameOriginal, ...finalItem } = item;
          if (!canImportToUnit(finalItem.unitId)) return; 
          const assetRef = doc(db, 'assets', finalItem.tombamento);
          batch.set(assetRef, finalItem); 
        });
        await batch.commit();
        processedCount += chunk.length;
        toast.loading(`Salvando ${processedCount}...`, { id: toastId });
      }
      toast.success("Importação concluída!", { id: toastId });
      clearAll();
    } catch (error) {
      toast.error("Erro: " + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // --- 6. GERAR MODELO COM DROPDOWNS DINÂMICOS ---
  const downloadTemplate = async () => {
    if (!unitsSnapshot || unitsSnapshot.empty) return toast.error("Nenhuma unidade disponível.");

    const workbook = new ExcelJS.Workbook();
    
    // --- PEGA DADOS ATUALIZADOS DO BANCO ---
    const setoresList = getSystemOptions('setores');
    const pavimentosList = getSystemOptions('pavimentos');
    const salasList = getSystemOptions('salas');
    const soList = getSystemOptions('sistemas_operacionais');
    
    // --- CRIA ABA DE VALIDAÇÃO OCULTA ---
    const refSheet = workbook.addWorksheet('Validacoes');
    refSheet.state = 'hidden'; 

    const fillValidationCol = (colChar, list) => {
        if(!list || list.length === 0) return;
        refSheet.getCell(`${colChar}1`).value = "HEADER"; 
        list.forEach((val, i) => { refSheet.getCell(`${colChar}${i+2}`).value = val; });
    };

    fillValidationCol('A', VALID_STATUSES); // Col A: Status
    fillValidationCol('B', setoresList);    // Col B: Setores
    fillValidationCol('C', pavimentosList); // Col C: Pavimentos
    fillValidationCol('D', salasList);      // Col D: Salas
    fillValidationCol('E', soList);         // Col E: S.O.

    // --- CABEÇALHOS ---
    const commonHeaders = ["Tombamento", "Status", "Setor", "Sala", "Pavimento", "Funcionario", "Marca", "Modelo", "Serial"];
    let headers = [];
    
    let validationMap = {
        "Status": 'A',
        "Setor": 'B',
        "Pavimento": 'C',
        "Sala": 'D'
    };

    if (importType === 'computador') {
      headers = [...commonHeaders, "Hostname", "Processador", "Memoria", "HD_SSD", "SO", "Antivirus", "MAC", "Service_Tag", "Observacao"];
      validationMap["SO"] = 'E';
    } else {
      headers = [...commonHeaders, "IP", "Conectividade", "Cartucho", "Colorido", "Frente_Verso", "Observacao"];
    }

    // Estilos
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    const obsFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    const fontStyle = { bold: true, color: { argb: 'FF000000' } };

    // --- CRIA UMA ABA PARA CADA UNIDADE PERMITIDA ---
    unitsSnapshot.docs.forEach(doc => {
      if (canImportToUnit(doc.id)) {
        const unitName = doc.data().sigla || doc.data().name;
        const safeName = unitName.replace(/[\/\\\?\*\[\]]/g, '').substring(0, 30);
        
        const sheet = workbook.addWorksheet(safeName);
        const row = sheet.addRow(headers);

        row.eachCell((cell, colNumber) => {
            cell.fill = cell.value === 'Observacao' ? obsFill : headerFill;
            cell.font = fontStyle;
            cell.border = { bottom: { style: 'thin' } };
            sheet.getColumn(cell.col).width = 20;
        });

        // APLICA DROPDOWNS
        for (let i = 2; i <= 1000; i++) {
            headers.forEach((headerName, idx) => {
                const validationCol = validationMap[headerName];
                if (validationCol) {
                    let listSize = 0;
                    if (headerName === "Status") listSize = VALID_STATUSES.length;
                    else if (headerName === "Setor") listSize = setoresList.length;
                    else if (headerName === "Pavimento") listSize = pavimentosList.length;
                    else if (headerName === "Sala") listSize = salasList.length;
                    else if (headerName === "SO") listSize = soList.length;

                    if (listSize > 0) {
                        sheet.getCell(i, idx + 1).dataValidation = {
                            type: 'list',
                            allowBlank: true,
                            formulae: [`=Validacoes!$${validationCol}$2:$${validationCol}$${listSize + 1}`],
                            showErrorMessage: true,
                            errorTitle: 'Opção Inválida',
                            error: 'Selecione um item da lista. Se não existir, cadastre-o no sistema antes.'
                        };
                    }
                }
            });
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `modelo_${importType}_por_unidade.xlsx`);
  };

  if (!authLoading && !isAdmin && allowedUnits.length === 0) {
     return (
         <div className={styles.page} style={{justifyContent:'center', alignItems:'center', height:'60vh'}}>
            <div className={styles.errorBox} style={{textAlign:'center'}}>
                <Ban size={48} style={{marginBottom: 10}} />
                <h2>Acesso Bloqueado</h2>
                <p>Você não possui permissão em nenhuma unidade.</p>
            </div>
         </div>
     );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Importação em Massa</h1>
          <p className={styles.subtitle}>Baixe o modelo. Ele contém as opções (Setores, Locais) atuais do sistema.</p>
        </div>
        <button onClick={downloadTemplate} className={styles.secondaryButton} disabled={loadingUnits || loadingOptions}>
          <Download size={18} /> Baixar Modelo Atualizado
        </button>
      </header>

      <div className={styles.typeSelector}>
        <button 
          className={`${styles.typeButton} ${importType === 'computador' ? styles.activeType : ''}`}
          onClick={() => { setImportType('computador'); clearAll(); }}
        >
          <Laptop size={24} /> <strong>Computadores</strong>
        </button>
        <button 
          className={`${styles.typeButton} ${importType === 'impressora' ? styles.activeType : ''}`}
          onClick={() => { setImportType('impressora'); clearAll(); }}
        >
          <Printer size={24} /> <strong>Impressoras</strong>
        </button>
      </div>

      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
        <input {...getInputProps()} />
        <UploadCloud size={48} className={styles.uploadIcon} />
        <div className={styles.dropText}>
          <p>Arraste sua planilha aqui.</p>
          <small>O sistema validará se os setores/locais existem.</small>
        </div>
      </div>

      {detectedUnits.length > 0 && fileData.length === 0 && (
        <div className={styles.unitSelectorBox}>
          <div className={styles.alertHeader}>
            <Building2 size={20} color="var(--color-primary)" />
            <h3>Unidades encontradas:</h3>
          </div>
          <p>Selecione quais importar (Cadeado = Sem permissão):</p>
          
          <div className={styles.unitGrid}>
             {detectedUnits.map(unitId => {
               const hasPermission = canImportToUnit(unitId);
               const label = getUnitLabel(unitId);
               return (
                 <label key={unitId} className={`${styles.unitCheckboxCard} ${selectedUnits.includes(unitId) ? styles.checked : ''} ${!hasPermission ? styles.disabledCard : ''}`}>
                   <input type="checkbox" checked={selectedUnits.includes(unitId)} onChange={() => toggleUnit(unitId)} disabled={!hasPermission} />
                   <span>{label}</span>
                   {!hasPermission && <Lock size={14} className={styles.lockIcon} />}
                 </label>
               );
             })}
          </div>
          <div style={{marginTop: 20}}>
             <button className={styles.primaryButton} onClick={() => handleConfirmSelection()} disabled={selectedUnits.length === 0}>Processar</button>
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className={styles.errorBox}>
          <h3><AlertTriangle size={20} /> Erros Encontrados</h3>
          <ul>{validationErrors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>
          <button onClick={clearAll} className={styles.textButton}>Limpar</button>
        </div>
      )}

      {fileData.length > 0 && validationErrors.length === 0 && (
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <div className={styles.successBadge}><CheckCircle size={18} /><span>Importar <strong>{importStats.count}</strong> itens.</span></div>
            <div className={styles.actionButtons}>
                <button className={styles.tertiaryButton} onClick={clearAll}>Cancelar</button>
                <button className={styles.primaryButton} onClick={handleImport} disabled={isUploading}>
                   {isUploading ? <Loader2 className={styles.spinner} /> : <FileSpreadsheet size={18} />} Confirmar
                </button>
            </div>
          </div>
          <div className={styles.tablePreview}>
             <table>
                <thead><tr><th>Unidade</th><th>Tombamento</th><th>Modelo</th><th>Setor</th><th>Status</th></tr></thead>
                <tbody>
                   {fileData.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                          <td>{getUnitLabel(r.unitId)}</td>
                          <td>{r.tombamento}</td><td>{r.modelo}</td><td>{r.setor}</td>
                          <td>{r.status}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;