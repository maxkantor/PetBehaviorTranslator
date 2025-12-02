# 📧 Email Setup Guide for Customer Support

## 🎯 Goal
Set up a professional support email (e.g., `support@yourdomain.com`) to receive customer support tickets.

---

## 🏆 Recommended: AWS SES (Simple Email Service)

### Why AWS SES?
- ✅ **FREE:** 62,000 emails/month (within AWS)
- ✅ **Cheap:** $0.10 per 1,000 emails after free tier
- ✅ **Integrated:** Works seamlessly with AWS Lambda
- ✅ **Reliable:** Enterprise-grade email delivery

---

## 📋 Step-by-Step: AWS SES Setup

### Step 1: Verify Your Domain in SES

1. **Go to AWS SES Console:**
   - https://console.aws.amazon.com/ses
   - Select region: **us-east-1** (recommended)

2. **Create Verified Identity:**
   - Click "Verified identities" → "Create identity"
   - Choose "Domain"
   - Enter your domain: `yourdomain.com`
   - Click "Create identity"

3. **Add DNS Records:**
   - SES will provide DNS records to add
   - Go to your domain registrar (Namecheap, Route 53, etc.)
   - Add the provided DNS records:
     - **CNAME records** for DKIM verification
     - **TXT record** for domain verification
   - Wait 15-60 minutes for verification

4. **Verify Email Address:**
   - While domain verifies, also verify: `support@yourdomain.com`
   - Click "Create identity" → "Email address"
   - Enter: `support@yourdomain.com`
   - Check email and click verification link

---

### Step 2: Request Production Access (Optional)

**Sandbox Mode (Default):**
- Can only send to verified email addresses
- Good for testing

**Production Mode:**
- Can send to any email address
- Required for customer support

**To Request:**
1. Go to SES Console → Account dashboard
2. Click "Request production access"
3. Fill out form:
   - Use case: Customer support
   - Website URL: Your Amplify URL
   - Expected volume: < 10,000/month (for small scale)
4. Submit request (usually approved in 24 hours)

---

### Step 3: Get SMTP Credentials

1. **Go to SMTP Settings:**
   - SES Console → SMTP settings
   - Click "Create SMTP credentials"

2. **Create IAM User:**
   - Enter username: `ses-smtp-user`
   - Click "Create"
   - **SAVE THE CREDENTIALS** (shown only once!)

3. **Note SMTP Details:**
   - **Server:** `email-smtp.us-east-1.amazonaws.com` (or your region)
   - **Port:** 587 (TLS) or 465 (SSL)
   - **Username:** Your SMTP username
   - **Password:** Your SMTP password

---

### Step 4: Configure Backend

#### Option A: Environment Variables (Recommended)

Add to AWS Lambda environment variables:

```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SUPPORT_EMAIL=support@yourdomain.com
ADMIN_EMAIL=your-admin@email.com
```

#### Option B: appsettings.json (Development)

```json
{
  "Email": {
    "SmtpHost": "email-smtp.us-east-1.amazonaws.com",
    "SmtpPort": 587,
    "SmtpUsername": "your-smtp-username",
    "SmtpPassword": "your-smtp-password",
    "SupportEmail": "support@yourdomain.com",
    "AdminEmail": "your-admin@email.com"
  }
}
```

---

## 🔧 Alternative: SendGrid (Easier, but Paid)

### Setup Steps:

1. **Sign Up:** https://sendgrid.com
2. **Verify Email:**
   - Settings → Sender Authentication
   - Verify: `support@yourdomain.com`
3. **Get API Key:**
   - Settings → API Keys
   - Create API key with "Mail Send" permissions
4. **Configure Backend:**
   - Use SendGrid API instead of SMTP
   - Add API key to environment variables

**Cost:**
- Free: 100 emails/day
- Paid: $19.95/month for 50,000 emails

---

## 🔧 Alternative: Mailgun (Developer Friendly)

### Setup Steps:

1. **Sign Up:** https://www.mailgun.com
2. **Verify Domain:**
   - Add DNS records to your domain
   - Verify domain ownership
3. **Get API Key:**
   - Settings → API Keys
   - Copy API key
4. **Configure Backend:**
   - Use Mailgun API
   - Add API key to config

**Cost:**
- Free: 5,000 emails/month
- Paid: $35/month for 50,000 emails

---

## 📝 Email Templates

### Support Ticket Confirmation (to Customer)

**Subject:** Support Ticket Received - #{ticketId}

**Body:**
```
Hi,

Thank you for contacting Pet Behavior Translator support!

Your support ticket has been received:
- Ticket ID: {ticketId}
- Priority: {priority}
- Response Time: {responseTime}

We'll get back to you within {responseTime}.

Best regards,
Pet Behavior Translator Support Team
```

### Support Ticket Notification (to Admin)

**Subject:** New Support Ticket - #{ticketId} - {priority}

**Body:**
```
New support ticket received:

Ticket ID: {ticketId}
User ID: {userId}
Email: {email}
Subject: {subject}
Priority: {priority}
Message:
{message}

---
Respond at: {supportEmail}
```

---

## 🧪 Testing Email Setup

### Test Locally:

1. **Configure email in `appsettings.json`**
2. **Create test support ticket**
3. **Check email inbox**

### Test in Production:

1. **Submit support form on live site**
2. **Check support email inbox**
3. **Verify admin notification received**

---

## 🔒 Security Best Practices

1. **Never commit credentials** to Git
2. **Use environment variables** in production
3. **Rotate SMTP passwords** regularly
4. **Use IAM roles** when possible (AWS)
5. **Enable email encryption** (TLS/SSL)

---

## 📊 Email Service Comparison

| Service | Free Tier | Cost After | Setup Difficulty |
|---------|-----------|------------|-----------------|
| **AWS SES** | 62k/month | $0.10/1k | Medium |
| **SendGrid** | 100/day | $19.95/mo | Easy |
| **Mailgun** | 5k/month | $35/mo | Easy |
| **Gmail SMTP** | Unlimited* | Free | Easy* |

*Gmail SMTP has daily limits and not recommended for production

---

## ✅ Recommended Setup

**For Production:**
1. **AWS SES** - Best for AWS integration, cheapest
2. **Verify domain** for professional emails
3. **Request production access** for unlimited sending
4. **Use environment variables** for credentials

**For Quick Testing:**
1. **SendGrid** - Easiest setup
2. **Verify email** (not domain)
3. **Use API key** in backend

---

## 🚀 Next Steps

1. Choose email service (AWS SES recommended)
2. Verify domain/email
3. Get credentials
4. Update backend configuration
5. Test email sending
6. Deploy to production

---

**Need help?** Check AWS SES documentation: https://docs.aws.amazon.com/ses/

