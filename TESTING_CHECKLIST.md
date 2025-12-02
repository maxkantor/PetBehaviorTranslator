# ✅ Premium Features Testing Checklist

## 🎯 Quick Test Results

**Backend Status:** ✅ Running on http://localhost:5001
**Frontend Status:** ✅ Running on http://localhost:3000
**Usage Endpoint:** ✅ Working
**Premium Status Endpoint:** ✅ Working

---

## 📋 Step-by-Step Testing Guide

### Test 1: Verify Backend Endpoints ✅

**Test Usage Endpoint:**
```powershell
Invoke-WebRequest -Uri "http://localhost:5001/api/usage/test-user-123" -Method GET
```
**Expected:** `{"dailyCount":0,"isPremium":false,"dailyLimit":5,"remaining":5}`

**Test Premium Status Endpoint:**
```powershell
$body = @{ userId = "test-user-123"; isPremium = $true; expiresAt = (Get-Date).AddMonths(1).ToString("o") } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:5001/api/premium/status" -Method POST -Body $body -ContentType "application/json"
```
**Expected:** `{"success":true,"isPremium":true}`

---

### Test 2: Test Frontend Usage Display

1. **Open Browser:** http://localhost:3000
2. **Check Usage Badge:**
   - Should show "5 translations remaining today"
   - Should have "Upgrade to Premium" link
3. **Verify User ID:**
   - Open browser console (F12)
   - Check localStorage: `localStorage.getItem('petBehaviorUserId')`
   - Should have a user ID like `user_1234567890_abc123`

---

### Test 3: Test Daily Limit (5 Translations)

**Steps:**
1. Make translation #1: "My dog barks at night"
   - ✅ Should work
   - ✅ Usage badge should show "4 translations remaining"

2. Make translation #2: "My cat meows constantly"
   - ✅ Should work
   - ✅ Usage badge should show "3 translations remaining"

3. Make translation #3: "Puppy biting hands"
   - ✅ Should work
   - ✅ Usage badge should show "2 translations remaining"

4. Make translation #4: "Cat scratching furniture"
   - ✅ Should work
   - ✅ Usage badge should show "1 translation remaining"

5. Make translation #5: "Dog won't eat"
   - ✅ Should work
   - ✅ Usage badge should show "0 translations remaining" or "Daily limit reached"

6. **Try translation #6:** "Cat hiding under bed"
   - ❌ Should show error: "Daily limit reached! Upgrade to Premium for unlimited translations."
   - ❌ Should NOT process the translation

---

### Test 4: Test Premium Status

**Option A: Via API (Quick Test)**
```powershell
# Set premium status
$body = @{ userId = "YOUR_USER_ID"; isPremium = $true; expiresAt = (Get-Date).AddMonths(1).ToString("o") } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:5001/api/premium/status" -Method POST -Body $body -ContentType "application/json"

# Refresh page and check
# Should show "Premium Member - Unlimited Translations" badge
# Should allow unlimited translations
```

**Option B: Via Frontend (Manual)**
1. Get your user ID from localStorage
2. Use API call above to set premium
3. Refresh frontend page
4. Should see premium badge
5. Make 10+ translations - all should work

---

### Test 5: Test Error Handling

1. **Empty Behavior:**
   - Click "Translate Behavior" with empty text
   - ✅ Should show: "Please describe your pet's behavior"

2. **Daily Limit Reached:**
   - After 5 translations, try 6th
   - ✅ Should show limit error
   - ✅ Should NOT call OpenAI API

3. **Network Error:**
   - Stop backend server
   - Try translation
   - ✅ Should show error message

---

### Test 6: Test Usage Reset

**Note:** Daily reset happens at midnight UTC. To test reset:

1. **Manual Reset Test:**
   - Set `LastResetDate` to yesterday in backend
   - Make a translation
   - Check if count resets to 0

2. **Or wait until midnight UTC** and verify count resets

---

## 🔍 What to Verify

### Backend:
- ✅ `/api/usage/{userId}` returns correct data
- ✅ `/api/premium/status` sets premium correctly
- ✅ `/api/translate` checks limits before processing
- ✅ Daily count increments correctly
- ✅ Limit enforced after 5 translations
- ✅ Premium users bypass limits

### Frontend:
- ✅ Usage badge displays correctly
- ✅ Remaining count updates after each translation
- ✅ Premium badge shows for premium users
- ✅ Error messages display when limit reached
- ✅ Upgrade link works
- ✅ User ID persists in localStorage

---

## 🐛 Common Issues & Fixes

### Issue: Endpoints return 404
**Fix:** Restart backend server to load new endpoints

### Issue: Usage not updating
**Fix:** Check that `userId` is being sent in translate request

### Issue: Limit not enforced
**Fix:** Verify backend is checking limits before processing

### Issue: Premium status not working
**Fix:** Check that premium status endpoint is called correctly

---

## 📊 Expected Test Results

| Test | Expected Result | Status |
|------|----------------|--------|
| Usage Endpoint | Returns usage data | ✅ |
| Premium Status | Sets premium correctly | ✅ |
| 5 Translations | All work | ⏳ Test Now |
| 6th Translation | Shows limit error | ⏳ Test Now |
| Premium User | Unlimited access | ⏳ Test Now |
| Usage Display | Shows correct count | ⏳ Test Now |

---

## 🎉 Next Steps After Testing

Once all tests pass:
1. ✅ Proceed with Stripe integration
2. ✅ Create premium checkout page
3. ✅ Set up webhook handling
4. ✅ Deploy to AWS

---

**Ready to test?** Open http://localhost:3000 and start making translations!

