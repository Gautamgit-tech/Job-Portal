const nodemailer = require("nodemailer");
const authKeys = require("./authKeys");

const emailConfigured = Boolean(authKeys.emailUser && authKeys.emailPass);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: authKeys.emailUser,
    pass: authKeys.emailPass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOtpEmail = (toEmail, otp) => {
  if (!emailConfigured) {
    return Promise.reject(new Error("Email service is not configured"));
  }
  const mailOptions = {
    from: authKeys.emailUser,
    to: toEmail,
    subject: "Job Portal - Your OTP Code",
    html: `<div style="font-family: sans-serif;">
      <h2>Job Portal Verification</h2>
      <p>Your One-Time Password (OTP) is:</p>
      <h1 style="letter-spacing: 4px;">${otp}</h1>
      <p>This OTP is valid for 5 minutes. Do not share it with anyone.</p>
    </div>`,
  };
  return transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = (toEmail, resetToken) => {
  if (!emailConfigured) return Promise.reject(new Error("Email service is not configured"));
  return transporter.sendMail({
    from: authKeys.emailUser,
    to: toEmail,
    subject: "Job Portal - Reset your password",
    html: `<div style="font-family: sans-serif;"><h2>Password reset</h2><p>Use this one-time reset token within 15 minutes:</p><p>${resetToken}</p></div>`,
  });
};

// Signup ke liye temporary OTP store (server restart pe clear ho jayega)
const signupOtpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

const saveSignupOtp = (email, otp) => {
  signupOtpStore.set(email, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });
};

const verifySignupOtp = (email, otp) => {
  const record = signupOtpStore.get(email);
  if (!record)
    return { valid: false, message: "OTP not found. Please request a new one." };
  if (Date.now() > record.expiresAt) {
    signupOtpStore.delete(email);
    return { valid: false, message: "OTP expired. Please request a new one." };
  }
  if (record.otp !== otp) {
    return { valid: false, message: "Incorrect OTP." };
  }
  signupOtpStore.delete(email);
  return { valid: true };
};

module.exports = {
  generateOtp,
  sendOtpEmail,
  sendPasswordResetEmail,
  saveSignupOtp,
  verifySignupOtp,
  OTP_EXPIRY_MS,
};