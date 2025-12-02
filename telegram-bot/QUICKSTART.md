# Quick Start Guide

## Your Bot Token is Ready! 🎉

Your Telegram Bot API Token has been configured:
```
8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus
```

## Setup Steps

### 1. Configure the Bot Server

Navigate to the server directory and run the setup script:

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

This will create a `.env` file with your bot token already configured.

### 2. Install Dependencies

From the root directory:
```bash
pnpm install
```

Or install individually:
```bash
# Server dependencies
cd telegram-bot/server
pnpm install

# Mini app dependencies
cd ../mini-app
pnpm install

# Shared dependencies
cd ../shared
pnpm install
```

### 3. Start the Bot

From the server directory:
```bash
cd telegram-bot/server
pnpm dev
```

You should see:
```
Server running on port 3000
Bot started with polling
```

### 4. Test Your Bot

1. Open Telegram
2. Search for your bot (the username you set in BotFather)
3. Send `/start`
4. The bot should respond with a welcome message!

### 5. Start the Mini App (Optional for development)

In a new terminal:
```bash
cd telegram-bot/mini-app
pnpm dev
```

The mini app will be available at `http://localhost:5173`

## What's Next?

- Test all bot commands (`/wallet`, `/balance`, `/help`)
- Configure your mini app URL when ready
- Set up webhook for production deployment
- See `DEPLOYMENT.md` for production setup

## Troubleshooting

**Bot not responding?**
- Check that the bot token is correct in `.env`
- Verify the server is running without errors
- Make sure you're messaging the correct bot

**Database errors?**
- The `data/` directory will be created automatically
- Check file permissions if issues persist

**Need help?**
- Check `BOT_TOKEN.md` for token management
- See `DEPLOYMENT.md` for production setup
- Review individual README files in each directory

## Security Reminder

⚠️ Your bot token is sensitive. Never:
- Commit `.env` files to git (already in `.gitignore`)
- Share your token publicly
- Commit setup scripts with tokens (they're for reference only)

If your token is compromised, revoke it immediately via [@BotFather](https://t.me/botfather).

