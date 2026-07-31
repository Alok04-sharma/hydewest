const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  const userId = user?._id || user?.id || user;
  const tokenVersion = Number(user?.tokenVersion || 0);

  return jwt.sign(
    {
      id: String(userId),
      tokenVersion,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      issuer: process.env.JWT_ISSUER || "hydewest-api",
      audience: process.env.JWT_AUDIENCE || "hydewest-client",
      subject: String(userId),
      algorithm: "HS256",
    }
  );
};

module.exports = generateToken;