const express = require("express");
const jwt = require("jsonwebtoken");
const authKeys = require("../lib/authKeys");
const otpService = require("../lib/otpService");

const User = require("../db/User");
const JobApplicant = require("../db/JobApplicant");
const Recruiter = require("../db/Recruiter");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await user.login(password);
    const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
    res.json({ token, type: user.type });
  } catch (err) {
    res.status(401).json({ message: "Invalid email or password" });
  }
});

// STEP 1 - Signup: OTP bhejo
router.post("/send-signup-otp", async (req, res) => {
  const { email, phone } = req.body;
  if (!email || !phone) {
    return res.status(400).json({ message: "Email and phone are required" });
  }
  try {
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: "An account with this phone number already exists" });
    }
    const otp = otpService.generateOtp();
    otpService.saveSignupOtp(email.toLowerCase(), otp);
    await otpService.sendOtpEmail(email, otp);
    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
});

// STEP 2 - Signup: OTP verify karke account banao
router.post("/signup", async (req, res) => {
  const data = req.body;
  if (!data.otp) {
    return res.status(400).json({ message: "OTP is required" });
  }
  const verification = otpService.verifySignupOtp(data.email.toLowerCase(), data.otp);
  if (!verification.valid) {
    return res.status(400).json({ message: verification.message });
  }

  let user = new User({
    email: data.email,
    phone: data.phone,
    password: data.password,
    type: data.type,
  });

  try {
    await user.save();
    const userDetails =
      user.type === "recruiter"
        ? new Recruiter({
            userId: user._id,
            name: data.name,
            contactNumber: data.phone,
            bio: data.bio,
          })
        : new JobApplicant({
            userId: user._id,
            name: data.name,
            education: data.education,
            skills: data.skills,
            rating: data.rating,
            resume: data.resume,
            profile: data.profile,
          });
    await userDetails.save();

    const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
    res.json({ token, type: user.type });
  } catch (err) {
    if (user._id) await User.findByIdAndDelete(user._id).catch(() => {});
    res.status(400).json({ message: err.message || "Signup failed" });
  }
});

// STEP 1 - Login: mobile number se OTP bhejo
router.post("/send-login-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: "Phone number is required" });
  }
  try {
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "No account found with this phone number" });
    }
    const otp = otpService.generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + otpService.OTP_EXPIRY_MS);
    await user.save();
    await otpService.sendOtpEmail(user.email, otp);

    const maskedEmail = user.email.replace(/^(.{2}).+(@.+)$/, "$1***$2");
    res.json({ message: "OTP sent to your registered email", maskedEmail });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
});

// STEP 2 - Login: OTP verify karke login karo
router.post("/login-otp", async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ message: "Phone and OTP are required" });
  }
  try {
    const user = await User.findOne({ phone }).select("+otp +otpExpiry");
    if (!user) {
      return res.status(404).json({ message: "No account found with this phone number" });
    }
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "Please request a new OTP" });
    }
    if (Date.now() > new Date(user.otpExpiry).getTime()) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
    res.json({ token, type: user.type });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

module.exports = router;