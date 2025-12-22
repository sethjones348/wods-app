#!/bin/bash

# Test Gemini API Setup
# This script tests if your Gemini API key works and what models are available

echo "🔍 Testing Gemini API Setup..."
echo ""

# Load API key from .env.local
if [ -f .env.local ]; then
  source .env.local
  API_KEY="$VITE_GEMINI_API_KEY"
else
  echo "❌ .env.local file not found"
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "❌ VITE_GEMINI_API_KEY not set in .env.local"
  exit 1
fi

echo "✅ API Key found: ${API_KEY:0:10}..."
echo ""

# Test 1: List available models
echo "📋 Test 1: Listing available models..."
echo ""

MODELS_RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1/models?key=$API_KEY")

if echo "$MODELS_RESPONSE" | grep -q "error"; then
  echo "❌ Error listing models:"
  echo "$MODELS_RESPONSE" | jq '.' 2>/dev/null || echo "$MODELS_RESPONSE"
  exit 1
fi

echo "✅ Successfully connected to Gemini API!"
echo ""
echo "Available models:"
echo "$MODELS_RESPONSE" | jq -r '.models[]?.name' 2>/dev/null | sed 's|models/||' | head -10
echo ""

# Test 2: Simple text generation test
echo "📝 Test 2: Testing simple text generation..."
echo ""

TEXT_TEST=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=$API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Say hello in one word"
      }]
    }]
  }')

if echo "$TEXT_TEST" | grep -q "error"; then
  echo "❌ Error with text generation:"
  echo "$TEXT_TEST" | jq '.' 2>/dev/null || echo "$TEXT_TEST"
  echo ""
  echo "Trying alternative model names..."
  
  # Try different model names
  for model in "gemini-1.5-flash" "gemini-1.5-pro" "gemini-pro"; do
    echo "Trying: $model"
    TEST_RESPONSE=$(curl -s -X POST \
      "https://generativelanguage.googleapis.com/v1/models/$model:generateContent?key=$API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
        "contents": [{
          "parts": [{
            "text": "Say hello"
          }]
        }]
      }')
    
    if ! echo "$TEST_RESPONSE" | grep -q "error"; then
      echo "✅ $model works!"
      echo "$TEST_RESPONSE" | jq -r '.candidates[0].content.parts[0].text' 2>/dev/null || echo "Response received"
      break
    else
      ERROR=$(echo "$TEST_RESPONSE" | jq -r '.error.message' 2>/dev/null || echo "Unknown error")
      echo "❌ $model failed: $ERROR"
    fi
  done
else
  echo "✅ Text generation works!"
  RESPONSE_TEXT=$(echo "$TEXT_TEST" | jq -r '.candidates[0].content.parts[0].text' 2>/dev/null)
  echo "Response: $RESPONSE_TEXT"
fi

echo ""
echo "🎉 Testing complete!"
echo ""
echo "Next: Try uploading ExampleWorkout.png in the app to test image extraction"

