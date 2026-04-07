// src/utils/response.js

const sendSuccess = (res, data, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

const sendCreated = (res, data, message = 'Created successfully') => {
  return sendSuccess(res, data, 201, message);
};

const sendNoContent = (res) => {
  return res.status(204).send();
};

module.exports = { sendSuccess, sendCreated, sendNoContent };
