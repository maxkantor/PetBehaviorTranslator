# 🚀 AWS Amplify Deployment Guide

## 📋 Prerequisites

- ✅ AWS Account (free tier available)
- ✅ Git repository (GitHub, GitLab, or Bitbucket)
- ✅ Code pushed to repository
- ✅ Domain name (optional, can use Amplify subdomain)

---

## 🎯 Step 1: Deploy Frontend to AWS Amplify

### 1.1 Push Code to Git

```bash
git add .
git commit -m "Ready for deployment"
git push origin master
```

### 1.2 Connect to AWS Amplify

1. **Go to AWS Amplify Console:**
   - Visit: https://console.aws.amazon.com/amplify
   - Sign in to your AWS account

2. **Create New App:**
   - Click "New app" → "Host web app"
   - Choose your Git provider (GitHub, GitLab, Bitbucket)
   - Authorize AWS to access your repository
   - Select repository: `maxkantor/PetBehaviorTranslator`
   - Select branch: `master`

3. **Configure Build Settings:**
   - Amplify should auto-detect from `amplify.yml`
   - Verify build settings:
     ```yaml
     version: 1
     frontend:
       phases:
         preBuild:
           commands:
             - npm install
         build:
           commands:
             - npm run build
       artifacts:
         baseDirectory: dist
         files:
           - '**/*'
       cache:
         paths:
           - node_modules/**/*
     ```

4. **Add Environment Variables:**
   - Go to App settings → Environment variables
   - Add: `VITE_API_URL` = `https://your-api-url.amazonaws.com/Prod`
     - (You'll update this after deploying backend)
   - ⚠️ **DO NOT add OPENAI_API_KEY here** - that goes in Lambda only!

5. **Deploy:**
   - Click "Save and deploy"
   - Wait for build to complete (~5-10 minutes)
   - Your app will be live at: `https://[random-id].amplifyapp.com`

---

## 🌐 Step 2: Set Up Custom Domain

### 2.1 Purchase Domain (if needed)

**Recommended Domain Registrars:**
- **Namecheap** - ~$10-15/year
- **Google Domains** - ~$12/year
- **AWS Route 53** - ~$12/year (easiest integration)

### 2.2 Add Domain to Amplify

1. **In Amplify Console:**
   - Go to your app → Domain management
   - Click "Add domain"
   - Enter your domain (e.g., `petbehavior.com`)

2. **Configure DNS:**
   - Amplify will provide DNS records
   - Add these to your domain registrar:
     - CNAME record (if using subdomain)
     - Or A/ALIAS record (if using root domain)

3. **Wait for SSL Certificate:**
   - AWS automatically provisions SSL certificate
   - Takes 15-60 minutes
   - Domain will be live with HTTPS

---

## 📧 Step 3: Set Up Support Email

### Option A: AWS SES (Simple Email Service) - FREE/Cheap

**Free Tier:** 62,000 emails/month (if verified)

#### Setup Steps:

1. **Go to AWS SES Console:**
   - https://console.aws.amazon.com/ses
   - Select your region (us-east-1 recommended)

2. **Verify Email Address:**
   - Click "Verified identities" → "Create identity"
   - Choose "Email address"
   - Enter: `support@yourdomain.com`
   - Check email and verify

3. **Request Production Access** (if needed):
   - By default, SES is in "Sandbox" mode
   - Can only send to verified emails
   - Request production access for unlimited sending
   - Usually approved within 24 hours

4. **Get SMTP Credentials:**
   - Go to SMTP settings
   - Create SMTP credentials
   - Save: SMTP server, port, username, password

5. **Update Backend:**
   - Add SES credentials to `appsettings.json` or environment variables
   - Configure email sending in support endpoint

#### Cost:
- **Free:** 62,000 emails/month (within AWS)
- **After free tier:** $0.10 per 1,000 emails
- **Very cheap!**

---

### Option B: SendGrid (Easier Setup)

**Free Tier:** 100 emails/day

1. **Sign up:** https://sendgrid.com
2. **Verify email:** support@yourdomain.com
3. **Get API key**
4. **Add to backend config**

#### Cost:
- **Free:** 100 emails/day
- **Paid:** $19.95/month for 50,000 emails

---

### Option C: Mailgun (Developer Friendly)

**Free Tier:** 5,000 emails/month

1. **Sign up:** https://www.mailgun.com
2. **Verify domain**
3. **Get API key**
4. **Add to backend**

#### Cost:
- **Free:** 5,000 emails/month
- **Paid:** $35/month for 50,000 emails

---

## 🔧 Step 4: Configure Backend for Email

### 4.1 Add Email Service to Backend

Update `backend/Program.cs` to send emails when support tickets are created.

### 4.2 Environment Variables

Add to AWS Lambda environment variables (or backend config):

```
SMTP_HOST=smtp.email.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SUPPORT_EMAIL=support@yourdomain.com
```

---

## 🚀 Step 5: Deploy Backend to AWS Lambda

### Option A: Using AWS SAM (Recommended)

1. **Install AWS SAM CLI:**
   ```bash
   # Follow: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   ```

2. **Deploy:**
   ```bash
   cd backend
   sam build
   sam deploy --guided
   ```

3. **Get API URL:**
   - After deployment, SAM outputs API Gateway URL
   - Update Amplify environment variable: `VITE_API_URL`

### Option B: Using AWS Lambda Console

1. **Create Lambda Function:**
   - Go to AWS Lambda Console
   - Create function → Author from scratch
   - Runtime: .NET 8
   - Upload your backend code

2. **Create API Gateway:**
   - Create REST API
   - Create resources and methods
   - Deploy API

---

## 📝 Step 6: Update Configuration

### Frontend (Amplify):
- Environment variable: `VITE_API_URL` = Your API Gateway URL
- ⚠️ **ONLY** `VITE_API_URL` - no API keys here!

### Backend (Lambda):
- Environment variables:
  - `OPENAI_API_KEY` ⬅️ **This goes here, NOT in Amplify!**
  - `AMAZON_ASSOCIATE_TAG`
  - `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`
  - `SUPPORT_EMAIL`, `ADMIN_EMAIL`

---

## ✅ Deployment Checklist

- [ ] Code pushed to Git
- [ ] AWS Amplify app created
- [ ] Frontend deployed to Amplify
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Backend deployed to Lambda
- [ ] API Gateway URL obtained
- [ ] Frontend environment variable updated
- [ ] Email service configured (SES/SendGrid/Mailgun)
- [ ] Support email verified
- [ ] Test support form sends emails
- [ ] Test premium features work
- [ ] Test unlimited translations

---

## 💰 Estimated Monthly Costs

**For small scale (< 1000 users):**

| Service | Cost |
|---------|------|
| AWS Amplify | **FREE** (1000 build minutes/month) |
| AWS Lambda | **FREE** (1M requests/month) |
| API Gateway | **FREE** (1M requests/month) |
| AWS SES | **FREE** (62k emails/month) |
| Domain | $10-15/year |
| **Total** | **~$1/month** |

---

## 🎯 Quick Start Commands

```bash
# 1. Push to Git
git add .
git commit -m "Ready for deployment"
git push origin master

# 2. Deploy backend (if using SAM)
cd backend
sam build
sam deploy --guided

# 3. Update Amplify environment variable
# Go to Amplify Console → App settings → Environment variables
# Set: VITE_API_URL = https://your-api-url.amazonaws.com/Prod
```

---

## 📚 Next Steps After Deployment

1. **Test the app** on Amplify URL
2. **Set up email notifications** for support tickets
3. **Monitor usage** in AWS CloudWatch
4. **Set up alerts** for errors
5. **Configure backups** (if using DynamoDB)

---

**Ready to deploy?** Follow the steps above! 🚀

