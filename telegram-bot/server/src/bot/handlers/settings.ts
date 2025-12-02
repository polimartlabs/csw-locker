import { Context } from 'grammy';

export async function settingsHandler(ctx: Context) {
  await ctx.reply(`
⚙️ *Wallet Settings*

Configure your wallet preferences and security settings.

*Available Settings:*
• Security rules
• Spending limits
• Guardian management
• Automation preferences

For detailed settings, open the mini app.
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔐 Security', callback_data: 'action:security' },
          { text: '👥 Guardians', callback_data: 'action:guardians' }
        ],
        [
          { text: '📱 Open Mini App', web_app: { url: process.env.MINI_APP_URL || 'https://example.com' } }
        ]
      ]
    }
  });
}

