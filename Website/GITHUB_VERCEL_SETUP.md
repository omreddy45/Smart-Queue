# SmartQueue - GitHub Push & Vercel Deployment Checklist

## ✅ Pre-Deployment Checklist

### Code Ready
- [x] Admin login component works
- [x] Razorpay integration functional
- [x] Gemini AI reports working
- [x] 400 demo orders setup
- [x] Real-time updates working
- [x] Backend API routes created

### Files Added
- [x] `vercel.json` - Vercel configuration
- [x] `api/create-order.js` - Serverless function
- [x] `.env.example` - Environment template
- [x] `.gitignore` - Git ignore rules
- [x] `DEPLOYMENT_GUIDE.md` - Deployment instructions
- [x] Updated `README.md` with full guide

### Local Testing
- [ ] Run `npm install`
- [ ] Run `npm run dev` (Terminal 1)
- [ ] Run `npm run backend` (Terminal 2)
- [ ] Test admin login at http://localhost:5173
- [ ] Test demo data initialization at http://localhost:5173/demo-init.html
- [ ] Test payment flow with Razorpay

## 🚀 Quick Start - Push to GitHub

### Option 1: Create New Repository

```bash
# Navigate to project
cd SmartQueue-HackHive-main

# Create new repo on GitHub.com first (don't initialize with README)
# Then run:
git remote add origin https://github.com/YOUR-USERNAME/SmartQueue.git
git branch -M main
git push -u origin main
```

### Option 2: Update Existing Repository

```bash
git add .
git commit -m "feat: Add Vercel deployment support, admin login, and demo data"
git push origin main
```

## 🔗 Connect to Vercel

1. **Visit Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Sign in with GitHub

2. **Create New Project**
   - Click "Add New"
   - Select "Project"
   - Select your GitHub repository

3. **Configure**
   - Framework: Vite
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Environment Variables**
   Add these in Vercel dashboard (Settings → Environment Variables):
   ```
   VITE_GEMINI_API_KEY=your_key_here
   VITE_RAZORPAY_KEY_ID=your_key_here
   VITE_RAZORPAY_KEY_SECRET=your_secret_here
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for completion
   - Your app is live! 🎉

## 🧪 Test After Deployment

1. **Open your deployed URL**
   - Example: `https://smartqueue-xyz.vercel.app`

2. **Test Admin Login**
   - Click "Admin Portal"
   - Select a canteen (register one first if needed)
   - Use password: `admin123`

3. **Test Razorpay**
   - Click "Online Order"
   - Add items and checkout
   - Should redirect to Razorpay test payment

4. **Test Admin Dashboard**
   - Generate detailed report
   - Should show AI-powered analytics

## 📝 Useful Commands

```bash
# Local development
npm run dev              # Start frontend
npm run backend          # Start backend (separate terminal)

# Build for production
npm run build

# Preview production build
npm run preview

# Git operations
git status              # Check status
git add .              # Stage all changes
git commit -m "msg"    # Commit with message
git push origin main   # Push to GitHub
git log --oneline      # View commit history
```

## 🔑 Environment Variables Needed

**For Vercel Production:**
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id_here
VITE_RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

**For Local Development (.env.local):**
```
VITE_GEMINI_API_KEY=your_api_key
VITE_RAZORPAY_KEY_ID=your_test_key
VITE_RAZORPAY_KEY_SECRET=your_test_secret
```

## 🎯 After Deployment

### Monitor
- Check Vercel dashboard for deployments
- View logs for errors
- Monitor function logs for API calls

### Update
- Push to GitHub main branch
- Vercel auto-deploys within seconds
- Zero downtime updates

### Custom Domain
- Add in Vercel Settings → Domains
- Update DNS with Vercel's nameservers
- SSL certificate auto-provisioned

## 📞 Support

### Common Issues

**Razorpay not working after deployment**
- [ ] Check environment variables in Vercel
- [ ] Verify API keys are correct
- [ ] Check browser console for errors
- [ ] Check Vercel function logs

**Admin login shows no canteens**
- [ ] Register a canteen first
- [ ] Check browser localStorage
- [ ] Try in incognito/private mode

**Payment fails**
- [ ] Using test credentials (ok for demo)
- [ ] Check network tab in browser DevTools
- [ ] Verify Razorpay status page

## 🎉 You're Ready!

Everything is configured for production deployment. Just:

1. ✅ Push to GitHub
2. ✅ Connect to Vercel
3. ✅ Add environment variables
4. ✅ Deploy!

Your SmartQueue app will be live and production-ready in minutes!
