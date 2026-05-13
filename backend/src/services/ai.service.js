import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

class AIService {
  /**
   * Resolve Excel headers to Unified Canonical Schema using Llama-3.3-70b.
   * Pre-processes the file before the worker thread to improve mapping accuracy.
   */
  async resolveMappings(headers, sampleRows) {
    if (!process.env.GROQ_API_KEY) {
      console.warn('AI MAPPING: GROQ_API_KEY not found. Falling back to heuristics.');
      return null;
    }

    const prompt = `
You are an expert Supply Chain & Retail Data Analyst. Map these Excel column headers to the canonical schema.

CANONICAL SCHEMA (map to these keys):
IDENTITY: locationName, articleNo, colorName
PRODUCT: sectionName, subSectionName, category, description, fabric, brand, gender, season, styleCode, size, barcode
QUANTITY: obsQty, cbsQty, netSlsQty, gitQty, saleThruPct, groupPurQty, groupPrtQty, deliveryChallanQty, groupWslQty, returnQty, transferInQty, transferOutQty, damagedQty
FINANCIAL: mrp, asp, netSalesValue, discountPct, costPrice
ORGANIZATION: asm, region, zone, storeGrade, storeManager
TIME: weekNumber, periodLabel, daysInPeriod

RULES:
1. headerRowIndex: 0-indexed row where column headers are located.
2. articleNo maps to: SKU, Item Code, Product ID, Material No, Style No, Article No, Part No.
3. locationName maps to: Store, Outlet, Site, Branch, Plant, Location.
4. obsQty = opening stock. cbsQty = closing stock. netSlsQty = units sold/net sales qty.
5. saleThruPct = sell-thru %, sell through %, ST%.
6. Each canonical key must map to a DIFFERENT column. No duplicates.
7. Only map columns you are confident about. Leave uncertain ones out.
8. isConsolidated: true if there is no store/location column.

RAW HEADERS:
Row 0: ${headers.join(' | ')}
${sampleRows.map((r, i) => `Row ${i + 1}: ${r.join(' | ')}`).join('\n')}

RESPOND ONLY WITH JSON:
{
  "headerRowIndex": 0,
  "mappings": {
    "articleNo": "Column Name",
    "locationName": "Column Name",
    ...
  },
  "isConsolidated": false
}`;

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a precise data mapping bot. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      console.log('AI MAPPING RESOLVED:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('AI MAPPING ERROR:', error.message);
      return null;
    }
  }
}

export default new AIService();
