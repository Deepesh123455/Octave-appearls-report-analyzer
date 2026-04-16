import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

class AIService {
  /**
   * Resolve Excel headers to Unified SCM Schema using Llama-3.3-70b-versatile.
   * Ensures deep semantic understanding of "Site/Store" vs "Article/SKU".
   * 
   * @param {string[]} headers - The raw header row from the Excel file
   * @param {string[][]} sampleRows - A few rows of sample data to provide context
   * @returns {Promise<Object>} - Field mapping JSON
   */
  async resolveMappings(headers, sampleRows) {
    if (!process.env.GROQ_API_KEY) {
      console.warn('AI MAPPING: GROQ_API_KEY not found. Falling back to heuristics.');
      return null;
    }

    const prompt = `
      As an expert Supply Chain Data Analyst, analyze these Excel headers and sample data.
      Your goal is to map them to our internal UNIFIED INVENTORY SCHEMA.

      MANDATORY CONSTRAINTS:
      1. HEADER DISCOVERY: Find the row index where column headers are located (0-indexed). 
      
      2. STORE VS SKU PATTERNS (CRITICAL): 
         - ARTICLE PATTERN: Alphanumeric codes with multiple dashes (e.g., "FM-201-26").
         - CATEGORY PATTERN: Words like "MEN", "WOMEN", "KIDS", "ACCESSORIES". These are NEVER articleNo.
         - CARDINALITY: Columns with many unique values are articles. Columns with 2-5 repeating values are Categories.

      3. MUTUAL EXCLUSION (DE-DUPLICATION):
         - Every schema field MUST point to a DIFFERENT column. 
         - DEDUPLICATION: articleNo and sectionName can NEVER point to the same column header.
         - DEDUPLICATION: locationName and articleNo can NEVER point to the same column header.

      RAW HEADERS AND FIRST 30 ROWS:
      ${headers.join(' | ')} (Row 0)
      ${sampleRows.map((r, i) => `Row ${i+1}: ${r.join(' | ')}`).join('\n')}

      RETURN ONLY A JSON OBJECT:
      {
        "headerRowIndex": number,
        "mappings": {
          "locationName": "Column Name",
          "articleNo": "Column Name",
          "colorName": "Column Name",
          "fabric": "Column Name",
          ...
        },
        "isConsolidated": boolean
      }
    `;

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a precise data mapping bot. Respond ONLY with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(chatCompletion.choices[0].message.content);
      console.log('AI MAPPING RESOLVED:', result);
      return result;

    } catch (error) {
      console.error('AI MAPPING ERROR:', error);
      return null; // Fallback to heuristics
    }
  }
}

export default new AIService();
