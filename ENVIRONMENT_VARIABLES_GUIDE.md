# 🔐 Environment Variables Guide

## 📍 Where Each Variable Goes

### ✅ Frontend (AWS Amplify)

**Only ONE environment variable:**

```
VITE_API_URL=https://your-api-gateway-url.amazonaws.com/Prod
```

**Why?**
- Frontend only calls the backend API
- All OpenAI calls happen in the backend
- API keys should NEVER be exposed in the frontend

---

### ✅ Backend (AWS Lambda)

**All sensitive keys and configuration:**

```
OPENAI_API_KEY=sk-proj-...
AMAZON_ASSOCIATE_TAG=your-tag-here
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SUPPORT_EMAIL=support@yourdomain.com
ADMIN_EMAIL=your-admin@email.com
```

**Why?**
- Backend makes the OpenAI API calls
- Backend has access to secure environment variables
- API keys are never exposed to the browser

---

## 🔒 Security Best Practices

### ❌ NEVER Do This:

```javascript
// ❌ BAD - Never expose API keys in frontend code
const OPENAI_KEY = "sk-proj-..."  // DON'T DO THIS!
```

### ✅ Always Do This:

```javascript
// ✅ GOOD - Frontend only knows the backend URL
const API_URL = import.meta.env.VITE_API_URL
// All API calls go through backend
```

---

## 📊 Architecture Flow

```
User Browser (Frontend)
    ↓
    Calls: VITE_API_URL/api/translate
    ↓
AWS API Gateway
    ↓
AWS Lambda (Backend)
    ↓
    Uses: OPENAI_API_KEY
    ↓
OpenAI API
```

**Key Point:** The OpenAI API key never touches the frontend!

---

## 🎯 Quick Reference

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_API_URL` | **Amplify** | Backend API endpoint |
| `OPENAI_API_KEY` | **Lambda** | OpenAI API authentication |
| `AMAZON_ASSOCIATE_TAG` | **Lambda** | Affiliate tracking |
| `SMTP_*` | **Lambda** | Email service configuration |

---

## ✅ Checklist

- [ ] `VITE_API_URL` set in Amplify
- [ ] `OPENAI_API_KEY` set in Lambda (NOT Amplify!)
- [ ] `AMAZON_ASSOCIATE_TAG` set in Lambda
- [ ] Email variables set in Lambda (if using email)
- [ ] No API keys in frontend code
- [ ] No API keys in Git repository

---

**Remember:** Keep secrets in the backend, never in the frontend! 🔒

