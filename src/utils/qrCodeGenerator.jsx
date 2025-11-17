import jsPDF from 'jspdf';
import QRCode from 'qrcode'; 

export const generateQrCodePdf = async (assets, hospitalLogoUrl, hospitalName = "ITAM Hospitalar") => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // ... (código de configuração de página e dimensões mantém igual) ...
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const labelWidth = 60; const labelHeight = 40; const marginX = 10;
  const marginY = 10; const gapX = 5; const gapY = 5; const qrSize = 25;
  
  const labelsPerRow = Math.floor((pageWidth - 2 * marginX) / (labelWidth + gapX));
  const maxLabelsPerPage = labelsPerRow * Math.floor((pageHeight - 2 * marginY) / (labelHeight + gapY));
  let currentX = marginX; let currentY = marginY; let labelsOnPage = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    
    // --- A CORREÇÃO ESTÁ AQUI ---
    // Força o uso da rota /scan/ (Pública) e do domínio de produção (Vercel)
    // Se estiver local, usa window.location.origin, mas troca /inventory por /scan
    const baseUrl = "https://controle-ativos.vercel.app"; // Sua URL da Vercel
    const assetUrl = `${baseUrl}/scan/${asset.id}`;
    // ---------------------------

    if (labelsOnPage >= maxLabelsPerPage) { doc.addPage(); currentX = marginX; currentY = marginY; labelsOnPage = 0; }

    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.1);
    doc.rect(currentX, currentY, labelWidth, labelHeight);

    try {
      const qrDataUrl = await QRCode.toDataURL(assetUrl, { errorCorrectionLevel: 'H', margin: 0, width: 100 });
      const qrX = currentX + (labelWidth / 2) - (qrSize / 2);
      const qrY = currentY + 3;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (err) { console.error("Erro QR", err); }

    const textCenter = currentX + (labelWidth / 2);
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
    doc.text(hospitalName.toUpperCase(), textCenter, currentY + qrSize + 6, { align: 'center' });
    
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(`ID: ${asset.tombamento || asset.id}`, textCenter, currentY + qrSize + 10, { align: 'center' });

    currentX += labelWidth + gapX; labelsOnPage++;
    if (labelsOnPage % labelsPerRow === 0) { currentX = marginX; currentY += labelHeight + gapY; }
  }
  doc.save('etiquetas_qr_code.pdf');
};