# PowerShell script to migrate Lambda environment variables to AWS Secrets Manager
# This script reads environment variables from a Lambda function and creates/updates a secret in Secrets Manager

param(
    [Parameter(Mandatory=$true)]
    [string]$FunctionName = "pet-behavior-translator-api",
    
    [Parameter(Mandatory=$false)]
    [string]$SecretName = "/pettranslator/app-secrets",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Migrate Lambda Secrets to Secrets Manager" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: AWS CLI is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Get Lambda function configuration
Write-Host "Fetching environment variables from Lambda function: $FunctionName" -ForegroundColor Yellow
try {
    $lambdaConfig = aws lambda get-function-configuration `
        --function-name $FunctionName `
        --region $Region `
        --output json | ConvertFrom-Json
    
    if (-not $lambdaConfig.Environment -or -not $lambdaConfig.Environment.Variables) {
        Write-Host "ERROR: No environment variables found in Lambda function" -ForegroundColor Red
        exit 1
    }
    
    $envVars = $lambdaConfig.Environment.Variables
    Write-Host "Found $($envVars.PSObject.Properties.Count) environment variables" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to retrieve Lambda configuration: $_" -ForegroundColor Red
    exit 1
}

# Prepare secrets dictionary
$secrets = @{}

# Add all environment variables to secrets
Write-Host ""
Write-Host "Preparing secrets..." -ForegroundColor Yellow
foreach ($key in $envVars.PSObject.Properties.Name) {
    $value = $envVars.$key
    $secrets[$key] = $value
    Write-Host "  - $key" -ForegroundColor Gray
}

# Add Stripe keys if not present (prompt user)
if (-not $secrets.ContainsKey("STRIPE_SECRET_KEY")) {
    Write-Host ""
    Write-Host "STRIPE_SECRET_KEY not found in environment variables." -ForegroundColor Yellow
    $stripeKey = Read-Host "Enter Stripe Secret Key (or press Enter to skip)"
    if ($stripeKey) {
        $secrets["STRIPE_SECRET_KEY"] = $stripeKey
    }
}

if (-not $secrets.ContainsKey("STRIPE_WEBHOOK_SECRET")) {
    Write-Host ""
    Write-Host "STRIPE_WEBHOOK_SECRET not found in environment variables." -ForegroundColor Yellow
    $stripeWebhook = Read-Host "Enter Stripe Webhook Secret (or press Enter to skip)"
    if ($stripeWebhook) {
        $secrets["STRIPE_WEBHOOK_SECRET"] = $stripeWebhook
    }
}

if (-not $secrets.ContainsKey("FRONTEND_URL")) {
    Write-Host ""
    Write-Host "FRONTEND_URL not found in environment variables." -ForegroundColor Yellow
    $frontendUrl = Read-Host "Enter Frontend URL (or press Enter to use default)"
    if ($frontendUrl) {
        $secrets["FRONTEND_URL"] = $frontendUrl
    } else {
        $secrets["FRONTEND_URL"] = "https://www.petbehaviortranslator.com"
    }
}

# Convert to JSON
$secretsJson = $secrets | ConvertTo-Json -Compress

Write-Host ""
Write-Host "Secret JSON (preview):" -ForegroundColor Cyan
Write-Host $secretsJson.Substring(0, [Math]::Min(200, $secretsJson.Length)) -ForegroundColor Gray
if ($secretsJson.Length -gt 200) {
    Write-Host "... (truncated)" -ForegroundColor Gray
}
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Would create/update secret: $SecretName" -ForegroundColor Cyan
    Write-Host "With $($secrets.Count) keys" -ForegroundColor Cyan
    exit 0
}

# Check if secret already exists
Write-Host "Checking if secret exists: $SecretName" -ForegroundColor Yellow
try {
    $existingSecret = aws secretsmanager describe-secret `
        --secret-id $SecretName `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    Write-Host "Secret already exists. Updating..." -ForegroundColor Yellow
    
    # Update existing secret
    $result = aws secretsmanager update-secret `
        --secret-id $SecretName `
        --secret-string $secretsJson `
        --region $Region `
        --output json | ConvertFrom-Json
    
    Write-Host "Secret updated successfully!" -ForegroundColor Green
    Write-Host "ARN: $($result.ARN)" -ForegroundColor Gray
} catch {
    Write-Host "Secret does not exist. Creating..." -ForegroundColor Yellow
    
    # Create new secret
    $result = aws secretsmanager create-secret `
        --name $SecretName `
        --secret-string $secretsJson `
        --description "Application secrets for Pet Behavior Translator API" `
        --region $Region `
        --output json | ConvertFrom-Json
    
    Write-Host "Secret created successfully!" -ForegroundColor Green
    Write-Host "ARN: $($result.ARN)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update Lambda IAM role to allow secretsmanager:GetSecretValue" -ForegroundColor White
Write-Host "2. Remove environment variables from Lambda function (optional)" -ForegroundColor White
Write-Host "3. Set SECRETS_MANAGER_SECRET_NAME environment variable to: $SecretName" -ForegroundColor White
Write-Host "   (or the code will use the default: /pettranslator/app-secrets)" -ForegroundColor Gray
Write-Host ""
Write-Host "IAM Policy needed:" -ForegroundColor Yellow
Write-Host @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "$($result.ARN)"
    }
  ]
}
"@ -ForegroundColor Gray

