const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { chatUpload } = require('../middleware/upload.middleware');
const {
  requestBoost,
  processBoostRequest,
  getAdminBoostRequests,
  getFeaturedItems,
  removeHighlight
} = require('../controllers/boost.controller');

const router = express.Router();

// Public routes
router.get('/featured', getFeaturedItems);

// Protected routes
router.use(protect);

// Organizer routes
router.post('/request', authorize('organizer', 'admin'), chatUpload.array('attachments', 5), requestBoost);

// Admin routes
router.get('/admin/requests', authorize('admin'), getAdminBoostRequests);
router.patch('/admin/requests/:id', authorize('admin'), processBoostRequest);
router.delete('/admin/remove/:type/:id', authorize('admin'), removeHighlight);

module.exports = router;
