const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword, adminLogin } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

const { validate } = require('../middleware/validate.middleware');

// Auth rate limiting is handled globally in index.js via authLimiter middleware

router.post('/register', validate([
  { field: 'username', rules: ['required', { min: 3 }, { max: 30 }] },
  { field: 'email',    rules: ['required', 'email'] },
  { field: 'password', rules: ['required', { min: 6 }] }
]), register);

router.post('/login', validate([
  { field: 'email',    rules: ['required', 'email'] },
  { field: 'password', rules: ['required'] }
]), login);

router.post('/admin-login', adminLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;
