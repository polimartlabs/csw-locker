@echo off
REM Bitcoin Locker Telegram Bot Setup Script for Windows

echo 🔧 Setting up Bitcoin Locker Telegram Bot...

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    (
        echo # Telegram Bot Configuration
        echo TELEGRAM_BOT_TOKEN=8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus
        echo TELEGRAM_WEBHOOK_URL=
        echo.
        echo # Server Configuration
        echo PORT=3000
        echo NODE_ENV=development
        echo.
        echo # Stacks Network Configuration
        echo STACKS_NETWORK=testnet
        echo STACKS_API_URL=https://api.testnet.hiro.so
        echo STACKS_EXPLORER_URL=https://explorer.stacks.co
        echo.
        echo # Database Configuration
        echo DATABASE_PATH=./data/bot.db
        echo.
        echo # Mini App Configuration
        echo MINI_APP_URL=http://localhost:5173
    ) > .env
    echo ✅ .env file created with bot token configured!
) else (
    echo ⚠️  .env file already exists. Skipping creation.
    echo    Your bot token is: 8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus
    echo    Make sure it's set in your .env file as TELEGRAM_BOT_TOKEN
)

REM Create data directory (always ensure it exists)
echo 📁 Ensuring data directory exists...
if not exist data mkdir data
echo ✅ Data directory ready!

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Install dependencies: pnpm install
echo 2. Start the bot: pnpm dev
echo.
echo Your bot token is configured: 8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus

pause

