# ⚡ Quick Admin Setup (30 Seconds)

## 🚀 Method 1: PowerShell Script (Easiest - No Console Needed)

1. **Get your User ID from browser:**
   - Open http://localhost:3000
   - Press F12 → Console tab
   - Type: `localStorage.getItem('petBehaviorUserId')`
   - Copy the user ID (like `user_1234567890_abc123`)

2. **Run PowerShell script:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File set-admin.ps1
   ```
   - Paste your user ID when prompted
   - Or just press Enter to use "admin" as user ID

3. **If you used "admin"**, update your browser:
   - In console, type: `localStorage.setItem('petBehaviorUserId', 'admin')`
   - Refresh page

4. **Done!** Refresh browser to see premium badge

---

## 🚀 Method 2: Direct URL (No Code - Safest)

1. **Get your User ID:**
   - Open http://localhost:3000
   - Press F12 → Console
   - Type: `localStorage.getItem('petBehaviorUserId')`
   - Copy the user ID

2. **Visit this URL** (replace YOUR_USER_ID):
   ```
   http://localhost:5001/api/admin/set-premium/YOUR_USER_ID
   ```
   Example:
   ```
   http://localhost:5001/api/admin/set-premium/user_1234567890_abc123
   ```

3. **You'll see:** `{"success":true,"isPremium":true,...}`

4. **Refresh your app** at http://localhost:3000

---

## 🚀 Method 3: Browser Console (Type Manually)

**If browser blocks pasting, type this manually:**

1. Open http://localhost:3000
2. Press F12 → Console tab
3. **Type each line separately:**

```javascript
// Step 1: Get your user ID
const userId = localStorage.getItem('petBehaviorUserId');
console.log('User ID:', userId);

// Step 2: Set to premium (type carefully)
fetch('http://localhost:5001/api/admin/set-premium/' + userId, {method: 'POST'})
  .then(response => response.json())
  .then(data => {
    console.log('✅ You are now admin!', data);
    location.reload();
  });
```

4. Press Enter after typing the code
5. Page will refresh automatically

---

## 🎯 That's It!

You now have:
- ✅ Unlimited translations
- ✅ No daily limits
- ✅ Premium status

---

## 🔄 Need to Do This Again?

**After server restart:** Just run the same command again in browser console.

**Or use the PowerShell script:**
```powershell
powershell -ExecutionPolicy Bypass -File set-admin.ps1
```

---

**Enjoy unlimited access! 👑**

