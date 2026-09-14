const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const authKeys = require("../lib/authKeys");
const otpService = require("../lib/otpService");

const User = require("../db/User");
const JobApplicant = require("../db/JobApplicant");
const Recruiter = require("../db/Recruiter");
const SignupOtp = require("../db/SignupOtp");

const router = express.Router();
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

router.post("/request-password-reset", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const generic = { message: "If an account exists, password reset instructions have been sent." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(200).json(generic);
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json(generic);
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    await otpService.sendPasswordResetEmail(user.email, rawToken);
    res.status(200).json(generic);
  } catch (err) {
    res.status(200).json(generic);
  }
});

router.post("/reset-password", async (req, res) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");
  if (!token || password.length < 8) return res.status(400).json({ message: "A valid token and password of at least 8 characters are required" });
  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpiry: { $gt: new Date() } }).select("+passwordResetToken +passwordResetExpiry");
    if (!user) return res.status(400).json({ message: "Reset token is invalid or expired" });
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(400).json({ message: "Unable to reset password" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password, type } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  if (type && !["applicant", "recruiter"].includes(type)) {
    return res.status(400).json({ message: "Invalid account type" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (type && user.type !== type) {
      return res.status(403).json({ message: user.type === "recruiter" ? "This account is registered as a Recruiter. Please select the correct login option." : "This account is registered as a Job Seeker. Please select the correct login option." });
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
  const email = normalizeEmail(req.body.email);
  const phone = String(req.body.phone || "").trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !phone) {
    return res.status(400).json({ message: "Email and phone are required" });
  }
  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: "An account with this phone number already exists" });
    }
    const otp = otpService.generateOtp();
    await otpService.sendOtpEmail(email, otp);
    await SignupOtp.findOneAndUpdate(
      { email },
      {
        email,
        otpHash: crypto.createHash("sha256").update(otp).digest("hex"),
        expiresAt: new Date(Date.now() + otpService.OTP_EXPIRY_MS),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.log(err);
    if (err.message === "Email service is not configured") {
      return res.status(503).json({ message: "Email service is not configured. Add EMAIL_USER and EMAIL_PASS to backend/.env." });
    }
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
});

// STEP 2 - Signup: OTP verify karke account banao
router.post("/signup", async (req, res) => {
  const data = req.body;
  if (!data.otp || !["applicant", "recruiter"].includes(data.type)) {
    return res.status(400).json({ message: "OTP is required" });
  }
  const email = normalizeEmail(data.email);
  const name = String(data.name || "").trim();
  const password = String(data.password || "");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address" });
  if (name.length < 2) return res.status(400).json({ message: "Name is required" });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
  if (data.type === "recruiter" && String(data.companyName || "").trim().length < 2) return res.status(400).json({ message: "Company name is required for recruiters" });
  const otpHash = crypto.createHash("sha256").update(String(data.otp).trim()).digest("hex");
  const otpRecord = await SignupOtp.findOne({ email });
  if (!otpRecord) return res.status(400).json({ message: "OTP not found. Please request a new one." });
  if (otpRecord.expiresAt.getTime() < Date.now()) {
    await SignupOtp.deleteOne({ _id: otpRecord._id });
    return res.status(400).json({ message: "OTP expired. Please request a new one." });
  }
  if (otpRecord.otpHash !== otpHash) return res.status(400).json({ message: "Incorrect OTP." });
  await SignupOtp.deleteOne({ _id: otpRecord._id });

  let user = new User({
    email,
    phone: data.phone,
    password,
    type: data.type,
  });

  try {
    await user.save();
    const userDetails =
      user.type === "recruiter"
        ? new Recruiter({
            userId: user._id,
            name: data.name,
            companyName: String(data.companyName || "").trim(),
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