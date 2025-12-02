import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';
import { initUsersTable, initWalletsTable, initGuardiansTable, initScheduledTransactionsTable } from './migrations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../../data/bot.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    try {
      // Get the directory path
      const dbDir = dirname(dbPath);
      
      // Create directory if it doesn't exist
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
        console.log('Created database directory:', dbDir);
      }
      
      // Create database
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      
      // Run migrations
      initUsersTable(db);
      initWalletsTable(db);
      initGuardiansTable(db);
      initScheduledTransactionsTable(db);
      
      console.log('Database initialized at:', dbPath);
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }
  return db;
}

export async function initDatabase() {
  getDatabase();
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

