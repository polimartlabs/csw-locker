import { Context } from 'grammy';
import { getUserByTelegramId, createUser } from '../../db/users.js';

export async function startHandler(ctx: Context) {
  const telegramId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'User';
  
  if (!telegramId) {
    await ctx.reply('Error: Could not identify user');
    return;
  }
  
  // Check if user exists, create if not
  let user = await getUserByTelegramId(telegramId);
  if (!user) {
    user = await createUser({
      telegramId,
      username,
      createdAt: new Date().toISOString()
    });
  }
  
  const welcomeMessage = `
👋 Welcome to Bitcoin Locker, ${username}!

Secure, recoverable, automated smart wallets for Stacks blockchain.

🔐 *Key Features:*
• Smart wallet creation
• Guardian-based recovery
• Transaction protection
• Automated savings (DCA)

Get started by creating your first wallet or connecting an existing one.

Use /help to see all available commands.
  `;
  
  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🚀 Create Wallet', callback_data: 'action:create_wallet' },
          { text: '💼 Open Wallet', callback_data: 'action:open_wallet' }
        ],
        [
          { text: '📊 View Balance', callback_data: 'action:show_balance' },
          { text: '⚙️ Settings', callback_data: 'action:settings' }
        ],
        [
          { text: '📱 Open Mini App', web_app: { url: process.env.MINI_APP_URL || 'https://example.com' } }
        ]
      ]
    }
  });
}

