# 🚦 Rate Limit Troubleshooting Guide

## What is a Rate Limit?

OpenAI API has rate limits to prevent abuse and ensure fair usage. When you hit the rate limit, you'll see the error: **"OpenAI API rate limit exceeded"**.

## Common Causes

1. **Free Tier Limits**: Free tier accounts have very low rate limits (3 requests/minute)
2. **Rapid Requests**: Making too many requests in a short time
3. **Account Tier**: Different account tiers have different limits

## Solutions

### 1. Wait and Retry
- **Free Tier**: Wait 1-2 minutes between requests
- **Paid Tier**: Usually resets within seconds to minutes
- The app will show an estimated wait time if available

### 2. Check Your Usage
Visit: https://platform.openai.com/usage
- See your current usage
- Check your rate limits
- Monitor your spending

### 3. Upgrade Your Account
- Free tier: 3 requests/minute, $0 credit
- Pay-as-you-go: Higher limits, pay per use
- Visit: https://platform.openai.com/account/billing

### 4. Reduce Request Frequency
- Don't spam the translate button
- Wait a few seconds between requests
- Use preset buttons instead of typing new behaviors repeatedly

## Current Model Being Used

The app uses **`gpt-4o-mini`** which is:
- ✅ The cheapest GPT-4 model
- ✅ Fast and efficient
- ✅ Still subject to rate limits

## Alternative Solutions

### Option 1: Use a Different API Key
If you have multiple OpenAI accounts, you can switch keys:
```powershell
$env:OPENAI_API_KEY="your-other-key-here"
```

### Option 2: Wait Periodically
- Free tier: Wait 1-2 minutes between requests
- Paid tier: Usually just a few seconds

### Option 3: Check Your Limits
Your rate limits depend on:
- Account type (free vs paid)
- Payment method
- Account age
- Usage history

## How to Check Your Current Limits

1. Go to https://platform.openai.com/account/limits
2. See your:
   - Requests per minute (RPM)
   - Tokens per minute (TPM)
   - Requests per day (RPD)

## Prevention Tips

1. **Don't spam requests** - Wait between translations
2. **Use presets** - They're faster and reduce typing
3. **Monitor usage** - Check your dashboard regularly
4. **Upgrade if needed** - For production use, consider paid tier

## Still Having Issues?

- Check OpenAI status: https://status.openai.com/
- Review OpenAI docs: https://platform.openai.com/docs/guides/rate-limits
- Contact OpenAI support if limits seem incorrect

---

**Note**: Rate limits are per API key, not per application. If you're sharing a key, all usage counts toward the same limit.


