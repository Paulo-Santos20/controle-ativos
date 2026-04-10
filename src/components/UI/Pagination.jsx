import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-md)',
    flexWrap: 'wrap'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    backgroundColor: 'var(--color-bg-component)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--border-radius)',
    cursor: 'pointer',
    color: 'var(--color-text-primary)',
    transition: 'all 0.2s',
    minWidth: '36px',
    minHeight: '36px'
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  buttonActive: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    borderColor: 'var(--color-primary)'
  },
  info: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    marginLeft: 'var(--spacing-md)',
    marginRight: 'var(--spacing-md)'
  }
};

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  itemsCount,
  itemsPerPage,
  totalItems
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const handleClick = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => handleClick(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          ...styles.button,
          ...(currentPage === 1 ? styles.buttonDisabled : {})
        }}
        aria-label="Página anterior"
      >
        <ChevronLeft size={18} />
      </button>

      {getPageNumbers().map((page, index) => {
        if (page === '...') {
          return <span key={`ellipsis-${index}`} style={styles.button}>...</span>;
        }
        
        return (
          <button
            key={page}
            onClick={() => handleClick(page)}
            style={{
              ...styles.button,
              ...(page === currentPage ? styles.buttonActive : {})
            }}
            aria-label={`Página ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        );
      })}

      <button
        onClick={() => handleClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          ...styles.button,
          ...(currentPage === totalPages ? styles.buttonDisabled : {})
        }}
        aria-label="Próxima página"
      >
        <ChevronRight size={18} />
      </button>

      {totalItems !== undefined && (
        <span style={styles.info}>
          {totalItems} itens total
        </span>
      )}
    </div>
  );
};

export default Pagination;