#!/bin/bash

# Ten10 Project Management - Setup Script
# This script sets up the application for local development

set -e

echo "========================================"
echo "Setting up Ten10 Project Management..."
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[ERROR] Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "[OK] Node.js $(node -v) detected"

# Kill any existing processes on ports 3001 and 5173
echo "[INFO] Checking for existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
echo "[OK] Cleared existing processes"

# Install dependencies
echo "[INFO] Installing dependencies..."
npm install

# Fix security vulnerabilities
echo "[INFO] Fixing security vulnerabilities..."
npm audit fix --force >/dev/null 2>&1 || true

# Set up environment files
echo "[INFO] Setting up environment files..."

# Backend environment
if [ ! -f "packages/backend/.env" ]; then
    cp packages/backend/.env.example packages/backend/.env
    echo "[OK] Created backend .env file"
else
    echo "[WARN] Backend .env file already exists"
fi

# Frontend environment
if [ ! -f "packages/frontend/.env" ]; then
    if [ -f "packages/frontend/.env.example" ]; then
        cp packages/frontend/.env.example packages/frontend/.env
        echo "[OK] Created frontend .env file"
    else
        # Create a basic frontend .env file
        cat > packages/frontend/.env << EOF
VITE_API_URL=http://localhost:3001/api
EOF
        echo "[OK] Created frontend .env file"
    fi
else
    echo "[WARN] Frontend .env file already exists"
fi

# Set up database
echo "[INFO] Setting up database..."
cd packages/backend

# Clean up any existing Prisma client
rm -rf node_modules/.prisma 2>/dev/null || true

# Generate Prisma client with retry
echo "[INFO] Generating Prisma client..."
npx prisma generate || {
    echo "[WARN] Prisma generate failed, retrying..."
    sleep 2
    npx prisma generate
}

# Push database schema
echo "[INFO] Pushing database schema..."
npx prisma db push

echo "[OK] Database setup complete"

cd ../..

echo ""
echo "========================================"
echo "Setup complete!"
echo "========================================"
echo ""
echo "The application is ready to run!"
echo ""
echo "Available commands:"
echo "   npm run dev      - Start both frontend and backend"
echo "   npm run build    - Build for production"
echo "   npm run test     - Run tests"
echo "   npm run lint     - Lint code"
echo ""
echo "NOTE: Make sure to configure your database URL in packages/backend/.env"
echo "   The default uses the Neon PostgreSQL database from the example."
echo ""

# Ask user if they want to start the application
read -p "Would you like to start the application now? (Y/N): " START_APP
if [[ "$START_APP" =~ ^[Yy]$ ]]; then
    echo ""
    echo "[INFO] Starting the application..."
    echo "[INFO] Opening browser to http://localhost:5173"
    echo ""
    echo "Press Ctrl+C to stop the servers when you're done."
    echo ""
    sleep 3
    
    # Open browser based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open http://localhost:5173
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open http://localhost:5173 2>/dev/null || echo "[WARN] Could not open browser automatically"
    fi
    
    npm run dev
else
    echo ""
    echo "To start the application later, run: npm run dev"
    echo "Then open your browser to: http://localhost:5173"
    echo ""
fi
