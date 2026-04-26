const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['player', 'organizer', 'admin'],
    default: 'player'
  },
  avatar: {
    type: String,
    default: ''
  },
  banner: {
    type: String,
    default: ''
  },
  realName: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // Player fields
  ign: { type: String, trim: true, default: '' },
  uid: { type: String, trim: true, default: '' },
  device: { type: String, enum: ['mobile', 'tablet', 'emulator', ''], default: '' },
  preferredRole: { type: String, default: '' },
  sensitivity: { type: String, default: '' },
  playStyle: { type: String, default: '' },
  // Organizer fields
  organizerProfile: {
    displayName: { type: String, default: '' },
    slug: { type: String, trim: true },
    bio: { type: String, default: '' },
    logo: { type: String, default: '' },
    banner: { type: String, default: '' },
    brandAccent: { type: String, default: '#00f0ff' },
    discord: { type: String, default: '' },
    telegram: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    totalScrimsHosted: { type: Number, default: 0 },
    totalPrizeDistributed: { type: Number, default: 0 },
    completionRate: { type: Number, default: 100 },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    // UPI — shown to players for entry fee payment
    upiId: { type: String, default: '' },
    // Telegram bot linking
    telegramChatId:   { type: Number, default: null },
    telegramUsername: { type: String, default: '' },
    telegramVerified: { type: Boolean, default: false },
    telegramOTP:      { type: String, default: null },
    telegramOTPExpiry:{ type: Date,   default: null },
    // Tier system
    organizerTier: { type: String, enum: ['starter','verified','pro','elite','super'], default: 'starter' },
    isSuperOrganizer: { type: Boolean, default: false },
    superOrganizerGrantedAt: { type: Date, default: null },
    superOrganizerGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    revenueSharePercent: { type: Number, default: 0 },
    totalPlayersHosted: { type: Number, default: 0 },
    // Subscription Plan
    plan: { type: String, enum: ['free', 'elite'], default: 'free' },
    subscription: {
      startDate: Date,
      endDate: Date,
      isActive: { type: Boolean, default: false }
    },
    pointsWallet: {
      balance: { type: Number, default: 0, min: 0 },
      pendingBalance: { type: Number, default: 0, min: 0 },
      totalAdded: { type: Number, default: 0 },
      totalUsed: { type: Number, default: 0 },
      totalWithdrawn: { type: Number, default: 0 },
      lastUpdatedAt: { type: Date }
    }
  },
  // TODO: wallet is only used by organizers. Players should
  // not have wallet fields. Migrate to organizerProfile.pointsWallet
  // in a future cleanup script.
  wallet: {
    balance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  
  // Test Data Guards
  isTestData: { type: Boolean, default: false },
  testBatchId: { type: String, default: null },
  testType: { type: String, enum: ['player', 'organizer', 'team', 'null'], default: 'null' },
  
  // Super Organizer flag (top-level for fast middleware lookups)
  isSuperOrganizer: { type: Boolean, default: false },

  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  lastLogin: { type: Date }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ 'organizerProfile.slug': 1 }, { unique: true, sparse: true });
userSchema.index({ 'organizerProfile.isVerified': 1 });

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT
userSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Remove password from JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
