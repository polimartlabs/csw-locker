#!/bin/bash

# Installation script with retry logic

echo "🚀 Installing Bitcoin Locker Telegram Bot dependencies..."

# Function to install with retries
install_with_retry() {
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt of $max_attempts..."
        
        if pnpm install --fetch-timeout=120000; then
            echo "✅ Installation successful!"
            return 0
        else
            echo "⚠️  Installation failed. Retrying..."
            sleep 5
            attempt=$((attempt + 1))
        fi
    done
    
    echo "❌ Installation failed after $max_attempts attempts"
    return 1
}

# Install root dependencies
echo "📦 Installing root dependencies..."
install_with_retry

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
install_with_retry
cd ..

# Install mini-app dependencies
echo "📦 Installing mini-app dependencies..."
cd mini-app
install_with_retry
cd ..

# Install shared dependencies
echo "📦 Installing shared dependencies..."
cd shared
install_with_retry
cd ..

echo "✅ All dependencies installed successfully!"

