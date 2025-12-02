# Bitcoin Locker Telegram Bot Server

Backend server for the Bitcoin Locker Telegram bot.

## Quick Start

Your bot token is already configured! See `BOT_TOKEN.md` in the parent directory for details.

### Automatic Setup

Run the setup script to create your `.env` file automatically:

**Windows:**
```bash
setup.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. Create a `.env` file in this directory:
   ```env
   TELEGRAM_BOT_TOKEN=8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus
   TELEGRAM_WEBHOOK_URL=
   PORT=3000
   NODE_ENV=development
   STACKS_NETWORK=testnet
   STACKS_API_URL=https://api.testnet.hiro.so
   STACKS_EXPLORER_URL=https://explorer.stacks.co
   DATABASE_PATH=./data/bot.db
   MINI_APP_URL=http://localhost:5173
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run in development:
   ```bash
   pnpm dev
   ```

## Configuration

- `TELEGRAM_BOT_TOKEN` - Your bot token (already configured)
- `STACKS_NETWORK` - `testnet` or `mainnet`
- `MINI_APP_URL` - URL of your deployed mini app

## Database

Uses SQLite by default. Database file will be created at `data/bot.db`.

## Deployment

For production, set up webhooks instead of polling:

1. Deploy your server with a public URL
2. Set `TELEGRAM_WEBHOOK_URL` in environment variables
3. Set `NODE_ENV=production`

The bot will automatically set the webhook on startup.

