import jsPDF from 'jspdf';
import QRCode from 'qrcode'; // Importa a biblioteca nova

/**
 * Gera um PDF com etiquetas QR Code para ativos.
 */
export const generateQrCodePdf = async (assets, hospitalLogoUrl, hospitalName = "ITAM Hospitalar") => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- CONFIGURAÇÃO DA ETIQUETA ---
  const labelWidth = 60;  // Largura um pouco maior para caber info
  const labelHeight = 40; // Altura
  const marginX = 10;
  const marginY = 10;
  const gapX = 5; // Espaço entre etiquetas
  const gapY = 5; // Espaço vertical entre etiquetas

  // Configuração do QR Code dentro da etiqueta
  const qrSize = 25; // Tamanho do quadrado do QR Code (mm)

  // Cálculo de quantas cabem
  const labelsPerRow = Math.floor((pageWidth - 2 * marginX) / (labelWidth + gapX));
  const maxLabelsPerPage = labelsPerRow * Math.floor((pageHeight - 2 * marginY) / (labelHeight + gapY));

  let currentX = marginX;
  let currentY = marginY;
  let labelsOnPage = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const assetUrl = `${window.location.origin}/scan/${asset.id}`;
    
    // Nova página se encher
    if (labelsOnPage >= maxLabelsPerPage) {
      doc.addPage();
      currentX = marginX;
      currentY = marginY;
      labelsOnPage = 0;
    }

    // --- 1. DESENHA A BORDA DA ETIQUETA ---
    doc.setDrawColor(200, 200, 200); // Cinza claro
    doc.setLineWidth(0.1);
    doc.rect(currentX, currentY, labelWidth, labelHeight);

    // --- 2. GERA O QR CODE (Base64 Direto) ---
    try {
      const qrDataUrl = await QRCode.toDataURL(assetUrl, {
        errorCorrectionLevel: 'H',
        margin: 0,
        width: 100 // Resolução alta
      });

      // Centraliza o QR Code horizontalmente na etiqueta
      // X = Posição atual + (Largura da etiqueta / 2) - (Tamanho do QR / 2)
      const qrX = currentX + (labelWidth / 2) - (qrSize / 2);
      const qrY = currentY + 3; // 3mm de padding do topo

      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    } catch (err) {
      console.error("Erro ao gerar QR", err);
    }

    // --- 3. TEXTOS ---
    const textCenter = currentX + (labelWidth / 2);

    // Nome do Hospital (Topo ou abaixo do QR)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    // Coloca o nome logo abaixo do QR Code
    doc.text(hospitalName.toUpperCase(), textCenter, currentY + qrSize + 6, { align: 'center' });

    // ID / Tombamento (Bem visível)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`ID: ${asset.tombamento || asset.id}`, textCenter, currentY + qrSize + 10, { align: 'center' });

    // (Opcional) Modelo pequeno abaixo
    if (asset.modelo) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const modeloCurto = asset.modelo.substring(0, 25); // Corta se for muito longo
      doc.text(modeloCurto, textCenter, currentY + qrSize + 13, { align: 'center' });
    }

    // --- 4. CÁLCULO DE POSIÇÃO PARA O PRÓXIMO ---
    currentX += labelWidth + gapX;
    labelsOnPage++;

    // Se não cabe mais na linha, vai para a próxima linha
    if (labelsOnPage % labelsPerRow === 0) {
      currentX = marginX;
      currentY += labelHeight + gapY;
    }
  }

  doc.save('etiquetas_qr_code.pdf');
};