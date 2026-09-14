const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("mongoose-type-email");

let schema = new mongoose.Schema(
  {
    email: {
      type: mongoose.SchemaTypes.Email,
      unique: true,
      lowercase: true,
      required: true,
    },
    phone: {
      type: String,
      unique: true,
      required: true,
      validate: {
        validator: function (v) {
          return /^\+\d{1,3}\d{10}$/.test(v);
        },
        msg: "Phone number is invalid!",
      },
    },
    password: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      enum: ["recruiter", "applicant"],
      required: true,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
  },
  { collation: { locale: "en" } }
);

schema.pre("save", function (next) {
  let user = this;
  if (!user.isModified("password") || !user.password) {
    return next();
  }
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) return next(err);
    user.password = hash;
    next();
  });
});

schema.methods.login = function (password) {
  let user = this;
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) reject(err);
      if (result) resolve();
      else reject();
    });
  });
};

module.exports = mongoose.model("UserAuth", schema);