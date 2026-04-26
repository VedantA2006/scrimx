const sendResponse = (res, statusCode, data = {}) => {
  const response = {
    success: true,
    ...data
  };
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, statusCode, data, pagination) => {
  return res.status(statusCode).json({
    success: true,
    ...data,
    pagination
  });
};

module.exports = { sendResponse, sendPaginated };
