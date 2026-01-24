/**
 * PDF Extractor
 *
 * Extracts text content from PDF files for rate letter analysis
 * and supplementary document processing.
 */

import { readFile } from 'fs/promises';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PDFExtractionResult {
  documentId: string;
  filename: string;
  rawText: string;
  pageCount: number;
  warnings: string[];
}

// ============================================================================
// EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract text from PDF file
 */
export async function extractPDFFile(
  filePath: string,
  documentId: string,
  filename: string
): Promise<PDFExtractionResult> {
  const warnings: string[] = [];

  try {
    // Dynamic import to handle potential module resolution issues
    const pdfParse = await import('pdf-parse');
    const dataBuffer = await readFile(filePath);

    const data = await pdfParse.default(dataBuffer);

    return {
      documentId,
      filename,
      rawText: data.text,
      pageCount: data.numpages,
      warnings,
    };
  } catch (error) {
    warnings.push(`PDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      documentId,
      filename,
      rawText: '',
      pageCount: 0,
      warnings,
    };
  }
}

/**
 * Extract text from specific pages of a PDF
 */
export async function extractPDFPages(
  filePath: string,
  pageNumbers: number[]
): Promise<string[]> {
  try {
    const pdfParse = await import('pdf-parse');
    const dataBuffer = await readFile(filePath);

    // pdf-parse doesn't support page-by-page extraction directly
    // For now, return the full text
    const data = await pdfParse.default(dataBuffer);

    // Simple page split heuristic based on form feeds or page breaks
    const pages = data.text.split(/\f|\n{3,}/);

    return pageNumbers.map(num => pages[num - 1] || '');
  } catch {
    return [];
  }
}
