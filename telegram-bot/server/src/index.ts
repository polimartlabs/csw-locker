import { Bot, Context, webhookCallback } from 'grammy';
import express from 'express';
import dotenv from 'dotenv';
import { setupCommandHandlers } from './bot/handlers/index.js';
import { initDatabase } from './db/index.js';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Bot(BOT_TOKEN);
const app = express();

// Initialize database
await initDatabase();

// Setup command handlers
setupCommandHandlers(bot);

// Express middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Webhook endpoint for Telegram
if (process.env.NODE_ENV === 'production') {
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (webhookUrl) {
    app.use(`/webhook`, webhookCallback(bot, 'express'));
    
    // Set webhook
    await bot.api.setWebhook(`${webhookUrl}/webhook`);
    console.log('Webhook set to:', `${webhookUrl}/webhook`);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  if (process.env.NODE_ENV !== 'production') {
    // Use polling in development
    bot.start();
    console.log('Bot started with polling');
  }
});

// Error handling
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`, err.error);
});

process.on('SIGINT', async () => {
  await bot.stop();
  process.exit(0);
});

