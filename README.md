# 🎬 MovieFlix - Premium Movie Streaming Platform

A full-featured movie streaming web application similar to flix.cc, built with modern technologies including React, Node.js, MongoDB, and Stripe for payments.

## ✨ Features

### 🎭 Core Features
- **🏠 Landing Page** - Eye-catching hero banner with movie thumbnails and CTAs
- **🔐 Authentication** - JWT-based auth with email/password and optional Google login
- **📱 Responsive Design** - Beautiful UI that works on all devices
- **🔍 Advanced Search** - Search movies by title, genre, year, and more
- **🎯 Personalized Recommendations** - AI-powered movie suggestions

### 🎥 Movie Features
- **📺 Video Streaming** - HLS/DASH support with responsive video player
- **🎬 Movie Details** - Comprehensive movie information with cast, ratings, and reviews
- **⭐ User Interactions** - Like, watchlist, rating, and progress tracking
- **🆓 Free & Premium Content** - Freemium model with subscription tiers

### 💳 Subscription System
- **🎁 Free Trial** - 1-month free trial for new users
- **💰 Subscription Plans**:
  - **Basic Plan**: Free trial then ad-supported content
  - **Pro Plan**: R120/month for unlimited ad-free access
- **💸 Payment Integration** - Stripe payment processing with ZAR support
- **📊 Subscription Management** - Cancel, reactivate, and change plans

### 👤 User Dashboard
- **📈 Personalized Dashboard** - Recently watched, recommendations, subscription status
- **📜 Watch History** - Track viewing progress and completed movies
- **💝 Watchlist** - Save movies to watch later
- **⚙️ Account Settings** - Profile management and preferences

### 🛠️ Admin Panel
- **📊 Analytics Dashboard** - User engagement, revenue, and content metrics
- **🎬 Content Management** - Add, edit, delete, and feature movies
- **👥 User Management** - View users, manage subscriptions, suspend accounts
- **💰 Revenue Tracking** - Subscription analytics and payment history

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Player** - Video streaming component
- **Framer Motion** - Smooth animations
- **React Hook Form** - Form management
- **Stripe JS** - Payment processing

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **Stripe** - Payment processing
- **Cloudinary** - Media storage and optimization
- **Nodemailer** - Email service

### DevOps & Deployment
- **Docker** - Containerization
- **Vercel/Netlify** - Frontend deployment
- **Render/Railway** - Backend deployment
- **MongoDB Atlas** - Cloud database
- **Cloudinary** - CDN for media assets

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- Stripe account for payments

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/movieflix.git
cd movieflix
```

### 2. Backend Setup
```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB (if running locally)
mongod

# Seed the database with sample data
npm run seed

# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
cd ../  # Go back to root directory
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:5000/api" > .env.local
echo "VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key" >> .env.local

# Start the frontend
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

### 5. Test Accounts
After running the seed script:
- **Admin**: admin@movieflix.com / Admin123!
- **User**: user@movieflix.com / User123!

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/movieflix

# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex
JWT_REFRESH_SECRET=your_refresh_token_secret_different_from_main_jwt

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_BASIC_PRICE_ID=price_your_basic_price_id
STRIPE_PRO_PRICE_ID=price_your_pro_price_id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

#### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

## 🏗️ Project Structure

```
movieflix/
├── backend/                 # Node.js backend
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── scripts/            # Database seeding
│   └── server.js           # Main server file
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── pages/              # Page components
│   ├── stores/             # Zustand state stores
│   ├── services/           # API services
│   └── App.jsx             # Main app component
├── public/                 # Static assets
└── docs/                   # Documentation
```

## 🎮 Usage Guide

### For Users
1. **Sign Up** - Create an account or use social login
2. **Browse Movies** - Explore featured, trending, and categorized content
3. **Start Free Trial** - Get 30 days of premium access
4. **Watch Content** - Stream movies with progress tracking
5. **Manage Subscription** - Upgrade, cancel, or change plans

### For Admins
1. **Access Admin Panel** - Login with admin credentials
2. **Add Movies** - Upload new content with metadata
3. **Manage Users** - View user analytics and manage accounts
4. **Monitor Revenue** - Track subscription and payment metrics
5. **Content Analytics** - See which movies are performing well

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Movie Endpoints
- `GET /api/movies` - Get movies with pagination
- `GET /api/movies/:id` - Get movie details
- `GET /api/movies/search` - Search movies
- `GET /api/movies/:id/stream` - Get streaming URL

### Payment Endpoints
- `GET /api/payments/plans` - Get subscription plans
- `POST /api/payments/subscribe` - Create subscription
- `POST /api/payments/cancel-subscription` - Cancel subscription

## 🚀 Deployment

### Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_API_URL
vercel env add VITE_STRIPE_PUBLISHABLE_KEY
```

### Backend Deployment (Render)
1. Create new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add environment variables

### Database (MongoDB Atlas)
1. Create MongoDB Atlas account
2. Create new cluster
3. Get connection string
4. Update `MONGODB_URI` in environment variables

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - Prevent API abuse
- **Input Validation** - Server-side validation with express-validator
- **CORS Protection** - Configured for specific origins
- **Helmet.js** - Security headers
- **Account Lockout** - Prevent brute force attacks

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd ../
npm test
```

### Test Stripe Integration
Use Stripe test cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

## 📈 Performance

- **CDN Integration** - Cloudinary for optimized media delivery
- **Database Indexing** - Optimized MongoDB queries
- **Lazy Loading** - Code splitting and component lazy loading
- **Caching** - React Query for server state caching
- **Image Optimization** - Responsive images with lazy loading

## 🛡️ Subscription Plans

### Basic Plan
- **Price**: Free trial for 1 month, then ad-supported
- **Features**: Limited movie selection, ads
- **Target**: Casual viewers

### Pro Plan  
- **Price**: R120/month
- **Features**: Unlimited movies, ad-free, HD quality
- **Target**: Regular viewers and families

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core streaming functionality
- ✅ User authentication
- ✅ Payment integration
- ✅ Admin panel

### Phase 2 (Next)
- 📱 Mobile app (React Native)
- 🔄 Offline downloads
- 📺 Chromecast support
- 🤖 AI recommendations

### Phase 3 (Future)
- 🌐 Multi-language support
- 📊 Advanced analytics
- 🎮 Interactive content
- 🔴 Live streaming

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for movie data
- [Stripe](https://stripe.com/) for payment processing
- [Cloudinary](https://cloudinary.com/) for media management
- [Vercel](https://vercel.com/) for hosting

## 📞 Support

- **Email**: support@movieflix.com
- **Documentation**: [docs.movieflix.com](https://docs.movieflix.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/movieflix/issues)

---

**Built with ❤️ for movie lovers worldwide**
