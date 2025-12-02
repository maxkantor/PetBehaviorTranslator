# 🐛 Amplify URL Troubleshooting Guide

## 🔍 Quick Diagnosis

**Your URL:** https://master.d29dv0pugzc00n.amplifyapp.com/

### What error are you seeing?

1. **Blank white page?**
   - Check browser console (F12) for JavaScript errors
   - Likely build/configuration issue

2. **404 Not Found?**
   - Amplify routing issue
   - Need to configure redirects

3. **Page loads but features don't work?**
   - Backend not deployed (expected)
   - API calls failing

4. **Build failed in Amplify Console?**
   - Check build logs in Amplify Console
   - Likely dependency or configuration issue

---

## 🔧 Common Fixes

### Fix 1: Configure React Router Redirects

**Problem:** React Router requires client-side routing configuration in Amplify.

**Solution:** Add `amplify.yml` with redirect rules or create a redirect file.

**Option A: Update `amplify.yml`** (Recommended)

The `amplify.yml` should be in your **root directory** (not in frontend/), or Amplify needs to know where your app is.

**Option B: Add `_redirects` file** (Simpler)

Create `frontend/public/_redirects` file:

```
/*    /index.html   200
```

This tells Amplify to serve `index.html` for all routes (required for React Router).

---

### Fix 2: Check Build Configuration

**Verify Amplify is building correctly:**

1. Go to Amplify Console → Your App → Build history
2. Click on the latest build
3. Check for errors in build logs

**Common build errors:**
- Missing dependencies
- Node version mismatch
- Build script errors

---

### Fix 3: Verify File Structure

**Amplify expects:**
```
Your Repo Root/
  ├── frontend/
  │   ├── package.json
  │   ├── vite.config.js
  │   ├── src/
  │   └── public/
  └── amplify.yml  (OR configure in Amplify Console)
```

**If `amplify.yml` is in `frontend/` folder:**
- Move it to root, OR
- Configure build settings in Amplify Console manually

---

### Fix 4: Check Base Directory in Amplify

If your frontend code is in a subfolder (`frontend/`):

1. Go to Amplify Console → App settings → Build settings
2. Set **Base directory:** `frontend`
3. Set **Build output:** `dist`

---

## 📋 Step-by-Step Diagnostic

### Step 1: Check Amplify Build Status

1. **Go to:** https://console.aws.amazon.com/amplify
2. **Click your app**
3. **Check Build history:**
   - ✅ Green checkmark = Build succeeded
   - ❌ Red X = Build failed (check logs)

**If build failed:**
- Click on the failed build
- Scroll through logs
- Look for error messages
- Common issues: missing packages, syntax errors, Node version

---

### Step 2: Check Browser Console

1. **Open:** https://master.d29dv0pugzc00n.amplifyapp.com/
2. **Press F12** to open Developer Tools
3. **Go to Console tab**
4. **Look for errors:**
   - Red error messages?
   - 404 errors for files?
   - CORS errors?

**Common console errors:**
- `Failed to load resource` = File not found
- `Uncaught ReferenceError` = JavaScript error
- `404` = Route not found (React Router issue)

---

### Step 3: Check Network Tab

1. **Open Developer Tools (F12)**
2. **Go to Network tab**
3. **Refresh page**
4. **Check what's loading:**
   - ✅ `index.html` loads?
   - ✅ `main.jsx` or `main-[hash].js` loads?
   - ✅ CSS files load?
   - ❌ Any 404 errors?

---

### Step 4: Verify Build Output

**Check if files were built correctly:**

1. Go to Amplify Console → Your app → Build settings
2. Verify build output directory: `dist`
3. Check if files are in the right place

---

## 🚨 Specific Error Solutions

### Error: "404 Not Found" when navigating

**Cause:** React Router needs redirect configuration.

**Fix:** Add `_redirects` file to `frontend/public/`:

```
/*    /index.html   200
```

Then commit and push:
```bash
git add frontend/public/_redirects
git commit -m "Add redirects for React Router"
git push
```

Amplify will auto-redeploy.

---

### Error: Blank white page

**Possible causes:**
1. JavaScript error (check console)
2. Build failed (check Amplify logs)
3. Wrong base directory

**Fix:**
1. Check browser console for errors
2. Check Amplify build logs
3. Verify base directory in Amplify settings

---

### Error: "Cannot GET /some-route"

**Cause:** React Router routes not configured.

**Fix:** Add redirects file (see above).

---

### Error: Build fails with "module not found"

**Cause:** Dependencies not installed or wrong Node version.

**Fix:**
1. Check `package.json` has all dependencies
2. Set Node version in Amplify:
   - Go to Build settings
   - Add in preBuild: `- nvm use 18` (or your Node version)

---

## ✅ Quick Checklist

- [ ] Build succeeded in Amplify Console
- [ ] No errors in browser console
- [ ] `index.html` loads
- [ ] JavaScript files load (check Network tab)
- [ ] `_redirects` file exists in `frontend/public/`
- [ ] Base directory configured correctly in Amplify
- [ ] Environment variables set (if needed)

---

## 🔧 Immediate Actions to Try

### Action 1: Add Redirects File

Create `frontend/public/_redirects`:

```
/*    /index.html   200
```

### Action 2: Move/Create amplify.yml in Root

If your repo structure is:
```
Repo Root/
  ├── frontend/
  └── backend/
```

Create `amplify.yml` in the **root**:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm install
    build:
      commands:
        - cd frontend
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

### Action 3: Check Amplify Build Settings

In Amplify Console:
- Base directory: `frontend` (if your code is in frontend/)
- Build output: `dist`
- Build command: `npm run build`
- Start command: (leave empty for static sites)

---

## 📞 What to Check Next

1. **What exact error do you see?**
   - Blank page?
   - 404?
   - Error message?
   - Something else?

2. **What shows in browser console (F12)?**
   - Any red error messages?
   - Copy and paste errors here

3. **What's in Amplify build logs?**
   - Build succeeded or failed?
   - Any error messages?

4. **Does the page load at all?**
   - Completely blank?
   - HTML but no React?
   - Partial loading?

---

**Once you provide these details, I can give you a specific fix!**

