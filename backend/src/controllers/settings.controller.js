const PlatformSettings = require('../models/PlatformSettings');

exports.getPaymentSettings = async (req, res, next) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    
    res.status(200).json({
      success: true,
      data: {
        upiId: settings.adminUpiId
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePaymentSettings = async (req, res, next) => {
  try {
    const { upiId } = req.body;
    
    let settings = await PlatformSettings.findOne();
    
    if (!settings) {
      settings = await PlatformSettings.create({ adminUpiId: upiId || '' });
    } else {
      settings.adminUpiId = upiId !== undefined ? upiId : settings.adminUpiId;
      await settings.save();
    }
    
    res.status(200).json({
      success: true,
      data: {
        upiId: settings.adminUpiId
      }
    });
  } catch (error) {
    next(error);
  }
};
