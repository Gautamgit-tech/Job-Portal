const mongoose = require("mongoose");

const assessmentDetailsSchema = new mongoose.Schema(
  {
    link: { type: String, trim: true, maxlength: 2048 },
    deadline: { type: Date },
    score: { type: Number, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["Not sent", "Pending", "Completed", "Expired"],
      default: "Not sent",
    },
  },
  { _id: false }
);

const interviewRoundSchema = new mongoose.Schema(
  {
    roundNumber: { type: Number, required: true, min: 1 },
    roundName: { type: String, required: true, trim: true, maxlength: 120 },
    date: { type: Date, required: true },
    interviewType: {
      type: String,
      enum: ["Online", "On-site", "Phone"],
      default: "Online",
    },
    meetingLink: { type: String, trim: true, maxlength: 2048 },
    interviewer: { type: String, trim: true, maxlength: 160 },
    feedback: { type: String, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
  },
  { timestamps: true }
);

const aiMatchSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100, required: true },
    summary: { type: String, trim: true, maxlength: 1200, required: true },
    matchedSkills: [{ type: String, trim: true, maxlength: 120 }],
    missingSkills: [{ type: String, trim: true, maxlength: 120 }],
    analyzedAt: { type: Date, required: true },
    model: { type: String, trim: true, maxlength: 80, required: true },
  },
  { _id: false }
);

let schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "applied", // when a applicant is applied
        "under_review",
        "shortlisted", // when a applicant is shortlisted
        "assessment",
        "interview",
        "offer",
        "hired",
        "accepted", // when a applicant is accepted
        "rejected", // when a applicant is rejected
        "deleted", // when any job is deleted
        "cancelled", // an application is cancelled by its author or when other application is accepted
        "withdrawn",
        "finished", // when job is over
      ],
      default: "applied",
      required: true,
    },
    hiringStage: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    hiringStageHistory: [
      {
        previousStage: { type: String, trim: true, maxlength: 80 },
        newStage: { type: String, trim: true, maxlength: 80, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    assessmentDetails: {
      type: assessmentDetailsSchema,
      default: () => ({ status: "Not sent" }),
    },
    interviewRounds: {
      type: [interviewRoundSchema],
      default: [],
    },
    aiMatch: {
      type: aiMatchSchema,
      default: undefined,
    },
    dateOfApplication: {
      type: Date,
      default: Date.now,
    },
    dateOfJoining: {
      type: Date,
      validate: [
        {
          validator: function (value) {
            return this.dateOfApplication <= value;
          },
          msg: "dateOfJoining should be greater than dateOfApplication",
        },
      ],
    },
    sop: {
      type: String,
      validate: {
        validator: function (v) {
          return v.split(" ").filter((ele) => ele != "").length <= 250;
        },
        msg: "Statement of purpose should not be greater than 250 words",
      },
    },
    statusHistory: [
      {
        previousStatus: { type: String },
        newStatus: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
        changedAt: { type: Date, default: Date.now },
        recruiterNote: { type: String, trim: true, maxlength: 2000 },
      },
    ],
  },
  { collation: { locale: "en" }, timestamps: true }
);

schema.index({ userId: 1, dateOfApplication: -1 });
schema.index({ recruiterId: 1, jobId: 1, status: 1 });

// schema.virtual("applicationUser", {
//   ref: "JobApplicantInfo",
//   localField: "userId",
//   foreignField: "userId",
//   justOne: true,
// });

// schema.virtual("applicationRecruiter", {
//   ref: "RecruiterInfo",
//   localField: "recruiterId",
//   foreignField: "userId",
//   justOne: true,
// });

// schema.virtual("applicationJob", {
//   ref: "jobs",
//   localField: "jobId",
//   foreignField: "_id",
//   justOne: true,
// });

module.exports = mongoose.model("applications", schema);
