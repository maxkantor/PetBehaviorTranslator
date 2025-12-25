# 🚀 Quick Secrets Manager Setup

Your backend is already configured to use AWS Secrets Manager! Here's the fastest way to set it up.

---

## ⚡ 3-Step Setup

### Step 1: Generate Secrets JSON

```bash
chmod +x generate-secrets-json.sh
./generate-secrets-json.sh
```

This will create `secrets.json` with all your configuration.

### Step 2: Create Secret in AWS

**Option A: AWS Console**
1. Go to: https://console.aws.amazon.com/secretsmanager
2. Click **"Store a new secret"**
3. Select **"Other type of secret"** → **"Plaintext"**
4. Paste contents of `secrets.json`
5. Secret name: `/pettranslator/app-secrets`
6. Click **"Store"**

**Option B: AWS CLI**
```bash
aws secretsmanager create-secret \
  --name /pettranslator/app-secrets \
  --secret-string file://secrets.json
```

### Step 3: Grant Lambda Permission

**AWS Console:**
1. Lambda → Your Function → Configuration → Permissions
2. Click Execution Role
3. Add permission → Attach policies
4. Search: `SecretsManagerReadWrite`
5. Attach

**AWS CLI:**
```bash
aws iam attach-role-policy \
  --role-name your-lambda-role-name \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

---

## 🔑 Required Secrets

At minimum, you need:

```json
{
  "OPENAI_API_KEY": "sk-proj-...",
  "ADMIN_USER_ID": "user_1733196547123_abc123xyz"
}
```

---

## 🎯 Setting ADMIN_USER_ID

### Get Your User ID:

1. Visit: https://www.petbehaviortranslator.com/
2. Open Console (F12)
3. Run: `localStorage.getItem('petBehaviorUserId')`
4. Copy the result

### Add to Secrets Manager:

1. Secrets Manager → `/pettranslator/app-secrets`
2. Edit secret value
3. Update `ADMIN_USER_ID` field
4. Save

**Note:** Lambda caches secrets for 5 minutes. Restart Lambda or wait 5 minutes for changes to take effect.

---

## 📝 Using the Template

1. Copy `secrets-template.json`
2. Fill in your values
3. Upload to Secrets Manager

```bash
# Edit template
cp secrets-template.json secrets.json
nano secrets.json  # or use your editor

# Upload to AWS
aws secretsmanager create-secret \
  --name /pettranslator/app-secrets \
  --secret-string file://secrets.json
```

---

## ✅ Verify It's Working

### Check CloudWatch Logs:

1. CloudWatch → Log Groups → Your Lambda
2. Look for: `[SECRETS] Secret /pettranslator/app-secrets retrieved successfully`

### Test Admin Access:

After setting `ADMIN_USER_ID`:
1. Wait 5 minutes (or restart Lambda)
2. Visit admin page
3. Should work without 401 errors!

---

## 🔄 Update Secrets Later

```bash
# Edit secrets.json
nano secrets.json

# Update in AWS
aws secretsmanager update-secret \
  --secret-id /pettranslator/app-secrets \
  --secret-string file://secrets.json
```

**Remember:** Lambda caches for 5 minutes. Restart Lambda to see changes immediately.

---

## 🛡️ Security Notes

- ✅ Secrets are encrypted at rest
- ✅ Secrets are encrypted in transit
- ✅ Only Lambda execution role can access
- ✅ Never commit `secrets.json` to git (already in `.gitignore`)

---

## 📚 Full Documentation

See `AWS_SECRETS_MANAGER_SETUP.md` for complete guide with:
- All available secrets
- IAM policy examples
- Troubleshooting
- Best practices

---

**That's it!** Your backend will automatically use secrets from AWS Secrets Manager! 🎉


