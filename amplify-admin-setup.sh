#!/bin/bash

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║          🔐 AMPLIFY ADMIN SETUP - NO RESTRICTIONS             ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will grant you unlimited admin access on your deployed app."
echo ""

# Check if backend URL is provided as argument
if [ -n "$1" ]; then
    BACKEND_URL="$1"
    echo "Using provided backend URL: $BACKEND_URL"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 STEP 1: Find Your Backend API URL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Where to find it:"
    echo "  1. AWS Amplify Console → Your App → Environment Variables"
    echo "     Look for: VITE_API_URL"
    echo ""
    echo "  2. AWS API Gateway Console → Your API → Stages → Prod"
    echo "     Look for: Invoke URL"
    echo ""
    echo "  3. AWS Lambda Console → Your Function → Configuration"
    echo "     Look for: Function URL"
    echo ""
    echo "Example formats:"
    echo "  - https://abc123.execute-api.us-east-1.amazonaws.com/Prod"
    echo "  - https://xyz789.lambda-url.us-east-1.on.aws"
    echo ""
    read -p "Enter your backend API URL: " BACKEND_URL
fi

# Remove trailing slash if present
BACKEND_URL=${BACKEND_URL%/}

# Validate URL
if [ -z "$BACKEND_URL" ]; then
    echo "❌ Error: Backend URL is required"
    exit 1
fi

if [[ ! "$BACKEND_URL" =~ ^https?:// ]]; then
    echo "❌ Error: URL must start with http:// or https://"
    echo "You entered: $BACKEND_URL"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 STEP 2: Creating Admin User on Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Calling: ${BACKEND_URL}/api/admin/set-premium/admin_user"
echo ""

# Call admin endpoint with timeout
RESPONSE=$(curl -s -X POST -m 10 "${BACKEND_URL}/api/admin/set-premium/admin_user" 2>&1)
CURL_EXIT_CODE=$?

# Check curl exit code
if [ $CURL_EXIT_CODE -ne 0 ]; then
    echo "❌ Error: Failed to connect to backend"
    echo ""
    echo "Curl exit code: $CURL_EXIT_CODE"
    echo "Response: $RESPONSE"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify the URL is correct"
    echo "  2. Check if backend is deployed and running"
    echo "  3. Test backend health:"
    echo "     curl ${BACKEND_URL}/api/usage/test"
    echo ""
    exit 1
fi

# Check if response contains success
if echo "$RESPONSE" | grep -q '"success".*true'; then
    echo "✅ SUCCESS! Admin user created on backend!"
    echo ""
    echo "Response:"
    if command -v python3 &> /dev/null; then
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    else
        echo "$RESPONSE"
    fi
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✨ STEP 3: Activate Admin Mode in Browser"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Choose ONE of these methods:"
    echo ""
    echo "📱 METHOD 1: Admin Page (Easiest)"
    echo "   1. Visit: https://master.d29dv0pugzc00n.amplifyapp.com/admin.html"
    echo "   2. Click 'Activate Admin Mode'"
    echo "   3. Done! ✅"
    echo ""
    echo "💻 METHOD 2: Browser Console"
    echo "   1. Open: https://master.d29dv0pugzc00n.amplifyapp.com/"
    echo "   2. Press F12 (or Cmd+Option+I on Mac)"
    echo "   3. Go to Console tab"
    echo "   4. Paste this command:"
    echo ""
    echo "      localStorage.setItem('petBehaviorUserId', 'admin_user'); location.reload();"
    echo ""
    echo "   5. Press Enter"
    echo ""
    echo "🔖 METHOD 3: Bookmarklet (One-Click)"
    echo "   Create a bookmark with this URL:"
    echo ""
    echo "   javascript:(function(){localStorage.setItem('petBehaviorUserId','admin_user');location.reload();})();"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 ADMIN FEATURES UNLOCKED:"
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
    echo ""
    echo "🔍 Verify Admin Status:"
    echo ""
    echo "   curl ${BACKEND_URL}/api/usage/admin_user"
    echo ""
    echo "   Expected: dailyLimit: 2147483647 (unlimited)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Offer to verify
    read -p "Would you like to verify admin status now? (y/n): " VERIFY
    if [[ "$VERIFY" =~ ^[Yy]$ ]]; then
        echo ""
        echo "Verifying admin status..."
        VERIFY_RESPONSE=$(curl -s "${BACKEND_URL}/api/usage/admin_user")
        echo ""
        if command -v python3 &> /dev/null; then
            echo "$VERIFY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$VERIFY_RESPONSE"
        else
            echo "$VERIFY_RESPONSE"
        fi
        echo ""
        if echo "$VERIFY_RESPONSE" | grep -q '"isPremium".*true'; then
            echo "✅ Verified! Admin user is active with premium status!"
        else
            echo "⚠️  Note: User exists but may not be active in browser yet."
            echo "    Follow Step 3 above to activate in your browser."
        fi
    fi
    
    echo ""
    echo "🎯 Your URLs:"
    echo "   App:        https://master.d29dv0pugzc00n.amplifyapp.com/"
    echo "   Admin Page: https://master.d29dv0pugzc00n.amplifyapp.com/admin.html"
    echo ""
    echo "✨ You're all set! Enjoy unlimited access!"
    echo ""
    
else
    echo "❌ Error: Failed to create admin user"
    echo ""
    echo "Response from server:"
    echo "$RESPONSE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 Troubleshooting:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Verify backend URL is correct:"
    echo "   ${BACKEND_URL}"
    echo ""
    echo "2. Test if backend is responding:"
    echo "   curl -v ${BACKEND_URL}/api/usage/test"
    echo ""
    echo "3. Check if backend is deployed:"
    echo "   - AWS Lambda Console: Check function exists"
    echo "   - AWS API Gateway: Check API is deployed to 'Prod' stage"
    echo ""
    echo "4. Check backend logs:"
    echo "   - AWS CloudWatch Logs"
    echo "   - Look for errors in Lambda function logs"
    echo ""
    echo "5. Verify CORS settings allow admin endpoint"
    echo ""
    echo "6. If backend not deployed, deploy it first:"
    echo "   cd backend && sam build && sam deploy --guided"
    echo ""
    exit 1
fi





