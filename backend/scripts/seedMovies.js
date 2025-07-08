import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import Subscription from '../models/Subscription.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/movieflix')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Sample movie data
const sampleMovies = [
  {
    title: 'Dune',
    overview: 'A noble family becomes embroiled in a war for control over the galaxy\'s most valuable asset while its heir becomes troubled by visions of a dark future.',
    genres: ['Science Fiction', 'Adventure', 'Drama'],
    releaseDate: new Date('2021-10-22'),
    runtime: 155,
    rating: 'PG-13',
    imdbRating: 8.0,
    poster: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/iaYSqKPY5pUJG0vz17j3lTKGVKi.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=n9xhJrPXop4',
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    hlsUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    isPremium: true,
    isFeatured: true,
    status: 'published',
    director: ['Denis Villeneuve'],
    cast: [
      { name: 'Timothée Chalamet', character: 'Paul Atreides', order: 1 },
      { name: 'Rebecca Ferguson', character: 'Lady Jessica', order: 2 },
      { name: 'Oscar Isaac', character: 'Duke Leto Atreides', order: 3 }
    ],
    countries: ['USA'],
    languages: ['English'],
    keywords: ['desert', 'prophecy', 'spice', 'sandworm'],
    views: 15420,
    likes: 892
  },
  {
    title: 'The Batman',
    overview: 'When the Riddler, a sadistic serial killer, begins murdering key political figures in Gotham, Batman is forced to investigate the city\'s hidden corruption.',
    genres: ['Action', 'Crime', 'Drama'],
    releaseDate: new Date('2022-03-04'),
    runtime: 176,
    rating: 'PG-13',
    imdbRating: 7.8,
    poster: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/b0PlHJr0f5ap3colZ0qVHiLzaJO.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=mqqft2x_Aa4',
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
    hlsUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    isPremium: true,
    isFeatured: true,
    status: 'published',
    director: ['Matt Reeves'],
    cast: [
      { name: 'Robert Pattinson', character: 'Batman / Bruce Wayne', order: 1 },
      { name: 'Zoë Kravitz', character: 'Catwoman / Selina Kyle', order: 2 },
      { name: 'Paul Dano', character: 'The Riddler', order: 3 }
    ],
    countries: ['USA'],
    languages: ['English'],
    keywords: ['batman', 'gotham', 'detective', 'vengeance'],
    views: 23580,
    likes: 1340
  },
  {
    title: 'Spider-Man: No Way Home',
    overview: 'With Spider-Man\'s identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear.',
    genres: ['Action', 'Adventure', 'Science Fiction'],
    releaseDate: new Date('2021-12-17'),
    runtime: 148,
    rating: 'PG-13',
    imdbRating: 8.4,
    poster: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=JfVOs4VSpmA',
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
    hlsUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    isPremium: false, // Free content
    isFeatured: true,
    status: 'published',
    director: ['Jon Watts'],
    cast: [
      { name: 'Tom Holland', character: 'Spider-Man / Peter Parker', order: 1 },
      { name: 'Zendaya', character: 'MJ', order: 2 },
      { name: 'Benedict Cumberbatch', character: 'Doctor Strange', order: 3 }
    ],
    countries: ['USA'],
    languages: ['English'],
    keywords: ['spider-man', 'multiverse', 'superhero', 'marvel'],
    views: 45230,
    likes: 2890
  },
  {
    title: 'Top Gun: Maverick',
    overview: 'After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he returns to TOPGUN.',
    genres: ['Action', 'Drama'],
    releaseDate: new Date('2022-05-27'),
    runtime: 131,
    rating: 'PG-13',
    imdbRating: 8.3,
    poster: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=qSqVVswa420',
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    hlsUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    isPremium: true,
    isFeatured: false,
    status: 'published',
    director: ['Joseph Kosinski'],
    cast: [
      { name: 'Tom Cruise', character: 'Pete "Maverick" Mitchell', order: 1 },
      { name: 'Miles Teller', character: 'Lt. Bradley "Rooster" Bradshaw', order: 2 },
      { name: 'Jennifer Connelly', character: 'Penny Benjamin', order: 3 }
    ],
    countries: ['USA'],
    languages: ['English'],
    keywords: ['aviation', 'navy', 'sequel', 'action'],
    views: 18750,
    likes: 1120
  },
  {
    title: 'Encanto',
    overview: 'A Colombian teenage girl has to face the frustration of being the only member of her family without magical powers.',
    genres: ['Animation', 'Comedy', 'Family', 'Fantasy'],
    releaseDate: new Date('2021-11-24'),
    runtime: 102,
    rating: 'PG',
    imdbRating: 7.2,
    poster: 'https://image.tmdb.org/t/p/w500/4j0PNHkMr5ax3IA8tjtxcmPU3QT.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces/3G1Q5xF40HkUBJXxt2DQgQzKTp5.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=CaimKeDcudo',
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
    hlsUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    isPremium: false, // Free content
    isFeatured: false,
    status: 'published',
    director: ['Jared Bush', 'Byron Howard'],
    cast: [
      { name: 'Stephanie Beatriz', character: 'Mirabel Madrigal (voice)', order: 1 },
      { name: 'María Cecilia Botero', character: 'Abuela Alma (voice)', order: 2 },
      { name: 'John Leguizamo', character: 'Bruno Madrigal (voice)', order: 3 }
    ],
    countries: ['USA'],
    languages: ['English', 'Spanish'],
    keywords: ['family', 'magic', 'colombia', 'disney'],
    views: 12340,
    likes: 780
  }
];

// Create admin user
const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@movieflix.com' });
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists');
      return existingAdmin;
    }

    const adminUser = new User({
      name: 'MovieFlix Admin',
      email: 'admin@movieflix.com',
      password: 'Admin123!',
      role: 'admin',
      isEmailVerified: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@movieflix.com');
    console.log('🔑 Password: Admin123!');

    // Create admin subscription
    const adminSubscription = new Subscription({
      user: adminUser._id,
      plan: 'pro',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      stripeCustomerId: `admin_${adminUser._id}`,
      amount: 12000,
      trialUsed: true
    });

    await adminSubscription.save();
    console.log('✅ Admin subscription created');

    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
};

// Create sample user
const createSampleUser = async () => {
  try {
    // Check if sample user already exists
    const existingUser = await User.findOne({ email: 'user@movieflix.com' });
    if (existingUser) {
      console.log('ℹ️ Sample user already exists');
      return existingUser;
    }

    const sampleUser = new User({
      name: 'John Doe',
      email: 'user@movieflix.com',
      password: 'User123!',
      role: 'user',
      isEmailVerified: true
    });

    await sampleUser.save();
    console.log('✅ Sample user created successfully');
    console.log('📧 Email: user@movieflix.com');
    console.log('🔑 Password: User123!');

    // Create user subscription (trial)
    const userSubscription = new Subscription({
      user: sampleUser._id,
      plan: 'basic',
      status: 'trialing',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stripeCustomerId: `user_${sampleUser._id}`,
      amount: 0,
      trialUsed: true
    });

    await userSubscription.save();
    console.log('✅ Sample user subscription created (30-day trial)');

    return sampleUser;
  } catch (error) {
    console.error('❌ Error creating sample user:', error);
    throw error;
  }
};

// Seed movies
const seedMovies = async (adminUser) => {
  try {
    // Clear existing movies
    await Movie.deleteMany({});
    console.log('🗑️ Cleared existing movies');

    // Add uploadedBy field to each movie
    const moviesWithUploader = sampleMovies.map(movie => ({
      ...movie,
      uploadedBy: adminUser._id
    }));

    // Insert sample movies
    const createdMovies = await Movie.insertMany(moviesWithUploader);
    console.log(`✅ Created ${createdMovies.length} sample movies`);

    return createdMovies;
  } catch (error) {
    console.error('❌ Error seeding movies:', error);
    throw error;
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Create users
    const adminUser = await createAdminUser();
    const sampleUser = await createSampleUser();

    // Seed movies
    const movies = await seedMovies(adminUser);

    // Add some sample watch history for the user
    if (movies.length > 0) {
      sampleUser.watchHistory = [
        {
          movieId: movies[0]._id,
          watchTime: 1800, // 30 minutes
          completed: false,
          watchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
          movieId: movies[2]._id,
          watchTime: movies[2].runtime * 60, // Full movie
          completed: true,
          watchedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        }
      ];

      // Add some movies to watchlist
      sampleUser.watchlist = [movies[1]._id, movies[3]._id];

      await sampleUser.save();
      console.log('✅ Added sample watch history and watchlist');
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`👑 Admin User: admin@movieflix.com (password: Admin123!)`);
    console.log(`👤 Sample User: user@movieflix.com (password: User123!)`);
    console.log(`🎬 Movies Created: ${movies.length}`);
    console.log(`💳 Free Movies: ${movies.filter(m => !m.isPremium).length}`);
    console.log(`⭐ Premium Movies: ${movies.filter(m => m.isPremium).length}`);
    console.log(`🌟 Featured Movies: ${movies.filter(m => m.isFeatured).length}`);
    
    console.log('\n🚀 You can now start the application!');
    console.log('Frontend: npm run dev');
    console.log('Backend: npm run dev');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    // Close database connection
    mongoose.connection.close();
    process.exit(0);
  }
};

// Run the seeding
seedDatabase();