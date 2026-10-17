import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Downloads a DOM element as a high-resolution A4 PDF.
 * Uses html2canvas-pro (with full support for modern CSS colors like oklch) + jsPDF.
 */
export async function downloadInvoicePdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  // Temporary style adjustments for optimal capture
  const originalWidth = element.style.width;
  const originalTransform = element.style.transform;
  const originalPosition = element.style.position;
  const originalTop = element.style.top;
  const originalLeft = element.style.left;
  
  // Force fixed standard desktop width during rasterization so it renders crisp standard A4 proportion
  element.style.width = '794px'; // standard 96 DPI A4 width in pixels
  element.style.transform = 'none';
  element.style.position = 'static';

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 2x for sharp print rendering
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // Extra pages if long invoice
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    // Restore styling
    element.style.width = originalWidth;
    element.style.transform = originalTransform;
    element.style.position = originalPosition;
    element.style.top = originalTop;
    element.style.left = originalLeft;
  }
}

/**
 * Generates an A4 PDF and returns it as a base64 Data URL string for direct background API dispatch.
 */
export async function generateInvoicePdfBase64(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  const originalWidth = element.style.width;
  const originalTransform = element.style.transform;
  const originalPosition = element.style.position;
  const originalTop = element.style.top;
  const originalLeft = element.style.left;

  element.style.width = '794px';
  element.style.transform = 'none';
  element.style.position = 'static';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    return pdf.output('datauristring');
  } finally {
    element.style.width = originalWidth;
    element.style.transform = originalTransform;
    element.style.position = originalPosition;
    element.style.top = originalTop;
    element.style.left = originalLeft;
  }
}

/**
 * Native print trigger: activates the browser print dialog.
 * The application index.css contains @media print rules to isolate the invoice container.
 */
export function printInvoice(): void {
  window.print();
}

/**
 * Mobile Web Share: Attempts to share invoice PDF or text via navigator.share
 */
export async function shareInvoice(elementId: string, invoiceNumber: string, customerName: string): Promise<boolean> {
  if (navigator.share) {
    try {
      const element = document.getElementById(elementId);
      if (element) {
        const originalWidth = element.style.width;
        const originalTransform = element.style.transform;
        const originalPosition = element.style.position;
        const originalTop = element.style.top;
        const originalLeft = element.style.left;

        element.style.width = '794px';
        element.style.transform = 'none';
        element.style.position = 'static';

        let blob: Blob | null = null;
        try {
          const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
          blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        } finally {
          element.style.width = originalWidth;
          element.style.transform = originalTransform;
          element.style.position = originalPosition;
          element.style.top = originalTop;
          element.style.left = originalLeft;
        }
        
        if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], `${invoiceNumber}.png`, { type: 'image/png' })] })) {
          const file = new File([blob], `${invoiceNumber}.png`, { type: 'image/png' });
          await navigator.share({
            title: `فاتورة ضريبية مبسطة ${invoiceNumber}`,
            text: `فاتورة ضريبية مبسطة رقم ${invoiceNumber} للعميل ${customerName} - Saudi Invoice Maker Pro`,
            files: [file],
          });
          return true;
        }
      }

      // Fallback share text
      await navigator.share({
        title: `فاتورة ${invoiceNumber}`,
        text: `فاتورة ضريبية مبسطة رقم ${invoiceNumber} للعميل ${customerName}`,
        url: window.location.href,
      });
      return true;
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') {
        console.warn('Share error:', e);
      }
    }
  }
  return false;
}

/**
 * Captures ONLY the invoice sheet area as a high-resolution PNG image (screenshot)
 * and triggers immediate download / clipboard copy.
 */
export async function captureInvoiceScreenshot(elementId: string, filename: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  // Temporary style adjustments for crisp 1:1 capture without parent zoom transforms
  const originalWidth = element.style.width;
  const originalTransform = element.style.transform;
  const originalPosition = element.style.position;
  const originalTop = element.style.top;
  const originalLeft = element.style.left;

  element.style.width = '794px';
  element.style.transform = 'none';
  element.style.position = 'static';

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 2x sharpness for crystal clear screenshot
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
    });

    const dataUrl = canvas.toDataURL('image/png');

    // Trigger instant browser download
    const safeFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // If browser supports copying image to clipboard, copy in background
    if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([
              new window.ClipboardItem({ 'image/png': blob }),
            ]).catch(() => {/* ignore clipboard permission limitations */});
          }
        }, 'image/png');
      } catch {
        // Ignore clipboard errors
      }
    }

    return dataUrl;
  } finally {
    // Restore styling
    element.style.width = originalWidth;
    element.style.transform = originalTransform;
    element.style.position = originalPosition;
    element.style.top = originalTop;
    element.style.left = originalLeft;
  }
}

