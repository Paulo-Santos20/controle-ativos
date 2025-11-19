import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx'; // Apenas para leitura
import ExcelJS from 'exceljs'; // Para gerar o arquivo colorido
import { saveAs } from 'file-saver'; // Para baixar
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase'; 
import { toast } from 'sonner';
import { Loader2, UploadCloud, AlertTriangle, CheckCircle, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import styles from './BulkImportPage.module.css';

const BulkImportPage = () => {
  const [fileData, setFileData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importStats, setImportStats] = useState({ computers: 0, printers: 0 });

  const processRow = (row) => {
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      normalizedRow[key.trim().toLowerCase()] = row[key];
    });

    const rawType = normalizedRow['tipo'] || '';
    const type = rawType.toLowerCase().includes('impressora') ? 'impressora' : 'computador';

    const baseData = {
      tombamento: String(normalizedRow['tombamento'] || '').trim(),
      type: type,
      marca: normalizedRow['marca'] || 'Genérico',
      modelo: normalizedRow['modelo'] || 'Desconhecido',
      serial: normalizedRow['serial'] || 'N/A',
      status: normalizedRow['status'] || 'Estoque',
      unitId: normalizedRow['unidade'] || '', 
      setor: normalizedRow['setor'] || 'Geral',
      sala: normalizedRow['sala'] || '',
      pavimento: normalizedRow['pavimento'] || '',
      funcionario: normalizedRow['funcionario'] || '',
      observacao: normalizedRow['observacao'] || '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      importedBy: auth.currentUser?.email,
      isImported: true
    };

    if (type === 'computador') {
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
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          allRows = [...allRows, ...json];
        });
        
        if (allRows.length === 0) {
          toast.error("A planilha está vazia.");
          return;
        }

        const processedData = allRows.map(processRow);
        validateData(processedData);
        
        const comps = processedData.filter(d => d.type === 'computador').length;
        const prints = processedData.filter(d => d.type === 'impressora').length;
        setImportStats({ computers: comps, printers: prints });

        setFileData(processedData);

      } catch (error) {
        console.error(error);
        toast.error("Erro ao ler o arquivo Excel.");
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const validateData = (data) => {
    const errors = [];
    data.forEach((row, index) => {
      if (!row.tombamento) errors.push(`Item ${index + 1}: Falta 'Tombamento'`);
      if (!row.unitId) errors.push(`Item ${index + 1} (${row.tombamento}): Falta 'Unidade'`);
      if (!row.status) errors.push(`Item ${index + 1} (${row.tombamento}): Falta 'Status'`);
    });
    setValidationErrors(errors);
    if (errors.length > 0) {
      toast.warning(`${errors.length} erros encontrados.`);
    } else {
      toast.success(`${data.length} itens válidos!`);
    }
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error("Corrija os erros antes de importar.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Iniciando importação...");

    try {
      const chunkSize = 400;
      const chunks = [];
      for (let i = 0; i < fileData.length; i += chunkSize) {
        chunks.push(fileData.slice(i, i + chunkSize));
      }

      let processedCount = 0;

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const assetRef = doc(db, 'assets', item.tombamento);
          batch.set(assetRef, item); 
        });
        await batch.commit();
        processedCount += chunk.length;
        toast.loading(`Processados ${processedCount} de ${fileData.length}...`, { id: toastId });
      }

      toast.success(`Sucesso! ${processedCount} ativos importados.`, { id: toastId });
      setFileData([]); 
      setImportStats({ computers: 0, printers: 0 });
    } catch (error) {
      console.error(error);
      toast.error("Erro na importação: " + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // --- 5. GERAR MODELO COM CORES (USANDO EXCELJS) ---
  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Estilos
    const mandatoryFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }; // Vermelho Claro
    const mandatoryFont = { color: { argb: 'FF9C0006' }, bold: true }; // Vermelho Escuro
    
    const optionalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }; // Verde Claro
    const optionalFont = { color: { argb: 'FF006100' }, bold: true }; // Verde Escuro

    const mandatoryCols = ["Tombamento", "Tipo", "Status", "Unidade"];

    // Helper
    const createSheet = (sheetName, headers, exampleRow) => {
      const sheet = workbook.addWorksheet(sheetName);
      const headerRow = sheet.addRow(headers);
      
      headerRow.eachCell((cell, colNumber) => {
        const headerName = cell.value;
        if (mandatoryCols.includes(headerName)) {
          cell.fill = mandatoryFill;
          cell.font = mandatoryFont;
        } else {
          cell.fill = optionalFill;
          cell.font = optionalFont;
        }
        cell.border = { bottom: { style: 'thin' } };
        sheet.getColumn(colNumber).width = 18;
      });

      sheet.addRow(exampleRow);
    };

    // Aba 1: Computadores
    createSheet(
      "Computadores",
      ["Tombamento", "Tipo", "Marca", "Modelo", "Serial", "Status", "Unidade", "Setor", "Sala", "Pavimento", "Funcionario", "Hostname", "Processador", "Memoria", "HD_SSD", "SO", "Antivirus", "MAC", "Service_Tag", "Observacao"],
      ["CMP-001", "computador", "Dell", "Optiplex", "12345", "Em uso", "HMR", "TI", "Sala TI", "Térreo", "João", "HMR-TI-01", "i5", "8GB", "256GB", "Win10", "Kaspersky", "", "", ""]
    );

    // Aba 2: Impressoras
    createSheet(
      "Impressoras",
      ["Tombamento", "Tipo", "Marca", "Modelo", "Serial", "Status", "Unidade", "Setor", "Sala", "Pavimento", "Funcionario", "IP", "Conectividade", "Cartucho", "Colorido", "Frente_Verso", "Observacao"],
      ["IMP-001", "impressora", "Brother", "8157", "98765", "Em uso", "HMR", "Recepção", "Balcão", "Térreo", "", "192.168.0.50", "Rede", "TN-3472", "Não", "Sim", ""]
    );

    // Baixar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, "modelo_ativos_colorido.xlsx");
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Importação em Massa</h1>
          <p className={styles.subtitle}>Use a planilha modelo para garantir os campos corretos.</p>
        </div>
        <button onClick={downloadTemplate} className={styles.secondaryButton}>
          <Download size={18} /> Baixar Modelo (Colorido)
        </button>
      </header>

      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
        <input {...getInputProps()} />
        <UploadCloud size={64} className={styles.uploadIcon} />
        {isDragActive ? (
          <p>Solte o arquivo aqui...</p>
        ) : (
          <div className={styles.dropText}>
            <p>Arraste seu Excel aqui ou clique para selecionar.</p>
            <div style={{display:'flex', gap: 10, justifyContent: 'center', marginTop: 8}}>
                <span style={{color: '#991b1b', fontWeight: 'bold', fontSize: '0.8rem', background:'#fee2e2', padding:'2px 8px', borderRadius:4}}>Vermelho: Obrigatório</span>
                <span style={{color: '#166534', fontWeight: 'bold', fontSize: '0.8rem', background:'#dcfce7', padding:'2px 8px', borderRadius:4}}>Verde: Opcional</span>
            </div>
          </div>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className={styles.errorBox}>
          <h3><AlertTriangle size={20} /> Erros Encontrados</h3>
          <ul>
            {validationErrors.slice(0, 10).map((err, idx) => <li key={idx}>{err}</li>)}
          </ul>
          <button onClick={() => {setFileData([]); setValidationErrors([])}} className={styles.textButton}>Limpar</button>
        </div>
      )}

      {fileData.length > 0 && validationErrors.length === 0 && (
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <div className={styles.successBadge}>
              <CheckCircle size={18} />
              <span>
                Prontos: 
                <strong> {importStats.computers} Computadores</strong>, 
                <strong> {importStats.printers} Impressoras</strong>
              </span>
            </div>
            <div className={styles.actionButtons}>
                <button className={styles.tertiaryButton} onClick={() => {setFileData([]); setImportStats({computers:0, printers:0})}}>
                    <RefreshCw size={16} /> Cancelar
                </button>
                <button 
                className={styles.primaryButton} 
                onClick={handleImport}
                disabled={isUploading}
                >
                {isUploading ? <Loader2 className={styles.spinner} /> : <FileSpreadsheet size={18} />}
                {isUploading ? "Importando..." : "Confirmar Importação"}
                </button>
            </div>
          </div>

          <div className={styles.tablePreview}>
            <table>
              <thead>
                <tr>
                  <th>Tombamento</th>
                  <th>Tipo</th>
                  <th>Modelo</th>
                  <th>Unidade</th>
                </tr>
              </thead>
              <tbody>
                {fileData.slice(0, 6).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.tombamento}</td>
                    <td>{row.type}</td>
                    <td>{row.marca} {row.modelo}</td>
                    <td>{row.unitId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fileData.length > 6 && <p className={styles.moreText}>...e mais {fileData.length - 6} itens.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;