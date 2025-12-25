# 🔐 PowerShell Admin Setup Guide

PowerShell scripts for granting admin access on Windows (or PowerShell Core on Mac/Linux).

---

## 📋 Available Scripts

| Script | Purpose |
|--------|---------|
| `grant-my-admin.ps1` | Grant admin to YOUR current user_id from live site |
| `amplify-admin-setup.ps1` | Create admin_user account on backend |

---

## 🚀 Quick Start

### Method 1: Grant Admin to Your Current User (Recommended)

**Step 1:** Get your user_id from https://www.petbehaviortranslator.com/
- Open DevTools (F12)
- Console tab: `localStorage.getItem('petBehaviorUserId')`
- Copy the result

**Step 2:** Run the script:

```powershell
# Interactive mode (will prompt for values)
.\grant-my-admin.ps1

# Or with parameters
.\grant-my-admin.ps1 "https://your-api.execute-api.us-east-1.amazonaws.com/Prod" "user_1733196547123_abc123xyz"
```

---

### Method 2: Create Admin User Account

```powershell
# Interactive mode
.\amplify-admin-setup.ps1

# Or with backend URL
.\amplify-admin-setup.ps1 "https://your-api.execute-api.us-east-1.amazonaws.com/Prod"
```

Then activate in browser:
```javascript
localStorage.setItem('petBehaviorUserId', 'admin_user');
location.reload();
```

---

## 💻 Usage Examples

### Example 1: Full Interactive

```powershell
PS> .\grant-my-admin.ps1

📍 STEP 1: Enter Your Backend API URL
Backend URL: https://abc123.execute-api.us-east-1.amazonaws.com/Prod

🔍 STEP 2: Get Your User ID from Live Site
Enter your user_id: user_1733196547123_abc123xyz

🚀 STEP 3: Granting Admin Access
✅ SUCCESS! YOU NOW HAVE ADMIN ACCESS!
```

---

### Example 2: With Parameters

```powershell
PS> $backend = "https://abc123.execute-api.us-east-1.amazonaws.com/Prod"
PS> $userId = "user_1733196547123_abc123xyz"
PS> .\grant-my-admin.ps1 $backend $userId
```

---

### Example 3: Verify Status

```powershell
# Check your admin status
$backend = "https://your-api.execute-api.us-east-1.amazonaws.com/Prod"
$userId = "user_1733196547123_abc123xyz"
$encoded = [System.Uri]::EscapeDataString($userId)
Invoke-RestMethod -Uri "$backend/api/usage/$encoded" | ConvertTo-Json
```

---

## 🔧 Requirements

### PowerShell Version
- **Windows:** PowerShell 5.1+ (built-in)
- **Mac/Linux:** PowerShell Core 7.0+ (`pwsh`)

### Check Your Version
```powershell
$PSVersionTable.PSVersion
```

### Install PowerShell Core (if needed)
```powershell
# Windows (via winget)
winget install Microsoft.PowerShell

# Mac (via Homebrew)
brew install powershell/tap/powershell

# Linux (Ubuntu/Debian)
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y powershell
```

---

## 🛠️ Troubleshooting

### Problem: "Execution Policy" Error

**Error:**
```
.\grant-my-admin.ps1 : File cannot be loaded because running scripts is disabled on this system.
```

**Solution:**
```powershell
# Check current policy
Get-ExecutionPolicy

# Set for current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run with bypass (one-time)
powershell -ExecutionPolicy Bypass -File .\grant-my-admin.ps1
```

---

### Problem: "Cannot bind parameter" Error

**Error:**
```
Cannot bind parameter because an empty string was not allowed.
```

**Solution:** Make sure you provide both parameters or run interactively:
```powershell
# Interactive (recommended)
.\grant-my-admin.ps1

# Or provide both parameters
.\grant-my-admin.ps1 "BACKEND_URL" "USER_ID"
```

---

### Problem: SSL/TLS Certificate Error

**Error:**
```
The underlying connection was closed: Could not establish trust relationship
```

**Solution:**
```powershell
# Temporarily bypass SSL check (not recommended for production)
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

# Or use -SkipCertificateCheck (PowerShell 7+)
Invoke-RestMethod -Uri $url -SkipCertificateCheck
```

---

### Problem: "Invoke-RestMethod" Not Found

**Solution:** This cmdlet is built-in. If missing, you may need to:
```powershell
# Import required modules
Import-Module Microsoft.PowerShell.Utility
```

---

## 📊 Script Comparison

| Feature | Bash Script | PowerShell Script |
|---------|------------|-------------------|
| Platform | Mac/Linux | Windows/Mac/Linux |
| Color Output | ✅ | ✅ |
| JSON Parsing | Python required | Built-in |
| URL Encoding | sed/awk | Built-in |
| Error Handling | Basic | Advanced |
| Interactive | ✅ | ✅ |

---

## 🎯 Quick Commands Reference

```powershell
# Grant admin to your user
.\grant-my-admin.ps1 "BACKEND_URL" "USER_ID"

# Create admin_user account
.\amplify-admin-setup.ps1 "BACKEND_URL"

# Check status
$backend = "BACKEND_URL"
$userId = "USER_ID"
$encoded = [System.Uri]::EscapeDataString($userId)
Invoke-RestMethod -Uri "$backend/api/usage/$encoded"

# Remove admin (if needed)
$encoded = [System.Uri]::EscapeDataString($userId)
Invoke-RestMethod -Uri "$backend/api/admin/remove-premium/$encoded" -Method Post
```

---

## ✅ Checklist

- [ ] PowerShell 5.1+ or PowerShell Core 7.0+ installed
- [ ] Execution policy allows script running
- [ ] Backend URL from Amplify environment variables
- [ ] User ID from browser localStorage
- [ ] Scripts run successfully
- [ ] Admin status verified
- [ ] Browser refreshed (Ctrl+Shift+R)

---

## 💡 Pro Tips

1. **Save your values as variables:**
   ```powershell
   $backend = "https://your-api.execute-api.us-east-1.amazonaws.com/Prod"
   $userId = "user_1733196547123_abc123xyz"
   .\grant-my-admin.ps1 $backend $userId
   ```

2. **Create an alias:**
   ```powershell
   Set-Alias -Name GrantAdmin -Value ".\grant-my-admin.ps1"
   GrantAdmin $backend $userId
   ```

3. **Add to PowerShell profile:**
   ```powershell
   # Edit profile
   notepad $PROFILE
   
   # Add function
   function Grant-PetAdmin {
       param($Backend, $UserId)
       .\grant-my-admin.ps1 $Backend $UserId
   }
   ```

---

## 🆘 Need Help?

1. Check PowerShell version: `$PSVersionTable`
2. Check execution policy: `Get-ExecutionPolicy`
3. Run with verbose: `$VerbosePreference = "Continue"`
4. Check error details: `$Error[0] | Format-List -Force`

---

**Ready?** Run `.\grant-my-admin.ps1` and follow the prompts! 🚀


