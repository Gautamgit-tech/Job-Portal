const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const jwtAuth = require("../lib/jwtAuth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const extensionFor = (file) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  const detected = extension;
  if (!allowedExtensions.includes(detected)) return "";
  return detected === ".jpeg" ? ".jpg" : detected;
};

const saveUploadedFile = async (file, destination) => {
  await fs.promises.writeFile(destination, file.buffer);
};

const hasValidImageSignature = (file, extension) => {
  if (extension === ".jpg") {
    return file.buffer.length >= 3 &&
      file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 &&
      file.buffer[2] === 0xff;
  }
  if (extension === ".png") {
    return file.buffer.length >= 8 &&
      file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return false;
};

router.post("/resume", upload.single("file"), (req, res) => {
  const { file } = req;
  if (!file) return res.status(400).json({ message: "Resume file is required" });
  const extension = extensionFor(file);
  if (extension !== ".pdf") {
    res.status(400).json({
      message: "Invalid format",
    });
  } else {
    const filename = `${uuidv4()}${extension}`;

    saveUploadedFile(file, `${__dirname}/../public/resume/${filename}`)
      .then(() => {
        res.send({
          message: "File uploaded successfully",
          url: `/host/resume/${filename}`,
        });
      })
      .catch((err) => {
        res.status(400).json({
          message: "Error while uploading",
        });
      });
  }
});

router.post("/profile", upload.single("file"), (req, res) => {
  const { file } = req;
  if (!file) return res.status(400).json({ message: "Profile image is required" });
  const extension = extensionFor(file);
  if (extension !== ".jpg" && extension !== ".png") {
    res.status(400).json({
      message: "Invalid format",
    });
  } else {
    const filename = `${uuidv4()}${extension}`;

    saveUploadedFile(file, `${__dirname}/../public/profile/${filename}`)
      .then(() => {
        res.send({
          message: "Profile image uploaded successfully",
          url: `/host/profile/${filename}`,
        });
      })
      .catch((err) => {
        res.status(400).json({
          message: "Error while uploading",
        });
      });
  }
});

router.post("/company-logo", jwtAuth, (req, res) => {
  if (req.user.type !== "recruiter") {
    return res.status(403).json({ message: "Recruiter access required" });
  }

  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ message: uploadError.message || "Unable to upload company logo" });
    }

    const { file } = req;
    if (!file) return res.status(400).json({ message: "Company logo image is required" });

    const extension = extensionFor(file);
    const validMimeType = ["image/jpeg", "image/png"].includes(file.mimetype);
    if (!validMimeType || ![".jpg", ".png"].includes(extension) || !hasValidImageSignature(file, extension)) {
      return res.status(400).json({ message: "Company logo must be a JPG or PNG image" });
    }

    const filename = `${uuidv4()}${extension}`;
    const destination = path.join(__dirname, "../public/profile", filename);
    try {
      await saveUploadedFile(file, destination);
      return res.status(201).json({
        message: "Company logo uploaded successfully",
        url: `/host/profile/${filename}`,
      });
    } catch (error) {
      return res.status(500).json({ message: "Unable to save company logo" });
    }
  });
});

module.exports = router;
