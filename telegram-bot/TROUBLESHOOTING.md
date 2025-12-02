# Troubleshooting Guide

## Installation Issues

### ECONNRESET Errors

If you're seeing connection reset errors during `pnpm install`:

```
ECONNRESET request to https://registry.npmjs.org/... failed
```

**Solutions:**

1. **Retry the installation:**
   ```bash
   pnpm install
   ```

2. **Clear pnpm cache:**
   ```bash
   pnpm store prune
   pnpm install
   ```

3. **Use a different registry (temporary):**
   ```bash
   pnpm install --registry https://registry.npmmirror.com
   ```

4. **Install with retries:**
   ```bash
   pnpm install --network-timeout=60000
   ```

5. **Install packages individually:**
   ```bash
   # Install server dependencies first
   cd telegram-bot/server
   pnpm install
   
   # Then mini-app
   cd ../mini-app
   pnpm install
   
   # Then shared
   cd ../shared
   pnpm install
   ```

6. **Check your network/firewall:**
   - Ensure npm registry is accessible
   - Check if VPN is causing issues
   - Try disabling firewall temporarily

### Deprecated Package Warnings

Warnings about deprecated subdependencies (like WalletConnect) are safe to ignore if they're transitive dependencies. They don't affect functionality.

Example:
```
WARN 2 deprecated subdependencies found: @walletconnect/sign-client@2.21.5
```

These are from `@stacks/connect` dependencies and don't need immediate action.

### Alternative: Use npm instead of pnpm

If pnpm continues to have issues:

```bash
# Install npm packages
cd telegram-bot/server
npm install

cd ../mini-app
npm install

cd ../shared
npm install
```

### Network Configuration

If you're behind a corporate proxy:

```bash
# Set proxy
pnpm config set proxy http://your-proxy:port
pnpm config set https-proxy http://your-proxy:port

# Or use environment variables
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
```

## Common Issues

### Bot Token Errors

**Error:** `TELEGRAM_BOT_TOKEN is required`

**Solution:**
1. Make sure you've run the setup script:
   ```bash
   cd telegram-bot/server
   setup.bat  # Windows
   # or
   ./setup.sh  # Linux/Mac
   ```

2. Or manually create `.env` file with:
   ```
   TELEGRAM_BOT_TOKEN=8478130428:AAHrc6jGHSwzgkC8LHj8zwqrPU7I4TRfOus
   ```

### Database Errors

**Error:** Database file not found or permission denied

**Solution:**
```bash
cd telegram-bot/server
mkdir -p data
chmod 755 data
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
1. Change port in `.env`:
   ```
   PORT=3001
   ```

2. Or kill the process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3000 | xargs kill
   ```

### TypeScript Errors

**Error:** Module not found or type errors

**Solution:**
```bash
# Rebuild shared package first
cd telegram-bot/shared
pnpm build

# Then rebuild others
cd ../server
pnpm build
```

### Mini App Not Loading in Telegram

**Issues:**
1. Make sure mini app URL is set in BotFather
2. URL must be HTTPS (or localhost for testing)
3. Check browser console for errors

**Solution:**
```bash
# For development, use ngrok to create HTTPS tunnel
ngrok http 5173

# Then set MINI_APP_URL in .env to the ngrok URL
```

## Getting Help

If issues persist:
1. Check server logs for detailed error messages
2. Verify all environment variables are set
3. Ensure Node.js version is 18+
4. Try fresh installation in a new directory

