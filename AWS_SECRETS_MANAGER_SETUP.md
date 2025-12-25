# 🔐 AWS Secrets Manager Setup Guide

Your backend is already configured to use AWS Secrets Manager! This guide shows you how to set up all your secrets.

---

## 📋 Quick Setup (5 Minutes)

### Step 1: Go to AWS Secrets Manager

1. Open AWS Console: https://console.aws.amazon.com/secretsmanager
2. Select your region (same as your Lambda function)
3. Click **"Store a new secret"**

### Step 2: Choose Secret Type

- Select: **"Other type of secret"**
- Choose: **"Plaintext"** (we'll use JSON format)

### Step 3: Enter Your Secrets (JSON Format)

Paste this JSON template and fill in your values:

```json
{
  "OPENAI_API_KEY": "sk-proj-your-openai-api-key-here",
  "ADMIN_USER_ID": "user_1733196547123_abc123xyz",
  "AMAZON_ASSOCIATE_TAG": "your-amazon-tag-20",
  "SMTP_HOST": "email-smtp.us-east-1.amazonaws.com",
  "SMTP_PORT": "587",
  "SMTP_USERNAME": "your-ses-smtp-username",
  "SMTP_PASSWORD": "your-ses-smtp-password",
  "SUPPORT_EMAIL": "support@petbehaviortranslator.com",
  "ADMIN_EMAIL": "admin@petbehaviortranslator.com",
  "STRIPE_SECRET_KEY": "sk_live_your-stripe-secret-key",
  "STRIPE_WEBHOOK_SECRET": "whsec_your-webhook-secret",
  "FRONTEND_URL": "https://www.petbehaviortranslator.com",
  "GA_MEASUREMENT_ID": "G-XXXXXXXXXX",
  "MIXPANEL_TOKEN": "your-mixpanel-token",
  "EVENT_LOG_BUCKET": "your-s3-bucket-name"
}
```

### Step 4: Configure Secret Name

- **Secret name:** `/pettranslator/app-secrets`
  - Or use a custom name and set `SECRETS_MANAGER_SECRET_NAME` env var in Lambda

### Step 5: Configure Rotation (Optional)

- Select: **"Disable automatic rotation"** (for now)
- Or set up rotation later for security

### Step 6: Review and Store

- Review your secret
- Click **"Store"**

---

## 🔑 Required Secrets

### Core Secrets (Required)

| Secret Key | Description | Example |
|------------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-proj-...` |
| `ADMIN_USER_ID` | Your user ID for admin access | `user_1733196547123_abc123xyz` |

### Optional Secrets

| Secret Key | Description | Default |
|------------|-------------|---------|
| `AMAZON_ASSOCIATE_TAG` | Amazon Associates tag | Empty (no affiliate links) |
| `SMTP_HOST` | Email SMTP server | Empty (no emails) |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USERNAME` | SMTP username | Empty |
| `SMTP_PASSWORD` | SMTP password | Empty |
| `SUPPORT_EMAIL` | Support email address | `support@yourdomain.com` |
| `ADMIN_EMAIL` | Admin email for notifications | Empty |
| `STRIPE_SECRET_KEY` | Stripe secret key | Empty (no payments) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Empty |
| `FRONTEND_URL` | Your frontend URL | `https://www.petbehaviortranslator.com` |
| `GA_MEASUREMENT_ID` | Google Analytics ID | Empty |
| `MIXPANEL_TOKEN` | Mixpanel token | Empty |
| `EVENT_LOG_BUCKET` | S3 bucket for event logs | Empty |

---

## 🎯 Setting Up ADMIN_USER_ID

### Method 1: Get Your User ID from Browser

1. Go to https://www.petbehaviortranslator.com/
2. Open DevTools (F12)
3. Console: `localStorage.getItem('petBehaviorUserId')`
4. Copy the result

### Method 2: Use the Admin Setup Script

```bash
# This will show you your user ID
./grant-my-admin.sh
```

### Method 3: Check Backend Logs

Look in CloudWatch logs for user IDs when users make translations.

---

## 📝 Complete Secret JSON Template

Copy this and fill in your values:

```json
{
  "OPENAI_API_KEY": "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "ADMIN_USER_ID": "user_1733196547123_abc123xyz",
  "AMAZON_ASSOCIATE_TAG": "",
  "SMTP_HOST": "",
  "SMTP_PORT": "587",
  "SMTP_USERNAME": "",
  "SMTP_PASSWORD": "",
  "SUPPORT_EMAIL": "support@petbehaviortranslator.com",
  "ADMIN_EMAIL": "",
  "STRIPE_SECRET_KEY": "",
  "STRIPE_WEBHOOK_SECRET": "",
  "FRONTEND_URL": "https://www.petbehaviortranslator.com",
  "GA_MEASUREMENT_ID": "",
  "MIXPANEL_TOKEN": "",
  "EVENT_LOG_BUCKET": ""
}
```

---

## 🔧 Update Lambda Function Configuration

### Step 1: Set Secret Name (If Using Custom Name)

In Lambda Console → Configuration → Environment Variables:

- **Key:** `SECRETS_MANAGER_SECRET_NAME`
- **Value:** `/pettranslator/app-secrets` (or your custom name)

### Step 2: Grant Lambda Permission to Read Secrets

Your Lambda needs permission to read from Secrets Manager:

**IAM Policy to Add:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:/pettranslator/app-secrets-*"
    }
  ]
}
```

**Or use AWS Console:**

1. Go to Lambda → Configuration → Permissions
2. Click on the Execution Role
3. Add permission → Attach policies
4. Search for: `SecretsManagerReadWrite`
5. Attach it

**Or use AWS CLI:**

```bash
aws iam attach-role-policy \
  --role-name your-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

---

## ✅ Verify Secrets Are Working

### Check Lambda Logs

1. Go to CloudWatch → Log Groups
2. Find your Lambda function logs
3. Look for: `[SECRETS]` messages
4. Should see: `Secret /pettranslator/app-secrets retrieved successfully`

### Test Admin Access

After setting `ADMIN_USER_ID` in Secrets Manager:

1. Wait 5 minutes (cache expires)
2. Or restart Lambda function
3. Try accessing admin page
4. Should work without 401 errors!

---

## 🔄 Updating Secrets

### Method 1: AWS Console

1. Go to Secrets Manager
2. Select your secret
3. Click **"Retrieve secret value"**
4. Click **"Edit"**
5. Update JSON
6. Save

**Note:** Lambda caches secrets for 5 minutes. Changes take effect after cache expires or Lambda restarts.

### Method 2: AWS CLI

```bash
# Get current secret
aws secretsmanager get-secret-value \
  --secret-id /pettranslator/app-secrets \
  --query SecretString \
  --output text > secrets.json

# Edit secrets.json
nano secrets.json

# Update secret
aws secretsmanager update-secret \
  --secret-id /pettranslator/app-secrets \
  --secret-string file://secrets.json
```

### Method 3: Force Cache Refresh

Restart your Lambda function:
1. Lambda Console → Your Function
2. Configuration → Environment Variables
3. Add a dummy variable (or change one)
4. Save (this restarts the function)

---

## 🛡️ Security Best Practices

### 1. Use Least Privilege IAM Policy

Only grant `GetSecretValue` permission, not full Secrets Manager access:

```json
{
  "Effect": "Allow",
  "Action": "secretsmanager:GetSecretValue",
  "Resource": "arn:aws:secretsmanager:*:*:secret:/pettranslator/app-secrets-*"
}
```

### 2. Enable Secret Rotation (Optional)

For sensitive secrets like API keys:
1. Secrets Manager → Your Secret
2. Rotation configuration
3. Enable automatic rotation
4. Set rotation schedule

### 3. Use Resource-Based Policies

You can also grant access via the secret's resource policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/your-lambda-role"
      },
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "*"
    }
  ]
}
```

### 4. Monitor Secret Access

Enable CloudTrail to monitor who accesses secrets:
- CloudTrail → Event history
- Filter by: `secretsmanager.amazonaws.com`

---

## 📊 Secret Structure Reference

Your backend expects this JSON structure in Secrets Manager:

```json
{
  "OPENAI_API_KEY": "string",
  "ADMIN_USER_ID": "string",
  "AMAZON_ASSOCIATE_TAG": "string (optional)",
  "SMTP_HOST": "string (optional)",
  "SMTP_PORT": "string (optional, default: 587)",
  "SMTP_USERNAME": "string (optional)",
  "SMTP_PASSWORD": "string (optional)",
  "SUPPORT_EMAIL": "string (optional)",
  "ADMIN_EMAIL": "string (optional)",
  "STRIPE_SECRET_KEY": "string (optional)",
  "STRIPE_WEBHOOK_SECRET": "string (optional)",
  "FRONTEND_URL": "string (optional)",
  "GA_MEASUREMENT_ID": "string (optional)",
  "MIXPANEL_TOKEN": "string (optional)",
  "EVENT_LOG_BUCKET": "string (optional)"
}
```

---

## 🎯 Quick Admin Setup with Secrets Manager

### Step 1: Get Your User ID

```javascript
// In browser console on your site
localStorage.getItem('petBehaviorUserId')
```

### Step 2: Add to Secrets Manager

1. Go to Secrets Manager
2. Select `/pettranslator/app-secrets`
3. Edit secret value
4. Add or update: `"ADMIN_USER_ID": "your-user-id-here"`
5. Save

### Step 3: Restart Lambda (or wait 5 minutes)

Lambda will pick up the new `ADMIN_USER_ID` automatically!

---

## 🆘 Troubleshooting

### Problem: "Secret not found"

**Solution:** 
- Check secret name matches: `/pettranslator/app-secrets`
- Or set `SECRETS_MANAGER_SECRET_NAME` env var in Lambda

### Problem: "Access Denied"

**Solution:**
- Check Lambda execution role has Secrets Manager permissions
- Verify IAM policy includes `secretsmanager:GetSecretValue`

### Problem: "Secret is empty"

**Solution:**
- Check JSON format is valid
- Ensure all keys are strings (use quotes)
- No trailing commas

### Problem: "Changes not taking effect"

**Solution:**
- Secrets are cached for 5 minutes
- Restart Lambda function to force refresh
- Or wait 5 minutes

### Problem: "ADMIN_USER_ID not working"

**Solution:**
1. Verify secret was updated
2. Check CloudWatch logs for `[ADMIN CHECK]` messages
3. Ensure user ID matches exactly (no extra spaces)
4. Restart Lambda or wait for cache to expire

---

## 📚 Additional Resources

- **AWS Secrets Manager Docs:** https://docs.aws.amazon.com/secretsmanager/
- **Lambda Secrets Tutorial:** https://docs.aws.amazon.com/lambda/latest/dg/configuration-secrets.html
- **IAM Best Practices:** https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html

---

## ✅ Checklist

- [ ] Created secret in Secrets Manager
- [ ] Added all required secrets (OPENAI_API_KEY, ADMIN_USER_ID)
- [ ] Added optional secrets as needed
- [ ] Set `SECRETS_MANAGER_SECRET_NAME` in Lambda (if using custom name)
- [ ] Granted Lambda permission to read secrets
- [ ] Verified secrets are accessible (check CloudWatch logs)
- [ ] Tested admin access with ADMIN_USER_ID
- [ ] Set up secret rotation (optional, recommended)

---

**Ready?** Set up your secrets in AWS Secrets Manager and your app will use them automatically! 🚀


