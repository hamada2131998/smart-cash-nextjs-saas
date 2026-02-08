#!/bin/bash

# Smart Cash & Custody SaaS - Quick Start Script
# هذا السكريبت يساعد في الإعداد الأولي للمشروع

echo "========================================="
echo "Smart Cash & Custody SaaS Setup"
echo "========================================="
echo ""

# Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "   ✓ Node.js $NODE_VERSION installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "   ✓ Dependencies installed"
echo ""

# Check .env.local
echo "🔧 Checking environment variables..."
if [ ! -f .env.local ]; then
    echo "   Creating .env.local from .env.local.example..."
    cp .env.local.example .env.local
    echo "   ✓ .env.local created"
    echo ""
    echo "⚠️  IMPORTANT: Please update .env.local with your Supabase credentials:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "   Get these from: https://supabase.com/dashboard/project/_/settings/api"
    echo ""
    read -p "Press Enter after updating .env.local..."
else
    echo "   ✓ .env.local exists"
fi
echo ""

# Instructions for Supabase setup
echo "========================================="
echo "🗄️  Supabase Setup Instructions"
echo "========================================="
echo ""
echo "1. Create a new project at https://supabase.com"
echo ""
echo "2. Run the SQL migration:"
echo "   - Go to SQL Editor in Supabase Dashboard"
echo "   - Open file: supabase/migrations/010_saas_production_patch.sql"
echo "   - Copy all content and paste it into SQL Editor"
echo "   - Click 'Run'"
echo ""
echo "3. Enable Email Auth (if not already enabled):"
echo "   - Go to Authentication → Providers → Email"
echo "   - Make sure Email provider is enabled"
echo "   - (Optional) Enable 'Confirm email' for production"
echo ""
echo "4. Storage bucket will be created automatically by the migration."
echo ""
echo "========================================="
echo ""

# Start development server
echo "🚀 Starting development server..."
echo ""
echo "   Open http://localhost:3000 in your browser"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""
npm run dev
