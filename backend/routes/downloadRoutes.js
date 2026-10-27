const express = require("express");
const fs = require("fs");
const path = require("path");
const jwtAuth = require("../lib/jwtAuth");
const JobApplicant = require("../db/JobApplicant");
const Application = require("../db/Application");

const router = express.Router();

router.get("/job-description/:file", async (req, res) => {
  const filename = req.params.file;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i.test(filename)) {
    return res.status(400).json({ message: "Invalid job description path" });
  }

  const address = path.join(__dirname, "../public/job-description", filename);
  try {
    await fs.promises.access(address, fs.constants.F_OK);
    return res.type("application/pdf").sendFile(address, {
      headers: { "Content-Disposition": `inline; filename="${filename}"` },
    });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ message: "Job description PDF not found" });
    return res.status(500).json({ message: "Unable to access job description PDF" });
  }
});

router.get("/resume/:file", jwtAuth, async (req, res) => {
  const filename = req.params.file;
  if (path.basename(filename) !== filename || /[\\/]/.test(filename)) {
    return res.status(400).json({ message: "Invalid resume path" });
  }

  try {
    const applicant = await JobApplicant.findOne({ resume: `/host/resume/${filename}` }).select("userId");
    if (!applicant) return res.status(404).json({ message: "Resume not found" });

    const isOwner = req.user.type === "applicant" &&
      String(req.user._id) === String(applicant.userId);
    const isRecruiter = req.user.type === "recruiter" &&
      await Application.exists({ userId: applicant.userId, recruiterId: req.user._id });
    if (!isOwner && !isRecruiter) {
      return res.status(403).json({ message: "You don't have access to this resume" });
    }

    const address = path.join(__dirname, "../public/resume", filename);
    await fs.promises.access(address, fs.constants.F_OK);
    return res.sendFile(address);
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ message: "File not found" });
    return res.status(500).json({ message: "Unable to access resume" });
  }
});

router.get("/profile/:file", (req, res) => {
  const address = path.join(__dirname, `../public/profile/${req.params.file}`);
  fs.access(address, fs.F_OK, (err) => {
    if (err) {
      res.status(404).json({
        message: "File not found",
      });
      return;
    }
    res.sendFile(address);
  });
});

module.exports = router;
