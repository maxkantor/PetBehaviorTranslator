# 💎 Premium Feature Setup Guide

## ✅ What's Been Implemented

### Backend (✅ Complete)
- ✅ Usage tracking system (in-memory, ready for DynamoDB upgrade)
- ✅ Daily limit checking (5 translations/day for free users)
- ✅ Premium status endpoint
- ✅ Usage status endpoint
- ✅ Rate limiting for free tier users

### Frontend (✅ Complete)
- ✅ User ID generation (localStorage-based)
- ✅ Usage tracking service
- ✅ Usage display component
- ✅ Premium badge display
- ✅ Daily limit warnings
- ✅ Integration with translate endpoint

## 🚀 What's Next (To Complete Premium)

### 1. Stripe Integration (Required)

#### Step 1: Create Stripe Account
1. Go to https://stripe.com and create an account
2. Get your API keys from Dashboard → Developers → API keys
3. Get your Publishable key (starts with `pk_`) and Secret key (starts with `sk_`)

#### Step 2: Create a Price/Product
1. In Stripe Dashboard → Products
2. Create a new product: "Pet Behavior Translator Premium"
3. Set price: $4.99/month (recurring)
4. Copy the Price ID (starts with `price_`)

#### Step 3: Configure Backend
Add to `backend/appsettings.json`:
```json
"Premium": {
  "StripePublishableKey": "pk_test_...",
  "StripeSecretKey": "sk_test_...",
  "StripePriceId": "price_...",
  "WebhookSecret": ""  // Will be generated after webhook setup
}
```

Or use environment variables:
```powershell
$env:STRIPE_PUBLISHABLE_KEY="pk_test_..."
$env:STRIPE_SECRET_KEY="sk_test_..."
$env:STRIPE_PRICE_ID="price_..."
```

### 2. Install Stripe Package

Add to `backend/PetBehaviorTranslator.csproj`:
```xml
<PackageReference Include="Stripe.net" Version="45.0.0" />
```

Then run:
```bash
cd backend
dotnet restore
```

### 3. Create Stripe Checkout Endpoint

Add to `backend/Program.cs` (see implementation example below)

### 4. Update Premium Page

Add Stripe Checkout button to `frontend/src/pages/Premium.jsx`

### 5. Set Up Stripe Webhook

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-api-url.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.deleted`
4. Copy webhook secret to config

## 📋 Quick Start Checklist

- [ ] Create Stripe account
- [ ] Get Stripe API keys
- [ ] Create product/price in Stripe
- [ ] Add Stripe keys to backend config
- [ ] Install Stripe.net NuGet package
- [ ] Create checkout endpoint
- [ ] Update Premium page with checkout
- [ ] Set up webhook endpoint
- [ ] Test payment flow
- [ ] Deploy to AWS

## 💡 Current Status

**What Works:**
- ✅ Free tier: 5 translations/day limit
- ✅ Usage tracking and display
- ✅ Premium status checking
- ✅ Rate limiting

**What's Missing:**
- ⏳ Stripe payment integration
- ⏳ Premium checkout page
- ⏳ Webhook handling for payments
- ⏳ DynamoDB for persistent storage (optional upgrade)

## 🔄 Upgrade to DynamoDB (Optional)

Current implementation uses in-memory storage. For production, upgrade to DynamoDB:

1. Create DynamoDB table: `pet-behavior-users`
   - Partition key: `UserId` (String)
   - Attributes: DailyCount, LastResetDate, IsPremium, PremiumExpiresAt

2. Install AWS SDK:
```xml
<PackageReference Include="AWSSDK.DynamoDBv2" Version="3.7.400.0" />
```

3. Replace in-memory dictionary with DynamoDB calls

## 📊 Cost Breakdown

### Current Setup (Free):
- **Usage Tracking**: In-memory (FREE)
- **User Storage**: localStorage (FREE)
- **Backend**: Your existing server

### After Stripe Integration:
- **Stripe**: 2.9% + $0.30 per transaction
- **Everything else**: Still FREE

### After AWS Migration:
- **AWS Cognito**: FREE (50k MAU)
- **DynamoDB**: FREE (25GB, 200M requests)
- **Lambda**: FREE (1M requests)
- **S3**: FREE (5GB)
- **Amplify**: FREE (1000 build minutes)

**Total Cost: Only Stripe transaction fees!**

## 🎯 Next Steps

1. **Complete Stripe Integration** (See examples below)
2. **Test locally** with Stripe test mode
3. **Deploy to AWS** when ready
4. **Upgrade to DynamoDB** for production scale

---

**Need help?** Check `PREMIUM_IMPLEMENTATION_PLAN.md` for detailed architecture.

