import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.js';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('CRITICAL: DATABASE_URL is not set in environment variables');
} else {
    try {
        const urlObj = new URL(dbUrl.replace(/["']/g, '')); // Clean quotes if present
        const host = urlObj.hostname;
        console.log(`DB DIAGNOSTIC: Attempting connection to host: ${host.substring(0, 4)}...${host.slice(-8)}`);
        
        if (host === 'base') {
            console.error('CRITICAL ERROR: hostname is detected as "base". Please check Render environment variables for extra quotes or typos.');
        }
    } catch (e) {
        console.error('DB DIAGNOSTIC: Failed to parse DATABASE_URL. It might be malformed.');
    }
}

const pool = new Pool({
    connectionString: dbUrl ? dbUrl.replace(/["']/g, '') : undefined,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
});

// Use the pool with Drizzle
const db = drizzle(pool, { schema });

export { db };