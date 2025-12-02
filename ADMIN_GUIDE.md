# 👑 Admin Guide - Unlimited Access

## Quick Setup: Become an Admin

### Method 1: Using PowerShell Script (Easiest)

1. **Get your User ID from browser:**
   - Open http://localhost:3000
   - Press F12 to open browser console
   - Type: `localStorage.getItem('petBehaviorUserId')`
   - Copy the user ID (e.g., `user_1234567890_abc123`)

2. **Run the admin script:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File set-admin.ps1
   ```
   - When prompted, paste your user ID
   - Or press Enter to use "admin" as user ID

3. **If you used "admin" as user ID:**
   - Update your browser localStorage:
     ```javascript
     localStorage.setItem('petBehaviorUserId', 'admin')
     ```

4. **Refresh your browser**
   - You should now see "Premium Member - Unlimited Translations" badge

---

### Method 2: Using Browser Console (Fastest)

1. **Open browser console** (F12) at http://localhost:3000

2. **Get your current user ID:**
   ```javascript
   const userId = localStorage.getItem('petBehaviorUserId');
   console.log('Your User ID:', userId);
   ```

3. **Set yourself to premium:**
   ```javascript
   const userId = localStorage.getItem('petBehaviorUserId');
   fetch('http://localhost:5001/api/admin/set-premium/' + userId, {
     method: 'POST'
   })
   .then(r => r.json())
   .then(data => {
     console.log('✅ Admin status set!', data);
     location.reload(); // Refresh page
   });
   ```

---

### Method 3: Using API Endpoint Directly

**Option A: Using PowerShell**
```powershell
# Replace 'YOUR_USER_ID' with your actual user ID
$userId = "YOUR_USER_ID"
Invoke-WebRequest -Uri "http://localhost:5001/api/admin/set-premium/$userId" -Method POST
```

**Option B: Using curl (if available)**
```bash
curl -X POST http://localhost:5001/api/admin/set-premium/YOUR_USER_ID
```

**Option C: Using Browser**
Just visit this URL (replace YOUR_USER_ID):
```
http://localhost:5001/api/admin/set-premium/YOUR_USER_ID
```

---

## 🎯 Quick Admin Setup

### One-Line Browser Setup:
Open browser console (F12) and paste:

```javascript
fetch('http://localhost:5001/api/admin/set-premium/' + localStorage.getItem('petBehaviorUserId'), {method: 'POST'}).then(r => r.json()).then(d => {console.log('✅ Admin!', d); location.reload()});
```

That's it! Refresh and you're admin. 🎉

---

## ✅ Verify Admin Status

1. **Check in browser:**
   - Refresh http://localhost:3000
   - Should see "Premium Member - Unlimited Translations" badge

2. **Check via API:**
   ```javascript
   const userId = localStorage.getItem('petBehaviorUserId');
   fetch(`http://localhost:5001/api/usage/${userId}`)
     .then(r => r.json())
     .then(data => console.log('Status:', data));
   ```
   - Should show: `isPremium: true`, `dailyLimit: 2147483647`

3. **Test unlimited translations:**
   - Make 10+ translations
   - All should work without limits

---

## 🔧 Admin Features Available

### Current Admin Endpoints:

1. **Set Any User to Premium:**
   ```
   POST /api/admin/set-premium/{userId}
   ```

2. **Remove Premium Status (Revert to Normal User):**
   ```
   POST /api/admin/remove-premium/{userId}
   ```

3. **View All Users:**
   ```
   GET /api/admin/users
   ```

---

## 🔄 Revert to Normal User

### Method 1: PowerShell Script (Easiest)

1. Run the script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File set-admin.ps1
   ```
2. Choose option **2** (Remove Premium)
3. Enter your user ID (or press Enter for "admin")
4. Refresh your browser

### Method 2: Direct URL

1. Get your User ID from browser console:
   ```javascript
   localStorage.getItem('petBehaviorUserId')
   ```

2. Visit this URL (replace YOUR_USER_ID):
   ```
   http://localhost:5001/api/admin/remove-premium/YOUR_USER_ID
   ```

3. You'll see: `{"success":true,"isPremium":false,...}`

4. Refresh http://localhost:3000

### Method 3: Browser Console (Type Manually)

```javascript
// Get your user ID
const userId = localStorage.getItem('petBehaviorUserId');

// Remove premium status
fetch('http://localhost:5001/api/admin/remove-premium/' + userId, {method: 'POST'})
  .then(response => response.json())
  .then(data => {
    console.log('✅ Reverted to normal user!', data);
    location.reload();
  });
```

**What happens when you revert:**
- ✅ Premium status removed
- ✅ Daily limit set to 5 translations/day
- ✅ Usage count reset to 0
- ✅ Premium expiration cleared

### Future Admin Features (can be added):
- Reset user usage counts
- Set custom limits
- View usage statistics
- Manage subscriptions

---

## 💡 Tips

- **Admin status persists** until server restart (since we're using in-memory storage)
- **After server restart:** Just run the admin script again
- **Multiple admins:** Set multiple user IDs to premium
- **Check all users:** Visit `http://localhost:5001/api/admin/users`

---

## 🐛 Troubleshooting

**Issue: Still seeing limits**
- Check your user ID matches: `localStorage.getItem('petBehaviorUserId')`
- Verify premium status: Check `/api/usage/{userId}` endpoint
- Refresh the browser page

**Issue: Premium status lost after restart**
- This is normal with in-memory storage
- Just run the admin script again after restart
- Or upgrade to DynamoDB for persistent storage

---

**Enjoy unlimited translations! 🎉**

