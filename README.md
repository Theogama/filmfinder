# 🎬 FlixStream - Movie Streaming Platform

A full-featured movie streaming web application similar to Netflix, built with React, Node.js, and MongoDB. Features include user authentication, subscription management, movie streaming, and an admin panel.

![FlixStream](https://img.shields.io/badge/FlixStream-Movie%20Streaming-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47a248)
![Stripe](https://img.shields.io/badge/Stripe-Payments-6772e5)

## ✨ Features

### 🎯 Core Features
- **Landing Page**: Eye-catching hero banner with call-to-action
- **Authentication**: Email/password and social login with JWT
- **User Dashboard**: Personalized movie suggestions and watchlist
- **Movie Streaming**: Responsive video player with HLS/DASH support
- **Subscription Plans**: Basic (free trial) and Pro (R120/month) plans
- **Admin Panel**: Complete movie and user management system

### 🎬 Movie Features
- Browse movies by genre, year, and rating
- Search functionality with real-time results
- Movie details with cast, crew, and reviews
- Trailer playback (free for all users)
- Full movie streaming (subscription required)
- Watch history and progress tracking
- Personalized recommendations

### 💳 Payment & Subscription
- Stripe integration for secure payments
- Monthly subscription plans (R120 ZAR)
- Free 1-month trial for new users
- Subscription management (upgrade, cancel, reactivate)
- Payment history and billing

### 👤 User Management
- User registration and authentication
- Profile management with preferences
- Watchlist and favorites
- Watch history with progress tracking
- Subscription status and billing

### 🔧 Admin Features
- Movie management (add, edit, delete)
- User management and analytics
- Subscription monitoring
- Content moderation tools
- Analytics dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB database
- Stripe account
- TMDB API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/flixstream.git
cd flixstream
```

2. **Install dependencies**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install
```

3. **Environment Setup**
```bash
# Copy environment files
cp server/.env.example server/.env

# Edit server/.env with your configuration
nano server/.env
```

4. **Start the application**
```bash
# Start backend server
cd server && npm run dev

# Start frontend (in new terminal)
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 🐳 Docker Deployment

### Quick Start with Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment
```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up -d
```

## 🌐 Platform Deployment

### Vercel (Recommended)
```bash
# Deploy frontend
npm run build
vercel --prod

# Deploy backend
cd server
vercel --prod
```

### Render
1. Connect your GitHub repository to Render
2. Render will automatically detect `render.yaml` and deploy both services

### Netlify
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flixstream

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URL
FRONTEND_URL=https://your-domain.com

# AWS S3 (for video storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# TMDB API
TMDB_API_KEY=your_tmdb_api_key
```

### Database Setup

#### MongoDB Atlas (Recommended)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Get your connection string
5. Add to environment variables

#### Local MongoDB
```bash
# Install MongoDB
brew install mongodb-community  # macOS
sudo apt-get install mongodb   # Ubuntu

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Stripe Setup
1. Create a Stripe account
2. Get your API keys from the dashboard
3. Set up webhook endpoints for subscription events

## 📱 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Movie Endpoints
- `GET /api/movies` - Get all movies with filters
- `GET /api/movies/featured` - Get featured movies
- `GET /api/movies/:id` - Get movie details
- `GET /api/movies/:id/stream` - Get streaming URL
- `GET /api/movies/search` - Search movies

### User Endpoints
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/watchlist` - Get user watchlist
- `POST /api/users/watchlist/:id` - Add to watchlist

### Subscription Endpoints
- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/subscriptions/upgrade` - Upgrade subscription
- `POST /api/subscriptions/cancel` - Cancel subscription

### Admin Endpoints
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - Get all users
- `GET /api/admin/movies` - Get all movies
- `POST /api/admin/movies` - Create movie

## 🎨 Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **React Query** - Data fetching
- **Framer Motion** - Animations
- **React Player** - Video player

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Stripe** - Payments
- **Multer** - File uploads

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **MongoDB Atlas** - Cloud database
- **AWS S3** - File storage
- **Cloudinary** - Image management

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Input validation and sanitization
- Secure payment processing
- Environment variable protection

## 📊 Performance

- Lazy loading for images and videos
- API response caching
- Database indexing
- CDN integration
- Optimized bundle size
- Progressive Web App features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/flixstream/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/flixstream/discussions)

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for movie data
- [Stripe](https://stripe.com/) for payment processing
- [MongoDB](https://www.mongodb.com/) for database
- [Vercel](https://vercel.com/) for hosting

## 📈 Roadmap

- [ ] Mobile app (React Native)
- [ ] Chromecast support
- [ ] Offline downloads
- [ ] AI-powered recommendations
- [ ] Multi-language support
- [ ] Live streaming capabilities
- [ ] Social features (comments, ratings)
- [ ] Advanced analytics

---

**Made with ❤️ by [Your Name]**
