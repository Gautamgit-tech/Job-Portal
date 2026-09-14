const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
export const server = `http://${host}:4444`;

const apiList = {
  login: `${server}/auth/login`,
  signup: `${server}/auth/signup`,
   sendSignupOtp: `${server}/auth/send-signup-otp`,   // NAYA
  sendLoginOtp: `${server}/auth/send-login-otp`,     // NAYA
  loginOtp: `${server}/auth/login-otp`,              // NAYA
  uploadResume: `${server}/upload/resume`,
  uploadProfileImage: `${server}/upload/profile`,
  jobs: `${server}/api/jobs`,
  applications: `${server}/api/applications`,
  rating: `${server}/api/rating`,
  user: `${server}/api/user`,
  applicants: `${server}/api/applicants`,
};

export default apiList;
