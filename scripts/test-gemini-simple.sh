#!/bin/bash

# Simple Gemini API Test
# Quick test to see if API key works and what models are available

source .env.local 2>/dev/null || true
API_KEY="${VITE_GEMINI_API_KEY}"

if [ -z "$API_KEY" ]; then
  echo "❌ VITE_GEMINI_API_KEY not found in .env.local"
  exit 1
fi

echo "Testing Gemini API..."
echo ""

# List models
echo "Available models:"
curl -s "https://generativelanguage.googleapis.com/v1/models?key=$API_KEY" | \
  jq -r '.models[]?.name' 2>/dev/null | \
  sed 's|models/||' | \
  head -10

echo ""
echo "Testing model access..."

# Try a simple test with different models (prioritize 2.5/2.0)
for model in "gemini-2.5-flash" "gemini-2.5-pro" "gemini-2.0-flash" "gemini-1.5-flash" "gemini-1.5-pro" "gemini-pro"; do
  echo -n "Testing $model... "
  RESPONSE=$(curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1/models/$model:generateContent?key=$API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Hi"}]}]}')
  
  if echo "$RESPONSE" | grep -q "error"; then
    ERROR=$(echo "$RESPONSE" | jq -r '.error.message' 2>/dev/null)
    echo "❌ $ERROR"
  else
    TEXT=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].text' 2>/dev/null)
    echo "✅ Works! Response: $TEXT"
    echo ""
    echo "✅ Recommended model: $model"
    break
  fi
done

