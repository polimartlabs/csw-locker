#!/bin/bash

# Quick installation with better error handling

set -e

echo "🚀 Installing Bitcoin Locker Telegram Bot..."

# Clear cache first
echo "🧹 Clearing pnpm cache..."
pnpm store prune || true

# Install with retries
install_package() {
    local dir=$1
    local name=$2
    
    echo "📦 Installing $name dependencies..."
    cd "$dir"
    
    local attempts=0
    local max_attempts=3
    
    while [ $attempts -lt $max_attempts ]; do
        if pnpm install; then
            echo "✅ $name dependencies installed successfully!"
            cd ..
            return 0
        else
            attempts=$((attempts + 1))
            if [ $attempts -lt $max_attempts ]; then
                echo "⚠️  Attempt $attempts failed. Retrying in 5 seconds..."
                sleep 5
            fi
        fi
    done
    
    echo "❌ Failed to install $name dependencies after $max_attempts attempts"
    cd ..
    return 1
}

# Root
echo "📦 Installing root dependencies..."
pnpm install || echo "⚠️  Root install had warnings, continuing..."

# Server
install_package "server" "Server"

# Mini-app  
install_package "mini-app" "Mini-app"

# Shared
install_package "shared" "Shared"

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Run setup script: cd server && ./setup.sh"
echo "2. Start the bot: cd server && pnpm dev"

