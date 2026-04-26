const express = require('express');
const router = express.Router();
const { requestTopup, getWallet, getBalance, getTransactionHistory, getAdminUpi } = require('../controllers/wallet.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public — admin UPI for top-up form
router.get('/admin-upi', getAdminUpi);

const { validate } = require('../middleware/validate.middleware');

// Protected organiser routes
router.use(protect);
router.post('/request-topup', authorize('organizer'), validate([
  { field: 'amount', rules: ['required'] },
  { field: 'utr',    rules: ['required', { min: 12 }, { max: 12 }] }
]), requestTopup);
router.get('/',               authorize('organizer'), getWallet);
router.get('/balance',        authorize('organizer'), getBalance);
router.get('/transactions',   authorize('organizer'), getTransactionHistory);

module.exports = router;
