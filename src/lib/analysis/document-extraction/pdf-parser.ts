// =============================================================================
// PDF PARSER - Extract text and structure from PDF documents
// =============================================================================

import type { ExtractedDocument, DocumentType } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface PDFParseResult {
  text: string;
  pages: PDFPage[];
  metadata: PDFMetadata;
  tables: RawTable[];
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
  textBlocks: TextBlock[];
}

export interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontName?: string;
  isBold?: boolean;
  isItalic?: boolean;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
}

export interface RawTable {
  pageNumber: number;
  rows: string[][];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

// =============================================================================
// PDF PARSER CLASS
// =============================================================================

export class PDFParser {
  private ocrEnabled: boolean;
  private tableDetectionEnabled: boolean;

  constructor(options: { ocrEnabled?: boolean; tableDetectionEnabled?: boolean } = {}) {
    this.ocrEnabled = options.ocrEnabled ?? true;
    this.tableDetectionEnabled = options.tableDetectionEnabled ?? true;
  }

  /**
   * Parse a PDF file and extract text, structure, and tables
   */
  async parse(file: File | Buffer | ArrayBuffer): Promise<PDFParseResult> {
    // Convert to ArrayBuffer if needed
    const buffer = await this.toArrayBuffer(file);

    // In production, this would use pdf.js or similar
    // For now, we'll create a structured approach that can be enhanced
    const pages = await this.extractPages(buffer);
    const metadata = await this.extractMetadata(buffer);
    const tables = this.tableDetectionEnabled ? await this.detectTables(pages) : [];

    const fullText = pages.map((p) => p.text).join('\n\n');

    return {
      text: fullText,
      pages,
      metadata,
      tables,
    };
  }

  /**
   * Parse from a URL (e.g., S3 or blob storage)
   */
  async parseFromUrl(url: string): Promise<PDFParseResult> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return this.parse(buffer);
  }

  /**
   * Convert various input types to ArrayBuffer
   */
  private async toArrayBuffer(input: File | Buffer | ArrayBuffer): Promise<ArrayBuffer> {
    if (input instanceof ArrayBuffer) {
      return input;
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
      return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    }
    if (input instanceof File) {
      return input.arrayBuffer();
    }
    throw new Error('Unsupported input type');
  }

  /**
   * Extract pages from PDF
   * In production, this would use pdf.js or a similar library
   */
  private async extractPages(buffer: ArrayBuffer): Promise<PDFPage[]> {
    // This is a placeholder implementation
    // In production, use pdf.js (pdfjs-dist) or similar

    // For now, return empty array - will be populated by actual PDF library
    // Example production implementation:
    // const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
    // const pages: PDFPage[] = [];
    // for (let i = 1; i <= pdfDoc.numPages; i++) {
    //   const page = await pdfDoc.getPage(i);
    //   const textContent = await page.getTextContent();
    //   ...
    // }

    return [];
  }

  /**
   * Extract metadata from PDF
   */
  private async extractMetadata(buffer: ArrayBuffer): Promise<PDFMetadata> {
    // Placeholder - would use pdf.js or similar
    return {
      pageCount: 0,
    };
  }

  /**
   * Detect tables in PDF pages using spatial analysis
   */
  private async detectTables(pages: PDFPage[]): Promise<RawTable[]> {
    const tables: RawTable[] = [];

    for (const page of pages) {
      const pageTables = this.detectTablesInPage(page);
      tables.push(...pageTables);
    }

    return tables;
  }

  /**
   * Detect tables in a single page using text block clustering
   */
  private detectTablesInPage(page: PDFPage): RawTable[] {
    const tables: RawTable[] = [];

    // Group text blocks by vertical position (rows)
    const rowGroups = this.groupByVerticalPosition(page.textBlocks);

    // Identify potential table regions by analyzing row patterns
    const tableRegions = this.identifyTableRegions(rowGroups);

    for (const region of tableRegions) {
      const rows = this.extractTableRows(region, page.textBlocks);
      if (rows.length > 1) {
        tables.push({
          pageNumber: page.pageNumber,
          rows,
          boundingBox: region.boundingBox,
          confidence: this.calculateTableConfidence(rows),
        });
      }
    }

    return tables;
  }

  /**
   * Group text blocks by their vertical position
   */
  private groupByVerticalPosition(blocks: TextBlock[]): Map<number, TextBlock[]> {
    const groups = new Map<number, TextBlock[]>();
    const tolerance = 5; // pixels

    for (const block of blocks) {
      // Round Y position to group nearby blocks
      const roundedY = Math.round(block.y / tolerance) * tolerance;
      const existing = groups.get(roundedY) || [];
      existing.push(block);
      groups.set(roundedY, existing);
    }

    return groups;
  }

  /**
   * Identify table regions based on row patterns
   */
  private identifyTableRegions(
    rowGroups: Map<number, TextBlock[]>
  ): { boundingBox: RawTable['boundingBox']; yPositions: number[] }[] {
    const regions: { boundingBox: RawTable['boundingBox']; yPositions: number[] }[] = [];
    const sortedYPositions = Array.from(rowGroups.keys()).sort((a, b) => a - b);

    let currentRegion: number[] = [];
    let lastColumnCount = 0;

    for (const y of sortedYPositions) {
      const blocks = rowGroups.get(y) || [];
      const columnCount = blocks.length;

      // If column count is consistent (±1) and > 2, likely a table row
      if (columnCount > 2 && Math.abs(columnCount - lastColumnCount) <= 1) {
        currentRegion.push(y);
      } else if (currentRegion.length >= 3) {
        // Save the region if it has at least 3 rows
        regions.push(this.createRegionFromYPositions(currentRegion, rowGroups));
        currentRegion = [];
      } else {
        currentRegion = [];
      }

      lastColumnCount = columnCount;
    }

    // Don't forget the last region
    if (currentRegion.length >= 3) {
      regions.push(this.createRegionFromYPositions(currentRegion, rowGroups));
    }

    return regions;
  }

  /**
   * Create a region object from Y positions
   */
  private createRegionFromYPositions(
    yPositions: number[],
    rowGroups: Map<number, TextBlock[]>
  ): { boundingBox: RawTable['boundingBox']; yPositions: number[] } {
    let minX = Infinity,
      maxX = 0,
      minY = Infinity,
      maxY = 0;

    for (const y of yPositions) {
      const blocks = rowGroups.get(y) || [];
      for (const block of blocks) {
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x + block.width);
        minY = Math.min(minY, block.y);
        maxY = Math.max(maxY, block.y + block.height);
      }
    }

    return {
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      yPositions,
    };
  }

  /**
   * Extract table rows from a region
   */
  private extractTableRows(
    region: { boundingBox: RawTable['boundingBox']; yPositions: number[] },
    blocks: TextBlock[]
  ): string[][] {
    const rows: string[][] = [];
    const tolerance = 5;

    // Filter blocks within the region
    const regionBlocks = blocks.filter(
      (block) =>
        block.x >= region.boundingBox.x - tolerance &&
        block.x <= region.boundingBox.x + region.boundingBox.width + tolerance &&
        block.y >= region.boundingBox.y - tolerance &&
        block.y <= region.boundingBox.y + region.boundingBox.height + tolerance
    );

    // Group by Y position
    const rowGroups = this.groupByVerticalPosition(regionBlocks);

    // Sort rows by Y position and extract text
    const sortedY = Array.from(rowGroups.keys()).sort((a, b) => a - b);

    for (const y of sortedY) {
      const rowBlocks = rowGroups.get(y) || [];
      // Sort by X position and extract text
      const sortedRow = rowBlocks.sort((a, b) => a.x - b.x);
      rows.push(sortedRow.map((block) => block.text.trim()));
    }

    return rows;
  }

  /**
   * Calculate confidence score for table detection
   */
  private calculateTableConfidence(rows: string[][]): number {
    if (rows.length < 2) return 0;

    // Factors that increase confidence:
    // 1. Consistent column count across rows
    // 2. Numeric content in data rows
    // 3. Header-like first row

    const columnCounts = rows.map((r) => r.length);
    const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
    const columnVariance =
      columnCounts.reduce((sum, c) => sum + Math.pow(c - avgColumns, 2), 0) / columnCounts.length;

    // Low variance = more consistent = higher confidence
    const consistencyScore = Math.max(0, 1 - columnVariance / avgColumns);

    // Check for numeric content in non-header rows
    let numericCells = 0;
    let totalCells = 0;
    for (let i = 1; i < rows.length; i++) {
      for (const cell of rows[i]) {
        totalCells++;
        if (/[\d$%,.]/.test(cell)) {
          numericCells++;
        }
      }
    }
    const numericScore = totalCells > 0 ? numericCells / totalCells : 0;

    // Combined confidence
    return consistencyScore * 0.6 + numericScore * 0.4;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create an ExtractedDocument from parse result
 */
export function createExtractedDocument(
  parseResult: PDFParseResult,
  filename: string,
  documentType: DocumentType
): Partial<ExtractedDocument> {
  return {
    filename,
    documentType,
    rawText: parseResult.text,
    pages: parseResult.metadata.pageCount,
    status: 'processing',
    extractionConfidence: calculateOverallConfidence(parseResult),
  };
}

/**
 * Calculate overall extraction confidence
 */
function calculateOverallConfidence(parseResult: PDFParseResult): number {
  const hasText = parseResult.text.length > 100;
  const hasPages = parseResult.pages.length > 0;
  const hasTables = parseResult.tables.length > 0;

  let confidence = 0;
  if (hasText) confidence += 0.4;
  if (hasPages) confidence += 0.3;
  if (hasTables) confidence += 0.3;

  // Adjust by table confidence
  if (hasTables) {
    const avgTableConfidence =
      parseResult.tables.reduce((sum, t) => sum + t.confidence, 0) / parseResult.tables.length;
    confidence = confidence * 0.7 + avgTableConfidence * 0.3;
  }

  return confidence;
}

/**
 * Check if text likely needs OCR
 */
export function needsOCR(parseResult: PDFParseResult): boolean {
  // If very little text was extracted from a multi-page document, likely needs OCR
  if (parseResult.metadata.pageCount > 0) {
    const avgCharsPerPage = parseResult.text.length / parseResult.metadata.pageCount;
    return avgCharsPerPage < 100; // Less than 100 chars per page suggests scanned PDF
  }
  return parseResult.text.length < 50;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const pdfParser = new PDFParser();
