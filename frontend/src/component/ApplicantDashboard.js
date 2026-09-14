import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, makeStyles, Paper, TextField, Typography } from "@material-ui/core";
import BookmarkBorderIcon from "@material-ui/icons/BookmarkBorder";
import DescriptionIcon from "@material-ui/icons/Description";
import EditIcon from "@material-ui/icons/Edit";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import SchoolIcon from "@material-ui/icons/School";
import WorkOutlineIcon from "@material-ui/icons/WorkOutline";
import FaceIcon from "@material-ui/icons/Face";
import axios from "axios";
import ChipInput from "material-ui-chip-input";

import { SetPopupContext } from "../App";
import apiList, { server } from "../lib/apiList";
import FileUploadInput from "../lib/FileUploadInput";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", maxWidth: 1440, padding: theme.spacing(2.5, 3, 6), margin: "0 auto", boxSizing: "border-box", [theme.breakpoints.down("xs")]: { padding: theme.spacing(1.5, 1.25, 4) } },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: theme.spacing(2), marginBottom: theme.spacing(1.5), [theme.breakpoints.down("xs")]: { flexDirection: "column" } },
  eyebrow: { color: "#1f8a70", fontWeight: 800, letterSpacing: ".12em" },
  hero: { padding: theme.spacing(2.5), borderRadius: 16, color: "#fff", background: "linear-gradient(120deg, #102a43 0%, #176b87 58%, #1f8a70 100%)", boxShadow: "0 16px 35px rgba(16,42,67,.16)" },
  heroTop: { display: "flex", alignItems: "center", gap: theme.spacing(2), [theme.breakpoints.down("xs")]: { alignItems: "flex-start", flexDirection: "column" } },
  avatar: { width: 78, height: 78, borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800 },
  heroCopy: { flexGrow: 1 },
  completeness: { minWidth: 220, [theme.breakpoints.down("xs")]: { width: "100%" } },
  actions: { display: "flex", gap: theme.spacing(1), flexWrap: "wrap" },
  grid: { marginTop: theme.spacing(2) },
  stat: { height: "100%", padding: theme.spacing(2), border: "1px solid #d9e2ec", borderTop: "3px solid #c21783", borderRadius: 12, cursor: "pointer", transition: "transform 160ms ease, box-shadow 160ms ease", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 22px rgba(16,42,67,.10)" } },
  statValue: { fontWeight: 800, color: "#102a43" },
  panel: { height: "100%", padding: theme.spacing(2), border: "1px solid #d9e2ec", borderRadius: 12, background: "linear-gradient(180deg, #fff 0%, #fbfdff 100%)" },
  panelTitle: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing(1), marginBottom: theme.spacing(1.5) },
  row: { display: "flex", alignItems: "center", gap: theme.spacing(1), padding: theme.spacing(1.25, 0), borderTop: "1px solid #e6edf3" },
  muted: { color: "#52606d" },
  chips: { display: "flex", flexWrap: "wrap", gap: theme.spacing(.75) },
  empty: { padding: theme.spacing(3), textAlign: "center", color: "#52606d", border: "1px dashed #cbd5df", borderRadius: 10 },
  loading: { minHeight: 560, display: "flex", alignItems: "center", justifyContent: "center" },
  recommendation: { height: "100%", padding: theme.spacing(2), border: "1px solid #e6edf3", borderRadius: 10 },
}));

const statusLabel = { under_review: "Under review", accepted: "Hired", withdrawn: "Withdrawn" };
const statusColor = { applied: "#3454D1", under_review: "#52606d", shortlisted: "#DC851F", assessment: "#7C4DFF", interview: "#00897B", offer: "#EF6C00", hired: "#09BC8A", accepted: "#09BC8A", rejected: "#D1345B", withdrawn: "#8a94a6" };
const labelFor = (value) => statusLabel[value] || String(value || "").replace("_", " ");

const CollectionEditor = ({ title, items, fields, onChange }) => (
  <div style={{ marginTop: 18 }}>
    <Typography variant="subtitle2">{title}</Typography>
    {(items || []).map((item, index) => <Grid container spacing={1} key={`${title}-${index}`} style={{ marginTop: 2 }}>
      {fields.map(([key, label]) => <Grid item xs={12} sm={fields.length > 1 ? 6 : 12} key={key}><TextField fullWidth size="small" variant="outlined" label={label} value={item[key] || ""} onChange={(event) => onChange(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, [key]: event.target.value } : entry))} /></Grid>)}
    </Grid>)}
    <Button size="small" color="primary" onClick={() => onChange([...(items || []), {}])}>Add {title.toLowerCase().replace(/s$/, "")}</Button>
  </div>
);

const ApplicantDashboard = () => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState({});

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setError("");
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    axios.get(apiList.applicantDashboard, { headers }).then((response) => {
      setDashboard(response.data);
      setDraft(response.data.profile || {});
    }).catch((requestError) => {
      setError(requestError.response?.data?.message || "Unable to load your dashboard");
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const completion = useMemo(() => {
    if (!dashboard?.profile) return { percent: 0, missing: [] };
    const profile = dashboard.profile;
    const checks = [
      ["Basic information", Boolean(profile.name && profile.email)],
      ["Profile photo", Boolean(profile.profile)],
      ["Skills", Boolean(profile.skills?.length)],
      ["Education", Boolean(profile.education?.length)],
      ["Resume", Boolean(profile.resume)],
      ["Experience", Boolean(profile.experience?.length)],
      ["Projects", Boolean(profile.projects?.length)],
      ["Certifications", Boolean(profile.certifications?.length)],
    ];
    const complete = checks.filter((item) => item[1]).length;
    return { percent: Math.round((complete / checks.length) * 100), missing: checks.filter((item) => !item[1]).map((item) => item[0]) };
  }, [dashboard]);

  const saveProfile = () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    axios.put(apiList.user, draft, { headers }).then((response) => {
      setPopup({ open: true, severity: "success", message: response.data.message });
      setEditOpen(false);
      loadDashboard();
    }).catch((requestError) => setPopup({ open: true, severity: "error", message: requestError.response?.data?.message || "Unable to update profile" }));
  };

  const saveUploadedField = (key, value) => {
    const nextDraft = { ...draft, [key]: value };
    setDraft(nextDraft);
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    axios.put(apiList.user, nextDraft, { headers }).then(() => {
      setDashboard((current) => current ? { ...current, profile: { ...current.profile, [key]: value } } : current);
      setPopup({ open: true, severity: "success", message: key === "resume" ? "Resume saved to your profile" : "Profile photo saved to your profile" });
    }).catch((requestError) => setPopup({ open: true, severity: "error", message: requestError.response?.data?.message || "Upload completed but profile could not be updated" }));
  };

  if (loading) return <main className={classes.page}><Paper className={classes.loading} elevation={0}><CircularProgress /></Paper></main>;
  if (error) return <main className={classes.page}><Paper className={classes.empty} elevation={0}><Typography variant="h6">Dashboard unavailable</Typography><Typography variant="body2">{error}</Typography><Button color="primary" onClick={loadDashboard}>Retry</Button></Paper></main>;

  const { profile, applications, stats, saved, recommendations } = dashboard;
  const total = Object.values(stats || {}).reduce((sum, value) => sum + value, 0);
  const statItems = [["Total applications", total, "all"], ["Under review", stats.under_review || 0, "under_review"], ["Shortlisted", stats.shortlisted || 0, "shortlisted"], ["Assessments", stats.assessment || 0, "assessment"], ["Interviews", stats.interview || 0, "interview"], ["Offers", stats.offer || 0, "offer"], ["Hired", (stats.hired || 0) + (stats.accepted || 0), "hired"], ["Rejected", stats.rejected || 0, "rejected"]];

  return <main className={classes.page}>
    <div className={classes.header}><div><Typography className={classes.eyebrow}>APPLICANT WORKSPACE</Typography><Typography variant="h4" component="h1">Your career dashboard</Typography><Typography className={classes.muted}>Keep your profile sharp and every application moving forward.</Typography></div><div className={classes.actions}><Button variant="outlined" href="/home">Find jobs</Button><Button variant="contained" color="primary" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>Edit profile</Button></div></div>
    <Paper className={classes.hero} elevation={0}><div className={classes.heroTop}>{profile.profile ? <img className={classes.avatar} src={`${server}${profile.profile}`} alt={profile.name} /> : <div className={classes.avatar}>{(profile.name || "A").charAt(0).toUpperCase()}</div>}<div className={classes.heroCopy}><Typography variant="h5">{profile.name || "Complete your profile"}</Typography><Typography variant="body1">{profile.headline || "Add a professional headline to stand out to recruiters."}</Typography><Typography variant="body2" style={{ opacity: .8, marginTop: 6 }}>{profile.location || "Location not added"} {profile.email ? `· ${profile.email}` : ""}</Typography></div><div className={classes.completeness}><Typography variant="body2">Profile completeness · {completion.percent}%</Typography><LinearProgress variant="determinate" value={completion.percent} style={{ marginTop: 8, background: "rgba(255,255,255,.25)" }} /><Typography variant="caption" style={{ opacity: .8 }}>{completion.missing.length ? `Missing: ${completion.missing.slice(0, 3).join(", ")}` : "Profile is complete"}</Typography></div></div></Paper>
    <Grid container spacing={2} className={classes.grid}>{statItems.map(([label, value, status]) => <Grid item xs={6} sm={3} md={1.5} key={label}><Paper className={classes.stat} elevation={0} onClick={() => window.location.href = status === "all" ? "/applications" : `/applications?status=${status}`}><Typography variant="h4" className={classes.statValue}>{value}</Typography><Typography variant="caption" className={classes.muted}>{label}</Typography></Paper></Grid>)}</Grid>
    <Grid container spacing={2} className={classes.grid}>
      <Grid item xs={12} md={7}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Recent applications</Typography><Button href="/applications" color="primary">View all</Button></div>{applications.length ? applications.map((application) => <div className={classes.row} key={application._id}><WorkOutlineIcon color="secondary" /><div style={{ flexGrow: 1 }}><Typography variant="body1">{application.job?.title || "Job unavailable"}</Typography><Typography variant="caption" className={classes.muted}>{application.recruiter?.name || "Company unavailable"} · {application.job?.location || "Location flexible"} · Applied {new Date(application.dateOfApplication).toLocaleDateString()}</Typography></div><Chip size="small" label={labelFor(application.status)} style={{ color: "#fff", background: statusColor[application.status] || "#52606d" }} /></div>) : <div className={classes.empty}><Typography>No applications yet.</Typography><Button href="/home" color="primary">Find jobs</Button></div>}</Paper></Grid>
      <Grid item xs={12} md={5}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Profile checklist</Typography><Button color="primary" onClick={() => setEditOpen(true)}>Complete</Button></div>{completion.missing.length ? completion.missing.map((item) => <div className={classes.row} key={item}><Typography className={classes.muted}>Add {item.toLowerCase()}</Typography></div>) : <Typography className={classes.muted}>Everything important is complete.</Typography>}<div style={{ marginTop: 18 }}><Typography variant="subtitle2">Skills</Typography><div className={classes.chips} style={{ marginTop: 8 }}>{profile.skills?.length ? profile.skills.map((skill) => <Chip key={skill} label={skill} size="small" />) : <Typography variant="body2" className={classes.muted}>Add skills to improve your profile.</Typography>}</div></div></Paper></Grid>
      <Grid item xs={12} md={5}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Saved jobs</Typography><Button href="/saved-jobs" color="primary">View all</Button></div>{saved.length ? saved.map((item) => <div className={classes.row} key={item._id}><BookmarkBorderIcon color="secondary" /><div style={{ flexGrow: 1 }}><Typography variant="body2">{item.job.title}</Typography><Typography variant="caption" className={classes.muted}>{item.recruiter?.name || "Verified employer"} · Saved {new Date(item.createdAt).toLocaleDateString()}</Typography></div></div>) : <div className={classes.empty}><Typography>No saved jobs yet.</Typography><Button href="/home" color="primary">Browse jobs</Button></div>}</Paper></Grid>
      <Grid item xs={12} md={7}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Recommended for you</Typography><Button href="/home" color="primary">Explore all</Button></div>{recommendations.length ? <Grid container spacing={1.5}>{recommendations.map((job) => <Grid item xs={12} sm={6} key={job._id}><div className={classes.recommendation}><Typography variant="subtitle1">{job.title}</Typography><Typography variant="caption" className={classes.muted}>{job.jobType} · {job.location || "Location flexible"}</Typography><Typography variant="body2" style={{ color: "#1f8a70", margin: "8px 0" }}>{job.matchScore ? `${job.matchScore}% skills match` : "New opportunity"}</Typography><Button size="small" href={`/home#job-${job._id}`}>View job</Button></div></Grid>)}</Grid> : <div className={classes.empty}>No recommendations available yet. Add skills to improve matching.</div>}</Paper></Grid>
      <Grid item xs={12} md={4}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Resume</Typography><DescriptionIcon color="secondary" /></div>{profile.resume ? <><Typography variant="body2">Resume uploaded</Typography><Button href={`${server}${profile.resume}`} target="_blank" rel="noreferrer" color="primary">View resume</Button></> : <div className={classes.empty}><Typography>No resume uploaded.</Typography><Button onClick={() => setEditOpen(true)} color="primary">Upload resume</Button></div>}</Paper></Grid>
      <Grid item xs={12} md={4}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Education</Typography><SchoolIcon color="secondary" /></div>{profile.education?.length ? profile.education.map((item) => <div key={`${item.institutionName}-${item.startYear}`}><Typography variant="body2">{item.institutionName}</Typography><Typography variant="caption" className={classes.muted}>{item.startYear} - {item.endYear || "Present"}</Typography></div>) : <div className={classes.empty}>No education added yet.</div>}</Paper></Grid>
      <Grid item xs={12} md={4}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Experience</Typography><WorkOutlineIcon color="secondary" /></div>{profile.experience?.length ? profile.experience.slice(0, 2).map((item, index) => <div key={`${item.company}-${index}`} style={{ marginBottom: 10 }}><Typography variant="body2">{item.title}</Typography><Typography variant="caption" className={classes.muted}>{item.company}</Typography></div>) : <div className={classes.empty}>No experience added yet.</div>}</Paper></Grid>
      <Grid item xs={12} md={6}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Projects</Typography></div>{profile.projects?.length ? profile.projects.slice(0, 3).map((item, index) => <div className={classes.row} key={`${item.name}-${index}`}><div><Typography variant="body2">{item.name}</Typography><Typography variant="caption" className={classes.muted}>{item.description}</Typography></div></div>) : <div className={classes.empty}>No projects added yet.</div>}</Paper></Grid>
      <Grid item xs={12} md={6}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Certifications</Typography></div>{profile.certifications?.length ? profile.certifications.slice(0, 3).map((item, index) => <div className={classes.row} key={`${item.name}-${index}`}><div><Typography variant="body2">{item.name}</Typography><Typography variant="caption" className={classes.muted}>{item.issuer}</Typography></div></div>) : <div className={classes.empty}>No certifications added yet.</div>}</Paper></Grid>
      <Grid item xs={12} md={6}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Upcoming interviews</Typography><EventAvailableIcon color="secondary" /></div><div className={classes.empty}>No upcoming interviews.</div></Paper></Grid>
    </Grid>
    <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Complete your profile</DialogTitle><DialogContent><TextField fullWidth variant="outlined" label="Professional headline" value={draft.headline || ""} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} style={{ marginTop: 8 }} /><TextField fullWidth variant="outlined" label="Location" value={draft.location || ""} onChange={(event) => setDraft({ ...draft, location: event.target.value })} style={{ marginTop: 12 }} /><TextField fullWidth variant="outlined" label="GitHub URL" value={draft.github || ""} onChange={(event) => setDraft({ ...draft, github: event.target.value })} style={{ marginTop: 12 }} /><TextField fullWidth variant="outlined" label="LinkedIn URL" value={draft.linkedin || ""} onChange={(event) => setDraft({ ...draft, linkedin: event.target.value })} style={{ marginTop: 12 }} /><ChipInput fullWidth variant="outlined" label="Skills" value={draft.skills || []} onAdd={(skill) => setDraft({ ...draft, skills: [...(draft.skills || []), skill] })} onDelete={(skill, index) => setDraft({ ...draft, skills: draft.skills.filter((_, itemIndex) => itemIndex !== index) })} style={{ marginTop: 12 }} /><CollectionEditor title="Experience" items={draft.experience} fields={[["title", "Job title"], ["company", "Company"]]} onChange={(experience) => setDraft({ ...draft, experience })} /><CollectionEditor title="Projects" items={draft.projects} fields={[["name", "Project name"], ["description", "Short description"], ["url", "Project URL"]]} onChange={(projects) => setDraft({ ...draft, projects })} /><CollectionEditor title="Certifications" items={draft.certifications} fields={[["name", "Certification name"], ["issuer", "Issuer"], ["url", "Credential URL"]]} onChange={(certifications) => setDraft({ ...draft, certifications })} /><div className={classes.upload}><Typography variant="caption" className={classes.muted}>{draft.resume ? "Resume currently uploaded. Choose a new file to replace it." : "No resume uploaded yet."}</Typography><FileUploadInput uploadTo={apiList.uploadResume} identifier="resume" handleInput={saveUploadedField} label="Replace resume (PDF)" icon={<DescriptionIcon />} /></div><div className={classes.upload}><Typography variant="caption" className={classes.muted}>{draft.profile ? "Profile photo currently uploaded. Choose a new image to replace it." : "No profile photo uploaded yet."}</Typography><FileUploadInput uploadTo={apiList.uploadProfileImage} identifier="profile" handleInput={saveUploadedField} label="Replace profile photo" icon={<FaceIcon />} /></div></DialogContent><DialogActions><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button variant="contained" color="primary" onClick={saveProfile}>Save profile</Button></DialogActions></Dialog>
  </main>;
};

export default ApplicantDashboard;
