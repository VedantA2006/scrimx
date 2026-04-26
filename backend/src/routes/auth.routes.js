const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, getMe, updateProfile, changePassword, adminLogin } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

const { validate } = require('../middleware/validate.middleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                     // 5 registrations per hour per IP
  message: { success: false, message: 'Too many accounts created. Try again later.' }
});

router.post('/register', registerLimiter, validate([
  { field: 'username', rules: ['required', { min: 3 }, { max: 30 }] },
  { field: 'email',    rules: ['required', 'email'] },
  { field: 'password', rules: ['required', { min: 6 }] }
]), register);

router.post('/login', loginLimiter, validate([
  { field: 'email',    rules: ['required', 'email'] },
  { field: 'password', rules: ['required'] }
]), login);

router.post('/admin-login', loginLimiter, adminLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;
