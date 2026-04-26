const Season = require('../models/Season');
const { AppError } = require('../middleware/error.middleware');
const { sendResponse } = require('../utils/response');

// @desc    Get current season
// @route   GET /api/seasons/current
const getCurrentSeason = async (req, res, next) => {
  try {
    const season = await Season.findOne({ isActive: true });
    sendResponse(res, 200, { season });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCurrentSeason };
