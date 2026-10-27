import axios from "axios";
import apiList, { server } from "./apiList";

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export const getRecruiterDashboard = async () => {
  const response = await axios.get(apiList.recruiterDashboard, authConfig());
  return response.data;
};

export const getRecruiterJobs = async () => {
  const response = await axios.get(apiList.jobs, {
    ...authConfig(),
    params: { myjobs: 1 },
  });
  return response.data;
};

export const createRecruiterJob = async (job) => {
  const body = new FormData();
  Object.entries(job).forEach(([key, value]) => {
    if (key === "jdFile" || value === undefined || value === null) return;
    body.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
  });
  if (job.jdFile) body.append("jdFile", job.jdFile);
  const response = await axios.post(apiList.jobs, body, authConfig());
  return response.data;
};

export const updateRecruiterJob = async (jobId, changes) => {
  const response = await axios.put(`${apiList.jobs}/${jobId}`, changes, authConfig());
  return response.data;
};

export const deleteRecruiterJob = async (jobId) => {
  const response = await axios.delete(`${apiList.jobs}/${jobId}`, authConfig());
  return response.data;
};

export const getJobApplicants = async (jobId) => {
  const response = await axios.get(apiList.applicants, {
    ...authConfig(),
    params: { jobId },
  });
  return response.data;
};

export const updateApplicantStatus = async (applicationId, status, recruiterNote) => {
  const response = await axios.put(
    `${apiList.applications}/${applicationId}`,
    { status, recruiterNote },
    authConfig()
  );
  return response.data;
};

export const updateApplicantStage = async (applicationId, update) => {
  const response = await axios.put(
    `${apiList.applications}/${applicationId}/stage`,
    update,
    authConfig()
  );
  return response.data;
};

export const generateJobDescription = async (jobDetails) => {
  const response = await axios.post(apiList.aiGenerateJobDescription, jobDetails, authConfig());
  return response.data;
};

export const analyzeApplicantResume = async (applicationId) => {
  const response = await axios.post(
    `${apiList.applications}/${applicationId}/ai-match`,
    {},
    authConfig()
  );
  return response.data;
};

export const getApplicantResume = async (resumePath) => {
  const response = await axios.get(`${server}${resumePath}`, {
    ...authConfig(),
    responseType: "blob",
  });
  return response.data;
};
