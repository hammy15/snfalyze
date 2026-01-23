import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
}

export interface OCRBlock {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  blockType: 'text' | 'table' | 'image';
}

// Process an image file with Tesseract OCR
export async function processImageWithOCR(
  imageSource: File | Blob | string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    // Extract blocks with bounding boxes
    const blocks: OCRBlock[] = [];

    if (result.data.blocks) {
      for (const block of result.data.blocks) {
        blocks.push({
          text: block.text,
          confidence: block.confidence,
          bbox: block.bbox,
          blockType: detectBlockType(block.text),
        });
      }
    }

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      blocks,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process image with OCR');
  }
}

// Process a PDF page (requires converting to image first)
export async function processPDFPageWithOCR(
  pageImageData: string | Blob,
  pageNumber: number,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  return processImageWithOCR(pageImageData, onProgress);
}

// Detect if a block looks like a table based on content patterns
function detectBlockType(text: string): 'text' | 'table' | 'image' {
  // Check for table-like patterns (multiple columns of numbers/text)
  const lines = text.split('\n').filter((l) => l.trim());

  if (lines.length < 2) return 'text';

  // Count lines with multiple tab/space-separated values
  let tableLines = 0;
  for (const line of lines) {
    const parts = line.split(/\s{2,}|\t/).filter((p) => p.trim());
    if (parts.length >= 3) {
      tableLines++;
    }
  }

  // If more than 50% of lines look like table rows, it's probably a table
  if (tableLines / lines.length > 0.5) {
    return 'table';
  }

  return 'text';
}

// Extract tables from OCR text
export function extractTablesFromOCR(ocrResult: OCRResult): string[][] {
  const tables: string[][] = [];

  for (const block of ocrResult.blocks) {
    if (block.blockType === 'table') {
      const rows = block.text
        .split('\n')
        .filter((l) => l.trim())
        .map((line) => {
          // Split by multiple spaces or tabs
          return line.split(/\s{2,}|\t/).map((cell) => cell.trim());
        });

      if (rows.length > 0) {
        tables.push(...rows);
      }
    }
  }

  return tables;
}

// Extract financial values from OCR text
export function extractFinancialDataFromOCR(ocrResult: OCRResult): Record<string, number | string> {
  const data: Record<string, number | string> = {};
  const text = ocrResult.text;

  // Common financial patterns
  const patterns = [
    // "Label: $1,234,567" or "Label: 1,234,567"
    /([A-Za-z\s]+):\s*\$?([\d,]+(?:\.\d{2})?)/g,
    // "Label    $1,234,567" (table format)
    /([A-Za-z\s]+)\s{2,}\$?([\d,]+(?:\.\d{2})?)/g,
    // Percentage values
    /([A-Za-z\s]+):\s*([\d.]+)\s*%/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const label = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      const value = match[2].replace(/,/g, '');

      // Parse as number if possible
      const numValue = parseFloat(value);
      data[label] = isNaN(numValue) ? value : numValue;
    }
  }

  return data;
}

// Pre-process image for better OCR results
export async function preprocessImageForOCR(
  imageBlob: Blob
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;

      if (!ctx) {
        resolve(imageBlob);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Increase contrast
        const contrast = 1.5;
        const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
        const newGray = Math.min(255, Math.max(0, factor * (gray - 128) + 128));

        data[i] = newGray;
        data[i + 1] = newGray;
        data[i + 2] = newGray;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(imageBlob);
        }
      }, 'image/png');
    };

    img.onerror = () => {
      resolve(imageBlob);
    };

    img.src = URL.createObjectURL(imageBlob);
  });
}
