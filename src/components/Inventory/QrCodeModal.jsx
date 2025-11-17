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
      pri.document.open();
      pri.document.write('<html><head><title>Imprimir QR Code</title>');
      pri.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } h3, p { font-family: sans-serif; text-align: center; } }</style>');
      pri.document.write('</head><body style="text-align: center; margin-top: 20px;">');
      
      // Adiciona o conteúdo
      pri.document.write(`<h3>${assetName}</h3>`);
      pri.document.write(`<p>ID: ${assetId}</p>`);
      pri.document.write(qrEl.innerHTML); // Adiciona o SVG do QR Code
      
      pri.document.write('</body></html>');
      pri.document.close();
      
      pri.focus();
      pri.print();
      
      // Remove o iframe após imprimir
      document.body.removeChild(iframe);
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