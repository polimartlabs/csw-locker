# Bot Server Setup Instructions

## Quick Setup

Your Telegram Bot Token has been configured. To set it up:

1. Create a `.env` file in the `server/` directory:
   ```bash
   cd telegram-bot/server
   ```

2. Create `.env` file with the following content:
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

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Run the bot:
   ```bash
   pnpm dev
   ```

## Security Note

⚠️ **IMPORTANT**: The `.env` file should NEVER be committed to git. Make sure it's in `.gitignore`.

Your bot token is: `8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus`

## Testing

Once the bot is running, you can test it:
1. Find your bot on Telegram (search for the bot username you set in BotFather)
2. Send `/start` command
3. The bot should respond with a welcome message

## Next Steps

1. Set up your mini app URL in `MINI_APP_URL`
2. Configure webhook URL when deploying to production
3. Test all bot commands

