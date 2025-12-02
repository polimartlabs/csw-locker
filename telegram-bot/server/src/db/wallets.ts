import { getDatabase } from './index.js';

export interface Wallet {
  id: number;
  userId: number;
  name?: string;
  contractAddress: string;
  contractName: string;
  network: string;
  balance?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletInput {
  userId: number;
  name?: string;
  contractAddress: string;
  contractName: string;
  network?: string;
}

export function createWallet(input: CreateWalletInput): Wallet {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO wallets (user_id, name, contract_address, contract_name, network, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    input.userId,
    input.name || null,
    input.contractAddress,
    input.contractName,
    input.network || 'testnet',
    now,
    now
  );
  
  return getWalletById(result.lastInsertRowid as number)!;
}

export function getWalletById(id: number): Wallet | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM wallets WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    contractAddress: row.contract_address,
    contractName: row.contract_name,
    network: row.network,
    balance: row.balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getUserWallets(telegramId: number): Wallet[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT w.* FROM wallets w
    JOIN users u ON w.user_id = u.id
    WHERE u.telegram_id = ?
    ORDER BY w.created_at DESC
  `);
  
  const rows = stmt.all(telegramId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    contractAddress: row.contract_address,
    contractName: row.contract_name,
    network: row.network,
    balance: row.balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export function getWalletByContractAddress(contractAddress: string): Wallet | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM wallets WHERE contract_address = ?');
  const row = stmt.get(contractAddress) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    contractAddress: row.contract_address,
    contractName: row.contract_name,
    network: row.network,
    balance: row.balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function updateWalletBalance(contractAddress: string, balance: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE wallets 
    SET balance = ?, updated_at = ?
    WHERE contract_address = ?
  `);
  
  stmt.run(balance, new Date().toISOString(), contractAddress);
}

