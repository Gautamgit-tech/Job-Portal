const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

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

module.exports = router;
