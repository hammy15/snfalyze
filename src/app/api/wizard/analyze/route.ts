import { NextRequest, NextResponse } from 'next/server';
import { db, documents } from '@/db';
import { inArray } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { join } from 'path';

const anthropic = new Anthropic();

interface FacilityInfo {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  beds?: number;
  type?: string;
  confidence: number;
}

interface AnalysisResult {
  suggestedDealName: string;
  suggestedDealType: 'purchase' | 'sale_leaseback' | 'acquisition_financing';
  suggestedAssetType: 'SNF' | 'ALF' | 'ILF';
  facilities: FacilityInfo[];
  documentTypes: Array<{
    filename: string;
    suggestedType: string;
    confidence: number;
  }>;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, fileIds } = body as {
      sessionId?: string;
      fileIds: string[];
    };

    if (!fileIds || fileIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files to analyze' },
        { status: 400 }
      );
    }

    // Get documents from database
    const docs = await db
      .select()
      .from(documents)
      .where(inArray(documents.id, fileIds));

    if (docs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No documents found' },
        { status: 404 }
      );
    }

    // Prepare document content for analysis
    const documentInfo: Array<{ filename: string; type: string; content?: string }> = [];

    for (const doc of docs) {
      const info: { filename: string; type: string; content?: string } = {
        filename: doc.filename || 'unknown',
        type: doc.type || 'unknown',
      };

      // Try to read file content for text-based files
      if (doc.fileUrl) {
        try {
          const filePath = join(process.cwd(), doc.fileUrl.replace(/^\//, ''));
          // For now, we'll just use filename analysis
          // In production, we'd extract text from PDFs/Excel
        } catch (e) {
          // Ignore file read errors
        }
      }

      documentInfo.push(info);
    }

    // Build prompt for Claude
    const prompt = `Analyze these document filenames from a healthcare real estate deal and extract information:

Documents:
${documentInfo.map((d, i) => `${i + 1}. ${d.filename} (detected type: ${d.type})`).join('\n')}

Based on these documents, provide your analysis in JSON format:

{
  "suggestedDealName": "A professional name for this deal based on facility names found",
  "suggestedDealType": "purchase" | "sale_leaseback" | "acquisition_financing",
  "suggestedAssetType": "SNF" | "ALF" | "ILF",
  "facilities": [
    {
      "name": "Facility name extracted from documents",
      "city": "City if found",
      "state": "State code if found (e.g., CA, TX)",
      "beds": number of beds if mentioned,
      "type": "SNF" | "ALF" | "ILF",
      "confidence": 0.0-1.0 confidence score
    }
  ],
  "documentTypes": [
    {
      "filename": "original filename",
      "suggestedType": "financial_statement" | "census_report" | "rent_roll" | "survey_report" | "cost_report" | "lease_agreement" | "om_package" | "staffing_report" | "appraisal" | "other",
      "confidence": 0.0-1.0
    }
  ],
  "confidence": overall confidence 0.0-1.0
}

Rules:
- Look for facility names in filenames (e.g., "Sunrise_SNF_Financials.pdf" suggests a facility named "Sunrise")
- Look for location indicators (city names, state codes)
- If multiple facilities are mentioned, list each one
- If no clear facility name is found, suggest a generic name like "Healthcare Portfolio"
- Default to "purchase" for deal type unless documents suggest otherwise
- Default to "SNF" for asset type unless documents clearly indicate ALF or ILF
- Be conservative with confidence scores

Return ONLY the JSON, no other text.`;

    // Call Claude for analysis
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let analysis: AnalysisResult;
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      // Return fallback analysis
      analysis = {
        suggestedDealName: 'New Healthcare Deal',
        suggestedDealType: 'purchase',
        suggestedAssetType: 'SNF',
        facilities: [
          {
            name: 'Facility 1',
            confidence: 0.5,
          },
        ],
        documentTypes: docs.map((d) => ({
          filename: d.filename || 'unknown',
          suggestedType: d.type || 'other',
          confidence: 0.7,
        })),
        confidence: 0.5,
      };
    }

    // Ensure facilities array exists and has at least one entry
    if (!analysis.facilities || analysis.facilities.length === 0) {
      analysis.facilities = [{ name: 'Facility 1', confidence: 0.5 }];
    }

    // Ensure documentTypes matches our documents
    if (!analysis.documentTypes || analysis.documentTypes.length !== docs.length) {
      analysis.documentTypes = docs.map((d) => ({
        filename: d.filename || 'unknown',
        suggestedType: d.type || 'other',
        confidence: 0.7,
      }));
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error analyzing documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze documents' },
      { status: 500 }
    );
  }
}
