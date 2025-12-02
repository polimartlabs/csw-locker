import { Context } from 'grammy';
import { getUserWallets } from '../../db/wallets.js';
import { getUserByTelegramId } from '../../db/users.js';

export async function walletHandler(ctx: Context) {
  const telegramId = ctx.from?.id;
  
  if (!telegramId) {
    await ctx.reply('Error: Could not identify user');
    return;
  }
  
  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await ctx.reply('Please use /start to initialize your account first.');
    return;
  }
  
  const wallets = await getUserWallets(telegramId);
  
  if (wallets.length === 0) {
    await ctx.reply(`
💼 *Your Wallets*

You don't have any wallets yet.

Create your first smart wallet to get started!
    `, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🚀 Create Wallet', callback_data: 'action:create_wallet' }
          ],
          [
            { text: '📱 Open Mini App', web_app: { url: process.env.MINI_APP_URL || 'https://example.com' } }
          ]
        ]
      }
    });
    return;
  }
  
  let message = `💼 *Your Wallets*\n\n`;
  
  wallets.forEach((wallet, index) => {
    message += `${index + 1}. *${wallet.name || 'Wallet'}*\n`;
    message += `   Address: \`${wallet.contractAddress}\`\n`;
    message += `   Balance: ${wallet.balance || '0'} STX\n\n`;
  });
  
  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 View Balance', callback_data: 'action:show_balance' },
          { text: '📤 Send', callback_data: 'action:send' }
        ],
        [
          { text: '📥 Receive', callback_data: 'action:receive' },
          { text: '⚙️ Settings', callback_data: 'action:settings' }
        ],
        [
          { text: '📱 Open Mini App', web_app: { url: process.env.MINI_APP_URL || 'https://example.com' } }
        ]
      ]
    }
  });
}

