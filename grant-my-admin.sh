#!/bin/bash

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║     🔐 GRANT YOURSELF ADMIN ACCESS ON LIVE SITE              ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will grant admin access to YOUR current user_id"
echo ""

# Step 1: Get Backend URL
if [ -n "$1" ]; then
    BACKEND_URL="$1"
    echo "Using backend URL: $BACKEND_URL"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 STEP 1: Enter Your Backend API URL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Find it at:"
    echo "  AWS Amplify Console → Environment Variables → VITE_API_URL"
    echo ""
    read -p "Backend URL: " BACKEND_URL
fi

BACKEND_URL=${BACKEND_URL%/}

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Error: Backend URL is required"
    exit 1
fi

# Step 2: Get User ID
if [ -n "$2" ]; then
    USER_ID="$2"
    echo "Using user ID: $USER_ID"
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 STEP 2: Get Your User ID from Live Site"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Instructions:"
    echo "  1. Open https://www.petbehaviortranslator.com/"
    echo "  2. Press F12 (or Cmd+Option+I on Mac) to open DevTools"
    echo "  3. Go to 'Console' tab"
    echo "  4. Type: localStorage.getItem('petBehaviorUserId')"
    echo "  5. Press Enter"
    echo "  6. Copy the user_id (without quotes)"
    echo ""
    echo "Example output: user_1733196547123_abc123xyz"
    echo ""
    read -p "Enter your user_id: " USER_ID
fi

USER_ID=$(echo "$USER_ID" | tr -d '"' | xargs)

if [ -z "$USER_ID" ]; then
    echo "❌ Error: User ID is required"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 STEP 3: Granting Admin Access"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Backend: ${BACKEND_URL}"
echo "User ID: ${USER_ID}"
echo ""
echo "Calling API..."

# URL encode the user_id (replace special characters)
ENCODED_USER_ID=$(echo "$USER_ID" | sed 's/ /%20/g')

# Call admin endpoint
RESPONSE=$(curl -s -X POST -m 10 "${BACKEND_URL}/api/admin/set-premium/${ENCODED_USER_ID}" 2>&1)
CURL_EXIT_CODE=$?

if [ $CURL_EXIT_CODE -ne 0 ]; then
    echo "❌ Error: Failed to connect to backend"
    echo ""
    echo "Response: $RESPONSE"
    exit 1
fi

# Check if successful
if echo "$RESPONSE" | grep -q '"success".*true'; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ SUCCESS! YOU NOW HAVE ADMIN ACCESS!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Response:"
    if command -v python3 &> /dev/null; then
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    else
        echo "$RESPONSE"
    fi
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 ADMIN FEATURES NOW ACTIVE:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  ✅ Unlimited translations (no daily limit)"
    echo "  ✅ Advanced AI analysis with expert insights"
    echo "  ✅ Prevention tips and recommendations"
    echo "  ✅ Priority support (24-hour response)"
    echo "  ✅ All premium features enabled"
    echo "  ✅ Valid until: 2035 (10 years!)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✨ FINAL STEP: Refresh Your Browser"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Go to https://www.petbehaviortranslator.com/ and:"
    echo ""
    echo "  1. Hard refresh the page:"
    echo "     - Mac: Cmd+Shift+R"
    echo "     - Windows/Linux: Ctrl+Shift+R"
    echo ""
    echo "  2. Or clear site data and reload:"
    echo "     - Open DevTools (F12)"
    echo "     - Right-click the refresh button"
    echo "     - Select 'Empty Cache and Hard Reload'"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔍 Verify Admin Status:"
    echo ""
    echo "   curl ${BACKEND_URL}/api/usage/${ENCODED_USER_ID}"
    echo ""
    
    # Verify immediately
    echo "Verifying your admin status..."
    VERIFY_RESPONSE=$(curl -s "${BACKEND_URL}/api/usage/${ENCODED_USER_ID}")
    echo ""
    if command -v python3 &> /dev/null; then
        echo "$VERIFY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$VERIFY_RESPONSE"
    else
        echo "$VERIFY_RESPONSE"
    fi
    echo ""
    
    if echo "$VERIFY_RESPONSE" | grep -q '"isPremium".*true'; then
        echo "✅ CONFIRMED! Your account now has unlimited access!"
        echo ""
        if echo "$VERIFY_RESPONSE" | grep -q '"dailyLimit".*2147483647'; then
            echo "✅ Daily limit: UNLIMITED (2,147,483,647)"
        fi
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 Your Details:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  User ID:  ${USER_ID}"
    echo "  Status:   ADMIN/PREMIUM ✅"
    echo "  Expires:  2035"
    echo "  Site:     https://www.petbehaviortranslator.com/"
    echo ""
    echo "✨ Enjoy unlimited translations!"
    echo ""
    
else
    echo "❌ Error: Failed to grant admin access"
    echo ""
    echo "Response from server:"
    echo "$RESPONSE"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify backend URL is correct"
    echo "  2. Verify user_id is correct (check for typos)"
    echo "  3. Test backend: curl ${BACKEND_URL}/api/usage/test"
    exit 1
fi




