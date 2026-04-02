#!/bin/bash
set -e

echo "🚀 Mission Control Setup"
echo "========================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Install it from: https://nodejs.org"
    echo "   Or on Mac: brew install node"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. You have: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✓ npm $(npm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create data directory
echo ""
echo "💾 Initializing database..."
mkdir -p data
node scripts/init-db.js

echo ""
echo "========================"
echo "✅ Setup complete!"
echo ""
echo "Start with: npm run dev"
echo "Open:      http://localhost:3001"
