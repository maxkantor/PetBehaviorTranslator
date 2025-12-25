# 🔐 Single Admin User ID Setup (Works on Any Device)

Perfect for travelers! Set up one admin user ID that works on **any PC, any browser, anywhere**.

---

## 🎯 The Solution

1. **Set a fixed admin user ID** in AWS Secrets Manager (e.g., `admin_user`)
2. **Grant admin access** to that user ID via API
3. **Activate on any device** by visiting a simple page

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Choose Your Admin User ID

Pick a simple, memorable ID like:
- `admin_user`
- `travel_admin`
- `main_admin`
- Or any ID you prefer

**Recommendation:** Use `admin_user` (simple and clear)

### Step 2: Set in AWS Secrets Manager

1. Go to AWS Secrets Manager: https://console.aws.amazon.com/secretsmanager
2. Select `/pettranslator/app-secrets`
3. Edit secret value
4. Set: `"ADMIN_USER_ID": "admin_user"` (or your chosen ID)
5. Save

### Step 3: Grant Admin Access to That User ID

Use the API endpoint to grant admin access:

```bash
# Replace with your backend URL
BACKEND_URL="https://your-api.execute-api.us-east-1.amazonaws.com/Prod"
ADMIN_ID="admin_user"

curl -X POST "${BACKEND_URL}/api/admin/set-premium/${ADMIN_ID}"
```

**Or use browser console:**
```javascript
const BACKEND_URL = 'https://your-api.execute-api.us-east-1.amazonaws.com/Prod';
const ADMIN_ID = 'admin_user';

fetch(`${BACKEND_URL}/api/admin/set-premium/${ADMIN_ID}`, {
  method: 'POST'
})
.then(res => res.json())
.then(data => console.log('✅ Admin granted!', data));
```

### Step 4: Deploy Activation Page

The `activate-admin.html` page is ready! Just deploy it to your site.

**Or use this bookmarklet on any device:**

```javascript
javascript:(function(){localStorage.setItem('petBehaviorUserId','admin_user');location.reload();})();
```

---

## 🚀 Using on Any Device

### Method 1: Visit Activation Page (Easiest)

1. Go to: `https://www.petbehaviortranslator.com/activate-admin.html`
2. Click **"Activate Admin on This Device"**
3. Done! ✅

**Bookmark this page** for instant access on any device!

### Method 2: Browser Console

On any device, open console (F12) and run:

```javascript
localStorage.setItem('petBehaviorUserId', 'admin_user');
location.reload();
```

### Method 3: Bookmarklet (One-Click)

Create a bookmark with this URL:

```
javascript:(function(){localStorage.setItem('petBehaviorUserId','admin_user');location.reload();})();
```

Click the bookmark on any device to activate admin instantly!

---

## 📋 Complete Setup Checklist

- [ ] Choose admin user ID (e.g., `admin_user`)
- [ ] Set `ADMIN_USER_ID` in AWS Secrets Manager
- [ ] Grant admin access via API: `/api/admin/set-premium/admin_user`
- [ ] Deploy `activate-admin.html` to your site
- [ ] Test on one device
- [ ] Bookmark activation page
- [ ] Test on different device/PC

---

## 🔧 Customizing the Admin User ID

If you want to use a different admin ID (not `admin_user`):

### Option 1: Update Activation Page

Edit `frontend/activate-admin.html`:

```javascript
// Change this line:
const ADMIN_USER_ID = 'your_custom_admin_id';
```

### Option 2: Use Environment Variable

You could make it configurable, but for simplicity, just hardcode it in the activation page.

---

## ✅ How It Works

1. **Backend:** Checks `ADMIN_USER_ID` from Secrets Manager
2. **Frontend:** Sets `localStorage.petBehaviorUserId` to that admin ID
3. **Result:** You're logged in as admin on any device!

---

## 🎯 Benefits

✅ **One admin account** - Same ID everywhere  
✅ **Works on any device** - PC, Mac, phone, tablet  
✅ **No Secrets Manager updates** - Set once, use forever  
✅ **Quick activation** - 30 seconds on new device  
✅ **Bookmarkable** - One-click activation  

---

## 🛠️ Troubleshooting

### Problem: "Access Denied" on admin page

**Solution:**
1. Verify `ADMIN_USER_ID` is set correctly in Secrets Manager
2. Verify you granted admin access: `curl -X POST BACKEND_URL/api/admin/set-premium/admin_user`
3. Restart Lambda (or wait 5 minutes for cache)
4. Check CloudWatch logs for `[ADMIN CHECK]` messages

### Problem: Activation page doesn't work

**Solution:**
1. Make sure `activate-admin.html` is deployed
2. Check browser console for errors
3. Verify the admin ID matches what's in Secrets Manager

### Problem: Different user ID on each device

**This is normal!** The activation page fixes this by setting the same admin ID on all devices.

---

## 📱 Mobile Access

On mobile, bookmark the activation page:

1. Visit: `https://www.petbehaviortranslator.com/activate-admin.html`
2. Add to home screen (iOS) or bookmark (Android)
3. Tap to activate admin anytime!

---

## 🔄 Workflow for Travelers

**On a new device:**

1. Open browser
2. Visit: `https://www.petbehaviortranslator.com/activate-admin.html`
3. Click "Activate Admin"
4. Done! ✅

**Takes 30 seconds!**

---

## 💡 Pro Tips

1. **Bookmark the activation page** - Fastest way to activate
2. **Use the bookmarklet** - Works even if page isn't deployed
3. **Set browser sync** - If you sync bookmarks, activation is even faster
4. **Save the bookmarklet** - Works offline (after first activation)

---

## 🎉 Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Set `ADMIN_USER_ID` in Secrets Manager | 2 min |
| 2 | Grant admin access via API | 30 sec |
| 3 | Deploy activation page | 1 min |
| 4 | Bookmark activation page | 10 sec |
| **Total Setup** | | **~4 min** |
| **Activate on New Device** | Visit activation page | **30 sec** |

---

**That's it!** You now have a single admin account that works on **any device, anywhere in the world**! 🌍✈️

