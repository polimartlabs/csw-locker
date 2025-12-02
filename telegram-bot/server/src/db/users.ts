import { getDatabase } from './index.js';

export interface User {
  id: number;
  telegramId: number;
  username?: string;
  stacksAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  telegramId: number;
  username?: string;
  stacksAddress?: string;
}

export function createUser(input: CreateUserInput): User {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO users (telegram_id, username, stacks_address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    input.telegramId,
    input.username || null,
    input.stacksAddress || null,
    now,
    now
  );
  
  return getUserById(result.lastInsertRowid as number)!;
}

export function getUserByTelegramId(telegramId: number): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE telegram_id = ?');
  const row = stmt.get(telegramId) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    username: row.username,
    stacksAddress: row.stacks_address,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getUserById(id: number): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    username: row.username,
    stacksAddress: row.stacks_address,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function updateUserStacksAddress(telegramId: number, stacksAddress: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE users 
    SET stacks_address = ?, updated_at = ?
    WHERE telegram_id = ?
  `);
  
  stmt.run(stacksAddress, new Date().toISOString(), telegramId);
}

