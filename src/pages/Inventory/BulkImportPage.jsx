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
  FileSpreadsheet, Download, RefreshCw, Laptop, Printer, Building2, Lock 
} from 'lucide-react';
import styles from './BulkImportPage.module.css';
import { useAuth } from '../../hooks/useAuth';

const BulkImportPage = () => {
  const { allowedUnits } = useAuth(); // Removemos o uso de 'isAdmin' para lógica de dados

  const [importType, setImportType] = useState('computador');
  
  const [allParsedData, setAllParsedData] = useState([]); 
  const [detectedUnits, setDetectedUnits] = useState([]); 
  const [selectedUnits, setSelectedUnits] = useState([]); 
  const [fileData, setFileData] = useState([]); 
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importStats, setImportStats] = useState({ count: 0 });

  // --- CORREÇÃO DE SEGURANÇA ESTRITA (QUERY) ---
  // Mesmo sendo Admin, só busca as unidades que estão na lista 'allowedUnits'
  const unitsQuery = useMemo(() => {
    // Se não tiver unidades permitidas, retorna null (ou uma query que não traz nada)
    if (!allowedUnits || allowedUnits.length === 0) {
        return query(collection(db, 'units'), where(documentId(), '==', 'SEM_PERMISSAO'));
    }
    // Filtra estritamente pelo ID
    return query(collection(db, 'units'), where(documentId(), 'in', allowedUnits));
  }, [allowedUnits]);

  const [unitsSnapshot, loadingUnits] = useCollection(unitsQuery);

  // Mapa de Tradução (Nome -> ID)
  const unitMap = useMemo(() => {
    if (!unitsSnapshot) return {};
    const map = {};
    unitsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id; 
        map[id.trim().toLowerCase()] = id;
        if (data.sigla) map[data.sigla.trim().toLowerCase()] = id;
        if (data.name) map[data.name.trim().toLowerCase()] = id;
    });
    return map;
  }, [unitsSnapshot]);

  const resolveUnitId = useCallback((text) => {
      if (!text) return null;
      const cleanText = String(text).trim().toLowerCase();
      return unitMap[cleanText] || null; 
  }, [unitMap]);

  // --- CORREÇÃO DE SEGURANÇA ESTRITA (HELPER) ---
  const canImportToUnit = useCallback((realUnitId) => {
    if (!realUnitId) return false;
    // REMOVIDO: if (isAdmin) return true; 
    // AGORA: Só passa se estiver na lista explícita
    return allowedUnits.includes(realUnitId.trim());
  }, [allowedUnits]);

  const clearAll = () => {
    setFileData([]);
    setAllParsedData([]);
    setDetectedUnits([]);
    setSelectedUnits([]);
    setValidationErrors([]);
    setImportStats({ count: 0 });
  };

  const getHeaders = () => {
    const common = ["Tombamento", "Status", "Setor", "Sala", "Pavimento", "Funcionario", "Marca", "Modelo", "Serial"];
    if (importType === 'computador') {
      return [...common, "Hostname", "Processador", "Memoria", "HD_SSD", "SO", "Antivirus", "MAC", "Service_Tag", "Observacao"];
    } else {
      return [...common, "IP", "Conectividade", "Cartucho", "Colorido", "Frente_Verso", "Observacao"];
    }
  };

  const processRow = (row, sheetName) => {
    const normalizedRow = {};
    Object.keys(row).forEach(key => { normalizedRow[key.trim().toLowerCase()] = row[key]; });

    const unitText = normalizedRow['unidade'] ? String(normalizedRow['unidade']).trim() : sheetName.trim();
    const realUnitId = resolveUnitId(unitText);

    const baseData = {
      tombamento: String(normalizedRow['tombamento'] || '').trim(),
      type: importType,
      unitId: realUnitId, 
      unitNameOriginal: unitText,
      
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

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        let allRows = [];

        workbook.SheetNames.forEach(sheetName => {
          if (sheetName.toLowerCase().includes('instru')) return;
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

        // Bloqueio Rápido: Se a única unidade encontrada não for permitida
        if (uniqueUnits.length === 1) {
            if (canImportToUnit(uniqueUnits[0])) {
                handleConfirmSelection([uniqueUnits[0]], allRows);
            } else {
                // Como o ID pode ser nulo se não achou no mapa, verificamos o nome original
                const originalName = allRows[0]?.unitNameOriginal || uniqueUnits[0];
                toast.error(`ACESSO NEGADO: Você não tem permissão na unidade "${originalName}".`);
                clearAll();
            }
        } 

      } catch (error) {
        console.error(error);
        toast.error("Erro ao ler arquivo.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [importType, resolveUnitId, canImportToUnit]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1
  });

  const getUnitLabel = (unitId) => {
     const unitDoc = unitsSnapshot?.docs.find(d => d.id === unitId);
     return unitDoc ? (unitDoc.data().sigla || unitDoc.data().name) : unitId;
  };

  const toggleUnit = (unitId) => {
    if (!canImportToUnit(unitId)) {
        toast.error(`Sem permissão para a unidade ${getUnitLabel(unitId)}.`);
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

    if (validUnits.length === 0) {
      toast.error("Nenhuma unidade permitida selecionada.");
      return;
    }

    const filtered = sourceData.filter(item => validUnits.includes(item.unitId));
    validateData(filtered);
    setImportStats({ count: filtered.length });
    setFileData(filtered);
    
    if (unitsToProcess !== selectedUnits) setSelectedUnits(validUnits);
  };

  const validateData = (data) => {
    const errors = [];
    data.forEach((row, index) => {
      const ref = `Linha ${index + 2} (${row.unitNameOriginal || '?'})`;
      
      if (!row.tombamento) errors.push(`${ref}: Falta Tombamento`);
      if (!row.status) errors.push(`${ref}: Falta Status`);
      
      if (!row.unitId) {
          errors.push(`${ref}: Unidade "${row.unitNameOriginal}" desconhecida.`);
      } 
      else if (!canImportToUnit(row.unitId)) {
          errors.push(`${ref}: PERMISSÃO NEGADA para "${getUnitLabel(row.unitId)}".`);
      }

      if (importType === 'computador' && !row.hostname) errors.push(`${ref}: Falta Hostname`);
    });
    setValidationErrors(errors);
    if (errors.length === 0) toast.success(`${data.length} itens validados!`);
    else toast.warning(`${errors.length} erros encontrados.`);
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) return toast.error("Corrija os erros.");
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

  const downloadTemplate = async () => {
    if (!unitsSnapshot || unitsSnapshot.empty) return toast.error("Nenhuma unidade disponível.");

    const workbook = new ExcelJS.Workbook();
    const headers = getHeaders();
    
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    const obsFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    const fontStyle = { bold: true, color: { argb: 'FF000000' } };

    unitsSnapshot.docs.forEach(doc => {
      // CORREÇÃO: Só gera a aba se tiver permissão (mesmo sendo Admin)
      if (canImportToUnit(doc.id)) {
        const unitName = doc.data().sigla || doc.data().name;
        const safeName = unitName.replace(/[\/\\\?\*\[\]]/g, '').substring(0, 30);
        const sheet = workbook.addWorksheet(safeName);
        const row = sheet.addRow(headers);
  
        row.eachCell((cell) => {
            cell.fill = cell.value === 'Observacao' ? obsFill : headerFill;
            cell.font = fontStyle;
            sheet.getColumn(cell.col).width = 20;
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `modelo_${importType}_por_unidade.xlsx`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Importação em Massa</h1>
          <p className={styles.subtitle}>Baixe o modelo, preencha as abas das unidades e envie.</p>
        </div>
        <button onClick={downloadTemplate} className={styles.secondaryButton} disabled={loadingUnits}>
          <Download size={18} /> Baixar Modelo
        </button>
      </header>

      <div className={styles.typeSelector}>
        <button className={`${styles.typeButton} ${importType === 'computador' ? styles.activeType : ''}`} onClick={() => { setImportType('computador'); clearAll(); }}><Laptop size={24} /> <strong>Computadores</strong></button>
        <button className={`${styles.typeButton} ${importType === 'impressora' ? styles.activeType : ''}`} onClick={() => { setImportType('impressora'); clearAll(); }}><Printer size={24} /> <strong>Impressoras</strong></button>
      </div>

      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
        <input {...getInputProps()} />
        <UploadCloud size={48} className={styles.uploadIcon} />
        <div className={styles.dropText}><p>Arraste sua planilha aqui.</p></div>
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
          <h3><AlertTriangle size={20} /> Erros ({validationErrors.length})</h3>
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
                <button className={styles.primaryButton} onClick={handleImport} disabled={isUploading}>{isUploading ? <Loader2 className={styles.spinner} /> : <FileSpreadsheet size={18} />} Confirmar</button>
            </div>
          </div>
          <div className={styles.tablePreview}>
             <table>
                <thead><tr><th>Unidade</th><th>Tombamento</th><th>Modelo</th><th>Setor</th></tr></thead>
                <tbody>
                   {fileData.slice(0, 8).map((r, i) => (
                      <tr key={i}><td>{getUnitLabel(r.unitId)}</td><td>{r.tombamento}</td><td>{r.modelo}</td><td>{r.setor}</td></tr>
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