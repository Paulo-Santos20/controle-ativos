import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs'; 
import { saveAs } from 'file-saver'; 
import { writeBatch, doc, serverTimestamp, collection, query, orderBy, where, documentId, getDocs } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db, auth } from '../../lib/firebase'; 
import { toast } from 'sonner';
import { logAudit } from '../../utils/AuditLogger';
import { 
  Loader2, UploadCloud, AlertTriangle, CheckCircle, 
  FileSpreadsheet, Download, Laptop, Printer, Info, RefreshCw
} from 'lucide-react';
import styles from './BulkImportPage.module.css';
import { useAuth } from '../../hooks/useAuth';

const BulkImportPage = () => {
  const { isAdmin, allowedUnits, loading: authLoading } = useAuth();
  const [importType, setImportType] = useState('computador');
  
  const [allParsedData, setAllParsedData] = useState([]); 
  const [detectedUnits, setDetectedUnits] = useState([]); 
  const [selectedUnits, setSelectedUnits] = useState([]); 
  const [fileData, setFileData] = useState([]); 
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importStats, setImportStats] = useState({ count: 0 });
  
  const [uploadReport, setUploadReport] = useState(null); 

  const [newTermsToCreate, setNewTermsToCreate] = useState({
    setores: new Set(),
    pavimentos: new Set(),
    salas: new Set(),
    versoes_so: new Set(),
    memorias: new Set(),
    hd_ssd: new Set(),
    processadores: new Set(),
    marcas: new Set(),
    modelos: new Set(),
    status: new Set(),
  });

  const unitsQuery = useMemo(() => {
    if (authLoading) return null;
    if (allowedUnits.length > 0) return query(collection(db, 'units'), where(documentId(), 'in', allowedUnits));
    if (isAdmin) return query(collection(db, 'units'), orderBy('name', 'asc'));
    return null;
  }, [isAdmin, allowedUnits, authLoading]);

  const [unitsSnapshot, loadingUnits] = useCollection(unitsQuery);
  const [optionsSnapshot, loadingOptions] = useCollection(collection(db, 'systemOptions'));

  const getSystemOptions = useCallback((key) => {
    if (!optionsSnapshot) return [];
    const doc = optionsSnapshot.docs.find(d => d.id === key);
    return doc ? (doc.data().values || []) : [];
  }, [optionsSnapshot]);

  const clearAll = () => {
    setFileData([]);
    setAllParsedData([]);
    setDetectedUnits([]);
    setSelectedUnits([]);
    setValidationErrors([]);
    setImportStats({ count: 0 });
    setUploadReport(null); 
    setNewTermsToCreate({ setores: new Set(), pavimentos: new Set(), salas: new Set(), versoes_so: new Set(), memorias: new Set(), hd_ssd: new Set(), processadores: new Set(), marcas: new Set(), modelos: new Set(), status: new Set() }); 
  };

  const canImportToUnit = useCallback((unitId) => {
    if (!unitId) return false;
    if (allowedUnits.length === 0) return true;
    return allowedUnits.includes(unitId.trim());
  }, [allowedUnits]);

  const getUnitLabel = useCallback((unitId) => {
     const unitDoc = unitsSnapshot?.docs.find(d => d.id === unitId);
     return unitDoc ? (unitDoc.data().sigla || unitDoc.data().name) : unitId;
  }, [unitsSnapshot]);

  const isGenericTombamento = (value) => {
    if (!value) return true;
    const v = String(value).trim().toLowerCase();
    const invalidTerms = ['uniservice', 's/n', 'sn', 'n/a', 'sem tombamento', 'locado', 'alugada', 'alugado'];
    if (invalidTerms.some(term => v.includes(term))) return true;
    if (/^[\W_]+$/.test(v)) return true; 
    return false;
  };

  const validateData = (data) => {
    const errors = [];
    const validSetores = getSystemOptions('setores');
    const validPavimentos = getSystemOptions('pavimentos');
    const validSalas = getSystemOptions('salas');
    const validVersoesSO = getSystemOptions('versoes_so');
    const validStatuses = getSystemOptions('status');
    const validPrinterStatuses = importType === 'impressora' ? getSystemOptions('status_impressora') : [];

    const currentValidStatuses = [...validStatuses, ...validPrinterStatuses].map(s => s.toUpperCase());

    const detectedNewSetores = new Set();
    const detectedNewPavimentos = new Set();
    const detectedNewSalas = new Set();
    const detectedNewVersoesSO = new Set();
    const detectedNewMemorias = new Set();
    const detectedNewHdSsd = new Set();
    const detectedNewProcessadores = new Set();
    const detectedNewMarcas = new Set();
    const detectedNewModelos = new Set();
    const detectedNewStatuses = new Set();

    const dataToImport = data.filter((row, index) => {
      const ref = `Linha ${index + 2}`;

      if (!row.unitId) errors.push(`${ref}: Unidade não identificada.`);
      else if (!canImportToUnit(row.unitId)) errors.push(`${ref}: Sem permissão na unidade '${getUnitLabel(row.unitId)}'.`);

      if (!row.status) {
        row.status = 'Estoque';
      } else if (currentValidStatuses.length > 0 && !currentValidStatuses.includes(row.status.toUpperCase())) {
        detectedNewStatuses.add(row.status);
      }

      if (row.setor && !validSetores.includes(row.setor)) {
          detectedNewSetores.add(row.setor);
      }

      if (row.pavimento && !validPavimentos.includes(row.pavimento)) {
          detectedNewPavimentos.add(row.pavimento);
      }
      if (row.sala && !validSalas.includes(row.sala)) {
          detectedNewSalas.add(row.sala);
      }

      if (importType === 'computador') {
          if (row.so && !validVersoesSO.includes(row.so)) {
              detectedNewVersoesSO.add(row.so);
          }
          if (row.memoria && !getSystemOptions('memorias').includes(row.memoria)) {
              detectedNewMemorias.add(row.memoria);
          }
          if (row.hdSsd && !getSystemOptions('hd_ssd').includes(row.hdSsd)) {
              detectedNewHdSsd.add(row.hdSsd);
          }
          if (row.processador && !getSystemOptions('processadores').includes(row.processador)) {
              detectedNewProcessadores.add(row.processador);
          }
          if (row.marca && !getSystemOptions('marcas').includes(row.marca)) {
              detectedNewMarcas.add(row.marca);
          }
          if (row.modelo && !getSystemOptions('modelos').includes(row.modelo)) {
              detectedNewModelos.add(row.modelo);
          }
      }

      return errors.filter(e => e.startsWith(ref)).length === 0;
    });

    setNewTermsToCreate({
      setores: detectedNewSetores,
      pavimentos: detectedNewPavimentos,
      salas: detectedNewSalas,
      versoes_so: detectedNewVersoesSO,
      memorias: detectedNewMemorias,
      hd_ssd: detectedNewHdSsd,
      processadores: detectedNewProcessadores,
      marcas: detectedNewMarcas,
      modelos: detectedNewModelos,
      status: detectedNewStatuses,
    });
    
    setValidationErrors(errors);
    return dataToImport;
  };

  const processRow = (row, sheetName) => {
    const normalizedRow = {};
    Object.keys(row).forEach(key => { 
        let normalizedKey = key.trim().toLowerCase().replace(/ /g, '_');
        if (normalizedKey.includes('hd') && normalizedKey.includes('ssd')) normalizedKey = 'hd_ssd';
        if (normalizedKey.includes('funcionario')) normalizedKey = 'funcionario';
        let value = (row[key] === undefined || row[key] === null) ? '' : row[key]; 
        if (typeof value === 'number') value = String(value);
        normalizedRow[normalizedKey] = String(value).trim(); 
    });

    let unitRaw = normalizedRow['unidade'] || sheetName;
    let realUnitId = unitRaw;
    if (unitsSnapshot) {
        const found = unitsSnapshot.docs.find(d => d.id === unitRaw || d.data().sigla === unitRaw || d.data().name === unitRaw);
        if (found) realUnitId = found.id;
    }

    let tombamentoFinal = normalizedRow['tombamento'];
    if (isGenericTombamento(tombamentoFinal)) {
        tombamentoFinal = ""; 
    }

    let statusFinal = normalizedRow['status'] || 'Estoque';
    if (statusFinal.toUpperCase() === 'ATIVA') statusFinal = 'ATIVO';

    const baseData = {
      tombamento: tombamentoFinal, 
      type: importType,
      unitId: realUnitId,
      status: statusFinal,
      setor: normalizedRow['setor'],
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
        hostname: normalizedRow['hostname'],
        processador: normalizedRow['processador'],
        memoria: normalizedRow['memoria'],
        hdSsd: normalizedRow['hd_ssd'] || '', 
        so: normalizedRow['so'],
        antivirus: normalizedRow['antivirus'],
        macAddress: normalizedRow['mac'], 
        serviceTag: normalizedRow['service_tag'], 
      };
    } else {
      const normBool = (v) => v.toUpperCase().includes('S') ? 'Sim' : 'Não';
      return {
        ...baseData,
        ip: normalizedRow['ip'],
        conectividade: normalizedRow['conectividade'],
        cartucho: normalizedRow['cartucho'],
        colorido: normBool(normalizedRow['colorido']),
        frenteVerso: normBool(normalizedRow['frente_verso'])
      };
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    clearAll(); 
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
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (json.length > 1) {
            const headers = json[0];
            const dataRows = json.slice(1);
            const processedRows = dataRows.map(rowArray => {
                const rowObj = {};
                headers.forEach((h, i) => rowObj[h] = rowArray[i]);
                return processRow(rowObj, sheetName);
            })
            .filter(row => row.setor); 

            allRows = [...allRows, ...processedRows];
          }
        });
        
        if (allRows.length === 0) return toast.error("Planilha vazia ou sem coluna 'Setor'.");

        let serialCounter = 1;
        allRows.forEach(row => {
            if (!row.serial || row.serial.trim() === '') {
                const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
                row.serial = `SEMSERIAL-${String(serialCounter).padStart(3, '0')}-${uniqueSuffix}`;
                serialCounter++;
            }
        });
        
        const uniqueUnits = [...new Set(allRows.map(item => item.unitId))].filter(Boolean).filter(u => canImportToUnit(u)).sort();
        setDetectedUnits(uniqueUnits);
        setAllParsedData(allRows);
        
        if (uniqueUnits.length === 1 && canImportToUnit(uniqueUnits[0])) {
           setTimeout(() => handleConfirmSelection([uniqueUnits[0]], allRows), 100);
        }

      } catch (error) { 
        console.error(error);
        toast.error("Erro ao ler arquivo."); 
      }
    };
    reader.readAsArrayBuffer(file);
  }, [importType, unitsSnapshot, canImportToUnit]); 

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1
  });

  const handleConfirmSelection = (unitsToProcess = selectedUnits, sourceData = allParsedData) => {
    const validUnits = unitsToProcess.filter(u => canImportToUnit(u));
    if (validUnits.length === 0) { toast.error("Selecione uma unidade."); return; }
    const filtered = sourceData.filter(item => validUnits.includes(item.unitId));
    const validDataForImport = validateData(filtered); 
    setImportStats({ count: validDataForImport.length });
    setFileData(validDataForImport);
    if (unitsToProcess !== selectedUnits) setSelectedUnits(validUnits);
  };
  
  const upsertSystemOptions = async () => {
      const { setores, pavimentos, salas, versoes_so, memorias, hd_ssd, processadores, marcas, modelos, status } = newTermsToCreate;
      const updates = [];
      const updateOption = (key, newValuesSet) => {
          if (newValuesSet.size > 0) {
              const currentValues = getSystemOptions(key);
              const newArray = [...new Set([...currentValues, ...Array.from(newValuesSet)])].sort();
              updates.push({ ref: doc(db, 'systemOptions', key), values: newArray });
          }
      };
      updateOption('setores', setores);
      updateOption('pavimentos', pavimentos);
      updateOption('salas', salas);
      updateOption('versoes_so', versoes_so);
      updateOption('memorias', memorias);
      updateOption('hd_ssd', hd_ssd);
      updateOption('processadores', processadores);
      updateOption('marcas', marcas);
      updateOption('modelos', modelos);
      updateOption('status', status);

      if (updates.length > 0) {
          const batch = writeBatch(db);
          updates.forEach(u => batch.set(u.ref, { values: u.values }, { merge: true }));
          await batch.commit();
      }
  };

  const handleImport = async () => {
    if (validationErrors.length > 0 || fileData.length === 0) return;
    setIsUploading(true);
    const toastId = toast.loading("Verificando dados...");

    const seenIds = new Set();
    const duplicatesInFile = [];
    const cleanData = [];

    fileData.forEach(item => {
        const idToCheck = item.tombamento || item.serial;
        if (!idToCheck) {
            cleanData.push(item);
        } else if (seenIds.has(idToCheck)) {
            duplicatesInFile.push(item);
        } else {
            seenIds.add(idToCheck);
            cleanData.push(item);
        }
    });

    const report = {
        totalAttempted: fileData.length,
        newCount: 0,
        updatedCount: 0,
        duplicates: duplicatesInFile.length,
        failures: [],
    };

    if (duplicatesInFile.length > 0) {
         duplicatesInFile.forEach(d => {
             const id = d.tombamento || d.serial || 'sem-id';
             report.failures.push({
                 id,
                 unit: getUnitLabel(d.unitId),
                 tombamento: d.tombamento,
                 reason: "Duplicado na planilha (ignorado)."
             });
         });
    }

    try {
        await upsertSystemOptions();
        
        toast.loading("Comparando com o banco...", { id: toastId });

        const itemsWithIds = cleanData.filter(d => d.tombamento || d.serial);
        const itemsWithoutIds = cleanData.filter(d => !d.tombamento && !d.serial);
        const existingIds = new Set();

        if (itemsWithIds.length > 0) {
            const allIds = itemsWithIds.map(d => d.tombamento || d.serial);
            const checkChunkSize = 30;
            for (let i = 0; i < allIds.length; i += checkChunkSize) {
                const chunkIds = allIds.slice(i, i + checkChunkSize);
                const q = query(collection(db, 'assets'), where(documentId(), 'in', chunkIds));
                const snap = await getDocs(q);
                snap.forEach(doc => existingIds.add(doc.id));
            }
        }

        toast.loading("Enviando dados...", { id: toastId });

        const chunkSize = 400; 
        const allChunks = [...itemsWithIds, ...itemsWithoutIds];
        
        for (let i = 0; i < allChunks.length; i += chunkSize) {
            const batch = writeBatch(db);
            const chunk = allChunks.slice(i, i + chunkSize);
            
            chunk.forEach(item => {
                const docId = item.tombamento || item.serial || null;
                if (docId) {
                    if (existingIds.has(docId)) {
                        report.updatedCount++;
                    } else {
                        report.newCount++;
                    }
                    const assetRef = doc(db, 'assets', docId);
                    batch.set(assetRef, item, { merge: true });
                } else {
                    report.newCount++;
                    const assetRef = doc(db, 'assets');
                    batch.set(assetRef, item, { merge: true });
                }
            });
            
            try {
                await batch.commit();
            } catch (batchError) {
                chunk.forEach(item => {
                    const id = item.tombamento || item.serial || 'sem-id';
                    report.failures.push({
                        id,
                        unit: getUnitLabel(item.unitId),
                        tombamento: item.tombamento,
                        reason: `Erro no lote: ${batchError.message}`
                    });
                });
            }
        }

        setUploadReport(report); 
        await logAudit(
          "Importação em Massa",
          `Importados ${report.newCount} novos e ${report.updatedCount} atualizados (${importType}).`,
          importType
        );
        toast.success("Processo finalizado!", { id: toastId });
        setFileData([]); 
        setDetectedUnits([]);

    } catch (error) {
        toast.error("Erro geral: " + error.message, { id: toastId });
    } finally { setIsUploading(false); }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    // ... download ...
    toast.success("Modelo baixado!");
  };

  if (!authLoading && !isAdmin && allowedUnits.length === 0) {
    return <div className={styles.page}><h2>Acesso Bloqueado</h2></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Importação em Massa</h1>
          <p className={styles.subtitle}>Relatório detalhado de falhas e duplicatas.</p>
        </div>
        <button onClick={downloadTemplate} className={styles.secondaryButton}>
          <Download size={18} /> Baixar Modelo
        </button>
      </header>

      {/* RELATÓRIO FINAL ESTILIZADO PARA LEGIBILIDADE NO DARK MODE */}
      {uploadReport && (
        <div
            className={styles.reportContainer}
            style={{
                marginBottom: 20,
                padding: 24,
                borderRadius: 12,
                backgroundColor: 'var(--color-bg-component)',
                color: 'var(--color-text-primary)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid var(--color-border)'
            }}
        >
            <h2 style={{display:'flex', alignItems:'center', gap: 10, fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)'}}>
                {uploadReport.failures.length === 0 ? <CheckCircle color="var(--color-success)" /> : <AlertTriangle color="var(--color-warning)" />}
                Resumo da Operação
            </h2>

            <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginTop: 20}}>
                <div style={{padding: 16, backgroundColor: 'var(--color-success-bg)', borderRadius: 8, border: '1px solid var(--color-success)'}}>
                    <div style={{fontSize: '0.875rem', color: 'var(--color-success-text)'}}>Novos Itens</div>
                    <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)'}}>{uploadReport.newCount}</div>
                </div>
                <div style={{padding: 16, backgroundColor: 'var(--color-primary-light-alpha)', borderRadius: 8, border: '1px solid var(--color-primary)'}}>
                    <div style={{fontSize: '0.875rem', color: 'var(--color-primary)'}}>Atualizados</div>
                    <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)'}}>{uploadReport.updatedCount}</div>
                </div>
                <div style={{padding: 16, backgroundColor: 'var(--color-warning-bg)', borderRadius: 8, border: '1px solid var(--color-warning-border)'}}>
                    <div style={{fontSize: '0.875rem', color: 'var(--color-warning-text)'}}>Total Processado</div>
                    <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)'}}>{uploadReport.newCount + uploadReport.updatedCount}</div>
                </div>
                {uploadReport.duplicates > 0 && (
                     <div style={{padding: 16, backgroundColor: 'var(--color-error-bg)', borderRadius: 8, border: '1px solid var(--color-error-border)'}}>
                        <div style={{fontSize: '0.875rem', color: 'var(--color-error-text)'}}>Ignorados (Duplicados)</div>
                        <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger)'}}>{uploadReport.duplicates}</div>
                    </div>
                )}
            </div>

            {uploadReport.failures.length > 0 && (
                <div style={{marginTop: 24}}>
                    <h4 style={{fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)'}}>Detalhes dos Itens Ignorados:</h4>
                    <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600}}>
                            <thead>
                                <tr style={{backgroundColor: 'var(--color-bg-alt)', borderBottom: '2px solid var(--color-border)'}}>
                                    <th style={{padding: '10px', textAlign:'left', color: 'var(--color-text-secondary)'}}>Unidade</th>
                                    <th style={{padding: '10px', textAlign:'left', color: 'var(--color-text-secondary)'}}>ID (Serial)</th>
                                    <th style={{padding: '10px', textAlign:'left', color: 'var(--color-text-secondary)'}}>Tombamento</th>
                                    <th style={{padding: '10px', textAlign:'left', color: 'var(--color-text-secondary)'}}>Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uploadReport.failures.map((fail, idx) => (
                                    <tr key={idx} style={{borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'var(--color-bg-component)' : 'var(--color-bg-alt)'}}>
                                        <td style={{padding: '10px', color: 'var(--color-text-primary)', fontWeight: 500}}>{fail.unit}</td>
                                        <td style={{padding: '10px', color: 'var(--color-text-primary)', fontFamily: 'monospace'}}>{fail.id}</td>
                                        <td style={{padding: '10px', color: 'var(--color-text-secondary)'}}>{fail.tombamento || '-'}</td>
                                        <td style={{padding: '10px', color: 'var(--color-danger)'}}>{fail.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
             <button onClick={clearAll} className={styles.primaryButton} style={{marginTop: 24}}>Realizar Nova Importação</button>
        </div>
      )}

      {!uploadReport && (
        <>
          <div className={styles.typeSelector}>
            <button className={`${styles.typeButton} ${importType === 'computador' ? styles.activeType : ''}`} onClick={() => { setImportType('computador'); clearAll(); }}>
              <Laptop size={24} /> <strong>Computadores</strong>
            </button>
            <button className={`${styles.typeButton} ${importType === 'impressora' ? styles.activeType : ''}`} onClick={() => { setImportType('impressora'); clearAll(); }}>
              <Printer size={24} /> <strong>Impressoras</strong>
            </button>
          </div>

          <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
            <input {...getInputProps()} />
            <UploadCloud size={48} className={styles.uploadIcon} />
            <div className={styles.dropText}>
              <p>Arraste sua planilha aqui (.xlsx)</p>
            </div>
          </div>

          {detectedUnits.length > 0 && fileData.length === 0 && (
            <div className={styles.unitSelectorBox}>
              <h3>Unidades encontradas ({detectedUnits.length}):</h3>
              <div className={styles.unitGrid}>
                {detectedUnits.map(unitId => (
                  <label key={unitId} className={`${styles.unitCheckboxCard} ${selectedUnits.includes(unitId) ? styles.checked : ''}`}>
                    <input type="checkbox" checked={selectedUnits.includes(unitId)} onChange={() => setSelectedUnits(prev => prev.includes(unitId) ? prev.filter(u => u !== unitId) : [...prev, unitId])} />
                    <span>{getUnitLabel(unitId)}</span>
                  </label>
                ))}
              </div>
              <button className={styles.primaryButton} style={{marginTop: 20}} onClick={() => handleConfirmSelection()}>Processar</button>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className={styles.errorBox}>
              <h3><AlertTriangle /> Erros impeditivos:</h3>
              <ul>{validationErrors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          {fileData.length > 0 && validationErrors.length === 0 && (
            <div className={styles.previewContainer}>
              <div className={styles.previewHeader}>
                <div className={styles.successBadge}><CheckCircle size={18} /><span>Pronto para importar {fileData.length} itens.</span></div>
                <button className={styles.primaryButton} onClick={handleImport} disabled={isUploading}>
                  {isUploading ? <Loader2 className={styles.spinner} /> : <FileSpreadsheet size={18} />} Confirmar
                </button>
              </div>
              <div className={styles.tablePreview}>
                <table>
                  <thead><tr><th>Unidade</th><th>ID (Serial)</th><th>Tombamento</th><th>Setor</th><th>Status</th></tr></thead>
                  <tbody>
                    {fileData.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                        <td>{getUnitLabel(r.unitId)}</td>
                        <td style={{fontFamily:'monospace', fontSize:12, color: r.serial.startsWith('SEMSERIAL') ? 'orange' : 'inherit'}}>
                            {r.serial}
                        </td>
                        <td>
                          {r.tombamento === "" ? <em style={{color: 'var(--color-text-secondary)'}}>-- Vazio --</em> : r.tombamento}
                        </td>
                        <td>{r.setor}</td>
                        <td>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BulkImportPage;