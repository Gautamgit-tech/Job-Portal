import React, { useContext, useState } from "react";
import { Button, CircularProgress, Grid, MenuItem, Paper, TextField, Typography, makeStyles } from "@material-ui/core";
import { useHistory } from "react-router-dom";
import { SetPopupContext } from "../../App";
import { createRecruiterJob, generateJobDescription } from "../../lib/recruiterApi";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", maxWidth: 900, padding: theme.spacing(4, 2), margin: "0 auto" },
  paper: { padding: theme.spacing(3), borderRadius: 16 },
  title: { marginBottom: theme.spacing(3), fontWeight: 800, color: "#172b4d" },
  submit: { marginTop: theme.spacing(2), minWidth: 160 },
}));

const toLocalDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const initialDetails = () => {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  return {
    title: "",
    description: "",
    requirements: "",
    location: "",
    workMode: "Remote",
    jobType: "Full Time",
    deadline: toLocalDateTime(deadline),
    salaryMin: "",
    salaryMax: "",
    skillsetsText: "",
    maxApplicants: 100,
    maxPositions: 1,
  };
};

const CreateJobs = () => {
  const classes = useStyles();
  const history = useHistory();
  const setPopup = useContext(SetPopupContext);
  const [details, setDetails] = useState(initialDetails);
  const [saving, setSaving] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [jdFile, setJdFile] = useState(null);

  const handleChange = (event) => {
    setDetails({ ...details, [event.target.name]: event.target.value });
  };

  const handleGenerateDescription = async () => {
    if (!details.title.trim()) {
      setPopup({ open: true, severity: "error", message: "Enter a job title before generating a description" });
      return;
    }

    setGeneratingDescription(true);
    try {
      const response = await generateJobDescription({
        title: details.title.trim(),
        skills: details.skillsetsText,
        requirements: details.requirements,
      });
      if (!response.description) {
        throw new Error("The AI did not return a job description");
      }
      setDetails((current) => ({ ...current, description: response.description }));
      setPopup({ open: true, severity: "success", message: "AI job description generated" });
    } catch (error) {
      setPopup({
        open: true,
        severity: "error",
        message: error.response?.data?.message || error.message || "Unable to generate job description",
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Number(details.salaryMin) > Number(details.salaryMax)) {
      setPopup({ open: true, severity: "error", message: "Maximum salary must be at least the minimum salary" });
      return;
    }

    const { skillsetsText, ...job } = details;
    setSaving(true);
    try {
      const response = await createRecruiterJob({
        ...job,
        skillsets: skillsetsText.split(",").map((skill) => skill.trim()).filter(Boolean),
        jdFile,
        salaryMin: Number(job.salaryMin),
        salaryMax: Number(job.salaryMax),
        maxApplicants: Number(job.maxApplicants),
        maxPositions: Number(job.maxPositions),
      });
      setPopup({ open: true, severity: "success", message: response.message });
      history.push("/myjobs");
    } catch (error) {
      setPopup({
        open: true,
        severity: "error",
        message: error.response?.data?.message || "Unable to create the job listing",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={classes.page}>
      <Typography variant="h4" className={classes.title}>Post a job</Typography>
      <Paper elevation={0} className={classes.paper}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField name="title" label="Job title" value={details.title} onChange={handleChange} required fullWidth />
            </Grid>
            <Grid item xs={12}>
              <Grid container justify="space-between" alignItems="center" spacing={1}>
                <Grid item>
                  <Typography variant="subtitle1">Job description</Typography>
                </Grid>
                <Grid item>
                  <Button
                    type="button"
                    size="small"
                    color="primary"
                    variant="outlined"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription}
                  >
                    {generatingDescription
                      ? <><CircularProgress size={16} style={{ marginRight: 8 }} />Generating...</>
                      : "✨ Generate with AI"}
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="description"
                    label="Job description"
                    value={details.description}
                    onChange={handleChange}
                    required
                    multiline
                    minRows={4}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <TextField name="requirements" label="Requirements" value={details.requirements} onChange={handleChange} required multiline minRows={3} helperText="List experience, qualifications, and responsibilities." fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="location" label="Location" value={details.location} onChange={handleChange} required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="workMode" label="Work arrangement" value={details.workMode} onChange={handleChange} select fullWidth>
                {["Remote", "On-site", "Hybrid"].map((mode) => <MenuItem key={mode} value={mode}>{mode}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="jobType" label="Employment type" value={details.jobType} onChange={handleChange} select fullWidth>
                {["Full Time", "Part Time", "Contract", "Internship", "Work From Home"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="deadline" label="Application deadline" type="datetime-local" value={details.deadline} onChange={handleChange} InputLabelProps={{ shrink: true }} required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="salaryMin" label="Minimum salary" type="number" value={details.salaryMin} onChange={handleChange} inputProps={{ min: 0 }} required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="salaryMax" label="Maximum salary" type="number" value={details.salaryMax} onChange={handleChange} inputProps={{ min: 0 }} required fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField name="skillsetsText" label="Skills" placeholder="React, Node.js, MongoDB" value={details.skillsetsText} onChange={handleChange} helperText="Separate skills with commas." fullWidth />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Job description PDF (optional)</Typography>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  const file = event.target.files[0];
                  if (!file) {
                    setJdFile(null);
                    return;
                  }
                  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
                    event.target.value = "";
                    setJdFile(null);
                    setPopup({ open: true, severity: "error", message: "Choose a PDF file for the job description" });
                    return;
                  }
                  if (file.size > 10 * 1024 * 1024) {
                    event.target.value = "";
                    setJdFile(null);
                    setPopup({ open: true, severity: "error", message: "The PDF must be 10 MB or smaller" });
                    return;
                  }
                  setJdFile(file);
                }}
              />
              <Typography variant="caption" color="textSecondary" display="block">
                {jdFile ? jdFile.name : "PDF only, up to 10 MB"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="maxApplicants" label="Applicant limit" type="number" value={details.maxApplicants} onChange={handleChange} inputProps={{ min: 1, step: 1 }} required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="maxPositions" label="Available positions" type="number" value={details.maxPositions} onChange={handleChange} inputProps={{ min: 1, step: 1 }} required fullWidth />
            </Grid>
          </Grid>
          <Button type="submit" variant="contained" color="primary" className={classes.submit} disabled={saving}>
            {saving ? "Publishing..." : "Publish job"}
          </Button>
        </form>
      </Paper>
    </main>
  );
};

export default CreateJobs;
