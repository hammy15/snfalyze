/**
 * AI Document Analyzer
 *
 * Uses multi-LLM router (Gemini primary → Claude fallback → OpenAI fallback)
 * to intelligently extract and analyze financial data from documents.
 */

import { getRouter } from '@/lib/ai';

// Types
export interface DocumentAnalysisRequest {
  documentId: string;
  filename: string;
  documentType: string;
  rawText: string;
  spreadsheetData?: Record<string, any[][]>;
  facilityType?: 'SNF' | 'ALF' | 'ILF';
}

export interface ExtractedField {
  value: number | string | boolean | null;
  confidence: number;
  source?: string;
  normalized?: string;
}

export interface DocumentAnalysisResult {
  documentType: string;
  extractedFields: Record<string, ExtractedField>;
  summary: string;
  keyFindings: string[];
  clarificationsNeeded: ClarificationRequest[];
  confidence: number;
}

export interface ClarificationRequest {
  field: string;
  reason: string;
  extractedValue: any;
  possibleValues?: any[];
  priority: 'high' | 'medium' | 'low';
}

// Analysis prompts by document type
const ANALYSIS_PROMPTS: Record<string, string> = {
  financial_statement: `Analyze this financial statement for a healthcare facility. Extract:

## Revenue Items (Annual)
- Total Revenue
- Medicare Revenue (Part A)
- Medicare Revenue (Part B)
- Medicare Advantage Revenue
- Medicaid Revenue
- Private Pay Revenue
- Other Revenue

## Expense Items (Annual)
- Total Expenses
- Salaries and Wages
- Employee Benefits
- Contract Labor / Agency
- Professional Fees
- Supplies
- Food/Dietary
- Utilities
- Repairs and Maintenance
- Insurance
- Property Taxes
- Management Fee
- Other Operating Expenses

## Calculated Metrics
- Net Operating Income (NOI)
- EBITDAR (if determinable)
- Labor Cost Percentage

For each value, provide the exact number found and your confidence (0-1).`,

  rent_roll: `Analyze this rent roll / census report for a healthcare facility. Extract:

## Census Data
- Total Licensed Beds
- Total Certified Beds
- Current Census / Occupied Beds
- Occupancy Rate (%)

## Payer Mix (as percentages of census)
- Medicare (Part A) %
- Medicare (Part B) %
- Medicare Advantage %
- Medicaid %
- Private Pay %
- Other %

## Rate Information (if available)
- Average Medicare Rate per Day
- Average Medicaid Rate per Day
- Average Private Pay Rate per Day

For each value, provide the exact number found and your confidence (0-1).`,

  census_report: `Analyze this census/occupancy report for a healthcare facility. Extract:

## Census Data
- Licensed Beds
- Certified Beds
- Average Daily Census (ADC)
- Occupancy Rate (%)
- Patient Days (for period)

## Payer Mix
- Medicare Days / %
- Medicaid Days / %
- Private Pay Days / %
- Other Days / %

## Trends (if available)
- Month-over-month occupancy change
- Year-over-year occupancy change

For each value, provide the exact number found and your confidence (0-1).`,

  staffing_report: `Analyze this staffing report for a healthcare facility. Extract:

## Staffing Hours Per Patient Day (HPPD)
- RN HPPD
- LPN/LVN HPPD
- CNA/NA HPPD
- Total Nursing HPPD

## FTE Counts
- Total RN FTEs
- Total LPN FTEs
- Total CNA FTEs
- Administrative FTEs

## Agency/Contract Staff
- Agency Labor Cost
- Agency % of Total Nursing

## Turnover (if available)
- Nursing Turnover Rate
- Total Employee Turnover Rate

For each value, provide the exact number found and your confidence (0-1).`,

  cost_report: `Analyze this Medicare Cost Report (Form 2540-10) for a healthcare facility. Extract:

## Statistical Data (Worksheet S-3)
- Total Beds
- Total Patient Days
- Medicare Days
- Medicaid Days

## Cost Data
- Total Operating Costs
- Nursing Costs
- Administrative Costs
- Capital Related Costs

## Per Diem Costs
- Medicare Cost Per Day
- Total Cost Per Day

For each value, provide the exact number found and your confidence (0-1).`,

  survey_report: `Analyze this state survey / inspection report for a healthcare facility. Extract:

## Deficiency Summary
- Total Deficiencies
- Scope/Severity Distribution
- Immediate Jeopardy (IJ) Citations
- Actual Harm (G+) Citations

## Star Ratings (if shown)
- Overall Star Rating
- Health Inspection Rating
- Staffing Rating
- Quality Rating

## Compliance Status
- SFF Status (Special Focus Facility)
- Compliance Issues

For each value, provide the exact number found and your confidence (0-1).`,

  om_package: `Analyze this Offering Memorandum for a healthcare facility acquisition. Extract:

## Property Information
- Facility Name
- Address (Street, City, State, ZIP)
- Facility Type (SNF/ALF/ILF)
- Year Built
- Square Footage
- Acreage

## Bed/Unit Count
- Licensed Beds
- Certified Beds
- Operational Beds

## Financial Highlights
- Total Revenue
- Total Expenses
- NOI
- EBITDAR
- Occupancy Rate

## Deal Information
- Asking Price
- Cap Rate
- Price Per Bed

For each value, provide the exact number found and your confidence (0-1).`,

  other: `Analyze this document and extract any relevant financial or operational data for a healthcare facility. Look for:
- Revenue figures
- Expense figures
- Bed counts
- Census/occupancy data
- Payer mix information
- Staffing metrics
- Quality indicators

For each value found, provide the exact number and your confidence (0-1).`,
};

/**
 * Analyze a document using Claude AI
 */
export async function analyzeDocument(
  request: DocumentAnalysisRequest
): Promise<DocumentAnalysisResult> {
  const analysisPrompt = ANALYSIS_PROMPTS[request.documentType] || ANALYSIS_PROMPTS.other;

  // Build the context
  let documentContent = request.rawText;
  if (request.spreadsheetData) {
    documentContent += '\n\n=== SPREADSHEET DATA ===\n';
    for (const [sheetName, data] of Object.entries(request.spreadsheetData)) {
      documentContent += `\n--- ${sheetName} ---\n`;
      for (const row of data.slice(0, 100)) { // Limit rows
        documentContent += row.map(cell => cell ?? '').join('\t') + '\n';
      }
    }
  }

  // Truncate if too long
  if (documentContent.length > 50000) {
    documentContent = documentContent.substring(0, 50000) + '\n...[truncated]';
  }

  const systemPrompt = `You are an expert financial analyst specializing in healthcare real estate, particularly skilled nursing facilities (SNF), assisted living facilities (ALF), and independent living facilities (ILF).

Your task is to extract financial and operational data from documents with high accuracy. Follow these rules:
1. Extract exact values as they appear in the document
2. For each field, provide a confidence score (0.0 to 1.0)
3. If a value is not found or unclear, set it to null with confidence 0
4. Identify any values that need clarification from the user
5. Provide a brief summary of the document
6. List 3-5 key findings or notable items

Respond in JSON format with this structure:
{
  "documentType": "the detected or confirmed document type",
  "extractedFields": {
    "fieldName": { "value": <number or string>, "confidence": <0-1>, "source": "quote from doc" }
  },
  "summary": "brief 2-3 sentence summary",
  "keyFindings": ["finding 1", "finding 2", ...],
  "clarificationsNeeded": [
    { "field": "fieldName", "reason": "why clarification needed", "extractedValue": <value>, "possibleValues": [<options>], "priority": "high|medium|low" }
  ],
  "overallConfidence": <0-1>
}`;

  try {
    const router = getRouter();
    const response = await router.route({
      taskType: 'document_analysis',
      systemPrompt,
      userPrompt: `${analysisPrompt}

Document filename: ${request.filename}
Facility type: ${request.facilityType || 'Unknown'}

=== DOCUMENT CONTENT ===
${documentContent}

Extract the data and respond with JSON only.`,
      responseFormat: 'json',
      metadata: { documentId: request.documentId },
    });

    // Parse JSON from response (may be wrapped in markdown code blocks)
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON
      const rawMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }

    const result = JSON.parse(jsonStr);

    return {
      documentType: result.documentType || request.documentType,
      extractedFields: result.extractedFields || {},
      summary: result.summary || 'Unable to summarize document.',
      keyFindings: result.keyFindings || [],
      clarificationsNeeded: result.clarificationsNeeded || [],
      confidence: result.overallConfidence || 0.5,
    };
  } catch (error) {
    console.error('AI document analysis failed:', error);

    // Return a minimal result on error
    return {
      documentType: request.documentType,
      extractedFields: {},
      summary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      keyFindings: [],
      clarificationsNeeded: [{
        field: 'document',
        reason: 'AI analysis failed - manual review required',
        extractedValue: null,
        priority: 'high',
      }],
      confidence: 0,
    };
  }
}

/**
 * Analyze multiple documents and cross-reference
 */
export async function analyzeDocumentSet(
  documents: DocumentAnalysisRequest[]
): Promise<{
  results: DocumentAnalysisResult[];
  conflicts: Array<{
    field: string;
    documents: Array<{ documentId: string; value: any }>;
  }>;
  consolidatedData: Record<string, ExtractedField>;
}> {
  // Analyze each document
  const results = await Promise.all(documents.map(doc => analyzeDocument(doc)));

  // Find conflicts
  const fieldValues: Record<string, Array<{ documentId: string; value: any; confidence: number }>> = {};

  documents.forEach((doc, i) => {
    const result = results[i];
    for (const [field, data] of Object.entries(result.extractedFields)) {
      if (data.value !== null) {
        if (!fieldValues[field]) {
          fieldValues[field] = [];
        }
        fieldValues[field].push({
          documentId: doc.documentId,
          value: data.value,
          confidence: data.confidence,
        });
      }
    }
  });

  const conflicts: Array<{ field: string; documents: Array<{ documentId: string; value: any }> }> = [];
  const consolidatedData: Record<string, ExtractedField> = {};

  for (const [field, values] of Object.entries(fieldValues)) {
    if (values.length > 1) {
      // Check for conflicts (values differ by more than 5%)
      const numericValues = values.filter(v => typeof v.value === 'number');
      if (numericValues.length > 1) {
        const avg = numericValues.reduce((s, v) => s + v.value, 0) / numericValues.length;
        const hasConflict = numericValues.some(v => Math.abs(v.value - avg) / avg > 0.05);

        if (hasConflict) {
          conflicts.push({
            field,
            documents: values.map(v => ({ documentId: v.documentId, value: v.value })),
          });
        }
      }
    }

    // Consolidate: pick highest confidence value
    const bestValue = values.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    consolidatedData[field] = {
      value: bestValue.value,
      confidence: bestValue.confidence,
    };
  }

  return { results, conflicts, consolidatedData };
}
