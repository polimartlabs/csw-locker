# Bitcoin Locker Telegram Mini App

React-based Telegram Mini App for Bitcoin Locker smart wallets.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run development server:
   ```bash
   pnpm dev
   ```

3. Build for production:
   ```bash
   pnpm build
   ```

## Configuration

Set up your mini app in [@BotFather](https://t.me/botfather):
1. Create a bot
2. Go to Bot Settings → Menu Button
3. Set the menu button URL to your deployed mini app URL

## Development

For local development, you can use Telegram's test mode or test directly in Telegram Desktop/Web.

## Deployment

Deploy the `dist` folder to a static hosting service:
- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages

Make sure to set the correct URL in your bot's webhook configuration.

