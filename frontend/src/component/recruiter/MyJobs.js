import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, Paper, TextField, Typography, makeStyles,
} from "@material-ui/core";
import { useHistory } from "react-router-dom";
import { SetPopupContext } from "../../App";
import { deleteRecruiterJob, getRecruiterJobs, updateRecruiterJob } from "../../lib/recruiterApi";
import { server } from "../../lib/apiList";
import { DEFAULT_HIRING_STAGES } from "../../lib/hiringStages";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", maxWidth: 1120, padding: theme.spacing(4, 2), margin: "0 auto" },
  heading: { marginBottom: theme.spacing(3), fontWeight: 800, color: "#172b4d" },
  card: { padding: theme.spacing(3), borderRadius: 16, border: "1px solid #e6ebf2", height: "100%" },
  status: { marginLeft: theme.spacing(1), verticalAlign: "middle" },
  actions: { display: "flex", gap: theme.spacing(1), flexWrap: "wrap", marginTop: theme.spacing(2) },
  dialogContent: { minWidth: 520, paddingTop: theme.spacing(1) },
  skills: { display: "flex", gap: theme.spacing(0.5), flexWrap: "wrap", marginTop: theme.spacing(1) },
  muted: { color: "#64748b" },
  "@media (max-width: 600px)": { dialogContent: { minWidth: "auto" } },
}));

const localDateTime = (date) => {
  const parsed = date ? new Date(date) : new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const editValues = (job) => ({
  title: job.title || "",
  description: job.description || "",
  requirements: job.requirements || "",
  location: job.location || "",
  workMode: job.workMode || "Remote",
  jobType: job.jobType || "Full Time",
  deadline: localDateTime(job.deadline),
  salaryMin: job.salaryMin === undefined ? (job.salary || "") : job.salaryMin,
  salaryMax: job.salaryMax === undefined ? (job.salary || "") : job.salaryMax,
  skillsets: (job.skillsets || []).join(", "),
  maxApplicants: job.maxApplicants || 1,
  maxPositions: job.maxPositions || 1,
});

const MyJobs = () => {
  const classes = useStyles();
  const history = useHistory();
  const setPopup = useContext(SetPopupContext);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await getRecruiterJobs());
    } catch (error) {
      setPopup({
        open: true,
        severity: "error",
        message: error.response?.data?.message || "Unable to load your job listings",
      });
    } finally {
      setLoading(false);
    }
  }, [setPopup]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const changeListingStatus = async (job) => {
    const status = job.status === "closed" ? "active" : "closed";
    if (status === "active" && job.deadline && new Date(job.deadline) <= new Date()) {
      setPopup({ open: true, severity: "error", message: "Update the expired deadline before reopening this listing" });
      return;
    }
    try {
      const response = await updateRecruiterJob(job._id, { status });
      setPopup({ open: true, severity: "success", message: response.message });
      await loadJobs();
    } catch (error) {
      setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to update listing" });
    }
  };

  const removeJob = async (job) => {
    if (!window.confirm(`Permanently delete "${job.title}"? This cannot be undone.`)) return;
    try {
      const response = await deleteRecruiterJob(job._id);
      setPopup({ open: true, severity: "success", message: response.message });
      await loadJobs();
    } catch (error) {
      setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to delete listing" });
    }
  };

  const saveJob = async (event) => {
    event.preventDefault();
    if (Number(form.salaryMin) > Number(form.salaryMax)) {
      setPopup({ open: true, severity: "error", message: "Maximum salary must be at least the minimum salary" });
      return;
    }
    setSaving(true);
    try {
      const response = await updateRecruiterJob(editingJob._id, {
        ...form,
        salaryMin: form.salaryMin === "" ? "" : Number(form.salaryMin),
        salaryMax: form.salaryMax === "" ? "" : Number(form.salaryMax),
        skillsets: form.skillsets.split(",").map((skill) => skill.trim()).filter(Boolean),
        maxApplicants: Number(form.maxApplicants),
        maxPositions: Number(form.maxPositions),
      });
      setPopup({ open: true, severity: "success", message: response.message });
      setEditingJob(null);
      await loadJobs();
    } catch (error) {
      setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to update listing" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={classes.page}>
      <Grid container justify="space-between" alignItems="center">
        <Typography variant="h4" className={classes.heading}>My job listings</Typography>
        <Button color="primary" variant="contained" onClick={() => history.push("/addjob")}>Post a job</Button>
      </Grid>
      {loading ? <CircularProgress color="primary" /> : jobs.length === 0 ? (
        <Paper elevation={0} className={classes.card}>
          <Typography className={classes.muted}>You have not posted any jobs yet.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {jobs.map((job) => {
            const expired = job.deadline && new Date(job.deadline) <= new Date();
            const closed = job.status === "closed" || expired;
            return (
              <Grid item xs={12} md={6} key={job._id}>
                <Paper elevation={0} className={classes.card}>
                <Typography variant="h6">
                  {job.title}
                  <Chip
                    className={classes.status}
                    size="small"
                    color={closed ? "default" : "primary"}
                    label={closed ? "Closed" : "Active"}
                  />
                </Typography>
                <Typography className={classes.muted}>
                  {job.location || "Location not specified"} | {job.workMode || "Work mode not specified"} | {job.jobType}
                </Typography>
                <Typography style={{ marginTop: 12 }}>
                  {job.salaryMin !== undefined && job.salaryMax !== undefined
                    ? `${job.salaryMin} - ${job.salaryMax}`
                    : `Salary: ${job.salary || "Not specified"}`}
                </Typography>
                <Typography className={classes.muted}>
                  {job.deadline ? `Deadline: ${new Date(job.deadline).toLocaleDateString()}` : "No application deadline"}
                  {" | "}{job.activeApplications || 0} applicants
                </Typography>
                <Typography className={classes.muted} style={{ marginTop: 8 }}>
                  Hiring process: {DEFAULT_HIRING_STAGES.join(" → ")}
                </Typography>
                {job.description && <Typography style={{ marginTop: 12 }}>{job.description}</Typography>}
                {job.jdFileUrl && (
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    <a href={`${server}${job.jdFileUrl}`} target="_blank" rel="noopener noreferrer">
                      View attached JD PDF
                    </a>
                  </Typography>
                )}
                <div className={classes.skills}>
                  {(job.skillsets || []).map((skill) => <Chip key={skill} size="small" label={skill} />)}
                </div>
                <div className={classes.actions}>
                  <Button size="small" color="primary" variant="contained" onClick={() => history.push(`/job/applications/${job._id}`)}>
                    Applicants
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => { setEditingJob(job); setForm(editValues(job)); }}>
                    Edit
                  </Button>
                  <Button size="small" variant="outlined" disabled={Boolean(expired)} onClick={() => changeListingStatus(job)}>
                    {expired ? "Expired" : job.status === "closed" ? "Reopen" : "Close"}
                  </Button>
                  <Button size="small" color="secondary" onClick={() => removeJob(job)}>Delete</Button>
                </div>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={Boolean(editingJob)} onClose={() => setEditingJob(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit job listing</DialogTitle>
        {form && (
          <form onSubmit={saveJob}>
            <DialogContent className={classes.dialogContent}>
              <Grid container spacing={2}>
                {[
                  ["title", "Job title", false],
                  ["location", "Location", false],
                  ["description", "Job description", true],
                  ["requirements", "Requirements", true],
                ].map(([name, label, multiline]) => (
                  <Grid item xs={12} key={name}>
                    <TextField
                      name={name}
                      label={label}
                      value={form[name]}
                      onChange={(event) => setForm({ ...form, [name]: event.target.value })}
                      required={name === "title"}
                      multiline={multiline}
                      minRows={multiline ? 3 : undefined}
                      fullWidth
                    />
                  </Grid>
                ))}
                <Grid item xs={12} sm={6}>
                  <TextField name="workMode" label="Work arrangement" select value={form.workMode} onChange={(event) => setForm({ ...form, workMode: event.target.value })} fullWidth>
                    {["Remote", "On-site", "Hybrid"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField name="jobType" label="Employment type" select value={form.jobType} onChange={(event) => setForm({ ...form, jobType: event.target.value })} fullWidth>
                    {["Full Time", "Part Time", "Contract", "Internship", "Work From Home"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField name="deadline" label="Application deadline" type="datetime-local" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} InputLabelProps={{ shrink: true }} required fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField name="skillsets" label="Skills (comma separated)" value={form.skillsets} onChange={(event) => setForm({ ...form, skillsets: event.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField name="salaryMin" label="Minimum salary" type="number" value={form.salaryMin} onChange={(event) => setForm({ ...form, salaryMin: event.target.value })} inputProps={{ min: 0 }} required fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField name="salaryMax" label="Maximum salary" type="number" value={form.salaryMax} onChange={(event) => setForm({ ...form, salaryMax: event.target.value })} inputProps={{ min: 0 }} required fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField name="maxApplicants" label="Applicant limit" type="number" value={form.maxApplicants} onChange={(event) => setForm({ ...form, maxApplicants: event.target.value })} inputProps={{ min: 1 }} required fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField name="maxPositions" label="Available positions" type="number" value={form.maxPositions} onChange={(event) => setForm({ ...form, maxPositions: event.target.value })} inputProps={{ min: 1 }} required fullWidth />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingJob(null)}>Cancel</Button>
              <Button type="submit" color="primary" variant="contained" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </main>
  );
};

export default MyJobs;
