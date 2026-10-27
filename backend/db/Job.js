const mongoose = require("mongoose");
const { DEFAULT_HIRING_STAGES } = require("../lib/hiringStages");

let schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    jdFileUrl: {
      type: String,
      trim: true,
      default: "",
    },
    requirements: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    workMode: {
      type: String,
      enum: ["Remote", "Hybrid", "On-site", ""],
      default: "",
    },
    experienceLevel: {
      type: String,
      enum: ["Internship", "Entry level", "Mid level", "Senior level", ""],
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    maxApplicants: {
      type: Number,
      validate: [
        {
          validator: Number.isInteger,
          msg: "maxApplicants should be an integer",
        },
        {
          validator: function (value) {
            return value > 0;
          },
          msg: "maxApplicants should greater than 0",
        },
      ],
    },
    maxPositions: {
      type: Number,
      validate: [
        {
          validator: Number.isInteger,
          msg: "maxPostions should be an integer",
        },
        {
          validator: function (value) {
            return value > 0;
          },
          msg: "maxPositions should greater than 0",
        },
      ],
    },
    activeApplications: {
      type: Number,
      default: 0,
      validate: [
        {
          validator: Number.isInteger,
          msg: "activeApplications should be an integer",
        },
        {
          validator: function (value) {
            return value >= 0;
          },
          msg: "activeApplications should greater than equal to 0",
        },
      ],
    },
    acceptedCandidates: {
      type: Number,
      default: 0,
      validate: [
        {
          validator: Number.isInteger,
          msg: "acceptedCandidates should be an integer",
        },
        {
          validator: function (value) {
            return value >= 0;
          },
          msg: "acceptedCandidates should greater than equal to 0",
        },
      ],
    },
    dateOfPosting: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
      validate: [
        {
          validator: function (value) {
            return this.dateOfPosting < value;
          },
          msg: "deadline should be greater than dateOfPosting",
        },
      ],
    },
    skillsets: [String],
    hiringStages: {
      type: [{
        type: String,
        trim: true,
        minlength: 1,
        maxlength: 80,
      }],
      default: () => DEFAULT_HIRING_STAGES.slice(),
    },
    jobType: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      min: 0,
      validate: [
        {
          validator: Number.isInteger,
          msg: "Duration should be an integer",
        },
      ],
    },
    salary: {
      type: Number,
      validate: [
        {
          validator: Number.isInteger,
          msg: "Salary should be an integer",
        },
        {
          validator: function (value) {
            return value >= 0;
          },
          msg: "Salary should be positive",
        },
      ],
    },
    salaryMin: {
      type: Number,
      min: 0,
    },
    salaryMax: {
      type: Number,
      min: 0,
      validate: {
        validator: function (value) {
          return value === undefined || this.salaryMin === undefined || value >= this.salaryMin;
        },
        msg: "Maximum salary must be greater than or equal to minimum salary",
      },
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      required: true,
    },
    rating: {
      type: Number,
      max: 5.0,
      default: -1.0,
      validate: {
        validator: function (v) {
          return v >= -1.0 && v <= 5.0;
        },
        msg: "Invalid rating",
      },
    },
  },
  { collation: { locale: "en" } }
);

module.exports = mongoose.model("jobs", schema);
