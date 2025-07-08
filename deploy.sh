#!/bin/bash

# FlixStream Deployment Script
# This script automates the deployment process for different platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command_exists git; then
        print_error "git is not installed. Please install git first."
        exit 1
    fi
    
    print_success "Prerequisites check passed!"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install frontend dependencies
    if [ -f "package.json" ]; then
        npm install
        print_success "Frontend dependencies installed!"
    fi
    
    # Install backend dependencies
    if [ -f "server/package.json" ]; then
        cd server && npm install && cd ..
        print_success "Backend dependencies installed!"
    fi
}

# Function to build the application
build_app() {
    print_status "Building the application..."
    
    # Build frontend
    if [ -f "package.json" ]; then
        npm run build
        print_success "Frontend built successfully!"
    fi
}

# Function to deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    if ! command_exists vercel; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy frontend
    print_status "Deploying frontend to Vercel..."
    vercel --prod --yes
    
    # Deploy backend
    print_status "Deploying backend to Vercel..."
    cd server
    vercel --prod --yes
    cd ..
    
    print_success "Deployment to Vercel completed!"
}

# Function to deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Build and start containers
    docker-compose up -d --build
    
    print_success "Docker deployment completed!"
    print_status "Access the application at: http://localhost"
}

# Function to deploy to Render
deploy_render() {
    print_status "Deploying to Render..."
    
    if [ ! -f "render.yaml" ]; then
        print_error "render.yaml not found. Please ensure you have the Render configuration file."
        exit 1
    fi
    
    print_warning "Please deploy to Render manually by:"
    print_warning "1. Push your code to GitHub"
    print_warning "2. Connect your repository to Render"
    print_warning "3. Render will automatically detect render.yaml and deploy"
}

# Function to deploy to Netlify
deploy_netlify() {
    print_status "Deploying to Netlify..."
    
    if ! command_exists netlify; then
        print_warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    
    # Build the application first
    build_app
    
    # Deploy to Netlify
    netlify deploy --prod --dir=dist
    
    print_success "Deployment to Netlify completed!"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Copy environment example file
    if [ -f "server/.env.example" ] && [ ! -f "server/.env" ]; then
        cp server/.env.example server/.env
        print_warning "Please edit server/.env with your configuration"
    fi
    
    # Create necessary directories
    mkdir -p server/uploads
    mkdir -p server/logs
    
    print_success "Environment setup completed!"
}

# Function to start development server
start_dev() {
    print_status "Starting development servers..."
    
    # Start backend in background
    cd server && npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend
    npm run dev &
    FRONTEND_PID=$!
    
    print_success "Development servers started!"
    print_status "Frontend: http://localhost:5173"
    print_status "Backend: http://localhost:5000"
    print_status "Press Ctrl+C to stop servers"
    
    # Wait for user to stop
    trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
    wait
}

# Function to show help
show_help() {
    echo "FlixStream Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  install     Install dependencies"
    echo "  build       Build the application"
    echo "  dev         Start development servers"
    echo "  vercel      Deploy to Vercel"
    echo "  docker      Deploy with Docker"
    echo "  render      Deploy to Render"
    echo "  netlify     Deploy to Netlify"
    echo "  setup       Setup environment"
    echo "  all         Install, build, and deploy to Vercel"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install    # Install dependencies"
    echo "  $0 dev        # Start development servers"
    echo "  $0 vercel     # Deploy to Vercel"
    echo "  $0 docker     # Deploy with Docker"
}

# Main script logic
main() {
    case "${1:-help}" in
        "install")
            check_prerequisites
            install_dependencies
            ;;
        "build")
            check_prerequisites
            build_app
            ;;
        "dev")
            check_prerequisites
            setup_environment
            start_dev
            ;;
        "vercel")
            check_prerequisites
            install_dependencies
            build_app
            deploy_vercel
            ;;
        "docker")
            check_prerequisites
            deploy_docker
            ;;
        "render")
            deploy_render
            ;;
        "netlify")
            check_prerequisites
            install_dependencies
            deploy_netlify
            ;;
        "setup")
            setup_environment
            ;;
        "all")
            check_prerequisites
            install_dependencies
            build_app
            deploy_vercel
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"