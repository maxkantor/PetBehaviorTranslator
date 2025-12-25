# ✈️ Quick Travel Admin Setup

**Use one admin account on any device, anywhere in the world!**

---

## 🚀 3-Step Setup (One Time)

### Step 1: Set Admin User ID in Secrets Manager

1. AWS Secrets Manager → `/pettranslator/app-secrets`
2. Edit → Set: `"ADMIN_USER_ID": "admin_user"`
3. Save

### Step 2: Grant Admin Access

```bash
# Replace with your backend URL
curl -X POST "https://your-api.execute-api.us-east-1.amazonaws.com/Prod/api/admin/set-premium/admin_user"
```

### Step 3: Deploy Activation Page

Deploy `activate-admin.html` to your site.

---

## 📱 Using on Any Device (30 Seconds)

### Option 1: Visit Activation Page

Go to: `https://www.petbehaviortranslator.com/activate-admin.html`

Click **"Activate Admin"** → Done! ✅

### Option 2: Browser Console

F12 → Console → Paste:

```javascript
localStorage.setItem('petBehaviorUserId', 'admin_user');
location.reload();
```

### Option 3: Bookmarklet

Bookmark this URL:

```
javascript:(function(){localStorage.setItem('petBehaviorUserId','admin_user');location.reload();})();
```

Click bookmark → Instant admin! ⚡

---

## ✅ That's It!

- **Setup once:** 5 minutes
- **Activate on new device:** 30 seconds
- **Works everywhere:** Any PC, any browser, any country

---

## 🔖 Bookmark These URLs

1. **Activation Page:** `https://www.petbehaviortranslator.com/activate-admin.html`
2. **Main App:** `https://www.petbehaviortranslator.com/`
3. **Admin Dashboard:** `https://www.petbehaviortranslator.com/admin`

---

**Perfect for travelers!** 🌍✈️


