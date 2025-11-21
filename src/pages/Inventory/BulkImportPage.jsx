import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs'; 
import { saveAs } from 'file-saver'; 
import { writeBatch, doc, serverTimestamp, collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore'; // Necessário para listar unidades
import { db, auth } from '../../lib/firebase'; 
import { toast } from 'sonner';
import { Loader2, UploadCloud, AlertTriangle, CheckCircle, FileSpreadsheet, Download, RefreshCw, Laptop, Printer } from 'lucide-react';
import styles from './BulkImportPage.module.css';

const BulkImportPage = () => {
  // Estado para decidir o que estamos importando (Computador ou Impressora)
  const [importType, setImportType] = useState('computador'); // 'computador' | 'impressora'
  
  const [fileData, setFileData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importCount, setImportCount] = useState(0);

  // Busca as Unidades para gerar as abas da planilha
  const [unitsSnapshot, loadingUnits] = useCollection(
    query(collection(db, 'units'), orderBy('name', 'asc'))
  );

  // --- 1. DEFINIÇÃO DAS COLUNAS (Cabeçalhos) ---
  const getHeaders = () => {
    if (importType === 'computador') {
      return [
        "Tombamento", "Hostname", "Marca", "Modelo", "Serial", "Status", 
        "Setor", "Sala", "Pavimento", "Funcionario", 
        "Processador", "Memoria", "HD_SSD", "SO", "Antivirus", "MAC", "Service_Tag", 
        "Observacao" // Único opcional
      ];
    } else {
      return [
        "Tombamento", "Marca", "Modelo", "Serial", "IP", "Status", 
        "Setor", "Sala", "Pavimento", "Funcionario", 
        "Conectividade", "Cartucho", "Colorido", "Frente_Verso", 
        "Observacao" // Único opcional
      ];
    }
  };

  // --- 2. LÓGICA DE PROCESSAMENTO ---
  const processRow = (row, sheetName) => {
    const normalizedRow = {};
    // Normaliza as chaves para minúsculo e sem espaços
    Object.keys(row).forEach(key => {
      normalizedRow[key.trim().toLowerCase()] = row[key];
    });

    // Dados Base (Obrigatórios para ambos)
    const baseData = {
      tombamento: String(normalizedRow['tombamento'] || '').trim(),
      type: importType,
      // A unidade vem do Nome da Aba (Sheet Name)
      unitId: sheetName.trim(), 
      
      marca: normalizedRow['marca'] || '',
      modelo: normalizedRow['modelo'] || '',
      serial: normalizedRow['serial'] || '',
      status: normalizedRow['status'] || '',
      setor: normalizedRow['setor'] || '',
      sala: normalizedRow['sala'] || '',
      pavimento: normalizedRow['pavimento'] || '',
      funcionario: normalizedRow['funcionario'] || '',
      observacao: normalizedRow['observacao'] || '', // Opcional
      
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
        colorido: normalizedRow['colorido'] || '',
        frenteVerso: normalizedRow['frente_verso'] || ''
      };
    }
  };

  // --- 3. LEITURA DO ARQUIVO ---
  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let allRows = [];

        // Itera sobre cada aba (Cada aba é uma unidade)
        workbook.SheetNames.forEach(sheetName => {
          // Ignora abas de instrução se houver
          if (sheetName.toLowerCase().includes('instru')) return;

          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          
          // Adiciona os dados processados, passando o nome da aba como unidade
          const processedRows = json.map(row => processRow(row, sheetName));
          allRows = [...allRows, ...processedRows];
        });
        
        if (allRows.length === 0) {
          toast.error("A planilha está vazia ou as abas não correspondem.");
          return;
        }

        validateData(allRows);
        setImportCount(allRows.length);
        setFileData(allRows);

      } catch (error) {
        console.error(error);
        toast.error("Erro ao ler o arquivo. Verifique o formato.");
      }
    };

    reader.readAsArrayBuffer(file);
  }, [importType]); // Recria se o tipo mudar

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1
  });

  // --- 4. VALIDAÇÃO RIGOROSA ---
  const validateData = (data) => {
    const errors = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 2; // +1 header +1 index 0
      const ref = row.tombamento || `Linha ${rowNum}`;

      // Validação Base (Tudo obrigatório exceto obs)
      if (!row.tombamento) errors.push(`${ref}: Falta Tombamento`);
      if (!row.marca) errors.push(`${ref}: Falta Marca`);
      if (!row.modelo) errors.push(`${ref}: Falta Modelo`);
      if (!row.serial) errors.push(`${ref}: Falta Serial`);
      if (!row.status) errors.push(`${ref}: Falta Status`);
      if (!row.setor) errors.push(`${ref}: Falta Setor`);
      if (!row.sala) errors.push(`${ref}: Falta Sala`);
      if (!row.pavimento) errors.push(`${ref}: Falta Pavimento`);
      // Funcionario pode ser opcional se for estoque, mas o prompt pediu "todas obrigatórias"
      if (!row.funcionario && row.status === 'Em uso') errors.push(`${ref}: Falta Funcionário (obrigatório para Em Uso)`);

      if (importType === 'computador') {
         if (!row.hostname) errors.push(`${ref}: Falta Hostname`);
         if (!row.processador) errors.push(`${ref}: Falta Processador`);
         if (!row.memoria) errors.push(`${ref}: Falta Memória`);
         if (!row.hdSsd) errors.push(`${ref}: Falta HD/SSD`);
         if (!row.so) errors.push(`${ref}: Falta S.O.`);
      } else {
         if (!row.cartucho) errors.push(`${ref}: Falta Cartucho`);
         if (!row.conectividade) errors.push(`${ref}: Falta Conectividade`);
      }
    });

    setValidationErrors(errors);
    
    if (errors.length > 0) {
      toast.warning(`${errors.length} erros encontrados. A importação será bloqueada.`);
    } else {
      toast.success(`${data.length} itens validados com sucesso!`);
    }
  };

  // --- 5. ENVIO ---
  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error("Corrija os erros indicados antes de importar.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Importando para o banco de dados...");

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
        toast.loading(`Salvando ${processedCount} de ${fileData.length}...`, { id: toastId });
      }

      toast.success(`Sucesso! ${processedCount} ${importType}s importados.`, { id: toastId });
      setFileData([]); 
      setImportCount(0);
    } catch (error) {
      console.error(error);
      toast.error("Erro na gravação: " + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // --- 6. GERAR MODELO POR UNIDADE ---
  const downloadTemplate = async () => {
    if (!unitsSnapshot || unitsSnapshot.empty) {
      toast.error("Nenhuma unidade cadastrada para gerar as abas.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const headers = getHeaders();
    
    // Estilos
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }; // Vermelho Claro (Obrigatório)
    const headerFont = { color: { argb: 'FF9C0006' }, bold: true };
    
    const obsFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }; // Verde Claro (Opcional)
    const obsFont = { color: { argb: 'FF006100' }, bold: true };

    // Cria uma aba para cada unidade
    unitsSnapshot.docs.forEach(doc => {
      const unitName = doc.data().sigla || doc.data().name || "Unidade";
      // Limpa caracteres inválidos para nome de aba Excel
      const safeSheetName = unitName.replace(/[*?:\/\[\]]/g, '').substring(0, 30);
      
      const sheet = workbook.addWorksheet(safeSheetName);
      const headerRow = sheet.addRow(headers);

      // Aplica estilos
      headerRow.eachCell((cell, colNumber) => {
        const val = cell.value;
        if (val === 'Observacao') {
           cell.fill = obsFill;
           cell.font = obsFont;
        } else {
           cell.fill = headerFill;
           cell.font = headerFont;
        }
        cell.border = { bottom: { style: 'thin' } };
        sheet.getColumn(colNumber).width = 18;
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `modelo_importacao_${importType}_por_unidade.xlsx`;
    saveAs(blob, fileName);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Importação em Massa</h1>
          <p className={styles.subtitle}>
            Selecione o tipo, baixe o modelo (com abas por unidade) e preencha.
          </p>
        </div>
      </header>

      {/* SELETOR DE TIPO DE IMPORTAÇÃO */}
      <div className={styles.typeSelector}>
        <button 
          className={`${styles.typeButton} ${importType === 'computador' ? styles.activeType : ''}`}
          onClick={() => { setImportType('computador'); setFileData([]); setValidationErrors([]); }}
        >
          <Laptop size={24} />
          <div>
            <strong>Computadores</strong>
            <small>Desktops, Notebooks...</small>
          </div>
        </button>
        <button 
          className={`${styles.typeButton} ${importType === 'impressora' ? styles.activeType : ''}`}
          onClick={() => { setImportType('impressora'); setFileData([]); setValidationErrors([]); }}
        >
          <Printer size={24} />
          <div>
            <strong>Impressoras</strong>
            <small>Térmicas, Laser, Etiquetas...</small>
          </div>
        </button>
      </div>

      {/* ÁREA DE AÇÃO */}
      <div className={styles.actionArea}>
        <div className={styles.step}>
          <span className={styles.stepNum}>1</span>
          <p>Baixe a planilha modelo. Ela virá com uma aba para cada unidade cadastrada.</p>
          <button onClick={downloadTemplate} className={styles.secondaryButton} disabled={loadingUnits}>
            {loadingUnits ? <Loader2 className={styles.spinner} /> : <Download size={18} />} 
            Baixar Modelo ({importType.toUpperCase()})
          </button>
        </div>

        <div className={styles.step}>
          <span className={styles.stepNum}>2</span>
          <p>Preencha os dados nas abas corretas. (Vermelho = Obrigatório)</p>
        </div>

        <div className={styles.step} style={{width: '100%'}}>
          <span className={styles.stepNum}>3</span>
          <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
            <input {...getInputProps()} />
            <UploadCloud size={48} className={styles.uploadIcon} />
            <div className={styles.dropText}>
              <p>Solte a planilha preenchida aqui.</p>
              <small>Importando como: <strong>{importType.toUpperCase()}</strong></small>
            </div>
          </div>
        </div>
      </div>

      {/* EXIBIÇÃO DE ERROS */}
      {validationErrors.length > 0 && (
        <div className={styles.errorBox}>
          <h3><AlertTriangle size={20} /> {validationErrors.length} Erros Encontrados</h3>
          <ul>
            {validationErrors.slice(0, 20).map((err, idx) => <li key={idx}>{err}</li>)}
            {validationErrors.length > 20 && <li>...e mais {validationErrors.length - 20}.</li>}
          </ul>
          <button onClick={() => {setFileData([]); setValidationErrors([])}} className={styles.textButton}>
            Limpar e tentar novamente
          </button>
        </div>
      )}

      {/* PREVIEW E CONFIRMAÇÃO */}
      {fileData.length > 0 && validationErrors.length === 0 && (
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <div className={styles.successBadge}>
              <CheckCircle size={18} />
              <span>
                <strong>{importCount}</strong> {importType}s prontos para importar.
              </span>
            </div>
            <div className={styles.actionButtons}>
                <button className={styles.tertiaryButton} onClick={() => {setFileData([]); setImportCount(0)}}>
                    <RefreshCw size={16} /> Cancelar
                </button>
                <button 
                  className={styles.primaryButton} 
                  onClick={handleImport}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className={styles.spinner} /> : <FileSpreadsheet size={18} />}
                  {isUploading ? "Enviando..." : "Confirmar Importação"}
                </button>
            </div>
          </div>

          <div className={styles.tablePreview}>
            <table>
              <thead>
                <tr>
                  <th>Unidade (Aba)</th>
                  <th>Tombamento</th>
                  <th>Modelo</th>
                  <th>Serial</th>
                  {importType === 'computador' ? <th>Hostname</th> : <th>IP</th>}
                </tr>
              </thead>
              <tbody>
                {fileData.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.unitId}</strong></td>
                    <td>{row.tombamento}</td>
                    <td>{row.marca} {row.modelo}</td>
                    <td>{row.serial}</td>
                    <td>{importType === 'computador' ? row.hostname : row.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fileData.length > 10 && <p className={styles.moreText}>...e mais {fileData.length - 10} itens.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;