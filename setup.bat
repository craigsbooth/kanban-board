@echo off
REM Ten10 Project Management - Setup Script for Windows
REM This script sets up the application for local development

echo ========================================
echo Setting up Ten10 Project Management...
echo ========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detected

REM Kill any existing processes on ports 3001 and 5173
echo [INFO] Checking for existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Cleared existing processes

REM Install dependencies
echo [INFO] Installing dependencies...
call npm install

REM Fix security vulnerabilities
echo [INFO] Fixing security vulnerabilities...
call npm audit fix --force >nul 2>&1

REM Set up environment files
echo [INFO] Setting up environment files...

REM Backend environment
if not exist "packages\backend\.env" (
    copy "packages\backend\.env.example" "packages\backend\.env"
    echo [OK] Created backend .env file
) else (
    echo [WARN] Backend .env file already exists
)

REM Frontend environment
if not exist "packages\frontend\.env" (
    if exist "packages\frontend\.env.example" (
        copy "packages\frontend\.env.example" "packages\frontend\.env"
        echo [OK] Created frontend .env file
    ) else (
        echo VITE_API_URL=http://localhost:3001/api > "packages\frontend\.env"
        echo [OK] Created frontend .env file
    )
) else (
    echo [WARN] Frontend .env file already exists
)

REM Set up database
echo [INFO] Setting up database...
cd packages\backend

REM Clean up any existing Prisma client
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma" >nul 2>&1
)

REM Generate Prisma client with retry
echo [INFO] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [WARN] Prisma generate failed, retrying...
    timeout /t 2 /nobreak >nul
    call npx prisma generate
)

REM Push database schema
echo [INFO] Pushing database schema...
call npx prisma db push

echo [OK] Database setup complete

cd ..\..

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo The application is ready to run!
echo.
echo Available commands:
echo    npm run dev      - Start both frontend and backend
echo    npm run build    - Build for production
echo    npm run test     - Run tests
echo    npm run lint     - Lint code
echo.
echo NOTE: Configure your database URL in packages\backend\.env
echo.

REM Ask user if they want to start the application
set /p START_APP="Would you like to start the application now? (Y/N): "
if /i "%START_APP%"=="Y" (
    echo.
    echo [INFO] Starting the application...
    echo [INFO] Opening browser to http://localhost:5173
    echo.
    echo Press Ctrl+C to stop the servers when you're done.
    echo.
    timeout /t 3 /nobreak >nul
    start http://localhost:5173
    call npm run dev
) else (
    echo.
    echo To start the application later, run: npm run dev
    echo Then open your browser to: http://localhost:5173
    echo.
    pause
)
