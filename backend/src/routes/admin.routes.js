const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  addWalletBalance,
  deleteUser,
  getAllScrims,
  deleteScrim,
  resetUserPassword,
  forceJoinEvent,
  grantSuperOrganizer,
  revokeSuperOrganizer,
  setOrganizerTier
} = require('../controllers/admin.controller');

const adminCtrl = require('../controllers/admin.controller');
const bulkForceJoinEvent = adminCtrl.bulkForceJoinEvent;

const { protect, authorize } = require('../middleware/auth.middleware');

// Protect all admin routes and authorize only 'admin' role
router.use(protect);
router.use(authorize('admin'));

// User Management Routes
router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .delete(deleteUser);

router.route('/users/:id/balance')
  .put(addWalletBalance);

router.route('/users/:id/reset-password')
  .put(resetUserPassword);

router.route('/users/:id/force-join')
  .post(forceJoinEvent);

router.route('/users/:id/super-organizer')
  .put(grantSuperOrganizer)
  .delete(revokeSuperOrganizer);

router.route('/users/:id/tier')
  .put(setOrganizerTier);

if (bulkForceJoinEvent) {
  router.route('/bulk-force-join')
    .post(bulkForceJoinEvent);
}

// Scrim Management Routes
router.route('/scrims')
  .get(getAllScrims);

router.route('/scrims/:id')
  .delete(deleteScrim);

// Plan Upgrade Request Routes
const { getAllUpgradeRequests, processUpgradeRequest } = require('../controllers/planRequest.controller');
router.get('/plan-requests', getAllUpgradeRequests);
router.patch('/plan-requests/:id', processUpgradeRequest);

// Platform Settings Routes
const { updatePaymentSettings } = require('../controllers/settings.controller');
router.put('/settings/payment', updatePaymentSettings);

module.exports = router;
