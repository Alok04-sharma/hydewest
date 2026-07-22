const sendResponse = require("../utils/sendResponse");

const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return sendResponse(
        res,
        400,
        false,
        result.error.issues[0].message
      );
    }

    req.body = result.data;

    next();
  };
};

module.exports = validate;