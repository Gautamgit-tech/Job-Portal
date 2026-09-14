const mongoose = require("mongoose");

let schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    companyName: { type: String, trim: true, default: "" },
    contactNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return v !== "" ? /\+\d{1,3}\d{10}/.test(v) : true;
        },
        msg: "Phone number is invalid!",
      },
    },
    bio: {
      type: String,
    },
  },
  { collation: { locale: "en" } }
);

module.exports = mongoose.model("RecruiterInfo", schema);
