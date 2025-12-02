import { Context } from 'grammy';

export async function helpHandler(ctx: Context) {
  const helpMessage = `
📖 *Bitcoin Locker Bot Commands*

*Basic Commands:*
/start - Start the bot and initialize your account
/wallet - View your wallets
/balance - Check wallet balance
/help - Show this help message
/settings - Configure wallet settings

*Guardian Commands:*
/guardians - List your guardians (recovery contacts)
/add_guardian <address> - Add a guardian
/remove_guardian <address> - Remove a guardian

*Security Commands:*
/security - Configure security settings
/freeze - Freeze wallet (emergency mode)

*Features:*
• Smart wallet creation
• Send/Receive STX and tokens
• Guardian-based recovery
• Transaction protection
• Automated savings

📱 Use the mini app for full features and better UI.

Need more help? Open the mini app or visit our documentation.
  `;
  
  await ctx.reply(helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '📱 Open Mini App', web_app: { url: process.env.MINI_APP_URL || 'https://example.com' } }
      ]]
    }
  });
}

