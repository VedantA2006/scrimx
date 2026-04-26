const express = require('express');
const router = express.Router();
const {
  getOrganizerWallet,
  submitPointRequest,
  getAdminPointRequests,
  reviewPointRequest,
  directPointAdjustment,
  getAdminOrganizerLedger,
  getMyTierInfo
} = require('../controllers/point.controller');

const { protect, authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// All point routes require auth
router.use(protect);

// -----------------------------------------------------
// ORGANIZER ROUTES
// -----------------------------------------------------
// Get current points balance and transactions
router.get('/wallet', authorize('organizer'), getOrganizerWallet);

// Get tier info
router.get('/tier', authorize('organizer'), getMyTierInfo);

// Submit a new point request (with optional payment proof image)
router.post('/request', authorize('organizer'), upload.single('attachment'), submitPointRequest);

// -----------------------------------------------------
// ADMIN ROUTES
// -----------------------------------------------------
// Get all point requests
router.get('/admin/requests', authorize('admin'), getAdminPointRequests);

// Approve or Reject a specific point request
router.patch('/admin/requests/:id', authorize('admin'), reviewPointRequest);

// Directly add/deduct points from an organizer natively
router.post('/admin/organizers/:id/adjustment', authorize('admin'), directPointAdjustment);

// View an organizer's ledger
router.get('/admin/organizers/:id/ledger', authorize('admin'), getAdminOrganizerLedger);

module.exports = router;
