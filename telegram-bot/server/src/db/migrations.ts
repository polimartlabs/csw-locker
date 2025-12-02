import Database from 'better-sqlite3';

export function initUsersTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      stacks_address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
  `);
}

export function initWalletsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT,
      contract_address TEXT UNIQUE NOT NULL,
      contract_name TEXT NOT NULL,
      network TEXT NOT NULL DEFAULT 'testnet',
      balance TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_wallets_contract_address ON wallets(contract_address);
  `);
}

export function initGuardiansTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guardians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      guardian_address TEXT NOT NULL,
      telegram_user_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
      UNIQUE(wallet_id, guardian_address)
    );
    
    CREATE INDEX IF NOT EXISTS idx_guardians_wallet_id ON guardians(wallet_id);
  `);
}

export function initScheduledTransactionsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      recipient TEXT,
      schedule_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      transaction_hash TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_scheduled_tx_wallet_id ON scheduled_transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_tx_status ON scheduled_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_tx_date ON scheduled_transactions(schedule_date);
  `);
}

