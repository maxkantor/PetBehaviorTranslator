# Set/Remove Admin/Premium Status Script
# This script can set your user account to premium or revert to normal user

Write-Host "👑 Admin/Premium Status Manager" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5001"

# Ask what to do
Write-Host "What would you like to do?" -ForegroundColor Yellow
Write-Host "  1. Set to Premium/Admin (unlimited translations)" -ForegroundColor White
Write-Host "  2. Remove Premium (revert to normal user)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -ne "1" -and $choice -ne "2") {
    Write-Host "❌ Invalid choice. Exiting." -ForegroundColor Red
    exit
}

# Get user ID
Write-Host ""
Write-Host "Enter your User ID (or press Enter to use default 'admin'):" -ForegroundColor Yellow
$userId = Read-Host
if ([string]::IsNullOrWhiteSpace($userId)) {
    $userId = "admin"
}

Write-Host ""

if ($choice -eq "1") {
    # Set to premium
    Write-Host "Setting premium status for user: $userId" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/set-premium/$userId" -Method POST
        $result = $response.Content | ConvertFrom-Json
        
        if ($result.success) {
            Write-Host "✅ Premium status set successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Your account now has:" -ForegroundColor Cyan
            Write-Host "  - Unlimited translations" -ForegroundColor White
            Write-Host "  - Premium status until: $($result.expiresAt)" -ForegroundColor White
            Write-Host ""
            Write-Host "💡 Next steps:" -ForegroundColor Yellow
            Write-Host "   1. If using a different user ID, update localStorage in your browser:" -ForegroundColor Gray
            Write-Host "      localStorage.setItem('petBehaviorUserId', '$userId')" -ForegroundColor Gray
            Write-Host "   2. Refresh your browser at http://localhost:3000" -ForegroundColor Gray
            Write-Host "   3. You should see 'Premium Member' badge" -ForegroundColor Gray
        } else {
            Write-Host "❌ Failed to set premium status" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Make sure the backend is running on $baseUrl" -ForegroundColor Yellow
    }
} else {
    # Remove premium
    Write-Host "Removing premium status for user: $userId" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/remove-premium/$userId" -Method POST
        $result = $response.Content | ConvertFrom-Json
        
        if ($result.success) {
            Write-Host "✅ Premium status removed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Your account is now:" -ForegroundColor Cyan
            Write-Host "  - Free tier user" -ForegroundColor White
            Write-Host "  - 5 translations per day limit" -ForegroundColor White
            Write-Host "  - Daily count reset to 0" -ForegroundColor White
            Write-Host ""
            Write-Host "💡 Next steps:" -ForegroundColor Yellow
            Write-Host "   1. Refresh your browser at http://localhost:3000" -ForegroundColor Gray
            Write-Host "   2. You should see usage badge with remaining translations" -ForegroundColor Gray
        } else {
            Write-Host "❌ Failed to remove premium status" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Make sure the backend is running on $baseUrl" -ForegroundColor Yellow
    }
}

Write-Host ""

