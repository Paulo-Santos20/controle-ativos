import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '/src/lib/firebase.js';
import { toast } from 'sonner';
import { Loader2, UploadCloud, AlertTriangle, CheckCircle, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import styles from './BulkImportPage.module.css';

const BulkImportPage = () => {
  const [fileData, setFileData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importStats, setImportStats] = useState({ computers: 0, printers: 0 });

  // --- 1. LÓGICA INTELIGENTE DE PROCESSAMENTO ---
  const processRow = (row) => {
    // Normaliza chaves (remove espaços e coloca em minúsculo para evitar erros de digitação no header)
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      normalizedRow[key.trim().toLowerCase()] = row[key];
    });

    // Detecta o tipo (padroniza para minúsculo)
    const rawType = normalizedRow['tipo'] || '';
    const type = rawType.toLowerCase().includes('impressora') ? 'impressora' : 'computador';

    // Campos Comuns
    const baseData = {
      tombamento: String(normalizedRow['tombamento'] || '').trim(),
      type: type,
      marca: normalizedRow['marca'] || 'Genérico',
      modelo: normalizedRow['modelo'] || 'Desconhecido',
      serial: normalizedRow['serial'] || 'N/A',
      status: normalizedRow['status'] || 'Estoque',
      unitId: normalizedRow['unidade'] || '', // IMPORTANTE: Tem que ser o ID ou Sigla exata
      setor: normalizedRow['setor'] || 'Geral',
      sala: normalizedRow['sala'] || '',
      pavimento: normalizedRow['pavimento'] || '',
      funcionario: normalizedRow['funcionario'] || '',
      observacao: normalizedRow['observacao'] || '',
      // Metadata
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      importedBy: auth.currentUser?.email,
      isImported: true
    };

    // Campos Específicos
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
      // Impressora
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

  // --- 2. FUNÇÃO DE LEITURA DO EXCEL ---
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let allRows = [];

        // Lê TODAS as abas (Sheets) do arquivo
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          allRows = [...allRows, ...json];
        });
        
        if (allRows.length === 0) {
          toast.error("A planilha está vazia.");
          return;
        }

        // Processa e valida
        const processedData = allRows.map(processRow);
        validateData(processedData);
        
        // Conta estatísticas para mostrar ao usuário
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

  // --- 3. VALIDAÇÃO ---
  const validateData = (data) => {
    const errors = [];
    data.forEach((row, index) => {
      if (!row.tombamento) errors.push(`Item ${index + 1}: Falta 'Tombamento'`);
      if (!row.unitId) errors.push(`Item ${index + 1} (${row.tombamento}): Falta 'Unidade'`);
      if (!row.status) errors.push(`Item ${index + 1} (${row.tombamento}): Falta 'Status'`);
    });
    setValidationErrors(errors);
    if (errors.length > 0) {
      toast.warning(`${errors.length} erros encontrados. Verifique a lista.`);
    } else {
      toast.success(`${data.length} itens carregados e válidos!`);
    }
  };

  // --- 4. ENVIO (BATCH) ---
  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error("Corrija os erros antes de importar.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Iniciando importação...");

    try {
      const chunkSize = 400; // Limite do Firestore é 500
      const chunks = [];
      for (let i = 0; i < fileData.length; i += chunkSize) {
        chunks.push(fileData.slice(i, i + chunkSize));
      }

      let processedCount = 0;

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          // O ID do documento é o Tombamento
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

  // --- 5. GERAR MODELO INTELIGENTE (2 Abas) ---
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Aba 1: Computadores
    const headersPC = [
      ["Tombamento", "Tipo", "Marca", "Modelo", "Serial", "Hostname", "Status", "Unidade", "Setor", "Sala", "Pavimento", "Funcionario", "Processador", "Memoria", "HD_SSD", "SO", "Antivirus", "MAC", "Service_Tag", "Observacao"]
    ];
    const examplePC = [
      ["CMP-001", "computador", "Dell", "Optiplex 3080", "123456", "HMR-TI-01", "Em uso", "HMR", "TI", "Sala TI", "Térreo", "João", "i5", "8GB", "256GB", "Windows 10", "Kaspersky", "", "", ""]
    ];
    const wsPC = XLSX.utils.aoa_to_sheet([...headersPC, ...examplePC]);
    XLSX.utils.book_append_sheet(wb, wsPC, "Computadores");

    // Aba 2: Impressoras
    const headersImp = [
      ["Tombamento", "Tipo", "Marca", "Modelo", "Serial", "IP", "Status", "Unidade", "Setor", "Sala", "Pavimento", "Funcionario", "Conectividade", "Cartucho", "Colorido", "Frente_Verso", "Observacao"]
    ];
    const exampleImp = [
      ["IMP-001", "impressora", "Brother", "8157", "987654", "192.168.0.50", "Em uso", "HMR", "Recepção", "Balcão", "Térreo", "", "Rede", "TN-3472", "Não", "Sim", ""]
    ];
    const wsImp = XLSX.utils.aoa_to_sheet([...headersImp, ...exampleImp]);
    XLSX.utils.book_append_sheet(wb, wsImp, "Impressoras");

    // Baixar
    XLSX.writeFile(wb, "modelo_importacao_ativos.xlsx");
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Importação em Massa</h1>
          <p className={styles.subtitle}>Cadastre múltiplos ativos via Excel.</p>
        </div>
        <button onClick={downloadTemplate} className={styles.secondaryButton}>
          <Download size={18} /> Baixar Planilha Modelo (2 Abas)
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
            <small>O sistema identificará automaticamente as abas de Computadores e Impressoras.</small>
          </div>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className={styles.errorBox}>
          <h3><AlertTriangle size={20} /> Erros Encontrados ({validationErrors.length})</h3>
          <ul>
            {validationErrors.slice(0, 10).map((err, idx) => <li key={idx}>{err}</li>)}
            {validationErrors.length > 10 && <li>...e mais {validationErrors.length - 10}.</li>}
          </ul>
          <button onClick={() => {setFileData([]); setValidationErrors([])}} className={styles.textButton}>Limpar e tentar novamente</button>
        </div>
      )}

      {fileData.length > 0 && validationErrors.length === 0 && (
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <div className={styles.statsBadge}>
              <CheckCircle size={18} />
              <span>
                Prontos para importar: 
                <strong> {importStats.computers} Computadores</strong> e 
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

          {/* Tabela de Preview (Amostra mista) */}
          <div className={styles.tablePreview}>
            <table>
              <thead>
                <tr>
                  <th>Tombamento</th>
                  <th>Tipo</th>
                  <th>Modelo</th>
                  <th>Unidade</th>
                  <th>Detalhe (CPU/Cartucho)</th>
                </tr>
              </thead>
              <tbody>
                {fileData.slice(0, 6).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.tombamento}</td>
                    <td>{row.type}</td>
                    <td>{row.marca} {row.modelo}</td>
                    <td>{row.unitId}</td>
                    <td>
                        {row.type === 'computador' 
                            ? `${row.processador || '-'} / ${row.memoria || '-'}`
                            : `${row.cartucho || '-'}`
                        }
                    </td>
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