import React from 'react';
import styles from './Reports.module.css';
import { LuDownload } from 'react-icons/lu';

const Reports = () => {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Relatórios Gerenciais</h1>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <label htmlFor="reportType">Tipo de Relatório</label>
          <select id="reportType" className={styles.selectInput}>
            <option>Ativos por Unidade</option>
            <option>Histórico de Manutenção</option>
            <option>Inventário Completo</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="unit">Filtrar por Unidade</label>
          <select id="unit" className={styles.selectInput}>
            <option>Todas as Unidades</option>
            <option>Hospital Boa Viagem</option>
            <option>Hospital Ilha do Leite</option>
          </select>
        </div>
        <button className={styles.primaryButton}>
          <LuDownload /> Exportar para CSV
        </button>
      </div>

      <div className={styles.content}>
        {/* Gráficos e Tabelas de Relatório virão aqui */}
        <p>Visualização do relatório (Gráfico ou Tabela)...</p>
      </div>
    </div>
  );
};

export default Reports;