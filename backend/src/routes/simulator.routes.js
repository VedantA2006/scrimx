const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const simulatorController = require('../controllers/simulator.controller');

// Extremely dangerous internal endpoints. Restricted strictly to Admin Devs
router.use(protect);
router.use(authorize('admin'));

router.post('/generate-users', simulatorController.generateFakeUsers);
router.post('/generate-teams', simulatorController.generateFakeTeams);
router.post('/generate-full-account', simulatorController.generateFullTestAccount);
router.post('/tournaments/register-bulk', simulatorController.bulkRegisterTeams);
router.delete('/purge', simulatorController.nukeTestEntities);

module.exports = router;
