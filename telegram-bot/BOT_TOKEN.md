# Telegram Bot Token Configuration

## Bot Token

Your Telegram Bot API Token has been configured:

```
8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus
```

## Setup Instructions

### Automatic Setup (Recommended)

Run the setup script in the `server/` directory:

**Windows:**
```bash
cd telegram-bot/server
setup.bat
```

**Linux/Mac:**
```bash
cd telegram-bot/server
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. Navigate to the server directory:
   ```bash
   cd telegram-bot/server
   ```

2. Create a `.env` file with the following content:
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

## Security Warning

⚠️ **IMPORTANT**: 
- Never commit the `.env` file to git
- Never share your bot token publicly
- If your token is compromised, revoke it immediately via [@BotFather](https://t.me/botfather)

The `.env` file is already in `.gitignore`, so it won't be committed accidentally.

## Testing Your Bot

Once configured:

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the bot:
   ```bash
   pnpm dev
   ```

3. Find your bot on Telegram and send `/start`

## Bot Management

- View bot info: [@BotFather](https://t.me/botfather) → `/mybots`
- Revoke token: [@BotFather](https://t.me/botfather) → Select your bot → API Token → Revoke current token
- Set menu button: [@BotFather](https://t.me/botfather) → `/setmenubutton` → Select bot → Set URL

