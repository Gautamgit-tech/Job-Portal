const mongoose = require("mongoose");
const { URL } = require("url");

const isHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch (error) {
    return false;
  }
};

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
    companyName: { type: String, trim: true, default: "", maxlength: 160 },
    companyWebsite: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2048,
      validate: { validator: isHttpUrl, msg: "Enter a valid company website URL" },
    },
    industry: { type: String, trim: true, default: "", maxlength: 120 },
    companySize: {
      type: String,
      enum: ["", "1-10", "11-50", "51-200", "201-500", "500+"],
      default: "",
    },
    location: { type: String, trim: true, default: "", maxlength: 160 },
    companyLogo: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (value) {
          return value === "" || /^\/host\/profile\/[a-f0-9-]+\.(jpg|png)$/i.test(value);
        },
        msg: "Company logo must be uploaded through the profile image upload",
      },
    },
    linkedInUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2048,
      validate: {
        validator: function (value) {
          return !value || (isHttpUrl(value) && /^https?:\/\/([a-z0-9-]+\.)?linkedin\.com\//i.test(value));
        },
        msg: "Enter a valid LinkedIn profile or company URL",
      },
    },
    contactNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return v !== "" ? /^\+[1-9]\d{7,14}$/.test(v) : true;
        },
        msg: "Phone number is invalid!",
      },
    },
    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
  },
  { collation: { locale: "en" } }
);

module.exports = mongoose.model("RecruiterInfo", schema);
