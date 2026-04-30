import { Groq } from 'groq-sdk';
import { db } from '../../db/config.js';
import { inventorySnapshots } from '../../db/schema.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const buildTable = (rows) => {
  if (!rows.length) return '(no rows)';
  const header = 'loc|sku|color|sec|obs|cbs|sls|stp%|git|asm';
  const lines = rows.map(r => [
    r.locationName || '',
    r.articleNo || '',
    r.colorName || '',
    r.sectionName || '',
    r.obsQty ?? 0,
    r.cbsQty ?? 0,
    r.netSlsQty ?? 0,
    r.saleThruPct != null ? r.saleThruPct.toFixed(1) : '0',
    r.gitQty ?? 0,
    r.asm || '',
  ].join('|'));
  return header + '\n' + lines.join('\n');
};

export const getChatResponse = async (userMessage, conversationHistory = []) => {
  // 1. Fetch all data once
  const allData = await db.select().from(inventorySnapshots);

  if (!allData.length) {
    return "No inventory data loaded. Please upload a file first.";
  }

  // 2. Build lookup sets
  const allStores = [...new Set(allData.map(r => r.locationName).filter(Boolean))];
  const allSkus = [...new Set(allData.map(r => r.articleNo).filter(Boolean))];
  const allColors = [...new Set(allData.map(r => r.colorName).filter(Boolean))];
  const msgUpper = userMessage.toUpperCase();


  const matchedStores = allStores.filter(s => msgUpper.includes(s.toUpperCase()));
  const matchedSkus = allSkus.filter(s => msgUpper.includes(s.toUpperCase()));
  const matchedColors = allColors.filter(c => c.length > 3 && msgUpper.includes(c.toUpperCase()));

  let relevantRows;
  let contextNote;

  const hasFilter = matchedStores.length || matchedSkus.length || matchedColors.length;

  if (hasFilter) {

    relevantRows = allData.filter(r => {
      const storeOk = !matchedStores.length || matchedStores.includes(r.locationName);
      const skuOk = !matchedSkus.length || matchedSkus.includes(r.articleNo);
      const colorOk = !matchedColors.length || matchedColors.includes(r.colorName);
      return storeOk && skuOk && colorOk;
    });
    contextNote = `Filtered: stores=[${matchedStores.join(',') || 'any'}] skus=[${matchedSkus.join(',') || 'any'}] colors=[${matchedColors.join(',') || 'any'}]. Found ${relevantRows.length} rows.`;
  } else {
    // No specific entity detected — send top 120 rows by closing stock (most actionable)
    relevantRows = [...allData]
      .sort((a, b) => (b.cbsQty || 0) - (a.cbsQty || 0))
      .slice(0, 120);
    contextNote = `No specific entity detected. Showing top 120 rows by closing stock (${allData.length} total rows).`;
  }

  // 4. Network summary (always included, very compact)
  const totalSales = allData.reduce((s, r) => s + (r.netSlsQty || 0), 0);
  const totalStock = allData.reduce((s, r) => s + (r.cbsQty || 0), 0);
  const totalGit = allData.reduce((s, r) => s + (r.gitQty || 0), 0);

  const systemPrompt = `You are "FileMind", an expert Retail SCM Intelligence AI assistant.

NETWORK SUMMARY:
- SKUs: ${allSkus.length} | Stores: ${allStores.length} | Total rows: ${allData.length}
- Net Sales: ${totalSales} units | Closing Stock: ${totalStock} units | In-Transit: ${totalGit} units
- All stores: ${allStores.join(', ')}
- All SKUs: ${allSkus.join(', ')}

CONTEXT: ${contextNote}

COLUMNS: loc=Store, sku=Article, color=Color, sec=Section, obs=Opening Stock, cbs=Closing Stock, sls=Net Sales, stp%=Sell-Thru%, git=In-Transit, asm=Manager

DATA:
${buildTable(relevantRows)}

RULES:
1. The stores and SKUs listed in the network summary ALL exist in the database.
2. Never say "not available" — if it's in the store list, it's valid.
3. For inter-store transfers: donors = high cbs + low/zero sls; receivers = low cbs + high sls.
4. WoS = cbs/sls. CRITICAL <1wk, LOW_STOCK <2wk, HEALTHY 2-10wk, OVERSTOCK >10wk, STAGNANT if sls=0.
5. Be structured, concise, bullet points. Give specific actionable transfer recommendations.`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 800,
  });

  return chatCompletion.choices[0].message.content;
};
