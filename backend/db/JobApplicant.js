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
    },
    education: [
      {
        institutionName: {
          type: String,
          required: true,
        },
        startYear: {
          type: Number,
          min: 1930,
          max: new Date().getFullYear(),
          required: true,
          validate: Number.isInteger,
        },
        endYear: {
          type: Number,
          max: new Date().getFullYear(),
          validate: [
            { validator: Number.isInteger, msg: "Year should be an integer" },
            {
              validator: function (value) {
                return this.startYear <= value;
              },
              msg: "End year should be greater than or equal to Start year",
            },
          ],
        },
      },
    ],
    skills: [String],
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
    resume: {
      type: String,
    },
    profile: {
      type: String,
    },
    headline: { type: String, trim: true, maxlength: 160 },
    location: { type: String, trim: true, maxlength: 120 },
    experience: [{
      title: String,
      company: String,
      employmentType: String,
      startDate: Date,
      endDate: Date,
      description: String,
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      url: String,
    }],
    certifications: [{
      name: String,
      issuer: String,
      date: Date,
      url: String,
    }],
    github: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    portfolio: { type: String, trim: true },
    savedJobs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "jobs",
    }],
  },
  { collation: { locale: "en" } }
);

schema.index({ userId: 1 }, { unique: true });
schema.index({ savedJobs: 1 });

module.exports = mongoose.model("JobApplicantInfo", schema);
