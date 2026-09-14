const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
export const server = `http://${host}:4444`;

const apiList = {
  login: `${server}/auth/login`,
  signup: `${server}/auth/signup`,
   sendSignupOtp: `${server}/auth/send-signup-otp`,   // NAYA
  sendLoginOtp: `${server}/auth/send-login-otp`,     // NAYA
  loginOtp: `${server}/auth/login-otp`,              // NAYA
  requestPasswordReset: `${server}/auth/request-password-reset`,
  resetPassword: `${server}/auth/reset-password`,
  uploadResume: `${server}/upload/resume`,
  uploadProfileImage: `${server}/upload/profile`,
  jobs: `${server}/api/jobs`,
  savedJobs: `${server}/api/saved-jobs`,
  savedJobStatus: (jobId) => `${server}/api/jobs/${jobId}/saved`,
  applications: `${server}/api/applications`,
  rating: `${server}/api/rating`,
  user: `${server}/api/user`,
  applicantDashboard: `${server}/api/applicant-dashboard`,
  applicants: `${server}/api/applicants`,
};

export default apiList;
