# 🚀 MovieFlix Deployment Guide

Complete deployment instructions for the MovieFlix streaming platform.

## 📋 Pre-Deployment Checklist

### Required Accounts & Services
- [ ] **MongoDB Atlas** - Cloud database
- [ ] **Stripe** - Payment processing
- [ ] **Cloudinary** - Media storage
- [ ] **Vercel/Netlify** - Frontend hosting
- [ ] **Render/Railway** - Backend hosting
- [ ] **Domain registrar** (optional) - Custom domain

### Development Environment
- [ ] Node.js 18+ installed
- [ ] MongoDB running locally
- [ ] All environment variables configured
- [ ] Application running locally
- [ ] Database seeded with test data

## 🗄️ Database Setup (MongoDB Atlas)

### 1. Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new project named "MovieFlix"

### 2. Create Database Cluster
1. Click "Create a New Cluster"
2. Choose "Shared" (free tier)
3. Select your preferred cloud provider and region
4. Click "Create Cluster"

### 3. Configure Database Access
1. Go to "Database Access" in the sidebar
2. Click "Add New Database User"
3. Create username and password (save these!)
4. Set privileges to "Read and write to any database"

### 4. Configure Network Access
1. Go to "Network Access" in the sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Or add specific IP addresses for production

### 5. Get Connection String
1. Go to "Clusters" and click "Connect"
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password

```bash
# Example connection string
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/movieflix?retryWrites=true&w=majority
```

## 💳 Stripe Setup

### 1. Create Stripe Account
1. Go to [Stripe](https://stripe.com)
2. Sign up for an account
3. Complete account verification

### 2. Get API Keys
1. Go to Developers → API Keys
2. Copy "Publishable key" and "Secret key"
3. For production, use live keys (requires activated account)

### 3. Create Products and Prices
```bash
# Using Stripe CLI (install from https://stripe.com/docs/stripe-cli)
stripe login

# Create Basic Plan
stripe products create --name="Basic Plan" --description="Ad-supported access"
stripe prices create --product=prod_xxx --unit-amount=0 --currency=zar --recurring[interval]=month

# Create Pro Plan  
stripe products create --name="Pro Plan" --description="Unlimited ad-free access"
stripe prices create --product=prod_xxx --unit-amount=12000 --currency=zar --recurring[interval]=month
```

### 4. Setup Webhooks
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-backend-url.com/api/payments/webhook`
4. Select events:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret

## ☁️ Cloudinary Setup

### 1. Create Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com)
2. Sign up for a free account

### 2. Get API Credentials
1. Go to Dashboard
2. Copy Cloud Name, API Key, and API Secret
3. These will be used for media uploads

## 🖥️ Backend Deployment (Render)

### 1. Prepare Repository
```bash
# Make sure your code is pushed to GitHub
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Create Render Account
1. Go to [Render](https://render.com)
2. Sign up and connect your GitHub account

### 3. Create Web Service
1. Click "New" → "Web Service"
2. Connect your repository
3. Configure settings:
   - **Name**: movieflix-backend
   - **Environment**: Node
   - **Region**: Choose closest to your users
   - **Branch**: main
   - **Root Directory**: backend
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 4. Add Environment Variables
In the Render dashboard, add these environment variables:

```env
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend-domain.com
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/movieflix
JWT_SECRET=your_production_jwt_secret_make_it_very_long_and_complex
JWT_REFRESH_SECRET=your_production_refresh_secret_different_from_jwt
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
STRIPE_BASIC_PRICE_ID=price_basic_plan_id_from_stripe
STRIPE_PRO_PRICE_ID=price_pro_plan_id_from_stripe
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
EMAIL_FROM=noreply@yourdomain.com
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 5. Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Note your backend URL (e.g., `https://movieflix-backend.onrender.com`)

## 🌐 Frontend Deployment (Vercel)

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Configure Environment Variables
Create `.env.production` file:
```env
VITE_API_URL=https://your-backend-url.onrender.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_publishable_key
```

### 3. Deploy to Vercel
```bash
# From project root directory
vercel

# Follow the prompts:
# Set up and deploy? Y
# Which scope? Your account
# Link to existing project? N
# Project name: movieflix
# Directory: ./
# Override settings? N
```

### 4. Add Environment Variables via Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - `VITE_API_URL` = `https://your-backend-url.onrender.com/api`
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_your_live_stripe_publishable_key`

### 5. Redeploy
```bash
vercel --prod
```

## 🎬 Seed Production Database

### 1. Update Seed Script for Production
```bash
# On your local machine, update backend/.env to use production MongoDB URI
MONGODB_URI=your_production_mongodb_uri

# Run seed script
cd backend
npm run seed
```

Or create a separate production seed script with fewer test accounts.

## 🔧 Post-Deployment Configuration

### 1. Update Stripe Webhook URL
1. Go to Stripe Dashboard → Webhooks
2. Update endpoint URL to: `https://your-backend-url.onrender.com/api/payments/webhook`

### 2. Update CORS Origins
In `backend/server.js`, update CORS configuration:
```javascript
app.use(cors({
  origin: [
    'https://your-frontend-domain.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

### 3. Test Payment Flow
1. Create test account on your deployed frontend
2. Start free trial
3. Upgrade to Pro plan using Stripe test cards
4. Verify webhook events are received

## 🌍 Custom Domain Setup (Optional)

### 1. Frontend Domain (Vercel)
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning

### 2. Backend Domain (Render)
1. Go to Render Dashboard → Your Service → Settings
2. Add custom domain under "Custom Domains"
3. Update DNS records as instructed

## 📊 Monitoring & Logging

### 1. Render Logs
- View logs in Render dashboard
- Set up log alerts for errors

### 2. Vercel Analytics
- Enable Vercel Analytics for frontend monitoring
- Monitor Core Web Vitals

### 3. Stripe Dashboard
- Monitor payment events
- Set up email notifications for failed payments

## 🔒 Security Checklist

### Production Security
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Use HTTPS everywhere
- [ ] Set secure CORS origins
- [ ] Enable rate limiting
- [ ] Use environment variables for all secrets
- [ ] Set up proper error logging
- [ ] Configure CSP headers

### API Security
- [ ] Validate all inputs
- [ ] Implement proper authentication
- [ ] Use HTTPS for API calls
- [ ] Set up API rate limiting
- [ ] Log security events

## 🧪 Testing in Production

### 1. Create Test Accounts
```bash
# Admin account
Email: admin@yourdomain.com
Password: SecureAdminPassword123!

# Test user account  
Email: test@yourdomain.com
Password: TestUserPassword123!
```

### 2. Test Critical Flows
- [ ] User registration and login
- [ ] Movie browsing and search
- [ ] Video streaming
- [ ] Free trial signup
- [ ] Pro subscription upgrade
- [ ] Payment processing
- [ ] Admin panel access
- [ ] Mobile responsiveness

### 3. Test Payment Cards
Use Stripe test cards in production test mode:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002

## 📈 Performance Optimization

### 1. Frontend Optimization
- Enable Vercel compression
- Optimize images with Cloudinary
- Implement lazy loading
- Use code splitting

### 2. Backend Optimization
- Add MongoDB indexes
- Implement API caching
- Optimize database queries
- Use CDN for static assets

### 3. Database Optimization
```javascript
// Add these indexes in MongoDB
db.movies.createIndex({ title: "text", overview: "text" })
db.movies.createIndex({ genres: 1 })
db.movies.createIndex({ releaseDate: -1 })
db.movies.createIndex({ views: -1 })
db.users.createIndex({ email: 1 })
db.subscriptions.createIndex({ user: 1 })
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Backend Won't Start
- Check environment variables
- Verify MongoDB connection string
- Check Node.js version compatibility

#### 2. Frontend API Calls Fail
- Verify VITE_API_URL is correct
- Check CORS configuration
- Verify backend is running

#### 3. Payments Not Working
- Check Stripe keys (live vs test)
- Verify webhook endpoint
- Check webhook signing secret

#### 4. Video Streaming Issues
- Verify video URLs are accessible
- Check CORS headers for video files
- Test HLS/DASH stream URLs

### Debug Commands
```bash
# Backend logs
heroku logs --tail --app movieflix-backend

# Test API endpoints
curl https://your-backend-url.com/api/health

# Test MongoDB connection
mongosh "your-mongodb-connection-string"
```

## 📞 Support & Maintenance

### Regular Maintenance
- [ ] Monitor error logs weekly
- [ ] Update dependencies monthly
- [ ] Backup database regularly
- [ ] Monitor payment failures
- [ ] Review user feedback

### Scaling Considerations
- Upgrade Render plan for more resources
- Consider Redis for caching
- Implement CDN for global distribution
- Set up database read replicas

---

## 🎉 Deployment Complete!

Your MovieFlix streaming platform is now live! 

**Frontend**: https://your-frontend-domain.vercel.app
**Backend**: https://your-backend-url.onrender.com
**Admin Panel**: https://your-frontend-domain.vercel.app/admin

### Test Credentials
- **Admin**: admin@movieflix.com / Admin123!
- **User**: user@movieflix.com / User123!

### Next Steps
1. Test all functionality
2. Set up monitoring
3. Configure custom domains
4. Launch marketing campaigns
5. Monitor user feedback

**🚀 Happy streaming!**