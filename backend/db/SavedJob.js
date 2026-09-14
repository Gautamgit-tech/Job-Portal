const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "jobs",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

schema.index({ applicantId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("SavedJob", schema);