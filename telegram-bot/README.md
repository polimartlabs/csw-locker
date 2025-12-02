# Bitcoin Locker Telegram Bot & Mini App

Telegram-first interface for Bitcoin Locker smart contracts on Stacks blockchain.

## Project Structure

- `server/` - Telegram bot backend (Node.js/TypeScript)
- `mini-app/` - Telegram Mini App (React/TypeScript)
- `shared/` - Shared utilities for Stacks contract interaction

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Telegram Bot Token from [@BotFather](https://t.me/botfather)
- Stacks network configuration (testnet/mainnet)

### Installation

```bash
pnpm install
```

### Environment Setup

1. Copy `.env.example` to `.env` in both `server/` and `mini-app/`
2. Configure your Telegram bot token and other settings

### Development

```bash
# Start bot server
pnpm dev:bot

# Start mini app
pnpm dev:app
```

## Features

- Wallet creation and management
- Send/receive STX and tokens
- Guardian-based recovery system
- Transaction protection (spending limits, delays)
- Automated savings (DCA)
- Telegram-first UX

## Documentation

See the main [README.md](../README.md) for more information about Bitcoin Locker.

