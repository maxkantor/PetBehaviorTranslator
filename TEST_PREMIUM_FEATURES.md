# 🧪 Premium Features Testing Guide

## ✅ Prerequisites
- Backend running on http://localhost:5001
- Frontend running on http://localhost:3000

## 🧪 Test Plan

### Test 1: Check Usage Endpoint
Test the usage API endpoint directly.

### Test 2: Test Daily Limit
Make 5 translations, then try a 6th one.

### Test 3: Test Premium Status
Set premium status and verify unlimited access.

### Test 4: Test Frontend Integration
Verify usage display and limit warnings work.

---

## 📋 Manual Testing Steps

### Step 1: Test Usage API
Open browser console and run:
```javascript
fetch('http://localhost:5001/api/usage/test-user-123')
  .then(r => r.json())
  .then(console.log)
```

Expected: `{ dailyCount: 0, isPremium: false, dailyLimit: 5, remaining: 5 }`

### Step 2: Test Translation with User ID
Make a translation through the UI and check usage updates.

### Step 3: Test Daily Limit
1. Make 5 translations (should all work)
2. Try 6th translation (should show limit message)
3. Check usage badge shows "0 remaining"

### Step 4: Test Premium Status
Set premium via API:
```javascript
fetch('http://localhost:5001/api/premium/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user-123',
    isPremium: true,
    expiresAt: new Date(Date.now() + 30*24*60*60*1000).toISOString()
  })
})
.then(r => r.json())
.then(console.log)
```

Then verify unlimited access works.

---

## 🔍 What to Check

✅ Usage endpoint returns correct data
✅ Daily count increments after each translation
✅ Limit enforced after 5 translations
✅ Premium status allows unlimited translations
✅ Usage badge displays correctly
✅ Error messages show when limit reached
✅ Premium badge shows for premium users

