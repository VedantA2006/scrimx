const express = require('express');
const router = express.Router();
const { getCurrentSeason } = require('../controllers/season.controller');

router.get('/current', getCurrentSeason);

module.exports = router;
