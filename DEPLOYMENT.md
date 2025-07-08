# FlixStream Deployment Guide

This guide provides step-by-step instructions for deploying the FlixStream movie streaming application to various platforms.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB database
- Stripe account for payments
- TMDB API key
- AWS S3 bucket (for video storage)
- Cloudinary account (for image uploads)

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flixstream

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URL
FRONTEND_URL=https://your-domain.com

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# TMDB API
TMDB_API_KEY=your_tmdb_api_key
```

## 📦 Deployment Options

### 1. Docker Deployment (Recommended)

#### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/flixstream.git
cd flixstream

# Create environment file
cp server/.env.example server/.env
# Edit server/.env with your configuration

# Start with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# MongoDB: localhost:27017
```

#### Production Deployment
```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up -d

# Or build custom image
docker build -t flixstream:latest .
docker run -d -p 5000:5000 --env-file .env flixstream:latest
```

### 2. Vercel Deployment

#### Frontend Deployment
1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy frontend:
```bash
# Build the project
npm run build

# Deploy to Vercel
vercel --prod
```

3. Set environment variables in Vercel dashboard:
   - `VITE_API_URL`: Your backend API URL

#### Backend Deployment
1. Navigate to server directory:
```bash
cd server
```

2. Deploy to Vercel:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard (all variables from .env file)

### 3. Render Deployment

#### Using render.yaml
1. Push your code to GitHub
2. Connect your repository to Render
3. Render will automatically detect the `render.yaml` file and deploy both services

#### Manual Deployment
1. Create a new Web Service in Render
2. Connect your GitHub repository
3. Configure build settings:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
4. Add environment variables
5. Deploy

### 4. Netlify Deployment

#### Frontend Only
1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Add environment variables
4. Deploy

### 5. Railway Deployment

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Set environment variables in Railway dashboard

### 6. Heroku Deployment

#### Backend
1. Install Heroku CLI
2. Create Heroku app:
```bash
heroku create flixstream-backend
```

3. Add MongoDB addon:
```bash
heroku addons:create mongolab:sandbox
```

4. Set environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# ... add all other environment variables
```

5. Deploy:
```bash
git push heroku main
```

#### Frontend
1. Create another Heroku app for frontend
2. Configure buildpacks for static sites
3. Deploy the built frontend

## 🔧 Configuration

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

### Stripe Configuration

1. Create a Stripe account
2. Get your API keys from the dashboard
3. Set up webhook endpoints:
   - URL: `https://your-domain.com/api/payments/webhook`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

### AWS S3 Setup

1. Create an AWS account
2. Create an S3 bucket
3. Create an IAM user with S3 permissions
4. Get access keys and add to environment variables

### Cloudinary Setup

1. Create a Cloudinary account
2. Get your cloud name, API key, and secret
3. Add to environment variables

## 🚀 Production Checklist

- [ ] Set up SSL certificates
- [ ] Configure domain names
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Set up CI/CD pipelines
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry)
- [ ] Configure CDN for static assets
- [ ] Set up database indexing
- [ ] Configure security headers

## 📊 Monitoring

### Health Checks
- Backend: `GET /health`
- Frontend: Check if the app loads correctly

### Logs
```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Vercel logs
vercel logs

# Render logs
# Available in Render dashboard
```

## 🔒 Security

### Environment Variables
- Never commit `.env` files to version control
- Use platform-specific secret management
- Rotate secrets regularly

### SSL/TLS
- Always use HTTPS in production
- Configure proper SSL certificates
- Set up HSTS headers

### Rate Limiting
- Configure rate limiting for API endpoints
- Set up DDoS protection
- Monitor for suspicious activity

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `FRONTEND_URL` environment variable
   - Verify CORS configuration in backend

2. **Database Connection Issues**
   - Verify MongoDB connection string
   - Check network connectivity
   - Ensure database user has proper permissions

3. **Payment Issues**
   - Verify Stripe API keys
   - Check webhook configuration
   - Test with Stripe test keys first

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for syntax errors

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development DEBUG=* npm start
```

## 📞 Support

For deployment issues:
1. Check the logs for error messages
2. Verify all environment variables are set
3. Test locally first
4. Check platform-specific documentation

## 🔄 Updates

To update the application:
1. Pull latest changes: `git pull origin main`
2. Update dependencies: `npm install`
3. Rebuild and redeploy
4. Test the application
5. Monitor for any issues

## 📈 Scaling

### Horizontal Scaling
- Use load balancers
- Deploy multiple instances
- Use container orchestration (Kubernetes)

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Use caching strategies

### Database Scaling
- Use MongoDB Atlas with auto-scaling
- Implement read replicas
- Use database sharding for large datasets