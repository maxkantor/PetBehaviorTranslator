# ✅ Quick Deployment Checklist

## 🚀 Pre-Deployment

- [ ] Code committed and pushed to Git
- [ ] All features tested locally
- [ ] Environment variables documented
- [ ] Domain name purchased (optional)

---

## 📦 Step 1: Deploy Frontend to Amplify

- [ ] Go to https://console.aws.amazon.com/amplify
- [ ] Create new app → Connect repository
- [ ] Select branch: `master`
- [ ] Verify build settings (auto-detected from `amplify.yml`)
- [ ] Add environment variable: `VITE_API_URL` (will update after backend deploy)
- [ ] Deploy and wait for build
- [ ] Note the Amplify URL: `https://[id].amplifyapp.com`

---

## 🔧 Step 2: Deploy Backend to Lambda

- [ ] Install AWS SAM CLI (if using SAM)
- [ ] Run `sam build` in backend folder
- [ ] Run `sam deploy --guided`
- [ ] Set environment variables:
  - `OPENAI_API_KEY`
  - `AMAZON_ASSOCIATE_TAG`
  - `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`
  - `SUPPORT_EMAIL`, `ADMIN_EMAIL`
- [ ] Note the API Gateway URL

---

## 🌐 Step 3: Configure Domain

- [ ] In Amplify Console → Domain management
- [ ] Add your domain
- [ ] Add DNS records to domain registrar
- [ ] Wait for SSL certificate (15-60 min)
- [ ] Verify HTTPS works

---

## 📧 Step 4: Set Up Support Email

- [ ] Go to AWS SES Console
- [ ] Verify domain or email: `support@yourdomain.com`
- [ ] Create SMTP credentials
- [ ] Request production access (if needed)
- [ ] Add SMTP credentials to Lambda environment variables
- [ ] Test email sending

---

## 🔄 Step 5: Update Configuration

- [ ] Update Amplify environment variable: `VITE_API_URL` = Your API Gateway URL
- [ ] Redeploy frontend (or wait for auto-deploy)
- [ ] Test app on live URL
- [ ] Test support form sends emails

---

## ✅ Post-Deployment Testing

- [ ] Test translation feature
- [ ] Test daily limit (5 translations)
- [ ] Test premium features (set yourself to admin)
- [ ] Test support form
- [ ] Verify emails are received
- [ ] Test on mobile devices
- [ ] Check all links work

---

## 📊 Quick Reference

**Amplify URL:** `https://[id].amplifyapp.com`  
**API Gateway URL:** `https://[id].execute-api.[region].amazonaws.com/Prod`  
**Support Email:** `support@yourdomain.com`  
**Admin Email:** `your-admin@email.com`

---

## 🆘 Troubleshooting

**Build fails:**
- Check `amplify.yml` syntax
- Verify Node.js version
- Check build logs

**API not working:**
- Verify `VITE_API_URL` is set correctly
- Check CORS settings
- Verify Lambda function is deployed

**Emails not sending:**
- Check SMTP credentials
- Verify email is verified in SES
- Check Lambda logs for errors

---

**Ready?** Start with Step 1! 🚀

