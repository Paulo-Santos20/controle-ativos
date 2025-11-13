import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '/src/lib/firebase.js';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  FileDown, 
  Filter, 
  Loader2, 
  Monitor, 
  AlertTriangle, 
  CheckCircle2,
  Building2,
  FileText // Ícone para PDF
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf'; // Biblioteca de PDF
import 'jspdf-autotable'; // Plugin de Tabela

import styles from './Reports.module.css';

// Cores consistentes com o Dashboard
const COLORS = ['#007aff', '#5ac8fa', '#ff9500', '#34c759', '#ff3b30', '#af52de'];

// Opções de Status (Reutilizadas para consistência)
const opcoesStatus = [
  "Em uso", "Manutenção", "Inativo", "Estoque", 
  "Manutenção agendada", "Devolução agendada", "Devolvido", "Reativação agendada"
];

const Reports = () => {
  // --- ESTADOS DE FILTRO ---
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // <-- NOVO FILTRO

  // --- BUSCA DE DADOS ---
  const [assets, loadingAssets, errorAssets] = useCollection(query(collection(db, 'assets')));
  const [units, loadingUnits] = useCollection(query(collection(db, 'units'), orderBy('name', 'asc')));

  // --- PROCESSAMENTO DE DADOS (MEMOIZED) ---
  
  // 1. Aplica os filtros aos dados brutos
  const filteredData = useMemo(() => {
    if (!assets) return [];
    return assets.docs
      .map(doc => doc.data())
      .filter(item => {
        const unitMatch = filterUnit === 'all' || item.unitId === filterUnit;
        const typeMatch = filterType === 'all' || item.type === filterType || item.tipoAtivo === filterType;
        // Lógica do Filtro de Status
        const statusMatch = filterStatus === 'all' || item.status === filterStatus;
        
        return unitMatch && typeMatch && statusMatch;
      });
  }, [assets, filterUnit, filterType, filterStatus]);

  // 2. Gera dados para o Gráfico de Pizza (Status)
  const statusData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const status = item.status || 'Desconhecido';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredData]);

  // 3. Gera dados para o Gráfico de Barras (Tipo de Ativo)
  const typeData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const type = item.tipoAtivo || item.type || 'Outro';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredData]);

  // --- KPIs (Indicadores) ---
  const totalAssets = filteredData.length;
  const totalMaintenance = filteredData.filter(i => i.status && i.status.toLowerCase().includes('manutenção')).length;
  const totalActive = filteredData.filter(i => i.status === 'Em uso').length;

  // --- FUNÇÃO DE EXPORTAR CSV ---
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }

    try {
      const headers = ["Tombamento", "Tipo", "Marca", "Modelo", "Serial", "Status", "Unidade", "Setor", "Usuário"];
      const rows = filteredData.map(item => [
        item.tombamento || "",
        item.tipoAtivo || item.type || "",
        item.marca || "",
        item.modelo || "",
        item.serial || "",
        item.status || "",
        item.unitId || "",
        item.setor || "",
        item.funcionario || ""
      ]);

      const csvContent = [
        headers.join(","), 
        ...rows.map(row => row.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio_ativos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("CSV gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar CSV.");
    }
  };

  // --- NOVA FUNÇÃO: EXPORTAR PDF ---
  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }

    try {
      const doc = new jsPDF();

      // Título e Data
      doc.setFontSize(18);
      doc.text("Relatório de Ativos de TI", 14, 22);
      
      doc.setFontSize(11);
      doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 14, 30);
      
      if (filterUnit !== 'all') {
        doc.text(`Unidade Filtrada: ${filterUnit}`, 14, 36);
      }

      // Colunas e Dados da Tabela
      const tableColumn = ["Tombamento", "Tipo", "Modelo", "Serial", "Status", "Setor", "Usuário"];
      const tableRows = [];

      filteredData.forEach(item => {
        const rowData = [
          item.tombamento || "N/A",
          item.tipoAtivo || item.type || "N/A",
          item.modelo || "N/A",
          item.serial || "N/A",
          item.status || "N/A",
          item.setor || "N/A",
          item.funcionario || ""
        ];
        tableRows.push(rowData);
      });

      // Gera a tabela automática
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 122, 255] }, // Cor primária do seu tema
      });

      doc.save(`relatorio_ativos_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro PDF:", error);
      toast.error("Erro ao gerar PDF.");
    }
  };

  if (loadingAssets || loadingUnits) {
    return <div className={styles.loadingState}><Loader2 className={styles.spinner} /> Carregando dados...</div>;
  }

  if (errorAssets) return <p className={styles.errorText}>Erro ao carregar dados.</p>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Relatórios Gerenciais</h1>
          <p className={styles.subtitle}>Visão geral e exportação de dados</p>
        </div>
        
        <div className={styles.headerActions}>
          {/* Botão PDF */}
          <button className={`${styles.primaryButton} ${styles.pdfButton}`} onClick={handleExportPDF}>
            <FileText size={18} /> PDF
          </button>
          {/* Botão CSV */}
          <button className={styles.primaryButton} onClick={handleExportCSV}>
            <FileDown size={18} /> CSV
          </button>
        </div>
      </header>

      {/* --- BARRA DE FILTROS --- */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <span>Filtros:</span>
        </div>
        
        {/* Filtro Unidade */}
        <select 
          value={filterUnit} 
          onChange={(e) => setFilterUnit(e.target.value)} 
          className={styles.filterSelect}
        >
          <option value="all">Todas as Unidades</option>
          {units?.docs.map(doc => (
            <option key={doc.id} value={doc.id}>{doc.data().sigla || doc.data().name}</option>
          ))}
        </select>

        {/* Filtro Tipo */}
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)} 
          className={styles.filterSelect}
        >
          <option value="all">Todos os Tipos</option>
          <option value="computador">Computadores</option>
          <option value="impressora">Impressoras</option>
        </select>

        {/* --- NOVO: Filtro Status --- */}
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)} 
          className={styles.filterSelect}
        >
          <option value="all">Todos os Status</option>
          {opcoesStatus.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {/* --- CARDS DE KPI --- */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}><Monitor size={24} /></div>
          <div>
            <span className={styles.kpiLabel}>Total de Ativos</span>
            <strong className={styles.kpiValue}>{totalAssets}</strong>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.success}`}><CheckCircle2 size={24} /></div>
          <div>
            <span className={styles.kpiLabel}>Em Uso</span>
            <strong className={styles.kpiValue}>{totalActive}</strong>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.warning}`}><AlertTriangle size={24} /></div>
          <div>
            <span className={styles.kpiLabel}>Em Manutenção</span>
            <strong className={styles.kpiValue}>{totalMaintenance}</strong>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} ${styles.info}`}><Building2 size={24} /></div>
          <div>
            <span className={styles.kpiLabel}>Unidade Filtrada</span>
            <strong className={styles.kpiValue}>{filterUnit === 'all' ? 'Geral' : filterUnit}</strong>
          </div>
        </div>
      </div>

      {/* --- GRÁFICOS --- */}
      <div className={styles.chartsGrid}>
        {/* Gráfico de Pizza: Status */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Barras: Tipos */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Quantidade por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="value" fill="#007aff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports;