# Premium Features Test Script
# Run this script to test all premium features

Write-Host "🧪 Testing Premium Features..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5001"
$testUserId = "test-user-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Test 1: Check Usage Endpoint
Write-Host "Test 1: Usage Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/usage/$testUserId" -Method GET
    $usage = $response.Content | ConvertFrom-Json
    Write-Host "  ✅ Usage endpoint working!" -ForegroundColor Green
    Write-Host "     Daily Count: $($usage.dailyCount)" -ForegroundColor Gray
    Write-Host "     Is Premium: $($usage.isPremium)" -ForegroundColor Gray
    Write-Host "     Daily Limit: $($usage.dailyLimit)" -ForegroundColor Gray
    Write-Host "     Remaining: $($usage.remaining)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Set Premium Status
Write-Host "Test 2: Premium Status Endpoint" -ForegroundColor Yellow
try {
    $expiresAt = (Get-Date).AddMonths(1).ToString("o")
    $body = @{
        userId = $testUserId
        isPremium = $true
        expiresAt = $expiresAt
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/premium/status" -Method POST -Body $body -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    Write-Host "  ✅ Premium status set successfully!" -ForegroundColor Green
    Write-Host "     Success: $($result.success)" -ForegroundColor Gray
    Write-Host "     Is Premium: $($result.isPremium)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Verify Premium Status
Write-Host "Test 3: Verify Premium Status" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/usage/$testUserId" -Method GET
    $usage = $response.Content | ConvertFrom-Json
    if ($usage.isPremium) {
        Write-Host "  ✅ Premium status verified!" -ForegroundColor Green
        Write-Host "     Daily Limit: $($usage.dailyLimit) (unlimited)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Premium status not set correctly" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Test Translation Endpoint (with limit check)
Write-Host "Test 4: Translation Endpoint Structure" -ForegroundColor Yellow
Write-Host "  Info: To test translations:" -ForegroundColor Cyan
Write-Host "     1. Open http://localhost:3000" -ForegroundColor Gray
Write-Host "     2. Make 5 translations (all should work)" -ForegroundColor Gray
Write-Host "     3. Try 6th translation (should show limit error)" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Backend API Tests Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "   2. Check the usage badge at the top" -ForegroundColor White
Write-Host "   3. Make 5 translations to test daily limit" -ForegroundColor White
Write-Host "   4. Try 6th translation to see limit error" -ForegroundColor White
Write-Host ""

