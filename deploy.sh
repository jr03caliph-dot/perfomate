#!/bin/bash

# Quick deployment script for Performate
# This script helps you deploy to various platforms

echo "🚀 Performate Deployment Helper"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo "Please create a .env file with:"
    echo ""
    echo "VITE_SUPABASE_URL=your_supabase_url"
    echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo ""
    read -p "Press Enter to continue anyway..."
fi

echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "Choose deployment option:"
echo "1. Vercel"
echo "2. Netlify"
echo "3. Preview locally"
echo "4. Just build (no deploy)"
echo ""
read -p "Enter option (1-4): " option

case $option in
    1)
        echo "🚀 Deploying to Vercel..."
        if command -v vercel &> /dev/null; then
            vercel --prod
        else
            echo "Vercel CLI not found. Install with: npm i -g vercel"
            echo "Or visit: https://vercel.com/new"
        fi
        ;;
    2)
        echo "🚀 Deploying to Netlify..."
        if command -v netlify &> /dev/null; then
            netlify deploy --prod
        else
            echo "Netlify CLI not found. Install with: npm i -g netlify-cli"
            echo "Or visit: https://app.netlify.com/drop"
        fi
        ;;
    3)
        echo "👀 Starting preview server..."
        npm run preview
        ;;
    4)
        echo "✅ Build complete! Files are in the 'dist' folder."
        echo "You can deploy manually by uploading the 'dist' folder to your hosting platform."
        ;;
    *)
        echo "Invalid option"
        ;;
esac

