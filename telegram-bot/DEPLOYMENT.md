# Deployment Guide

## Overview

The Bitcoin Locker Telegram Bot consists of:
1. **Bot Server** - Backend that handles Telegram bot commands
2. **Mini App** - Frontend React app served inside Telegram
3. **Database** - SQLite database (or PostgreSQL in production)

## Prerequisites

- Node.js 18+
- pnpm (or npm)
- Telegram Bot Token from [@BotFather](https://t.me/botfather)
- Public domain/server for hosting

## Step 1: Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command
3. Follow prompts to create bot and get token
4. Use `/setmenubutton` to set your mini app URL

## Step 2: Deploy Mini App

### Option A: Netlify

1. Build the mini app:
   ```bash
   cd mini-app
   pnpm build
   ```

2. Deploy `dist` folder to Netlify
3. Get your Netlify URL (e.g., `https://your-app.netlify.app`)

### Option B: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. In `mini-app` directory: `vercel`
3. Follow prompts and get deployment URL

## Step 3: Deploy Bot Server

### Option A: Railway

1. Create Railway account
2. Create new project
3. Connect GitHub repo or deploy directly
4. Set environment variables:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_URL` (your Railway URL)
   - `MINI_APP_URL` (your mini app URL)
   - `STACKS_NETWORK`
   - `NODE_ENV=production`

### Option B: Render

1. Create Render account
2. Create new Web Service
3. Connect repo and set:
   - Build Command: `cd server && pnpm install && pnpm build`
   - Start Command: `cd server && pnpm start`
4. Set environment variables (same as above)

## Step 4: Configure Webhook

Once server is deployed, the webhook will be automatically set. Verify:

1. Check server logs for webhook confirmation
2. Test bot with `/start` command

## Environment Variables

### Bot Server

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-server.com
MINI_APP_URL=https://your-miniapp.com
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so
NODE_ENV=production
PORT=3000
DATABASE_PATH=./data/bot.db
```

### Mini App

```env
VITE_BOT_API_URL=https://your-server.com
VITE_STACKS_NETWORK=testnet
```

## Testing

1. Send `/start` to your bot
2. Click "Open Mini App" button
3. Test wallet creation and operations

## Troubleshooting

- **Webhook not working**: Check server URL is accessible and SSL is valid
- **Mini app not loading**: Verify URL in BotFather menu button settings
- **Database errors**: Check file permissions and database path

## Security Notes

- Never commit `.env` files
- Use environment variables in production
- Rotate bot token if compromised
- Use HTTPS for all endpoints

