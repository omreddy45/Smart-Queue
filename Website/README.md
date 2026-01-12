# SmartQueue - Campus Canteen Management System

A smart digital waiting token system for campus canteens featuring AI-powered wait time predictions, real-time order management, and Razorpay payment integration.

## Features

✨ **Real-time Order Management**
- Live order tracking with event-based updates
- Kitchen Display System (KDS) for staff
- Admin dashboard with analytics

🎯 **AI-Powered Analytics**
- Gemini-powered detailed reports
- Best-selling item analysis
- Data-driven recommendations

💳 **Payment Integration**
- Razorpay integration for online orders
- Secure backend proxy for payment processing
- Demo mode available

📊 **Admin Dashboard**
- Real-time KPIs and metrics
- Order history and analytics
- Sales performance tracking

## Local Development

### Prerequisites
- Node.js 18+ and npm
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/SmartQueue.git
   cd SmartQueue
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```

4. **Add your API keys to `.env.local`**
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_RAZORPAY_KEY_ID=your_razorpay_test_key
   VITE_RAZORPAY_KEY_SECRET=your_razorpay_secret_key
   ```

5. **Start development servers**
   
   Terminal 1 - Frontend (Vite):
   ```bash
   npm run dev
   ```
   
   Terminal 2 - Backend (Express):
   ```bash
   npm run backend
   ```

6. **Open browser**
   ```
   http://localhost:5173
   ```

### Demo Data Initialization

To quickly test with 400 completed orders:

1. Navigate to `http://localhost:5173/demo-init.html`
2. Click **"Initialize Demo Data"**
3. This will:
   - Keep only VITFC canteen
   - Create 400 completed orders spread across today
   - Use all 7 food items

Then login as admin:
- Canteen: VITFC
- Password: `admin123`

## Deployment on Vercel

### Prerequisites
- Vercel account (free at vercel.com)
- GitHub account with repository pushed

### Step-by-Step Deployment

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: SmartQueue app"
   git branch -M main
   git remote add origin https://github.com/your-username/SmartQueue.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add these variables:
     ```
     VITE_GEMINI_API_KEY: your_api_key
     VITE_RAZORPAY_KEY_ID: your_razorpay_test_key
     VITE_RAZORPAY_KEY_SECRET: your_razorpay_secret_key
     ```

4. **Deploy**
   - Vercel will automatically deploy when you push to GitHub
   - Your app will be available at `https://smartqueue-[random].vercel.app`

### API Routes
- Frontend: `https://smartqueue-[random].vercel.app`
- Backend API: `https://smartqueue-[random].vercel.app/api/create-order`

**Important**: The Razorpay order creation endpoint is automatically available at `/api/create-order` on Vercel. No additional backend server needed!

## Project Structure

```
SmartQueue/
├── src/
│   ├── components/          # React components
│   ├── services/            # Backend services & Gemini integration
│   ├── App.tsx              # Main app component
│   └── index.tsx            # Entry point
├── api/
│   └── create-order.js      # Vercel serverless function for Razorpay
├── backend/
│   └── server.js            # Local Express server (dev only)
├── public/
│   └── demo-init.html       # Demo data initialization page
├── vercel.json              # Vercel configuration
├── .env.example             # Environment variables template
└── package.json             # Dependencies
```

## Technologies Used

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js (local), Vercel Serverless Functions (production)
- **AI**: Google Gemini 1.5 Flash
- **Payments**: Razorpay
- **Database**: localStorage (can extend with Firebase)
- **Real-time**: Event-based updates + polling

## API Endpoints

### Order Creation (Razorpay)
- **Endpoint**: `POST /api/create-order`
- **Body**:
  ```json
  {
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123",
    "notes": {}
  }
  ```

### Health Check
- **Endpoint**: `GET /api/health`
- **Response**: `{ "status": "Backend server is running" }`

## Demo Credentials

**Admin Login**
- Any registered canteen
- Password: `admin123` or the canteen ID

**Razorpay Test Credentials**
- Key ID: `rzp_test_S2ZiBOtNgg2gta`
- Secret: `9UUuvkyxieO4PnwvwUB8WMQF`

## Troubleshooting

### Razorpay Orders Not Creating
- Verify backend server is running: `npm run backend` (local) or check Vercel API routes (production)
- Check environment variables are set correctly
- Ensure `.env.local` has correct Razorpay credentials

### Admin Login Not Working
- Make sure you've registered a canteen first
- Use "admin123" as password or the canteen ID
- Clear browser cache and localStorage if needed

### Real-time Updates Not Working
- Check browser console for errors
- Verify event listeners are enabled
- Try refreshing the page

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please open an issue on GitHub or contact the development team.

---

**Made with ❤️ for campus dining management**
