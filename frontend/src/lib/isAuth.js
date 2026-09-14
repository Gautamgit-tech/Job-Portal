const isAuth = () => {
  return localStorage.getItem("token");
};

export const userType = () => {
  const type = localStorage.getItem("type");
  return type === "member" || type === "jobseeker" ? "applicant" : type;
};

export default isAuth;
