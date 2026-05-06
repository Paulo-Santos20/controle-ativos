import React from 'react';
import QRCode from 'react-qr-code';
import styles from './QrCodeModal.module.css'; // Criaremos este CSS
import { Download, Printer } from 'lucide-react';

/**
 * Componente que exibe um QR Code em um modal.
 * @param {object} props
 * @param {string} props.assetId - O ID do documento do ativo (Tombamento).
 * @param {string} props.assetName - O nome/modelo do ativo.
 */
const QrCodeModal = ({ assetId, assetName }) => {
  // --- IMPORTANTE: URL PÚBLICA DA VERCEL ---
  // Esta é a URL que será embutida no QR Code.
  const assetUrl = `https://controle-ativos.vercel.app/scan/${assetId}`;

  // Função para escapar HTML e prevenir XSS
  const escapeHtml = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Função para imprimir apenas o QR Code
  const handlePrint = () => {
    const qrEl = document.getElementById('qr-code-wrapper');
    if (qrEl) {
      // Cria um iframe temporário para não bagunçar a página
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const pri = iframe.contentWindow;
      const doc = pri.document;

      doc.open();
      doc.write('<!DOCTYPE html><html><head><title>Imprimir QR Code</title>');
      doc.write('<style>@media print { body { -webkit-print-color-adjust: exact; } h3, p { font-family: sans-serif; text-align: center; margin: 10px 0; } }</style>');
      doc.write('</head><body style="text-align: center; margin-top: 20px;">');

      // Adiciona o conteúdo com escape para prevenir XSS
      const safeName = escapeHtml(assetName);
      const safeId = escapeHtml(assetId);
      doc.write('<h3>' + safeName + '</h3>');
      doc.write('<p>ID: ' + safeId + '</p>');
      // Clone o SVG do QR Code para evitar XSS (defense in depth)
      const qrSvg = qrEl.querySelector('svg');
      if (qrSvg) {
        doc.write('<div style="display:flex;justify-content:center;">' + qrSvg.outerHTML + '</div>');
      }

      doc.write('</body></html>');
      doc.close();

      pri.focus();
      pri.print();

      // Remove o iframe após imprimir
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  return (
    <div className={styles.container}>
      <p className={styles.instructions}>
        Aponte a câmera do celular para o código abaixo.
      </p>
      
      {/* Wrapper para impressão e download */}
      <div id="qr-code-wrapper" className={styles.qrWrapper}>
        <QRCode
          value={assetUrl}
          size={256} // Tamanho em pixels
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox={`0 0 256 256`}
          level="H" // Alta correção de erro
        />
      </div>

      <input 
        type="text" 
        className={styles.urlInput}
        value={assetUrl} 
        readOnly 
      />
      <small className={styles.hint}>
        Este QR Code leva à página pública de informações do ativo.
      </small>
      
      <button onClick={handlePrint} className={styles.printButton}>
        <Printer size={18} />
        Imprimir Etiqueta
      </button>
    </div>
  );
};

export default QrCodeModal;