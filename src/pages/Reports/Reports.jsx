import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, where, documentId } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  FileDown, Filter, Loader2, Monitor, AlertTriangle, CheckCircle2, Building2, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf'; 
import autoTable from 'jspdf-autotable'; 

import { useAuth } from '../../hooks/useAuth';
import styles from './Reports.module.css';

const COLORS = ['#007aff', '#5ac8fa', '#ff9500', '#34c759', '#ff3b30', '#af52de'];

// --- CORREÇÃO 1: Lista exata de status usada no cadastro ---
const opcoesStatus = [
  "Em uso", 
  "Em manutenção", // Era "Manutenção" antes, corrigido para "Em manutenção"
  "Manutenção agendada", 
  "Estoque", 
  "Inativo",
  "Devolução agendada", 
  "Devolvido", 
  "Reativação agendada"
];

const Reports = () => {
  const { isAdmin, allowedUnits, loading: authLoading } = useAuth();

  const [filterUnit, setFilterUnit] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // --- QUERIES SEGURAS ---
  const assetsQuery = useMemo(() => {
    if (authLoading) return null;
    const constraints = [];
    if (!isAdmin) {
        if (allowedUnits.length > 0) constraints.push(where('unitId', 'in', allowedUnits));
        else constraints.push(where('unitId', '==', 'BLOQUEADO'));
    }
    return query(collection(db, 'assets'), ...constraints);
  }, [authLoading, isAdmin, allowedUnits]);

  const unitsQuery = useMemo(() => {
    if (authLoading) return null;
    if (isAdmin) return query(collection(db, 'units'), orderBy('name', 'asc'));
    if (allowedUnits.length > 0) return query(collection(db, 'units'), where(documentId(), 'in', allowedUnits));
    return null;
  }, [authLoading, isAdmin, allowedUnits]);

  const [assets, loadingAssets, errorAssets] = useCollection(assetsQuery);
  const [units, loadingUnits] = useCollection(unitsQuery);

  // --- PROCESSAMENTO ---
  const filteredData = useMemo(() => {
    if (!assets) return [];
    return assets.docs
      .map(doc => doc.data())
      .filter(item => {
        // Filtros de Unidade e Tipo
        const unitMatch = filterUnit === 'all' || item.unitId === filterUnit;
        const typeMatch = filterType === 'all' || item.type === filterType || item.tipoAtivo === filterType;
        
        // --- CORREÇÃO 2: Filtro de Status Robusto ---
        // Converte tudo para minúsculo para garantir que "Em manutenção" bata com "Em Manutenção"
        let statusMatch = true;
        if (filterStatus !== 'all') {
            const itemStatus = (item.status || '').toLowerCase().trim();
            const filterVal = filterStatus.toLowerCase().trim();
            statusMatch = itemStatus === filterVal;
        }
        
        return unitMatch && typeMatch && statusMatch;
      });
  }, [assets, filterUnit, filterType, filterStatus]);

  const statusData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const status = item.status || 'Desconhecido';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredData]);

  const typeData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const type = item.tipoAtivo || item.type || 'Outro';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredData]);

  const totalAssets = filteredData.length;
  // Contagem inteligente: Inclui qualquer status que contenha a palavra "manutenção"
  const totalMaintenance = filteredData.filter(i => i.status && i.status.toLowerCase().includes('manutenção')).length;
  const totalActive = filteredData.filter(i => i.status === 'Em uso').length;

  // --- EXPORTAÇÃO ---
  const handleExportCSV = () => {
    if (filteredData.length === 0) { toast.error("Não há dados para exportar."); return; }
    try {
      const headers = ["Tombamento", "Tipo", "Marca", "Modelo", "Serial", "Status", "Unidade", "Setor", "Usuário"];
      const rows = filteredData.map(item => [
        item.tombamento || "", item.tipoAtivo || item.type || "", item.marca || "", item.modelo || "",
        item.serial || "", item.status || "", item.unitId || "", item.setor || "", item.funcionario || ""
      ]);
      const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio_ativos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast.success("CSV gerado com sucesso!");
    } catch (error) { console.error(error); toast.error("Erro ao gerar CSV."); }
  };

  const handleExportPDF = () => {
    if (filteredData.length === 0) { toast.error("Não há dados para exportar."); return; }
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text("Relatório de Ativos de TI", 14, 22);
      doc.setFontSize(11); doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 30);
      if (filterUnit !== 'all') doc.text(`Unidade Filtrada: ${filterUnit}`, 14, 36);
      
      const tableColumn = ["Tombamento", "Tipo", "Modelo", "Serial", "Status", "Setor", "Usuário"];
      const tableRows = [];
      filteredData.forEach(item => {
        tableRows.push([
          item.tombamento || "N/A", item.tipoAtivo || item.type || "N/A", item.modelo || "N/A",
          item.serial || "N/A", item.status || "N/A", item.setor || "N/A", item.funcionario || ""
        ]);
      });
      
      autoTable(doc, { 
        head: [tableColumn], 
        body: tableRows, 
        startY: 40, 
        styles: { fontSize: 8 }, 
        headStyles: { fillColor: [0, 122, 255] }, 
      });
      
      doc.save(`relatorio_ativos_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) { console.error("Erro PDF:", error); toast.error("Erro ao gerar PDF: " + error.message); }
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return percent > 0.05 ? ( 
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
        {`${value}`}
      </text>
    ) : null;
  };

  if (loadingAssets || loadingUnits || authLoading) {
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
          <button className={`${styles.primaryButton} ${styles.pdfButton}`} onClick={handleExportPDF}>
            <FileText size={18} /> PDF
          </button>
          <button className={styles.primaryButton} onClick={handleExportCSV}>
            <FileDown size={18} /> CSV
          </button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <Filter size={16} /> <span>Filtros:</span>
        </div>
        <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className={styles.filterSelect}>
          <option value="all">Todas as Unidades (Permitidas)</option>
          {units?.docs.map(doc => (
            <option key={doc.id} value={doc.id}>{doc.data().sigla || doc.data().name}</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>
          <option value="all">Todos os Tipos</option>
          <option value="computador">Computadores</option>
          <option value="impressora">Impressoras</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>
          <option value="all">Todos os Status</option>
          {opcoesStatus.map(status => (<option key={status} value={status}>{status}</option>))}
        </select>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}><div className={styles.kpiIcon}><Monitor size={24} /></div><div><span className={styles.kpiLabel}>Total de Ativos</span><strong className={styles.kpiValue}>{totalAssets}</strong></div></div>
        <div className={styles.kpiCard}><div className={`${styles.kpiIcon} ${styles.success}`}><CheckCircle2 size={24} /></div><div><span className={styles.kpiLabel}>Em Uso</span><strong className={styles.kpiValue}>{totalActive}</strong></div></div>
        <div className={styles.kpiCard}><div className={`${styles.kpiIcon} ${styles.warning}`}><AlertTriangle size={24} /></div><div><span className={styles.kpiLabel}>Em Manutenção</span><strong className={styles.kpiValue}>{totalMaintenance}</strong></div></div>
        <div className={styles.kpiCard}><div className={`${styles.kpiIcon} ${styles.info}`}><Building2 size={24} /></div><div><span className={styles.kpiLabel}>Unidade Filtrada</span><strong className={styles.kpiValue}>{filterUnit === 'all' ? 'Geral' : filterUnit}</strong></div></div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={statusData} 
                cx="50%" 
                cy="50%" 
                labelLine={false}
                label={renderCustomLabel} 
                outerRadius={100} 
                dataKey="value"
              >
                {statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} itens`, name]} /> 
              
              {/* LEGENDA MELHORADA COM QUANTIDADES */}
              <Legend 
                formatter={(value, entry) => {
                    const item = statusData.find(s => s.name === value);
                    return `${value} (${item ? item.value : 0})`;
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Quantidade por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              {/* BARRAS COM QUANTIDADES */}
              <Bar dataKey="value" fill="#007aff" radius={[4, 4, 0, 0]} label={{ position: 'top' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.detailsSection}>
        <h3 className={styles.sectionTitle}>Detalhamento dos Dados Filtrados</h3>
        <div className={styles.tableContainer}>
          <table className={styles.detailsTable}>
            <thead>
              <tr>
                <th>Tombamento</th>
                <th>Tipo</th>
                <th>Modelo</th>
                <th>Status</th>
                <th>Unidade/Setor</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 50).map((item, idx) => ( 
                <tr key={idx}>
                  <td><strong>{item.tombamento}</strong></td>
                  <td>{item.tipoAtivo || item.type}</td>
                  <td>{item.modelo}</td>
                  <td><span className={styles.statusTag} data-status={item.status}>{item.status}</span></td>
                  <td>{item.unitId} - {item.setor}</td>
                </tr>
              ))}
              {filteredData.length > 50 && (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                    ... e mais {filteredData.length - 50} itens. Use "Exportar" para ver todos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Reports;