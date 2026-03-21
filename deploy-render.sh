#!/bin/bash

# HyperChain Render Deployment Script
# This script helps you deploy to Render quickly

echo "🎨 HyperChain Render Deployment Helper"
echo "======================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - Ready for Render deployment"
    echo "✅ Git initialized"
else
    echo "✅ Git repository already initialized"
fi

echo ""
echo "📋 Pre-deployment Checklist:"
echo ""
echo "1. ✅ Render configuration files created"
echo "2. ⏳ Push code to GitHub"
echo "3. ⏳ Create Render web service"
echo "4. ⏳ Set environment variables"
echo "5. ⏳ Deploy!"
echo ""

# Check if code is committed
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes"
    echo ""
    echo "Would you like to commit them now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        git add .
        echo "Enter commit message:"
        read -r commit_msg
        git commit -m "$commit_msg"
        echo "✅ Changes committed"
    fi
fi

echo ""
echo "📤 Ready to push to GitHub?"
echo ""
echo "Make sure you have:"
echo "  1. Created a GitHub repository"
echo "  2. Added it as remote: git remote add origin <url>"
echo ""
echo "Push now? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "Pushing to GitHub..."
    git push origin main || git push origin master
    echo ""
    echo "✅ Code pushed to GitHub!"
fi

echo ""
echo "🎨 Next Steps for Render Deployment:"
echo ""
echo "1. Go to: https://dashboard.render.com"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Configure:"
echo "   - Build Command: npm install && npm run build"
echo "   - Start Command: npm start"
echo "   - Plan: Free"
echo "5. Add environment variables (see .env.render)"
echo "6. Click 'Create Web Service'"
echo ""
echo "📖 For detailed instructions, see: RENDER_DEPLOYMENT.md"
echo "📋 For quick reference, see: RENDER_QUICK_REF.md"
echo ""
echo "🔑 Generate encryption key:"
echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""
echo "⏱️  Total deployment time: ~20 minutes"
echo ""
echo "🎉 Good luck with your deployment!"
echo ""
