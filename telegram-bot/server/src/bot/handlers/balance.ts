import { Context } from 'grammy';
import { getUserWallets } from '../../db/wallets.js';
import { getUserByTelegramId } from '../../db/users.js';
import { getWalletBalance } from '../../services/stacks.js';

export async function balanceHandler(ctx: Context) {
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
    await ctx.reply('You don\'t have any wallets yet. Use /wallet to create one.');
    return;
  }
  
  // Get balance for the first wallet (or selected wallet)
  const wallet = wallets[0];
  try {
    const balance = await getWalletBalance(wallet.contractAddress);
    
    await ctx.reply(`
📊 *Wallet Balance*

*${wallet.name || 'Wallet'}*
Address: \`${wallet.contractAddress}\`

💰 *Balances:*
• STX: ${balance.stx} STX
• USD: ~$${balance.usd}

${wallets.length > 1 ? `\n_You have ${wallets.length} wallets. Open mini app to switch._` : ''}
    `, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Refresh', callback_data: 'action:show_balance' }
          ],
          [
            { text: '📱 Open Mini App', web_app: { url: process.env.MINI_APP_URL || 'https://example.com' } }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    await ctx.reply('Error fetching balance. Please try again later.');
  }
}

