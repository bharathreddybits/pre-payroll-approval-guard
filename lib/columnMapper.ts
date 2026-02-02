import OpenAI from 'openai';
import { CANONICAL_FIELDS, CanonicalField } from './canonicalSchema';

export interface ColumnMapping {
  uploadedColumn: string;
  canonicalField: string | null;
  confidence: number;
  reasoning: string;
}

export interface MappingResult {
  mappings: ColumnMapping[];
  method: 'ai' | 'mock';
}

// ---------------------------------------------------------------------------
// Public entry point — auto-selects AI vs mock based on API key availability
// ---------------------------------------------------------------------------

export async function mapColumns(
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<MappingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const isPlaceholder = !apiKey || apiKey === 'your-openai-api-key-here' || apiKey.startsWith('placeholder');

  if (!isPlaceholder) {
    try {
      const mappings = await mapColumnsWithAI(headers, sampleRows);
      return { mappings, method: 'ai' };
    } catch (err: any) {
      console.warn('[ColumnMapper] AI mapping failed, falling back to mock:', err.message);
    }
  }

  const mappings = mapColumnsWithMock(headers);
  return { mappings, method: 'mock' };
}

// ---------------------------------------------------------------------------
// AI Mapper — uses OpenAI GPT-4o-mini
// ---------------------------------------------------------------------------

async function mapColumnsWithAI(
  headers: string[],
  sampleRows: Record<string, string>[],
): Promise<ColumnMapping[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const schemaDescription = CANONICAL_FIELDS
    .filter(f => f.dataType !== 'array')
    .map(f => `- ${f.name} (${f.dataType}): ${f.description}`)
    .join('\n');

  const sampleText = sampleRows.slice(0, 5).map((row, i) =>
    `Row ${i + 1}: ${JSON.stringify(row)}`
  ).join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a payroll data column mapper. Given CSV column headers and sample data rows, map each column to the closest field in the canonical payroll schema below. Return JSON only.

Canonical Schema Fields:
${schemaDescription}

Rules:
- Map each uploaded column to exactly one canonical field, or null if no match.
- Use semantic understanding, not just exact name matching.
- Consider the sample data values to disambiguate (e.g., numeric vs string, date patterns).
- Assign confidence 0.0-1.0 based on match quality.
- Provide a brief reasoning for each mapping.`,
      },
      {
        role: 'user',
        content: `CSV Headers: ${JSON.stringify(headers)}

Sample Data:
${sampleText}

Return a JSON object with this exact structure:
{
  "mappings": [
    {
      "uploaded_column": "header_name",
      "canonical_field": "CanonicalFieldName_or_null",
      "confidence": 0.95,
      "reasoning": "brief explanation"
    }
  ]
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);
  if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
    throw new Error('Invalid response structure from OpenAI');
  }

  return parsed.mappings.map((m: any) => ({
    uploadedColumn: m.uploaded_column,
    canonicalField: m.canonical_field || null,
    confidence: typeof m.confidence === 'number' ? m.confidence : 0,
    reasoning: m.reasoning || '',
  }));
}

// ---------------------------------------------------------------------------
// Mock Mapper — fuzzy string matching against aliases
// ---------------------------------------------------------------------------

export function mapColumnsWithMock(headers: string[]): ColumnMapping[] {
  return headers.map(header => {
    const match = findBestMatch(header, CANONICAL_FIELDS);
    return match;
  });
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findBestMatch(header: string, fields: CanonicalField[]): ColumnMapping {
  const normalizedHeader = normalize(header);

  // Pass 1: exact alias match
  for (const field of fields) {
    for (const alias of field.aliases) {
      if (normalize(alias) === normalizedHeader) {
        return {
          uploadedColumn: header,
          canonicalField: field.name,
          confidence: 0.95,
          reasoning: `Exact match with known alias "${alias}"`,
        };
      }
    }
    // Also check canonical name itself
    if (normalize(field.name) === normalizedHeader) {
      return {
        uploadedColumn: header,
        canonicalField: field.name,
        confidence: 0.98,
        reasoning: `Exact match with canonical field name`,
      };
    }
  }

  // Pass 2: substring / contains match
  for (const field of fields) {
    for (const alias of field.aliases) {
      const normalizedAlias = normalize(alias);
      if (
        normalizedHeader.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedHeader)
      ) {
        if (normalizedAlias.length >= 3 && normalizedHeader.length >= 3) {
          return {
            uploadedColumn: header,
            canonicalField: field.name,
            confidence: 0.70,
            reasoning: `Partial match with alias "${alias}"`,
          };
        }
      }
    }
  }

  // Pass 3: no match
  return {
    uploadedColumn: header,
    canonicalField: null,
    confidence: 0,
    reasoning: 'No matching canonical field found',
  };
}
