import { Bot } from 'grammy';
import { startHandler } from './start.js';
import { walletHandler } from './wallet.js';
import { balanceHandler } from './balance.js';
import { helpHandler } from './help.js';
import { settingsHandler } from './settings.js';
import { guardiansHandler, addGuardianHandler, removeGuardianHandler } from './guardians.js';
import { securityHandler } from './security.js';

export function setupCommandHandlers(bot: Bot) {
  // Basic commands
  bot.command('start', startHandler);
  bot.command('help', helpHandler);
  bot.command('wallet', walletHandler);
  bot.command('balance', balanceHandler);
  bot.command('settings', settingsHandler);
  
  // Guardian commands
  bot.command('guardians', guardiansHandler);
  bot.command('add_guardian', addGuardianHandler);
  bot.command('remove_guardian', removeGuardianHandler);
  
  // Security commands
  bot.command('security', securityHandler);
  
  // Handle inline button callbacks
  bot.callbackQuery(/^action:(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    await ctx.answerCallbackQuery();
    
    switch (action) {
      case 'open_wallet':
        await walletHandler(ctx);
        break;
      case 'show_balance':
        await balanceHandler(ctx);
        break;
      case 'send':
        await ctx.reply('Send functionality - Opening mini app...', {
          reply_markup: {
            inline_keyboard: [[
              { text: 'Open Wallet', web_app: { url: process.env.MINI_APP_URL || 'https://example.com' } }
            ]]
          }
        });
        break;
      case 'receive':
        await ctx.reply('Receive functionality - Opening mini app...', {
          reply_markup: {
            inline_keyboard: [[
              { text: 'Open Wallet', web_app: { url: process.env.MINI_APP_URL || 'https://example.com' } }
            ]]
          }
        });
        break;
      default:
        await ctx.reply('Unknown action');
    }
  });
}

