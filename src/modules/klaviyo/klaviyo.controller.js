const service = require("./klaviyo.service");

const subscribe = async (req, res, next) => {
  try {
    const result = await service.subscribeProfileToList(req.body);
    return res.status(200).json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  subscribe,
};
