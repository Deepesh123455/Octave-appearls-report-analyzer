/**
 * PARSER WORKER
 * ─────────────────────────────────────────────────────────────────────────────
 * Worker thread that runs the full parsing pipeline in isolation.
 * Receives fileBuffer + optional aiMappings via workerData.
 * Sends parsed rows back in chunks via parentPort.
 */

import { parentPort, workerData } from 'worker_threads';
import { runPipeline } from '../mapping/pipeline.js';
import fs from 'fs';
import path from 'path';

const CHUNK_SIZE = 2000;

try {
  const { fileBuffer, aiMappings } = workerData;

  const result = runPipeline(fileBuffer, aiMappings);

  // Write audit log to debug file
  try {
    fs.writeFileSync(
      path.join(process.cwd(), 'debug_headers.txt'),
      result.auditLog.join('\n')
    );
    fs.writeFileSync(
      path.join(process.cwd(), 'debug_processed_rows.json'),
      JSON.stringify(result.rows.slice(0, 10), null, 2)
    );
  } catch (e) { /* non-critical */ }

  const { rows, reportType } = result;

  if (rows.length === 0) {
    parentPort.postMessage({
      type: 'DATA',
      rows: [],
      reportType,
      mappedFields: result.mappedFields,
      isLast: true
    });
  } else {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      parentPort.postMessage({
        type: 'DATA',
        rows: chunk,
        reportType,
        mappedFields: result.mappedFields,
        isLast: (i + CHUNK_SIZE) >= rows.length
      });
    }
  }

} catch (error) {
  parentPort.postMessage({ type: 'ERROR', error: error.message });
}
