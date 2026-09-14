const crypto = require("crypto");

module.exports = {
  jwtSecretKey: process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex"),
  emailUser: process.env.EMAIL_USER,
  emailPass: (process.env.EMAIL_PASS || "").replace(/\s+/g, ""),
};