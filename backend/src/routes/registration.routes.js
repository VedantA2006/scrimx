const express = require('express');
const router = express.Router();
const { registerForScrim, getScrimRegistrations, getMyRegistrations, updateRegistrationStatus, cancelRegistration, getPublicSlotList, initiatePaidRegistration, submitUtr, checkIn } = require('../controllers/registration.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// Public route - view approved teams
router.get('/scrim/:scrimId/public', getPublicSlotList);

router.use(protect);
router.post('/', registerForScrim);
router.post('/paid', upload.single('screenshot'), initiatePaidRegistration);
router.get('/my', getMyRegistrations);
router.get('/scrim/:scrimId', authorize('organizer', 'admin'), getScrimRegistrations);
router.put('/:id/status', authorize('organizer', 'admin'), updateRegistrationStatus);
router.put('/:id/cancel', cancelRegistration);
router.put('/:id/utr', submitUtr);
router.put('/:id/checkin', checkIn);

module.exports = router;
