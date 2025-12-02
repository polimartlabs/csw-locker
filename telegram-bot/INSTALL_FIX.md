# Installation Fix Guide

## Connection Reset Errors

If you're experiencing `ECONNRESET` errors during installation, try these solutions:

### Solution 1: Clear Cache and Retry (Recommended)

```bash
# Clear pnpm cache
pnpm store prune

# Retry installation
cd telegram-bot
pnpm install
```

### Solution 2: Install with Increased Timeout

```bash
cd telegram-bot/server
pnpm install --fetch-timeout=60000

cd ../mini-app
pnpm install --fetch-timeout=60000

cd ../shared
pnpm install --fetch-timeout=60000
```

### Solution 3: Install Packages One by One

If bulk installation fails, install individually:

```bash
cd telegram-bot/server
pnpm add grammy express dotenv better-sqlite3 zod
pnpm add -D typescript tsx @types/node @types/express @types/better-sqlite3 eslint
pnpm add @stacks/connect @stacks/network @stacks/transactions
```

### Solution 4: Use npm Instead

If pnpm continues to fail:

```bash
cd telegram-bot/server
npm install

cd ../mini-app
npm install

cd ../shared
npm install
```

### Solution 5: Check Network Connection

```bash
# Test npm registry connectivity
curl https://registry.npmjs.org/

# Or use ping
ping registry.npmjs.org
```

### Solution 6: Configure Registry Mirror (if in certain regions)

```bash
# Use alternative registry
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

## Deprecated Warnings

The warnings about deprecated WalletConnect packages are **safe to ignore**. They're transitive dependencies from `@stacks/connect` and don't affect functionality:

```
WARN 2 deprecated subdependencies found: @walletconnect/sign-client@2.21.5
```

These will be resolved when Stacks updates their dependencies.

## Quick Fix Script

Run this to clear cache and retry:

```bash
cd telegram-bot
pnpm store prune
pnpm install --no-frozen-lockfile
```

## Still Having Issues?

1. Check your internet connection
2. Disable VPN if active
3. Check firewall settings
4. Try from a different network
5. Contact your network administrator if behind corporate firewall

