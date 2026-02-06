import { Invoice, INVOICE_STATUS_LABELS } from '@/types/invoice';

// Generar HTML de la factura para convertir a PDF o imprimir
export const generateInvoiceHTML = (invoice: Invoice): string => {
  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const itemsHTML = invoice.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.taxRate}%</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 500;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1F2937;
      line-height: 1.5;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo-section { flex: 1; }
    .logo { width: 120px; height: auto; margin-bottom: 12px; }
    .business-name { font-size: 24px; font-weight: 700; color: #1E3A5F; }
    .business-info { font-size: 13px; color: #6B7280; margin-top: 8px; }
    .invoice-section { text-align: right; }
    .invoice-title { font-size: 32px; font-weight: 700; color: #1E3A5F; }
    .invoice-number { font-size: 18px; color: #6B7280; margin-top: 4px; }
    .invoice-date { font-size: 14px; color: #6B7280; margin-top: 8px; }
    .status-badge { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 20px; 
      font-size: 12px; 
      font-weight: 600;
      margin-top: 8px;
    }
    .status-draft { background: #FEF3C7; color: #D97706; }
    .status-sent { background: #DBEAFE; color: #2563EB; }
    .status-paid { background: #D1FAE5; color: #059669; }
    .status-cancelled { background: #FEE2E2; color: #DC2626; }
    .parties { display: flex; gap: 40px; margin-bottom: 40px; }
    .party { flex: 1; }
    .party-label { font-size: 12px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; margin-bottom: 8px; }
    .party-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .party-info { font-size: 14px; color: #6B7280; }
    .piano-info { 
      background: #F3F4F6; 
      padding: 16px; 
      border-radius: 8px; 
      margin-bottom: 24px;
      font-size: 14px;
    }
    .piano-label { font-weight: 600; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { 
      background: #1E3A5F; 
      color: white; 
      padding: 12px; 
      text-align: left; 
      font-size: 13px;
      font-weight: 600;
    }
    th:nth-child(2), th:nth-child(4) { text-align: center; }
    th:nth-child(3), th:nth-child(5) { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .total-row.final { 
      border-top: 2px solid #1E3A5F; 
      margin-top: 8px; 
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #1E3A5F;
    }
    .notes { 
      margin-top: 40px; 
      padding: 16px; 
      background: #F9FAFB; 
      border-radius: 8px;
      font-size: 13px;
      color: #6B7280;
    }
    .notes-title { font-weight: 600; color: #374151; margin-bottom: 8px; }
    .footer { 
      margin-top: 60px; 
      text-align: center; 
      font-size: 12px; 
      color: #9CA3AF;
      border-top: 1px solid #E5E7EB;
      padding-top: 20px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      ${invoice.business?.logo ? `<img src="${invoice.business.logo}" class="logo" alt="Logo">` : ''}
      <div class="business-name">${invoice.business?.name || 'Piano Tech'}</div>
      <div class="business-info">
        ${invoice.business?.taxId ? `NIF/CIF: ${invoice.business.taxId}<br>` : ''}
        ${invoice.business?.address ? `${invoice.business.address}<br>` : ''}
        ${invoice.business?.postalCode || ''} ${invoice.business?.city || ''}<br>
        ${invoice.business?.phone ? `Tel: ${invoice.business.phone}<br>` : ''}
        ${invoice.business?.email || ''}
      </div>
    </div>
    <div class="invoice-section">
      <div class="invoice-title">FACTURA</div>
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <div class="invoice-date">Fecha: ${formatDate(invoice.date)}</div>
      ${invoice.dueDate ? `<div class="invoice-date">Vencimiento: ${formatDate(invoice.dueDate)}</div>` : ''}
      <span class="status-badge status-${invoice.status}">${INVOICE_STATUS_LABELS[invoice.status]}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Facturar a</div>
      <div class="party-name">${invoice.clientName}</div>
      <div class="party-info">
        ${invoice.clientTaxId ? `NIF/CIF: ${invoice.clientTaxId}<br>` : ''}
        ${invoice.clientAddress || ''}
        ${invoice.clientEmail ? `<br>${invoice.clientEmail}` : ''}
      </div>
    </div>
  </div>

  ${invoice.pianoInfo ? `
  <div class="piano-info">
    <span class="piano-label">Piano:</span> ${invoice.pianoInfo}
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cant.</th>
        <th>Precio Unit.</th>
        <th>IVA</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal</span>
      <span>${formatCurrency(invoice.subtotal)}</span>
    </div>
    <div class="total-row">
      <span>IVA</span>
      <span>${formatCurrency(invoice.taxAmount)}</span>
    </div>
    <div class="total-row final">
      <span>TOTAL</span>
      <span>${formatCurrency(invoice.total)}</span>
    </div>
  </div>

  ${invoice.notes || invoice.paymentTerms ? `
  <div class="notes">
    ${invoice.paymentTerms ? `<div class="notes-title">Condiciones de pago</div><p>${invoice.paymentTerms}</p>` : ''}
    ${invoice.notes ? `<div class="notes-title" style="margin-top: ${invoice.paymentTerms ? '12px' : '0'}">Notas</div><p>${invoice.notes}</p>` : ''}
  </div>
  ` : ''}

  ${invoice.business?.bankAccount ? `
  <div class="notes">
    <div class="notes-title">Datos bancarios</div>
    <p>IBAN: ${invoice.business.bankAccount}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Gracias por confiar en nuestros servicios</p>
    <p>${invoice.business?.name || 'Piano Tech'} - ${invoice.business?.email || ''}</p>
  </div>
</body>
</html>
  `;
};

// Función para abrir la factura en una nueva ventana (para imprimir/guardar como PDF)
export const openInvoiceForPrint = (invoice: Invoice): void => {
  const html = generateInvoiceHTML(invoice);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Dar tiempo para que cargue el contenido antes de imprimir
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

// Función para descargar la factura como archivo HTML (puede convertirse a PDF)
export const downloadInvoiceHTML = (invoice: Invoice): void => {
  const html = generateInvoiceHTML(invoice);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Factura_${invoice.invoiceNumber}.html`;
  link.click();
  URL.revokeObjectURL(url);
};

// Generar enlace mailto con la factura
export const generateEmailLink = (invoice: Invoice, attachmentNote: boolean = true): string => {
  const subject = encodeURIComponent(`Factura ${invoice.invoiceNumber} - ${invoice.business.name || 'Piano Tech'}`);
  const body = encodeURIComponent(`
Estimado/a ${invoice.clientName},

Adjunto le enviamos la factura ${invoice.invoiceNumber} correspondiente a los servicios prestados.

Detalles de la factura:
- Número: ${invoice.invoiceNumber}
- Fecha: ${new Date(invoice.date).toLocaleDateString('es-ES')}
- Importe total: €${invoice.total.toFixed(2)}

${invoice.paymentTerms ? `Condiciones de pago: ${invoice.paymentTerms}\n` : ''}
${invoice.business.bankAccount ? `Datos bancarios para transferencia:\nIBAN: ${invoice.business.bankAccount}\n` : ''}

${attachmentNote ? 'Por favor, guarde la factura adjunta como PDF desde su navegador (Ctrl+P o Cmd+P > Guardar como PDF).\n' : ''}

Quedamos a su disposición para cualquier consulta.

Un cordial saludo,
${invoice.business.name || 'Piano Tech'}
${invoice.business.phone ? `Tel: ${invoice.business.phone}` : ''}
${invoice.business.email || ''}
  `.trim());

  return `mailto:${invoice.clientEmail || ''}?subject=${subject}&body=${body}`;
};

// Abrir cliente de email con la factura
export const sendInvoiceByEmail = (invoice: Invoice): void => {
  const mailtoLink = generateEmailLink(invoice);
  window.open(mailtoLink, '_blank');
};
