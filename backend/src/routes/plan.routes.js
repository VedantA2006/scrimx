const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { getCurrentPlan, purchaseWithWallet, grantElitePlan } = require('../controllers/plan.controller');
const { requestUpgrade, getMyUpgradeRequests } = require('../controllers/planRequest.controller');
const { chatUpload } = require('../middleware/upload.middleware');

const router = express.Router();

router.use(protect);

// Admin only route
router.post('/admin/grant-elite', authorize('admin'), grantElitePlan);

router.use(authorize('organizer', 'admin'));

router.get('/current', getCurrentPlan);
router.post('/request-upgrade', chatUpload.array('attachments', 5), requestUpgrade);
router.get('/requests/my', getMyUpgradeRequests);
router.post('/purchase-wallet', purchaseWithWallet);

module.exports = router;
