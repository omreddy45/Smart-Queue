# SmartQueue Deployment Guide

## Quick Deployment to Vercel

This guide walks you through deploying SmartQueue to Vercel with full backend support.

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)
- API keys:
  - Gemini API key
  - Razorpay test credentials

### Step 1: Push Code to GitHub

```bash
# If you haven't pushed to GitHub yet
git remote add origin https://github.com/YOUR-USERNAME/SmartQueue.git
git branch -M main
git push -u origin main
```

### Step 2: Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Select **"Import from Git"**
4. Find your **SmartQueue** repository
5. Click **"Import"**

### Step 3: Configure Environment Variables

In the Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_GEMINI_API_KEY` | Your Gemini API key | Required for AI features |
| `VITE_RAZORPAY_KEY_ID` | Your Razorpay key ID | Test mode key |
| `VITE_RAZORPAY_KEY_SECRET` | Your Razorpay secret | Test mode secret |

### Step 4: Deploy

1. Click **"Deploy"**
2. Vercel will automatically build and deploy
3. Your app will be live at: `https://smartqueue-[hash].vercel.app`

### How Backend Works on Vercel

The backend automatically converts to **Serverless Functions**:

- **Frontend**: Served as static files from Vercel's CDN
- **API Routes**: Located in `/api` folder (automatically deployed as serverless functions)
- **Razorpay Integration**: Works through `/api/create-order` endpoint

**Important**: No separate backend server needed on Vercel! The Express code in `/backend/server.js` is for local development only.

### API Endpoints After Deployment

**Development (Local)**
```
Frontend:  http://localhost:5173
Backend:   http://localhost:3000
API:       http://localhost:3000/api/create-order
```

**Production (Vercel)**
```
Frontend:  https://smartqueue-[hash].vercel.app
Backend:   (Serverless, same domain)
API:       https://smartqueue-[hash].vercel.app/api/create-order
```

### Testing Payment Flow

1. Access your deployed app: `https://smartqueue-[hash].vercel.app`
2. Select **"Online Order"**
3. Try placing an order (uses Razorpay test mode)
4. Payments work without any additional backend!

### Continuous Deployment

Every time you push to GitHub:
```bash
git push origin main
```

Vercel automatically:
1. Detects the push
2. Builds the project
3. Deploys to production
4. Shows deployment status

### Monitoring & Logs

Check deployment logs in Vercel dashboard:
1. Go to your project
2. Click **"Deployments"**
3. Click on a deployment to see logs
4. Check **"Function Logs"** for API call details

### Common Issues

**Issue**: Razorpay not working after deployment
- **Solution**: Verify API keys are set in Environment Variables
- Check Vercel logs for errors

**Issue**: CORS errors on API calls
- **Solution**: CORS is automatically handled in `/api/create-order.js`
- Ensure Vercel deployment is complete

**Issue**: Frontend shows 404 for API routes
- **Solution**: Check that `/api/create-order.js` is deployed
- Verify `vercel.json` configuration

### Rollback to Previous Version

1. Go to Vercel project
2. Click **"Deployments"**
3. Find a previous deployment
4. Click **"Promote to Production"**

### Custom Domain

1. In Vercel project settings
2. Go to **Domains**
3. Add your custom domain
4. Follow DNS setup instructions

### Database & Storage

Currently uses **localStorage** (browser storage):
- Data persists per browser
- No server-side storage

To add persistent storage:
- Enable Firebase (uncomment in `firebaseConfig.ts`)
- Add Firebase credentials to environment variables
- Data automatically syncs

### Performance Tips

1. **CDN**: All assets cached globally by Vercel
2. **Serverless**: API routes auto-scale
3. **Build**: Optimized with Vite

### Support

For issues:
1. Check Vercel logs
2. Check browser console
3. Open GitHub issue

---

**Deployment Status**: ✅ Ready for production!
