import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface ExportPdfOptions {
  forceSinglePage?: boolean;
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a5' | 'letter' | 'legal' | 'f4';
}

export const exportToPdf = async (
  elementId: string,
  options: ExportPdfOptions = {}
): Promise<void> => {
  const {
    forceSinglePage = true,
    filename = 'document.pdf',
    orientation = 'portrait',
    format = 'a4'
  } = options;
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID "${elementId}" not found.`);
    return;
  }

  // Check if the element is hidden
  const isHidden =
    element.classList.contains('hidden') ||
    window.getComputedStyle(element).display === 'none';

  // Store original styles to restore them later
  const originalStyle = {
    position: element.style.position,
    top: element.style.top,
    left: element.style.left,
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    display: element.style.display,
    boxShadow: element.style.boxShadow,
  };

  // Check if there are sub-elements marked as individual PDF pages
  const pdfPages = element.querySelectorAll('.pdf-page');

  if (pdfPages.length > 0) {
    // Show wrapper to render correctly
    if (isHidden) {
      element.classList.remove('hidden');
      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '-9999px';
      element.style.width = '800px';
      element.style.maxWidth = '800px';
      element.style.display = 'block';
      element.style.boxShadow = 'none';
    } else {
      element.style.width = '800px';
      element.style.maxWidth = '800px';
      element.style.boxShadow = 'none';
    }

    try {
      const pdfFormat = format === 'f4' ? [215, 330] : format;
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pdfFormat,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Page margin settings
      const margin = 12; // 12mm page margin
      const printableWidth = pdfWidth - (margin * 2);
      const printableHeight = pdfHeight - (margin * 2);

      for (let i = 0; i < pdfPages.length; i++) {
        const pageEl = pdfPages[i] as HTMLElement;

        // Apply clean width constraints temporarily
        const origWidth = pageEl.style.width;
        const origMaxWidth = pageEl.style.maxWidth;
        pageEl.style.width = '800px';
        pageEl.style.maxWidth = '800px';

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        pageEl.style.width = origWidth;
        pageEl.style.maxWidth = origMaxWidth;

        const imgData = canvas.toDataURL('image/png');
        const imgHeightOnPdf = (canvas.height * printableWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        // Fit page to pdf page dimensions inside margins
        if (imgHeightOnPdf > printableHeight) {
          const scale = printableHeight / imgHeightOnPdf;
          const finalWidth = printableWidth * scale;
          const finalHeight = printableHeight;
          const x = margin + (printableWidth - finalWidth) / 2;
          const y = margin;
          pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');
        } else {
          const x = margin;
          const y = margin;
          pdf.addImage(imgData, 'PNG', x, y, printableWidth, imgHeightOnPdf, undefined, 'FAST');
        }
      }

      // Restore wrapper styles
      if (isHidden) {
        element.classList.add('hidden');
      }
      element.style.position = originalStyle.position;
      element.style.top = originalStyle.top;
      element.style.left = originalStyle.left;
      element.style.width = originalStyle.width;
      element.style.maxWidth = originalStyle.maxWidth;
      element.style.display = originalStyle.display;
      element.style.boxShadow = originalStyle.boxShadow;

      pdf.save(filename);
      return;
    } catch (err) {
      console.error('Failed to export multi-page PDF:', err);
      // Restore wrapper styles
      if (isHidden) {
        element.classList.add('hidden');
      }
      element.style.position = originalStyle.position;
      element.style.top = originalStyle.top;
      element.style.left = originalStyle.left;
      element.style.width = originalStyle.width;
      element.style.maxWidth = originalStyle.maxWidth;
      element.style.display = originalStyle.display;
      element.style.boxShadow = originalStyle.boxShadow;
      return;
    }
  }

  // Fallback: Temporarily show the element and position it offscreen if it was hidden,
  // and force a clean width of 800px to ensure standard page layout proportions
  if (isHidden) {
    element.classList.remove('hidden');
    element.style.position = 'fixed';
    element.style.top = '0';
    element.style.left = '-9999px';
    element.style.width = '800px';
    element.style.maxWidth = '800px';
    element.style.display = 'block';
    element.style.boxShadow = 'none';
  } else {
    element.style.width = '800px';
    element.style.maxWidth = '800px';
    element.style.boxShadow = 'none';
  }

  try {
    // Generate the canvas image from the HTML element
    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale for sharp text and graphics
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Restore original styles and classes immediately
    if (isHidden) {
      element.classList.add('hidden');
    }
    element.style.position = originalStyle.position;
    element.style.top = originalStyle.top;
    element.style.left = originalStyle.left;
    element.style.width = originalStyle.width;
    element.style.maxWidth = originalStyle.maxWidth;
    element.style.display = originalStyle.display;
    element.style.boxShadow = originalStyle.boxShadow;

    const imgData = canvas.toDataURL('image/png');
    
    // Create jsPDF document instance
    const pdfFormat = format === 'f4' ? [215, 330] : format;
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: pdfFormat,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const margin = 12; // 12mm page margin
    const printableWidth = pdfWidth - (margin * 2);
    const printableHeight = pdfHeight - (margin * 2);
    const imgHeightOnPdf = (canvas.height * printableWidth) / canvas.width;

    if (forceSinglePage) {
      // Scale the content down proportionally to fit on a single page inside margins
      if (imgHeightOnPdf > printableHeight) {
        const scale = printableHeight / imgHeightOnPdf;
        const finalWidth = printableWidth * scale;
        const finalHeight = printableHeight;
        const x = margin + (printableWidth - finalWidth) / 2;
        const y = margin;
        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');
      } else {
        const x = margin;
        const y = margin;
        pdf.addImage(imgData, 'PNG', x, y, printableWidth, imgHeightOnPdf, undefined, 'FAST');
      }
    } else {
      // Multi-page layout
      let heightLeft = imgHeightOnPdf;
      let position = margin;

      // Add the first page
      pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeightOnPdf, undefined, 'FAST');
      heightLeft -= printableHeight;

      // Add subsequent pages if content overflows
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeightOnPdf - heightLeft);
        pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeightOnPdf, undefined, 'FAST');
        heightLeft -= printableHeight;
      }
    }

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    
    // Ensure styles are restored even if generation fails
    if (isHidden) {
      element.classList.add('hidden');
    }
    element.style.position = originalStyle.position;
    element.style.top = originalStyle.top;
    element.style.left = originalStyle.left;
    element.style.width = originalStyle.width;
    element.style.maxWidth = originalStyle.maxWidth;
    element.style.display = originalStyle.display;
    element.style.boxShadow = originalStyle.boxShadow;
  }
};
