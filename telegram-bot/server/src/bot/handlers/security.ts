import { Context } from 'grammy';
import { getUserByTelegramId } from '../../db/users.js';
import { getUserWallets } from '../../db/wallets.js';
import { getSecurityLevel } from '../../services/stacks.js';

export async function securityHandler(ctx: Context) {
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
  
  const wallet = wallets[0];
  
  try {
    const securityLevel = await getSecurityLevel(wallet.contractAddress);
    
    const levelNames = ['No Rules', 'Standard Rules', 'Emergency (Frozen)'];
    const levelName = levelNames[securityLevel] || 'Unknown';
    
    await ctx.reply(`
🔐 *Security Settings*

*${wallet.name || 'Wallet'}*
Address: \`${wallet.contractAddress}\`

*Current Status:*
• Security Level: ${securityLevel} (${levelName})
• Spending Limits: Enabled
• Guardian Recovery: Enabled

*Available Actions:*
• Set spending limits
• Configure withdrawal delays
• Freeze wallet (emergency)

For detailed security configuration, open the mini app.
    `, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '❄️ Freeze Wallet', callback_data: 'action:freeze_wallet' }
          ],
          [
            { text: '📱 Open Mini App', web_app: { url: `${process.env.MINI_APP_URL}/settings/security` } }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    await ctx.reply('Error fetching security settings. Please try again later.');
  }
}

