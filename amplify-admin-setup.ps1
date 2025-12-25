# PowerShell script for Amplify admin setup
# Usage: .\amplify-admin-setup.ps1 [BackendURL]

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "║          🔐 AMPLIFY ADMIN SETUP - NO RESTRICTIONS             ║" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will grant you unlimited admin access on your deployed app." -ForegroundColor Yellow
Write-Host ""

# Check if backend URL is provided as argument
if ($args.Count -gt 0) {
    $BackendUrl = $args[0]
    Write-Host "Using provided backend URL: $BackendUrl" -ForegroundColor Green
} else {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📍 STEP 1: Find Your Backend API URL" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Where to find it:" -ForegroundColor Yellow
    Write-Host "  1. AWS Amplify Console → Your App → Environment Variables" -ForegroundColor White
    Write-Host "     Look for: VITE_API_URL" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. AWS API Gateway Console → Your API → Stages → Prod" -ForegroundColor White
    Write-Host "     Look for: Invoke URL" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. AWS Lambda Console → Your Function → Configuration" -ForegroundColor White
    Write-Host "     Look for: Function URL" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Example formats:" -ForegroundColor Yellow
    Write-Host "  - https://abc123.execute-api.us-east-1.amazonaws.com/Prod" -ForegroundColor Gray
    Write-Host "  - https://xyz789.lambda-url.us-east-1.on.aws" -ForegroundColor Gray
    Write-Host ""
    $BackendUrl = Read-Host "Enter your backend API URL"
}

# Remove trailing slash
$BackendUrl = $BackendUrl.TrimEnd('/')

# Validate URL
if ([string]::IsNullOrWhiteSpace($BackendUrl)) {
    Write-Host "❌ Error: Backend URL is required" -ForegroundColor Red
    exit 1
}

if (-not ($BackendUrl -match '^https?://')) {
    Write-Host "❌ Error: URL must start with http:// or https://" -ForegroundColor Red
    Write-Host "You entered: $BackendUrl" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 STEP 2: Creating Admin User on Backend" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Calling: $BackendUrl/api/admin/set-premium/admin_user" -ForegroundColor White
Write-Host ""

try {
    # Call admin endpoint
    $ApiUrl = "$BackendUrl/api/admin/set-premium/admin_user"
    $Response = Invoke-RestMethod -Uri $ApiUrl -Method Post -TimeoutSec 10 -ErrorAction Stop
    
    if ($Response.success) {
        Write-Host "✅ SUCCESS! Admin user created on backend!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Yellow
        $Response | ConvertTo-Json -Depth 10
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "✨ STEP 3: Activate Admin Mode in Browser" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Choose ONE of these methods:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📱 METHOD 1: Admin Page (Easiest)" -ForegroundColor White
        Write-Host "   1. Visit: https://master.d29dv0pugzc00n.amplifyapp.com/admin.html" -ForegroundColor Gray
        Write-Host "   2. Click 'Activate Admin Mode'" -ForegroundColor Gray
        Write-Host "   3. Done! ✅" -ForegroundColor Green
        Write-Host ""
        Write-Host "💻 METHOD 2: Browser Console" -ForegroundColor White
        Write-Host "   1. Open: https://master.d29dv0pugzc00n.amplifyapp.com/" -ForegroundColor Gray
        Write-Host "   2. Press F12 to open DevTools" -ForegroundColor Gray
        Write-Host "   3. Go to Console tab" -ForegroundColor Gray
        Write-Host "   4. Paste this command:" -ForegroundColor Gray
        Write-Host ""
        Write-Host "      localStorage.setItem('petBehaviorUserId', 'admin_user'); location.reload();" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   5. Press Enter" -ForegroundColor Gray
        Write-Host ""
        Write-Host "🔖 METHOD 3: Bookmarklet (One-Click)" -ForegroundColor White
        Write-Host "   Create a bookmark with this URL:" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   javascript:(function(){localStorage.setItem('petBehaviorUserId','admin_user');location.reload();})();" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "🎉 ADMIN FEATURES UNLOCKED:" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  ✅ Unlimited translations (no daily limit)" -ForegroundColor Green
        Write-Host "  ✅ Advanced AI analysis with expert insights" -ForegroundColor Green
        Write-Host "  ✅ Prevention tips and recommendations" -ForegroundColor Green
        Write-Host "  ✅ Priority support (24-hour response)" -ForegroundColor Green
        Write-Host "  ✅ All premium features enabled" -ForegroundColor Green
        Write-Host "  ✅ Valid until: 2035 (10 years!)" -ForegroundColor Green
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🔍 Verify Admin Status:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Invoke-RestMethod -Uri '$BackendUrl/api/usage/admin_user'" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   Expected: dailyLimit: 2147483647 (unlimited)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        
        # Offer to verify
        $Verify = Read-Host "Would you like to verify admin status now? (y/n)"
        if ($Verify -match '^[Yy]') {
            Write-Host ""
            Write-Host "Verifying admin status..." -ForegroundColor Yellow
            try {
                $VerifyUrl = "$BackendUrl/api/usage/admin_user"
                $VerifyResponse = Invoke-RestMethod -Uri $VerifyUrl -Method Get -ErrorAction Stop
                Write-Host ""
                $VerifyResponse | ConvertTo-Json -Depth 10
                Write-Host ""
                if ($VerifyResponse.isPremium -eq $true) {
                    Write-Host "✅ Verified! Admin user is active with premium status!" -ForegroundColor Green
                } else {
                    Write-Host "⚠️  Note: User exists but may not be active in browser yet." -ForegroundColor Yellow
                    Write-Host "    Follow Step 3 above to activate in your browser." -ForegroundColor Yellow
                }
            } catch {
                Write-Host "⚠️  Could not verify: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        
        Write-Host ""
        Write-Host "🎯 Your URLs:" -ForegroundColor Cyan
        Write-Host "   App:        https://master.d29dv0pugzc00n.amplifyapp.com/" -ForegroundColor White
        Write-Host "   Admin Page: https://master.d29dv0pugzc00n.amplifyapp.com/admin.html" -ForegroundColor White
        Write-Host ""
        Write-Host "✨ You're all set! Enjoy unlimited access!" -ForegroundColor Green
        Write-Host ""
        
    } else {
        Write-Host "❌ Error: Failed to create admin user" -ForegroundColor Red
        Write-Host ""
        Write-Host "Response from server:" -ForegroundColor Yellow
        $Response | ConvertTo-Json -Depth 10
        exit 1
    }
    
} catch {
    Write-Host "❌ Error: Failed to connect to backend" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🔍 Troubleshooting:" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Verify backend URL is correct:" -ForegroundColor White
    Write-Host "   $BackendUrl" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Test if backend is responding:" -ForegroundColor White
    Write-Host "   Invoke-RestMethod -Uri '$BackendUrl/api/usage/test'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Check if backend is deployed:" -ForegroundColor White
    Write-Host "   - AWS Lambda Console: Check function exists" -ForegroundColor Gray
    Write-Host "   - AWS API Gateway: Check API is deployed to 'Prod' stage" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Check backend logs:" -ForegroundColor White
    Write-Host "   - AWS CloudWatch Logs" -ForegroundColor Gray
    Write-Host "   - Look for errors in Lambda function logs" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Verify CORS settings allow admin endpoint" -ForegroundColor White
    Write-Host ""
    Write-Host "6. If backend not deployed, deploy it first:" -ForegroundColor White
    Write-Host "   cd backend && sam build && sam deploy --guided" -ForegroundColor Gray
    Write-Host ""
    exit 1
}


