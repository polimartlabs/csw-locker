/**
 * Configuration Example
 * 
 * Copy this file to config.ts or use environment variables.
 * NEVER commit config.ts with real tokens to git.
 */

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  stacks: {
    network: (process.env.STACKS_NETWORK || 'testnet') as 'testnet' | 'mainnet',
    apiUrl: process.env.STACKS_API_URL || 'https://api.testnet.hiro.so',
    explorerUrl: process.env.STACKS_EXPLORER_URL || 'https://explorer.stacks.co',
  },
  database: {
    path: process.env.DATABASE_PATH || './data/bot.db',
  },
  miniApp: {
    url: process.env.MINI_APP_URL || 'http://localhost:5173',
  },
};

