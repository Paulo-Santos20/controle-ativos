import React from 'react';
import ReactDOM from 'react-dom';
import styles from './Modal.module.css';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  // Usamos createPortal para garantir que o modal fique no topo da UI
  return ReactDOM.createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Fechar modal">
            <X size={22} />
          </button>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') 
  );
};

export default Modal;