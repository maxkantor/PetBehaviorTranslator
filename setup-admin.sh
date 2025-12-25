#!/bin/bash

echo "🔐 Setting up ADMIN user with no restrictions..."
echo ""

# Call the admin endpoint to create admin user
echo "Creating admin user in backend..."
RESPONSE=$(curl -s -X POST http://localhost:5001/api/admin/set-premium/admin_user)

if [ $? -eq 0 ]; then
    echo "✅ Admin user created successfully!"
    echo "Response: $RESPONSE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 NEXT STEP: Set your browser to use admin account"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Option 1: Automatic (Recommended)"
    echo "  Open this URL in your browser:"
    echo "  http://localhost:3000"
    echo ""
    echo "  Then press F12 to open Developer Console and paste this:"
    echo "  localStorage.setItem('petBehaviorUserId', 'admin_user'); location.reload();"
    echo ""
    echo "Option 2: Manual"
    echo "  1. Open http://localhost:3000 in your browser"
    echo "  2. Press F12 (or Cmd+Option+I on Mac)"
    echo "  3. Go to the 'Console' tab"
    echo "  4. Paste this command and press Enter:"
    echo "     localStorage.setItem('petBehaviorUserId', 'admin_user'); location.reload();"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 ADMIN FEATURES ENABLED:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ✅ Unlimited translations (no daily limit)"
    echo "  ✅ Advanced AI analysis with detailed insights"
    echo "  ✅ Prevention tips and expert recommendations"
    echo "  ✅ Priority support (24-hour response time)"
    echo "  ✅ Premium badge and features"
    echo "  ✅ Valid until: 2035 (10 years!)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "❌ Error: Could not create admin user"
    echo "Make sure the backend is running on http://localhost:5001"
fi






