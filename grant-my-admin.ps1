# PowerShell script to grant admin access to YOUR current user_id
# Usage: .\grant-my-admin.ps1 [BackendURL] [UserID]

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "║     🔐 GRANT YOURSELF ADMIN ACCESS ON LIVE SITE              ║" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will grant admin access to YOUR current user_id" -ForegroundColor Yellow
Write-Host ""

# Step 1: Get Backend URL
if ($args.Count -gt 0) {
    $BackendUrl = $args[0]
    Write-Host "Using backend URL: $BackendUrl" -ForegroundColor Green
} else {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📍 STEP 1: Enter Your Backend API URL" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Find it at:" -ForegroundColor Yellow
    Write-Host "  AWS Amplify Console → Environment Variables → VITE_API_URL" -ForegroundColor White
    Write-Host ""
    $BackendUrl = Read-Host "Backend URL"
}

# Remove trailing slash
$BackendUrl = $BackendUrl.TrimEnd('/')

if ([string]::IsNullOrWhiteSpace($BackendUrl)) {
    Write-Host "❌ Error: Backend URL is required" -ForegroundColor Red
    exit 1
}

# Step 2: Get User ID
if ($args.Count -gt 1) {
    $UserId = $args[1]
    Write-Host "Using user ID: $UserId" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🔍 STEP 2: Get Your User ID from Live Site" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Instructions:" -ForegroundColor Yellow
    Write-Host "  1. Open https://www.petbehaviortranslator.com/" -ForegroundColor White
    Write-Host "  2. Press F12 to open DevTools" -ForegroundColor White
    Write-Host "  3. Go to 'Console' tab" -ForegroundColor White
    Write-Host "  4. Type: localStorage.getItem('petBehaviorUserId')" -ForegroundColor White
    Write-Host "  5. Press Enter" -ForegroundColor White
    Write-Host "  6. Copy the user_id (without quotes)" -ForegroundColor White
    Write-Host ""
    Write-Host "Example output: user_1733196547123_abc123xyz" -ForegroundColor Gray
    Write-Host ""
    $UserId = Read-Host "Enter your user_id"
}

# Clean up user ID (remove quotes and whitespace)
$UserId = $UserId.Trim().Trim('"').Trim("'")

if ([string]::IsNullOrWhiteSpace($UserId)) {
    Write-Host "❌ Error: User ID is required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 STEP 3: Granting Admin Access" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend: $BackendUrl" -ForegroundColor White
Write-Host "User ID: $UserId" -ForegroundColor White
Write-Host ""
Write-Host "Calling API..." -ForegroundColor Yellow

# URL encode the user_id (PowerShell native method)
$EncodedUserId = [System.Uri]::EscapeDataString($UserId)

# Build the API URL
$ApiUrl = "$BackendUrl/api/admin/set-premium/$EncodedUserId"

try {
    # Call admin endpoint
    $Response = Invoke-RestMethod -Uri $ApiUrl -Method Post -TimeoutSec 10 -ErrorAction Stop
    
    if ($Response.success) {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "✅ SUCCESS! YOU NOW HAVE ADMIN ACCESS!" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Yellow
        $Response | ConvertTo-Json -Depth 10
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "🎉 ADMIN FEATURES NOW ACTIVE:" -ForegroundColor Cyan
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
        Write-Host "✨ FINAL STEP: Refresh Your Browser" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Go to https://www.petbehaviortranslator.com/ and:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  1. Hard refresh the page:" -ForegroundColor White
        Write-Host "     - Windows: Ctrl+Shift+R" -ForegroundColor Gray
        Write-Host "     - Mac: Cmd+Shift+R" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  2. Or clear site data and reload:" -ForegroundColor White
        Write-Host "     - Open DevTools (F12)" -ForegroundColor Gray
        Write-Host "     - Right-click the refresh button" -ForegroundColor Gray
        Write-Host "     - Select 'Empty Cache and Hard Reload'" -ForegroundColor Gray
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🔍 Verifying your admin status..." -ForegroundColor Yellow
        
        # Verify immediately
        try {
            $VerifyUrl = "$BackendUrl/api/usage/$EncodedUserId"
            $VerifyResponse = Invoke-RestMethod -Uri $VerifyUrl -Method Get -ErrorAction Stop
            
            Write-Host ""
            Write-Host "Verification Response:" -ForegroundColor Yellow
            $VerifyResponse | ConvertTo-Json -Depth 10
            Write-Host ""
            
            if ($VerifyResponse.isPremium -eq $true) {
                Write-Host "✅ CONFIRMED! Your account now has unlimited access!" -ForegroundColor Green
                Write-Host ""
                if ($VerifyResponse.dailyLimit -eq 2147483647) {
                    Write-Host "✅ Daily limit: UNLIMITED (2,147,483,647)" -ForegroundColor Green
                }
            }
        } catch {
            Write-Host "⚠️  Could not verify status automatically. Check manually:" -ForegroundColor Yellow
            Write-Host "   Invoke-RestMethod -Uri '$BackendUrl/api/usage/$EncodedUserId'" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "🎯 Your Details:" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  User ID:  $UserId" -ForegroundColor White
        Write-Host "  Status:   ADMIN/PREMIUM ✅" -ForegroundColor Green
        Write-Host "  Expires:  2035" -ForegroundColor White
        Write-Host "  Site:     https://www.petbehaviortranslator.com/" -ForegroundColor White
        Write-Host ""
        Write-Host "✨ Enjoy unlimited translations!" -ForegroundColor Green
        Write-Host ""
        
    } else {
        Write-Host "❌ Error: Failed to grant admin access" -ForegroundColor Red
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
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Verify backend URL is correct" -ForegroundColor White
    Write-Host "  2. Verify user_id is correct (check for typos)" -ForegroundColor White
    Write-Host "  3. Test backend: Invoke-RestMethod -Uri '$BackendUrl/api/usage/test'" -ForegroundColor White
    Write-Host ""
    exit 1
}

