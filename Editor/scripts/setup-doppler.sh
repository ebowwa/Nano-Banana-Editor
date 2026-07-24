#!/bin/bash

echo "Setting up Doppler for Nano Banana Editor"
echo "=========================================="
echo ""

# Check if Doppler is installed
if ! command -v doppler &> /dev/null; then
    echo "Doppler CLI is not installed. Please install it first:"
    echo "  brew install dopplerhq/cli/doppler"
    exit 1
fi

echo "Step 1: Login to Doppler"
echo "------------------------"
doppler login

echo ""
echo "Step 2: Setup project"
echo "--------------------"
doppler setup

echo ""
echo "Step 3: Set your secrets"
echo "------------------------"
echo "You can set secrets using:"
echo "  doppler secrets set GEMINI_API_KEY"
echo "  doppler secrets set GOOGLE_CLIENT_ID"
echo "  doppler secrets set API_KEY"
echo ""
echo "Or open the Doppler dashboard:"
doppler open

echo ""
echo "Step 4: Test configuration"
echo "--------------------------"
echo "Your current secrets:"
doppler secrets

echo ""
echo "Setup complete! You can now run 'npm run dev' and Doppler will provide your secrets."
echo "To run with Doppler explicitly: doppler run -- npm run dev"