const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { PDFParse } = require("pdf-parse");
const jwtAuth = require("../lib/jwtAuth");

const User = require("../db/User");
const JobApplicant = require("../db/JobApplicant");
const Recruiter = require("../db/Recruiter");
const Job = require("../db/Job");
const Application = require("../db/Application");
const Rating = require("../db/Rating");
const SavedJob = require("../db/SavedJob");
const {
  DEFAULT_HIRING_STAGES,
} = require("../lib/hiringStages");
const { generateJobDescription, matchCandidate } = require("../lib/aiService");

const jdUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() !== ".pdf" ||
      !["application/pdf", "application/octet-stream"].includes(file.mimetype)) {
      callback(new Error("Job description attachment must be a PDF file"));
      return;
    }
    callback(null, true);
  },
});

const allowedStatusTransitions = {
  applied: ["under_review", "shortlisted", "rejected", "cancelled", "withdrawn"],
  under_review: ["shortlisted", "rejected", "cancelled", "withdrawn"],
  shortlisted: ["assessment", "interview", "offer", "accepted", "rejected", "cancelled", "withdrawn"],
  assessment: ["interview", "rejected", "cancelled", "withdrawn"],
  interview: ["offer", "rejected", "cancelled", "withdrawn"],
  offer: ["hired", "rejected", "cancelled", "withdrawn"],
  hired: ["finished"],
  accepted: ["finished"],
  rejected: [],
  withdrawn: [],
  cancelled: [],
  deleted: [],
  finished: [],
};

const hiringStageForLegacyStatus = {
  applied: "Applied",
  under_review: "Applied",
  shortlisted: "Shortlisted",
  assessment: "Assessment",
  interview: "PI",
  offer: "HR Interview",
  hired: "Hired",
  accepted: "Hired",
  rejected: "Rejected",
};

const isHttpUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch (error) {
    return false;
  }
};

const router = express.Router();

router.post("/ai/generate-jd", jwtAuth, async (req, res) => {
  if (req.user.type !== "recruiter") {
    return res.status(403).json({ message: "Recruiter access required" });
  }
  const { title, skills, requirements } = req.body || {};
  if (typeof title !== "string" || !title.trim() || title.trim().length > 160) {
    return res.status(400).json({ message: "A job title of 1 to 160 characters is required" });
  }
  if (skills !== undefined && typeof skills !== "string" && !Array.isArray(skills)) {
    return res.status(400).json({ message: "Skills must be text or a list of skills" });
  }
  if (requirements !== undefined && (typeof requirements !== "string" || requirements.length > 8000)) {
    return res.status(400).json({ message: "Requirements must be text of 8,000 characters or fewer" });
  }

  try {
    const skillText = Array.isArray(skills) ? skills.join(", ") : (skills || "");
    if (skillText.length > 2000) {
      return res.status(400).json({ message: "Skills must be 2,000 characters or fewer" });
    }
    const description = await generateJobDescription({
      title: title.trim(),
      skills: skillText.trim(),
      requirements: (requirements || "").trim(),
    });
    return res.json({ description });
  } catch (error) {
    return res.status(error.statusCode || 502).json({ message: error.message || "Unable to generate job description" });
  }
});

router.post("/applications/:id/ai-match", jwtAuth, async (req, res) => {
  if (req.user.type !== "recruiter") {
    return res.status(403).json({ message: "Recruiter access required" });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid application id" });
  }

  try {
    const application = await Application.findOne({
      _id: req.params.id,
      recruiterId: req.user._id,
    });
    if (!application) return res.status(404).json({ message: "Application not found" });

    const job = await Job.findOne({
      _id: application.jobId,
      userId: req.user._id,
    }).select("title description requirements skillsets");
    if (!job) return res.status(403).json({ message: "You do not own this job" });

    const applicant = await JobApplicant.findOne({ userId: application.userId }).select("skills resume");
    if (!applicant) return res.status(404).json({ message: "Candidate profile not found" });
    if (!applicant.resume) return res.status(400).json({ message: "This candidate has not uploaded a resume" });

    const resumeFilename = path.basename(applicant.resume);
    if (
      !applicant.resume.startsWith("/host/resume/") ||
      resumeFilename !== applicant.resume.slice("/host/resume/".length) ||
      !resumeFilename.toLowerCase().endsWith(".pdf")
    ) {
      return res.status(400).json({ message: "Candidate resume path is invalid" });
    }

    const resumePath = path.join(__dirname, "../public/resume", resumeFilename);
    let resumeBuffer;
    try {
      resumeBuffer = await fs.promises.readFile(resumePath);
    } catch (error) {
      if (error.code === "ENOENT") return res.status(404).json({ message: "Candidate resume file was not found" });
      throw error;
    }

    let parser;
    let resumeText;
    try {
      parser = new PDFParse({ data: resumeBuffer });
      const parsed = await parser.getText();
      resumeText = parsed.text;
    } catch (error) {
      return res.status(422).json({ message: "Unable to extract readable text from this PDF resume" });
    } finally {
      if (parser) await parser.destroy();
    }
    if (!resumeText || !resumeText.trim()) {
      return res.status(422).json({ message: "This PDF resume contains no extractable text" });
    }

    const aiMatch = await matchCandidate({
      jobTitle: job.title,
      jobDescription: job.description,
      requirements: job.requirements,
      requiredSkills: job.skillsets,
      candidateSkills: applicant.skills,
      resumeText,
    });
    application.aiMatch = aiMatch;
    await application.save();

    return res.json({
      message: "AI resume match saved",
      aiMatch: application.aiMatch,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to analyze candidate resume",
    });
  }
});

// To add new job
router.post("/jobs", jwtAuth, (req, res, next) => {
  jdUpload.single("jdFile")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Job description PDF must be 10 MB or smaller"
      : error.message || "Unable to process job description PDF";
    return res.status(400).json({ message });
  });
}, async (req, res) => {
  const user = req.user;
  if (user.type !== "recruiter") {
    return res.status(403).json({ message: "Recruiter access required" });
  }

  let savedPdfPath;
  try {
    const data = req.body;
    if (req.file && req.file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(400).json({ message: "The uploaded file is not a valid PDF" });
    }
    const parseList = (value) => {
      if (Array.isArray(value)) return value;
      if (typeof value !== "string" || !value.trim()) return [];
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return value.split(",").map((item) => item.trim()).filter(Boolean);
      }
    };
    const salaryMin = data.salaryMin === "" ? undefined : Number(data.salaryMin);
    const salaryMax = data.salaryMax === "" ? undefined : Number(data.salaryMax);
    let jdFileUrl = "";
    if (req.file) {
      const directory = path.join(__dirname, "../public/job-description");
      await fs.promises.mkdir(directory, { recursive: true });
      const filename = `${uuidv4()}.pdf`;
      savedPdfPath = path.join(directory, filename);
      await fs.promises.writeFile(savedPdfPath, req.file.buffer, { flag: "wx" });
      jdFileUrl = `/host/job-description/${filename}`;
    }
    const job = new Job({
      userId: user._id,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      maxApplicants: data.maxApplicants,
      maxPositions: data.maxPositions,
      deadline: data.deadline,
      skillsets: parseList(data.skillsets),
      hiringStages: DEFAULT_HIRING_STAGES,
      jdFileUrl,
      location: data.location,
      workMode: data.workMode,
      experienceLevel: data.experienceLevel,
      category: data.category,
      jobType: data.jobType,
      duration: data.duration,
      salaryMin,
      salaryMax,
      salary: salaryMin !== undefined && salaryMax !== undefined
        ? Math.round((salaryMin + salaryMax) / 2)
        : data.salary,
    });

    await job.save();
    return res.status(201).json({ message: "Job added successfully", job });
  } catch (err) {
    if (savedPdfPath) {
      try {
        await fs.promises.unlink(savedPdfPath);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") console.error("Failed to remove an unassociated job description PDF", cleanupError);
      }
    }
    return res.status(err.name === "ValidationError" ? 400 : 500).json({
      message: err.name === "ValidationError" ? err.message : "Unable to create the job listing",
    });
  }
});

// to get all the jobs [pagination] [for recruiter personal and for everyone]
router.get("/jobs", jwtAuth.optional, (req, res) => {
  let user = req.user;

  let findParams = {};
  let sortParams = {};
  const paginated = req.query.page !== undefined || req.query.limit !== undefined;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);

  // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
  // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
  // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

  // to list down jobs posted by a particular recruiter
  if (user && user.type === "recruiter" && req.query.myjobs) {
    findParams = {
      ...findParams,
      userId: user._id,
    };
  }
  if (!(user && user.type === "recruiter" && req.query.myjobs)) {
    findParams.status = { $ne: "closed" };
    findParams.$and = [
      {
        $or: [
          { deadline: { $exists: false } },
          { deadline: null },
          { deadline: { $gt: new Date() } },
        ],
      },
    ];
  }

  if (req.query.q) {
    findParams = {
      ...findParams,
      $or: [
        { title: { $regex: req.query.q, $options: "i" } },
        { skillsets: { $regex: req.query.q, $options: "i" } },
      ],
    };
  }

  if (req.query.location) {
    findParams.location = { $regex: req.query.location, $options: "i" };
  }

  if (req.query.workMode) {
    findParams.workMode = req.query.workMode;
  }

  if (req.query.experienceLevel) {
    findParams.experienceLevel = req.query.experienceLevel;
  }

  if (req.query.category) {
    findParams.category = { $regex: req.query.category, $options: "i" };
  }

  if (req.query.postedAfter) {
    findParams.dateOfPosting = { $gte: new Date(req.query.postedAfter) };
  }

  if (req.query.jobType) {
    let jobTypes = [];
    if (Array.isArray(req.query.jobType)) {
      jobTypes = req.query.jobType;
    } else {
      jobTypes = [req.query.jobType];
    }
    console.log(jobTypes);
    findParams = {
      ...findParams,
      jobType: {
        $in: jobTypes,
      },
    };
  }

  if (req.query.salaryMin && req.query.salaryMax) {
    findParams.$and = [
      ...(findParams.$and || []),
      { salary: { $gte: parseInt(req.query.salaryMin, 10) } },
      { salary: { $lte: parseInt(req.query.salaryMax, 10) } },
    ];
  } else if (req.query.salaryMin) {
    findParams.salary = { $gte: parseInt(req.query.salaryMin, 10) };
  } else if (req.query.salaryMax) {
    findParams.salary = { $lte: parseInt(req.query.salaryMax, 10) };
  }

  if (req.query.duration) {
    findParams = {
      ...findParams,
      duration: {
        $lt: parseInt(req.query.duration),
      },
    };
  }

  if (req.query.asc) {
    if (Array.isArray(req.query.asc)) {
      req.query.asc.map((key) => {
        sortParams = {
          ...sortParams,
          [key]: 1,
        };
      });
    } else {
      sortParams = {
        ...sortParams,
        [req.query.asc]: 1,
      };
    }
  }

  if (req.query.desc) {
    if (Array.isArray(req.query.desc)) {
      req.query.desc.map((key) => {
        sortParams = {
          ...sortParams,
          [key]: -1,
        };
      });
    } else {
      sortParams = {
        ...sortParams,
        [req.query.desc]: -1,
      };
    }
  }

  let arr = [
    {
      $lookup: {
        from: "recruiterinfos",
        localField: "userId",
        foreignField: "userId",
        as: "recruiter",
      },
    },
    { $unwind: "$recruiter" },
    { $match: findParams },
  ];

  if (Object.keys(sortParams).length > 0) {
    arr = [
      {
        $lookup: {
          from: "recruiterinfos",
          localField: "userId",
          foreignField: "userId",
          as: "recruiter",
        },
      },
      { $unwind: "$recruiter" },
      { $match: findParams },
      {
        $sort: sortParams,
      },
    ];
  }

  const query = Job.aggregate(arr);
  if (paginated) {
    query.facet({
      results: [{ $skip: (page - 1) * limit }, { $limit: limit }],
      metadata: [{ $count: "total" }],
    });
  }

  query
    .then((posts) => {
      if (posts == null || (paginated && posts.length === 0)) {
        res.status(404).json({
          message: "No job found",
        });
        return;
      }
      if (paginated) {
        const metadata = posts[0].metadata[0] || { total: 0 };
        res.json({
          results: posts[0].results,
          page,
          limit,
          total: metadata.total,
          pages: Math.ceil(metadata.total / limit),
        });
        return;
      }
      res.json(posts);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/recruiter-dashboard", jwtAuth, async (req, res) => {
  if (req.user.type !== "recruiter") {
    return res.status(403).json({ message: "Recruiter access required" });
  }

  try {
    const [jobs, totalApplicants] = await Promise.all([
      Job.find({ userId: req.user._id }).select("status deadline").lean(),
      Application.countDocuments({ recruiterId: req.user._id }),
    ]);
    const now = new Date();
    const activeJobs = jobs.filter((job) =>
      job.status !== "closed" && (!job.deadline || new Date(job.deadline) > now)
    ).length;

    return res.json({
      totalJobs: jobs.length,
      totalApplicants,
      activeJobs,
      closedJobs: jobs.length - activeJobs,
    });
  } catch (err) {
    return res.status(500).json({ message: "Unable to load recruiter dashboard" });
  }
});

// to get info about a particular job
router.get("/jobs/:id", jwtAuth, (req, res) => {
  Job.findOne({ _id: req.params.id })
    .then((job) => {
      if (job == null) {
        res.status(400).json({
          message: "Job does not exist",
        });
        return;
      }
      res.json(job);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// to update info of a particular job
router.put("/jobs/:id", jwtAuth, async (req, res) => {
  const user = req.user;
  if (user.type !== "recruiter") {
    return res.status(403).json({
      message: "Recruiter access required",
    });
  }
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: user._id });
    if (!job) return res.status(404).json({ message: "Job does not exist" });
    const data = req.body;
    const editableFields = [
      "title", "description", "requirements", "maxApplicants", "maxPositions",
      "deadline", "skillsets", "location", "workMode", "experienceLevel",
      "category", "jobType", "duration", "status",
    ];
    editableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(data, field)) job[field] = data[field];
    });
    job.hiringStages = DEFAULT_HIRING_STAGES;
    if (Object.prototype.hasOwnProperty.call(data, "salaryMin")) {
      job.salaryMin = data.salaryMin === "" ? undefined : Number(data.salaryMin);
    }
    if (Object.prototype.hasOwnProperty.call(data, "salaryMax")) {
      job.salaryMax = data.salaryMax === "" ? undefined : Number(data.salaryMax);
    }
    if (job.salaryMin !== undefined && job.salaryMax !== undefined) {
      job.salary = Math.round((job.salaryMin + job.salaryMax) / 2);
    }
    await job.save();
    return res.json({ message: "Job details updated successfully", job });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// to delete a job
router.delete("/jobs/:id", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type !== "recruiter") {
    return res.status(403).json({
      message: "Recruiter access required",
    });
  }
  Job.findOneAndDelete({
    _id: req.params.id,
    userId: user._id,
  })
    .then((job) => {
      if (job === null) {
        res.status(404).json({
          message: "Job does not exist",
        });
        return;
      }
      res.json({
        message: "Job deleted successfully",
      });
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// get user's personal details
router.get("/user", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type === "recruiter") {
    Recruiter.findOne({ userId: user._id })
      .then((recruiter) => {
        if (recruiter == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        res.json(recruiter);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    JobApplicant.findOne({ userId: user._id })
      .then((jobApplicant) => {
        if (jobApplicant == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        res.json(jobApplicant);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
});

router.get("/applicant-dashboard", jwtAuth, async (req, res) => {
  if (req.user.type !== "applicant") return res.status(403).json({ message: "Applicant access required" });
  try {
    const applicant = await JobApplicant.findOne({ userId: req.user._id }).lean();
    if (!applicant) return res.status(404).json({ message: "Applicant profile not found" });
    const account = await User.findById(req.user._id).select("email").lean();
    const applications = await Application.aggregate([
      { $match: { userId: req.user._id } },
      { $lookup: { from: "jobs", localField: "jobId", foreignField: "_id", as: "job" } },
      { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "recruiterinfos", localField: "recruiterId", foreignField: "userId", as: "recruiter" } },
      { $unwind: { path: "$recruiter", preserveNullAndEmptyArrays: true } },
      { $sort: { dateOfApplication: -1 } },
      { $limit: 5 },
    ]);
    const statusCounts = await Application.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const stats = statusCounts.reduce((result, item) => ({ ...result, [item._id]: item.count }), {});
    const saved = await SavedJob.aggregate([
      { $match: { applicantId: req.user._id } },
      { $lookup: { from: "jobs", localField: "jobId", foreignField: "_id", as: "job" } },
      { $unwind: "$job" },
      { $lookup: { from: "recruiterinfos", localField: "job.userId", foreignField: "userId", as: "recruiter" } },
      { $unwind: { path: "$recruiter", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $limit: 3 },
      { $project: { _id: 1, createdAt: 1, job: 1, recruiter: 1 } },
    ]);
    const skills = (applicant.skills || []).map((skill) => skill.toLowerCase());
    const recommendations = (await Job.find({ deadline: { $gt: new Date() } }).sort({ dateOfPosting: -1 }).limit(50).lean())
      .filter((job) => !applications.some((application) => String(application.jobId) === String(job._id)))
      .map((job) => {
        const matchedSkills = (job.skillsets || []).filter((skill) => skills.includes(String(skill).toLowerCase()));
        const score = job.skillsets?.length ? Math.round((matchedSkills.length / job.skillsets.length) * 100) : 0;
        return { ...job, matchedSkills, matchScore: score };
      }).sort((left, right) => right.matchScore - left.matchScore || new Date(right.dateOfPosting) - new Date(left.dateOfPosting)).slice(0, 4);
    res.json({ profile: { ...applicant, email: account?.email || "" }, applications, stats, saved, recommendations });
  } catch (err) {
    res.status(500).json({ message: "Unable to load applicant dashboard" });
  }
});

// get user details from id
router.get("/user/:id", jwtAuth, (req, res) => {
  User.findOne({ _id: req.params.id })
    .then((userData) => {
      if (userData === null) {
        res.status(404).json({
          message: "User does not exist",
        });
        return;
      }

      if (userData.type === "recruiter") {
        Recruiter.findOne({ userId: userData._id })
          .then((recruiter) => {
            if (recruiter === null) {
              res.status(404).json({
                message: "User does not exist",
              });
              return;
            }
            res.json(recruiter);
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      } else {
        JobApplicant.findOne({ userId: userData._id })
          .then((jobApplicant) => {
            if (jobApplicant === null) {
              res.status(404).json({
                message: "User does not exist",
              });
              return;
            }
            res.json(jobApplicant);
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      }
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// update user details
router.put("/user", jwtAuth, async (req, res) => {
  const user = req.user;
  const data = req.body;
  if (user.type === "recruiter") {
    try {
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return res.status(400).json({ message: "A profile object is required" });
      }
      const recruiter = await Recruiter.findOne({ userId: user._id });
      if (!recruiter) {
        return res.status(404).json({ message: "Recruiter profile not found" });
      }

      const fields = [
        "name",
        "contactNumber",
        "bio",
        "companyName",
        "companyWebsite",
        "industry",
        "companySize",
        "location",
        "companyLogo",
        "linkedInUrl",
      ];
      for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          if (typeof data[field] !== "string") {
            return res.status(400).json({ message: `${field} must be a string` });
          }
          recruiter[field] = data[field].trim();
        }
      }

      if (recruiter.name.trim().length < 2) {
        return res.status(400).json({ message: "Name must contain at least 2 characters" });
      }
      if (recruiter.companyName.trim().length < 2) {
        return res.status(400).json({ message: "Company name must contain at least 2 characters" });
      }
      if (recruiter.bio.length > 2000) {
        return res.status(400).json({ message: "Company description must be 2000 characters or fewer" });
      }

      await recruiter.save();
      return res.json({
        message: "Recruiter profile updated successfully",
        profile: recruiter,
      });
    } catch (err) {
      if (err.name === "ValidationError" || err.name === "CastError") {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: "Unable to update recruiter profile" });
    }
  } else {
    JobApplicant.findOne({ userId: user._id })
      .then((jobApplicant) => {
        if (jobApplicant == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        if (data.name) {
          jobApplicant.name = data.name;
        }
        if (data.education) {
          jobApplicant.education = data.education;
        }
        if (data.skills) {
          jobApplicant.skills = data.skills;
        }
        if (data.resume) {
          jobApplicant.resume = data.resume;
        }
        if (data.profile) {
          jobApplicant.profile = data.profile;
        }
        ["headline", "location", "experience", "projects", "certifications", "github", "linkedin", "portfolio"].forEach((key) => {
          if (data[key] !== undefined) jobApplicant[key] = data[key];
        });
        console.log(jobApplicant);
        jobApplicant
          .save()
          .then(() => {
            res.json({
              message: "User information updated successfully",
            });
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
});

// apply for a job [todo: test: done]
router.post("/jobs/:id/applications", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "applicant") {
    res.status(401).json({
      message: "You don't have permissions to apply for a job",
    });
    return;
  }
  const data = req.body;
  const jobId = req.params.id;

  // check whether applied previously
  // find job
  // check count of active applications < limit
  // check user had < 10 active applications && check if user is not having any accepted jobs (user id)
  // store the data in applications

  Application.findOne({
    userId: user._id,
    jobId: jobId,
    status: {
      $nin: ["deleted", "accepted", "cancelled"],
    },
  })
    .then((appliedApplication) => {
      console.log(appliedApplication);
      if (appliedApplication !== null) {
        res.status(400).json({
          message: "You have already applied for this job",
        });
        return;
      }

      Job.findOne({ _id: jobId })
        .then((job) => {
          if (job === null) {
            res.status(404).json({
              message: "Job does not exist",
            });
            return;
          }
          if (job.status === "closed" || (job.deadline && job.deadline <= new Date())) {
            res.status(409).json({ message: "This job is no longer accepting applications" });
            return;
          }
          Application.countDocuments({
            jobId: jobId,
            status: {
              $nin: ["rejected", "deleted", "cancelled", "finished"],
            },
          })
            .then((activeApplicationCount) => {
              if (activeApplicationCount < job.maxApplicants) {
                Application.countDocuments({
                  userId: user._id,
                  status: {
                    $nin: ["rejected", "deleted", "cancelled", "finished"],
                  },
                })
                  .then((myActiveApplicationCount) => {
                    if (myActiveApplicationCount < 10) {
                      Application.countDocuments({
                        userId: user._id,
                        status: "accepted",
                      }).then((acceptedJobs) => {
                        if (acceptedJobs === 0) {
                          const application = new Application({
                            userId: user._id,
                            recruiterId: job.userId,
                            jobId: job._id,
                            status: "applied",
                            hiringStage: "Applied",
                            statusHistory: [{
                              newStatus: "applied",
                              changedBy: user._id,
                            }],
                            sop: data.sop,
                          });
                          application
                            .save()
                            .then(() => {
                              res.json({
                                message: "Job application successful",
                              });
                            })
                            .catch((err) => {
                              res.status(400).json(err);
                            });
                        } else {
                          res.status(400).json({
                            message:
                              "You already have an accepted job. Hence you cannot apply.",
                          });
                        }
                      });
                    } else {
                      res.status(400).json({
                        message:
                          "You have 10 active applications. Hence you cannot apply.",
                      });
                    }
                  })
                  .catch((err) => {
                    res.status(400).json(err);
                  });
              } else {
                res.status(400).json({
                  message: "Application limit reached",
                });
              }
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    })
    .catch((err) => {
      res.json(400).json(err);
    });
});

// recruiter gets applications for a particular job [pagination] [todo: test: done]
router.get("/jobs/:id/applications", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "recruiter") {
    res.status(401).json({
      message: "You don't have permissions to view job applications",
    });
    return;
  }
  const jobId = req.params.id;

  // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
  // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
  // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

  let findParams = {
    jobId: jobId,
    recruiterId: user._id,
  };

  let sortParams = {};

  if (req.query.status) {
    findParams = {
      ...findParams,
      status: req.query.status,
    };
  }

  Application.find(findParams)
    .collation({ locale: "en" })
    .sort(sortParams)
    // .skip(skip)
    // .limit(limit)
    .then((applications) => {
      res.json(applications);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/applications/:id/stage", jwtAuth, async (req, res) => {
  if (req.user.type !== "recruiter") {
    return res.status(403).json({ message: "Recruiter access required" });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid application id" });
  }
  const data = req.body;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({ message: "A stage update object is required" });
  }

  const allowedFields = ["stage", "assessmentDetails", "interviewRound"];
  if (Object.keys(data).some((field) => !allowedFields.includes(field))) {
    return res.status(400).json({ message: "Unexpected stage update field" });
  }
  if (!Object.prototype.hasOwnProperty.call(data, "stage")) {
    return res.status(400).json({ message: "Candidate stage is required" });
  }

  try {
    const application = await Application.findOne({
      _id: req.params.id,
      recruiterId: req.user._id,
    });
    if (!application) return res.status(404).json({ message: "Application not found" });

    const job = await Job.findOne({ _id: application.jobId, userId: req.user._id }).select("_id");
    if (!job) return res.status(403).json({ message: "You do not own this job" });
    if (["deleted", "cancelled", "withdrawn"].includes(application.status)) {
      return res.status(409).json({ message: "This application is no longer active" });
    }

    const currentStage = application.hiringStage || hiringStageForLegacyStatus[application.status] || "Applied";
    if (!DEFAULT_HIRING_STAGES.includes(data.stage)) {
      return res.status(400).json({ message: "Choose a stage from the hiring pipeline" });
    }

    const nextStage = data.stage;
    if (data.assessmentDetails !== undefined) {
      const details = data.assessmentDetails;
      if (!details || typeof details !== "object" || Array.isArray(details)) {
        return res.status(400).json({ message: "Assessment details must be an object" });
      }
      if (!isHttpUrl(details.link)) {
        return res.status(400).json({ message: "A valid HTTP(S) assessment link is required" });
      }
      const deadline = new Date(details.deadline);
      if (!details.deadline || Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
        return res.status(400).json({ message: "Assessment deadline must be a future date and time" });
      }
      application.assessmentDetails = {
        link: details.link.trim(),
        deadline,
        status: "Pending",
      };
    }

    if (data.interviewRound !== undefined) {
      const round = data.interviewRound;
      if (!round || typeof round !== "object" || Array.isArray(round)) {
        return res.status(400).json({ message: "Interview round details must be an object" });
      }
      if (application.interviewRounds.length >= 20) {
        return res.status(409).json({ message: "Maximum interview rounds reached" });
      }
      const date = new Date(round.date);
      if (!round.roundName || typeof round.roundName !== "string" || round.roundName.trim().length > 120) {
        return res.status(400).json({ message: "Interview round name is required and must be 120 characters or fewer" });
      }
      if (!round.date || Number.isNaN(date.getTime()) || date <= new Date()) {
        return res.status(400).json({ message: "Interview date and time must be in the future" });
      }
      const interviewType = round.interviewType || "Online";
      if (!["Online", "On-site", "Phone"].includes(interviewType)) {
        return res.status(400).json({ message: "Invalid interview type" });
      }
      if (round.meetingLink && !isHttpUrl(round.meetingLink)) {
        return res.status(400).json({ message: "Meeting link must be a valid HTTP(S) URL" });
      }
      if (interviewType === "Online" && !isHttpUrl(round.meetingLink)) {
        return res.status(400).json({ message: "A valid meeting link is required for online interviews" });
      }

      application.interviewRounds.push({
        roundNumber: application.interviewRounds.length + 1,
        roundName: round.roundName.trim(),
        date,
        interviewType,
        meetingLink: typeof round.meetingLink === "string" ? round.meetingLink.trim() : "",
        interviewer: typeof round.interviewer === "string" ? round.interviewer.trim() : "",
        feedback: "",
        status: "Scheduled",
      });
    }

    if (nextStage !== application.hiringStage) {
      application.hiringStageHistory.push({
        previousStage: currentStage,
        newStage: nextStage,
        changedBy: req.user._id,
      });
      application.hiringStage = nextStage;
    }
    await application.save();
    return res.json({
      message: "Candidate stage updated successfully",
      application,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Unable to update candidate stage" });
  }
});

// recruiter/applicant gets all his applications [pagination]
router.get("/applications", jwtAuth, (req, res) => {
  const user = req.user;

  // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
  // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
  // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

  Application.aggregate([
    {
      $lookup: {
        from: "jobapplicantinfos",
        localField: "userId",
        foreignField: "userId",
        as: "jobApplicant",
      },
    },
    { $unwind: { path: "$jobApplicant", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "jobs",
        localField: "jobId",
        foreignField: "_id",
        as: "job",
      },
    },
    { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "recruiterinfos",
        localField: "recruiterId",
        foreignField: "userId",
        as: "recruiter",
      },
    },
    { $unwind: { path: "$recruiter", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        [user.type === "recruiter" ? "recruiterId" : "userId"]: user._id,
      },
    },
    {
      $sort: {
        dateOfApplication: -1,
      },
    },
  ])
    .then((applications) => {
      res.json(applications);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// update status of application: [Applicant: Can cancel, Recruiter: Can do everything] [todo: test: done]
router.put("/applications/:id", jwtAuth, (req, res) => {
  const user = req.user;
  const id = req.params.id;
  const status = req.body.status;
  const recruiterNote = typeof req.body.recruiterNote === "string" ? req.body.recruiterNote.trim() : "";

  if (!Object.prototype.hasOwnProperty.call(allowedStatusTransitions, status)) {
    return res.status(400).json({ message: "Invalid application status" });
  }

  // "applied", // when a applicant is applied
  // "shortlisted", // when a applicant is shortlisted
  // "accepted", // when a applicant is accepted
  // "rejected", // when a applicant is rejected
  // "deleted", // when any job is deleted
  // "cancelled", // an application is cancelled by its author or when other application is accepted
  // "finished", // when job is over

  if (user.type === "recruiter") {
    if (status === "accepted") {
      // get job id from application
      // get job info for maxPositions count
      // count applications that are already accepted
      // compare and if condition is satisfied, then save

      Application.findOne({
        _id: id,
        recruiterId: user._id,
      })
        .then((application) => {
          if (application === null) {
            res.status(404).json({
              message: "Application not found",
            });
            return;
          }

          Job.findOne({
            _id: application.jobId,
            userId: user._id,
          }).then((job) => {
            if (job === null) {
              res.status(404).json({
                message: "Job does not exist",
              });
              return;
            }

            Application.countDocuments({
              recruiterId: user._id,
              jobId: job._id,
              status: "accepted",
            }).then((activeApplicationCount) => {
              if (activeApplicationCount < job.maxPositions) {
                // accepted
                if (!allowedStatusTransitions[application.status].includes(status)) {
                  res.status(409).json({ message: `Cannot move application from ${application.status} to ${status}` });
                  return;
                }
                application.statusHistory.push({ previousStatus: application.status, newStatus: status, changedBy: user._id, recruiterNote });
                application.status = status;
                application.dateOfJoining = req.body.dateOfJoining;
                application
                  .save()
                  .then(() => {
                    Application.find(
                      {
                        _id: {
                          $ne: application._id,
                        },
                        userId: application.userId,
                        status: {
                          $nin: [
                            "rejected",
                            "deleted",
                            "cancelled",
                            "accepted",
                            "finished",
                          ],
                        },
                      }
                    )
                      .then((otherApplications) => Promise.all(otherApplications.map((otherApplication) => {
                        otherApplication.statusHistory.push({ previousStatus: otherApplication.status, newStatus: "cancelled", changedBy: user._id });
                        otherApplication.status = "cancelled";
                        return otherApplication.save();
                      })))
                      .then(() => {
                        if (status === "accepted") {
                          Job.findOneAndUpdate(
                            {
                              _id: job._id,
                              userId: user._id,
                            },
                            {
                              $set: {
                                acceptedCandidates: activeApplicationCount + 1,
                              },
                            }
                          )
                            .then(() => {
                              res.json({
                                message: `Application ${status} successfully`,
                              });
                            })
                            .catch((err) => {
                              res.status(400).json(err);
                            });
                        } else {
                          res.json({
                            message: `Application ${status} successfully`,
                          });
                        }
                      })
                      .catch((err) => {
                        res.status(400).json(err);
                      });
                  })
                  .catch((err) => {
                    res.status(400).json(err);
                  });
              } else {
                res.status(400).json({
                  message: "All positions for this job are already filled",
                });
              }
            });
          });
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    } else {
      Application.findOne(
        {
          _id: id,
          recruiterId: user._id,
          status: {
            $nin: ["rejected", "deleted", "cancelled"],
          },
        }
      )
        .then((application) => {
          if (application === null) {
            res.status(400).json({
              message: "Application status cannot be updated",
            });
            return;
          }
          if (!allowedStatusTransitions[application.status].includes(status)) {
            res.status(409).json({ message: `Cannot move application from ${application.status} to ${status}` });
            return;
          }
          const previousStatus = application.status;
          application.status = status;
          application.statusHistory.push({ previousStatus, newStatus: status, changedBy: user._id, recruiterNote });
          return application.save();
        })
        .then((application) => {
          if (!application) return;
          if (status === "finished") {
            res.json({
              message: `Job ${status} successfully`,
            });
          } else {
            res.json({
              message: `Application ${status} successfully`,
            });
          }
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    }
  } else {
    if (status === "cancelled" || status === "withdrawn") {
      console.log(id);
      console.log(user._id);
      Application.findOne(
        {
          _id: id,
          userId: user._id,
        },
      )
        .then((application) => {
          if (!application) {
            res.status(404).json({ message: "Application not found" });
            return;
          }
          if (!allowedStatusTransitions[application.status].includes(status)) {
            res.status(409).json({ message: `Cannot move application from ${application.status} to ${status}` });
            return;
          }
          application.statusHistory.push({ previousStatus: application.status, newStatus: status, changedBy: user._id });
          application.status = status;
          return application.save();
        })
        .then((application) => {
          if (!application) return;
          res.json({
            message: `Application ${status} successfully`,
          });
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    } else {
      res.status(401).json({
        message: "You don't have permissions to update job status",
      });
    }
  }
});

// get a list of final applicants for current job : recruiter
// get a list of final applicants for all his jobs : recuiter
router.get("/applicants", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type === "recruiter") {
    let findParams = {
      recruiterId: user._id,
    };
    if (req.query.jobId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.jobId)) {
        return res.status(400).json({ message: "Invalid job id" });
      }
      findParams = {
        ...findParams,
        jobId: new mongoose.Types.ObjectId(req.query.jobId),
      };
    }
    if (req.query.status) {
      if (Array.isArray(req.query.status)) {
        findParams = {
          ...findParams,
          status: { $in: req.query.status },
        };
      } else {
        findParams = {
          ...findParams,
          status: req.query.status,
        };
      }
    }
    let sortParams = {};

    if (!req.query.asc && !req.query.desc) {
      sortParams = { _id: 1 };
    }

    if (req.query.asc) {
      if (Array.isArray(req.query.asc)) {
        req.query.asc.map((key) => {
          sortParams = {
            ...sortParams,
            [key]: 1,
          };
        });
      } else {
        sortParams = {
          ...sortParams,
          [req.query.asc]: 1,
        };
      }
    }

    if (req.query.desc) {
      if (Array.isArray(req.query.desc)) {
        req.query.desc.map((key) => {
          sortParams = {
            ...sortParams,
            [key]: -1,
          };
        });
      } else {
        sortParams = {
          ...sortParams,
          [req.query.desc]: -1,
        };
      }
    }

    Application.aggregate([
      {
        $lookup: {
          from: "jobapplicantinfos",
          localField: "userId",
          foreignField: "userId",
          as: "jobApplicant",
        },
      },
      { $unwind: "$jobApplicant" },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      { $match: findParams },
      { $sort: sortParams },
    ])
      .then((applications) => {
        res.json(applications);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    res.status(400).json({
      message: "You are not allowed to access applicants list",
    });
  }
});

// to add or update a rating [todo: test]
router.put("/rating", jwtAuth, (req, res) => {
  const user = req.user;
  const data = req.body;
  if (user.type === "recruiter") {
    // can rate applicant
    Rating.findOne({
      senderId: user._id,
      receiverId: data.applicantId,
      category: "applicant",
    })
      .then((rating) => {
        if (rating === null) {
          console.log("new rating");
          Application.countDocuments({
            userId: data.applicantId,
            recruiterId: user._id,
            status: {
              $in: ["accepted", "finished"],
            },
          })
            .then((acceptedApplicant) => {
              if (acceptedApplicant > 0) {
                // add a new rating

                rating = new Rating({
                  category: "applicant",
                  receiverId: data.applicantId,
                  senderId: user._id,
                  rating: data.rating,
                });

                rating
                  .save()
                  .then(() => {
                    // get the average of ratings
                    Rating.aggregate([
                      {
                        $match: {
                          receiverId: mongoose.Types.ObjectId(data.applicantId),
                          category: "applicant",
                        },
                      },
                      {
                        $group: {
                          _id: {},
                          average: { $avg: "$rating" },
                        },
                      },
                    ])
                      .then((result) => {
                        // update the user's rating
                        if (result === null) {
                          res.status(400).json({
                            message: "Error while calculating rating",
                          });
                          return;
                        }
                        const avg = result[0].average;

                        JobApplicant.findOneAndUpdate(
                          {
                            userId: data.applicantId,
                          },
                          {
                            $set: {
                              rating: avg,
                            },
                          }
                        )
                          .then((applicant) => {
                            if (applicant === null) {
                              res.status(400).json({
                                message:
                                  "Error while updating applicant's average rating",
                              });
                              return;
                            }
                            res.json({
                              message: "Rating added successfully",
                            });
                          })
                          .catch((err) => {
                            res.status(400).json(err);
                          });
                      })
                      .catch((err) => {
                        res.status(400).json(err);
                      });
                  })
                  .catch((err) => {
                    res.status(400).json(err);
                  });
              } else {
                // you cannot rate
                res.status(400).json({
                  message:
                    "Applicant didn't worked under you. Hence you cannot give a rating.",
                });
              }
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        } else {
          rating.rating = data.rating;
          rating
            .save()
            .then(() => {
              // get the average of ratings
              Rating.aggregate([
                {
                  $match: {
                    receiverId: mongoose.Types.ObjectId(data.applicantId),
                    category: "applicant",
                  },
                },
                {
                  $group: {
                    _id: {},
                    average: { $avg: "$rating" },
                  },
                },
              ])
                .then((result) => {
                  // update the user's rating
                  if (result === null) {
                    res.status(400).json({
                      message: "Error while calculating rating",
                    });
                    return;
                  }
                  const avg = result[0].average;
                  JobApplicant.findOneAndUpdate(
                    {
                      userId: data.applicantId,
                    },
                    {
                      $set: {
                        rating: avg,
                      },
                    }
                  )
                    .then((applicant) => {
                      if (applicant === null) {
                        res.status(400).json({
                          message:
                            "Error while updating applicant's average rating",
                        });
                        return;
                      }
                      res.json({
                        message: "Rating updated successfully",
                      });
                    })
                    .catch((err) => {
                      res.status(400).json(err);
                    });
                })
                .catch((err) => {
                  res.status(400).json(err);
                });
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        }
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    // applicant can rate job
    Rating.findOne({
      senderId: user._id,
      receiverId: data.jobId,
      category: "job",
    })
      .then((rating) => {
        console.log(user._id);
        console.log(data.jobId);
        console.log(rating);
        if (rating === null) {
          console.log(rating);
          Application.countDocuments({
            userId: user._id,
            jobId: data.jobId,
            status: {
              $in: ["accepted", "finished"],
            },
          })
            .then((acceptedApplicant) => {
              if (acceptedApplicant > 0) {
                // add a new rating

                rating = new Rating({
                  category: "job",
                  receiverId: data.jobId,
                  senderId: user._id,
                  rating: data.rating,
                });

                rating
                  .save()
                  .then(() => {
                    // get the average of ratings
                    Rating.aggregate([
                      {
                        $match: {
                          receiverId: mongoose.Types.ObjectId(data.jobId),
                          category: "job",
                        },
                      },
                      {
                        $group: {
                          _id: {},
                          average: { $avg: "$rating" },
                        },
                      },
                    ])
                      .then((result) => {
                        if (result === null) {
                          res.status(400).json({
                            message: "Error while calculating rating",
                          });
                          return;
                        }
                        const avg = result[0].average;
                        Job.findOneAndUpdate(
                          {
                            _id: data.jobId,
                          },
                          {
                            $set: {
                              rating: avg,
                            },
                          }
                        )
                          .then((foundJob) => {
                            if (foundJob === null) {
                              res.status(400).json({
                                message:
                                  "Error while updating job's average rating",
                              });
                              return;
                            }
                            res.json({
                              message: "Rating added successfully",
                            });
                          })
                          .catch((err) => {
                            res.status(400).json(err);
                          });
                      })
                      .catch((err) => {
                        res.status(400).json(err);
                      });
                  })
                  .catch((err) => {
                    res.status(400).json(err);
                  });
              } else {
                // you cannot rate
                res.status(400).json({
                  message:
                    "You haven't worked for this job. Hence you cannot give a rating.",
                });
              }
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        } else {
          // update the rating
          rating.rating = data.rating;
          rating
            .save()
            .then(() => {
              // get the average of ratings
              Rating.aggregate([
                {
                  $match: {
                    receiverId: mongoose.Types.ObjectId(data.jobId),
                    category: "job",
                  },
                },
                {
                  $group: {
                    _id: {},
                    average: { $avg: "$rating" },
                  },
                },
              ])
                .then((result) => {
                  if (result === null) {
                    res.status(400).json({
                      message: "Error while calculating rating",
                    });
                    return;
                  }
                  const avg = result[0].average;
                  console.log(avg);

                  Job.findOneAndUpdate(
                    {
                      _id: data.jobId,
                    },
                    {
                      $set: {
                        rating: avg,
                      },
                    }
                  )
                    .then((foundJob) => {
                      if (foundJob === null) {
                        res.status(400).json({
                          message: "Error while updating job's average rating",
                        });
                        return;
                      }
                      res.json({
                        message: "Rating added successfully",
                      });
                    })
                    .catch((err) => {
                      res.status(400).json(err);
                    });
                })
                .catch((err) => {
                  res.status(400).json(err);
                });
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        }
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
});

// get personal rating
router.get("/rating", jwtAuth, (req, res) => {
  const user = req.user;
  Rating.findOne({
    senderId: user._id,
    receiverId: req.query.id,
    category: user.type === "recruiter" ? "applicant" : "job",
  }).then((rating) => {
    if (rating === null) {
      res.json({
        rating: -1,
      });
      return;
    }
    res.json({
      rating: rating.rating,
    });
  });
});

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);

router.get("/saved-jobs", jwtAuth, async (req, res) => {
  if (req.user.type !== "applicant") return res.status(403).json({ message: "Only applicants can view saved jobs" });
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
  try {
    const match = { applicantId: req.user._id };
    const [savedJobs, total] = await Promise.all([
      SavedJob.aggregate([
        { $match: match },
        { $lookup: { from: "jobs", localField: "jobId", foreignField: "_id", as: "job" } },
        { $unwind: "$job" },
        { $lookup: { from: "recruiterinfos", localField: "job.userId", foreignField: "userId", as: "recruiter" } },
        { $unwind: { path: "$recruiter", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { _id: 1, createdAt: 1, jobId: "$job", recruiter: 1 } },
      ]),
      SavedJob.countDocuments(match),
    ]);
    res.json({ results: savedJobs, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Unable to load saved jobs" });
  }
});

router.get("/jobs/:id/saved", jwtAuth, async (req, res) => {
  if (req.user.type !== "applicant") return res.status(403).json({ message: "Only applicants can check saved jobs" });
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid job ID" });
  try {
    const saved = await SavedJob.exists({ applicantId: req.user._id, jobId: req.params.id });
    res.json({ saved: Boolean(saved) });
  } catch (err) {
    res.status(500).json({ message: "Unable to check saved job" });
  }
});

router.post("/jobs/:id/save", jwtAuth, async (req, res) => {
  if (req.user.type !== "applicant") return res.status(403).json({ message: "Only applicants can save jobs" });
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid job ID" });
  try {
    const job = await Job.findById(req.params.id).select("_id").lean();
    if (!job) return res.status(404).json({ message: "Job does not exist" });
    const savedJob = await SavedJob.findOneAndUpdate(
      { applicantId: req.user._id, jobId: job._id },
      { $setOnInsert: { applicantId: req.user._id, jobId: job._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(savedJob.createdAt === savedJob.updatedAt ? 201 : 200).json({ message: "Job saved", saved: true });
  } catch (err) {
    if (err.code === 11000) return res.status(200).json({ message: "Job already saved", saved: true });
    res.status(500).json({ message: "Unable to save job" });
  }
});

router.delete("/jobs/:id/save", jwtAuth, async (req, res) => {
  if (req.user.type !== "applicant") return res.status(403).json({ message: "Only applicants can unsave jobs" });
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid job ID" });
  try {
    const result = await SavedJob.deleteOne({ applicantId: req.user._id, jobId: req.params.id });
    res.json({ message: result.deletedCount ? "Job removed from saved jobs" : "Job was not saved", saved: false });
  } catch (err) {
    res.status(500).json({ message: "Unable to remove saved job" });
  }
});

// Application.findOne({
//   _id: id,
//   userId: user._id,
// })
//   .then((application) => {
//     application.status = status;
//     application
//       .save()
//       .then(() => {
//         res.json({
//           message: `Application ${status} successfully`,
//         });
//       })
//       .catch((err) => {
//         res.status(400).json(err);
//       });
//   })
//   .catch((err) => {
//     res.status(400).json(err);
//   });

// router.get("/jobs", (req, res, next) => {
//   passport.authenticate("jwt", { session: false }, function (err, user, info) {
//     if (err) {
//       return next(err);
//     }
//     if (!user) {
//       res.status(401).json(info);
//       return;
//     }
//   })(req, res, next);
// });

module.exports = router;
