require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { setupSocket } = require('./socket');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { initCronJobs } = require('./services/cron.service');
require('./services/telegram.service'); // Start Telegram bot polling at server boot


const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const scrimRoutes = require('./routes/scrim.routes');
const organizerRoutes = require('./routes/organizer.routes');
const teamRoutes = require('./routes/team.routes');
const registrationRoutes = require('./routes/registration.routes');
const reviewRoutes = require('./routes/review.routes');
const adminRoutes = require('./routes/admin.routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for correct client IP behind Render/Vercel reverse proxy
// Without this, express-rate-limit sees ALL users as the same IP
// Using 'true' to trust all proxies — Render uses multiple proxy layers
app.set('trust proxy', true);

// Security
app.use(helmet());

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

// Helper: extract real client IP from x-forwarded-for (Render sends comma-separated list)
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // First IP in the list is the real client IP
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  keyGenerator: getClientIp,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Auth-specific rate limiters are defined per-route in auth.routes.js
// (login: 500/15min, register: 500/1hr) — no extra blanket limiter needed here

// Body parsing
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scrims', scrimRoutes);
app.use('/api/organizers', organizerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api/withdrawals', require('./routes/withdrawal.routes'));
app.use('/api/results', require('./routes/result.routes'));
app.use('/api/extractions', require('./routes/extraction.routes'));
app.use('/api/disputes', require('./routes/dispute.routes'));
app.use('/api/promotions', require('./routes/promotion.routes'));
app.use('/api/plans', require('./routes/plan.routes'));
app.use('/api/seasons', require('./routes/season.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/admin-stats', require('./routes/admin_stats.routes'));
app.use('/api/admin', adminRoutes);
app.use('/api/simulator', require('./routes/simulator.routes'));
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/join-requests', require('./routes/joinRequest.routes'));
app.use('/api/points', require('./routes/point.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/tournaments', require('./routes/tournament.routes'));
app.use('/api/telegram', require('./routes/telegram.routes'));
app.use('/api/weekly-leaderboard', require('./routes/weeklyLeaderboard.routes'));
app.use('/api/boosts', require('./routes/boost.routes'));


// Public Settings Routes
const { getPaymentSettings } = require('./controllers/settings.controller');
app.get('/api/settings/payment', getPaymentSettings);


// Generic file upload endpoint (for chat attachments, etc.)
const { chatUpload } = require('./middleware/upload.middleware');
const { protect } = require('./middleware/auth.middleware');
app.post('/api/upload', protect, chatUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  res.json({ success: true, url: req.file.path });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ScrimX API is running', timestamp: new Date().toISOString() });
});

// Catch-all for missing API routes
app.all('/api/*', notFound);

// Serve Frontend in Production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../frontend/dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('API is running. Please set NODE_ENV to production and build the frontend to serve the app.'));
}

// Global Error handling
app.use(errorHandler);

// --- CRON JOBS ---
const cron = require('node-cron');
const Scrim = require('./models/Scrim');
const Tournament = require('./models/Tournament');

// Run every hour to remove expired highlights
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    await Scrim.updateMany(
      { isHighlighted: true, highlightExpiresAt: { $lt: now } },
      { $set: { isHighlighted: false }, $unset: { highlightType: 1, highlightPlan: 1, highlightExpiresAt: 1, boostScore: 1 } }
    );
    await Tournament.updateMany(
      { isHighlighted: true, highlightExpiresAt: { $lt: now } },
      { $set: { isHighlighted: false }, $unset: { highlightType: 1, highlightPlan: 1, highlightExpiresAt: 1, boostScore: 1 } }
    );
    // console.log('Expired highlights cleaned up');
  } catch (err) {
    console.error('Error cleaning up highlights:', err);
  }
});
// -----------------

// ──────────────────────────────────────────────
// Process-Level Crash Protection (Production)
// ──────────────────────────────────────────────

// Catch synchronous exceptions that escape all try/catch blocks
process.on('uncaughtException', (err) => {
  console.error('💀 UNCAUGHT EXCEPTION! Shutting down gracefully...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

// Database connection and server start
let server;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scrimx')
  .then(() => {
    console.log('✅ MongoDB connected');
    // Start background schedulers
    initCronJobs();
    
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    setupSocket(io);
    app.set('io', io);

    server = httpServer.listen(PORT, () => {
      console.log(`🚀 ScrimX API running on port ${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${PORT} is occupied by a zombie process. Auto-killing...`);
        const { exec } = require('child_process');
        
        if (process.platform === 'win32') {
          exec(`netstat -ano | findstr :${PORT}`, (err, stdout) => {
            if (!stdout) return process.exit(1);
            const lines = stdout.trim().split('\n');
            const pid = lines[0].trim().split(/\s+/).pop();
            console.log(`🧹 Found zombie PID ${pid}. Terminating...`);
            exec(`taskkill /F /PID ${pid}`, () => {
              setTimeout(() => {
                server.close();
                server.listen(PORT);
              }, 1000);
            });
          });
        } else {
          exec(`npx kill-port ${PORT}`, () => {
            setTimeout(() => {
              server.close();
              server.listen(PORT);
            }, 1000);
          });
        }
      } else {
        console.error('Server error:', e);
      }
    });

    // NOTE: Per-route timeout for AI pipeline is set in extraction.routes.js
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Catch unhandled async promise rejections
process.on('unhandledRejection', (err) => {
  console.error('💀 UNHANDLED REJECTION! Shutting down gracefully...');
  console.error(err.name, err.message);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown on SIGTERM (e.g. hosting platform restarts)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        console.log('🔌 MongoDB connection closed.');
        process.exit(0);
      });
    });
  }
});

// Graceful shutdown on nodemon restart (SIGUSR2)
process.once('SIGUSR2', () => {
  console.log('🔄 Nodemon restart. Forcefully closing connections...');
  if (server) {
    if (server.closeAllConnections) server.closeAllConnections();
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        process.kill(process.pid, 'SIGUSR2');
      });
    });
    // Fallback if server.close hangs (common with websockets/keep-alive)
    setTimeout(() => {
      process.kill(process.pid, 'SIGUSR2');
    }, 1500).unref();
  } else {
    process.kill(process.pid, 'SIGUSR2');
  }
});

// Graceful shutdown on app termination (Ctrl+C)
process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  if (server) {
    if (server.closeAllConnections) server.closeAllConnections();
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        console.log('🔌 MongoDB connection closed.');
        process.exit(0);
      });
    });
    // Fallback if server.close hangs
    setTimeout(() => {
      console.log('🔌 Forcing shutdown after timeout...');
      process.exit(0);
    }, 1500).unref();
  } else {
    process.exit(0);
  }
});

module.exports = app;
