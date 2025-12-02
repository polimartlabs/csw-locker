@echo off
REM Installation script with retry logic for Windows

echo 🚀 Installing Bitcoin Locker Telegram Bot dependencies...

REM Install root dependencies
echo 📦 Installing root dependencies...
:retry_root
pnpm install --fetch-timeout=120000
if %errorlevel% neq 0 (
    echo ⚠️  Installation failed. Retrying...
    timeout /t 5 /nobreak >nul
    goto retry_root
)
echo ✅ Root dependencies installed!

REM Install server dependencies
echo 📦 Installing server dependencies...
cd server
:retry_server
pnpm install --fetch-timeout=120000
if %errorlevel% neq 0 (
    echo ⚠️  Installation failed. Retrying...
    timeout /t 5 /nobreak >nul
    goto retry_server
)
cd ..
echo ✅ Server dependencies installed!

REM Install mini-app dependencies
echo 📦 Installing mini-app dependencies...
cd mini-app
:retry_miniapp
pnpm install --fetch-timeout=120000
if %errorlevel% neq 0 (
    echo ⚠️  Installation failed. Retrying...
    timeout /t 5 /nobreak >nul
    goto retry_miniapp
)
cd ..
echo ✅ Mini-app dependencies installed!

REM Install shared dependencies
echo 📦 Installing shared dependencies...
cd shared
:retry_shared
pnpm install --fetch-timeout=120000
if %errorlevel% neq 0 (
    echo ⚠️  Installation failed. Retrying...
    timeout /t 5 /nobreak >nul
    goto retry_shared
)
cd ..
echo ✅ Shared dependencies installed!

echo.
echo ✅ All dependencies installed successfully!
pause

