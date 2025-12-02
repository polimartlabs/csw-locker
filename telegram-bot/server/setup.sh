#!/bin/bash

# Bitcoin Locker Telegram Bot Setup Script

echo "🔧 Setting up Bitcoin Locker Telegram Bot..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus
TELEGRAM_WEBHOOK_URL=

# Server Configuration
PORT=3000
NODE_ENV=development

# Stacks Network Configuration
STACKS_NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so
STACKS_EXPLORER_URL=https://explorer.stacks.co

# Database Configuration
DATABASE_PATH=./data/bot.db

# Mini App Configuration
MINI_APP_URL=http://localhost:5173
EOF
    echo "✅ .env file created with bot token configured!"
else
    echo "⚠️  .env file already exists. Skipping creation."
    echo "   Your bot token is: 8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus"
    echo "   Make sure it's set in your .env file as TELEGRAM_BOT_TOKEN"
fi

# Create data directory (always ensure it exists)
echo "📁 Ensuring data directory exists..."
mkdir -p data
echo "✅ Data directory ready!"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: pnpm install"
echo "2. Start the bot: pnpm dev"
echo ""
echo "Your bot token is configured: 8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus"

