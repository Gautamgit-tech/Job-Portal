import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, makeStyles, Paper, TextField, Typography } from "@material-ui/core";
import EditIcon from "@material-ui/icons/Edit";
import SchoolIcon from "@material-ui/icons/School";
import WorkOutlineIcon from "@material-ui/icons/WorkOutline";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import DescriptionIcon from "@material-ui/icons/Description";
import FaceIcon from "@material-ui/icons/Face";
import axios from "axios";
import ChipInput from "material-ui-chip-input";

import { SetPopupContext } from "../App";
import FileUploadInput from "../lib/FileUploadInput";
import apiList, { server } from "../lib/apiList";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", maxWidth: 1180, padding: theme.spacing(3, 2, 6), margin: "0 auto" },
  heading: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing(2), marginBottom: theme.spacing(3), [theme.breakpoints.down("xs")]: { alignItems: "flex-start", flexDirection: "column" } },
  hero: { padding: theme.spacing(3), borderRadius: 16, color: "#fff", background: "linear-gradient(120deg, #102a43 0%, #176b87 100%)" },
  avatar: { width: 82, height: 82, borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700 },
  heroContent: { display: "flex", alignItems: "center", gap: theme.spacing(2) },
  stat: { minHeight: 118, padding: theme.spacing(2), borderRadius: 12, border: "1px solid #d9e2ec" },
  statIcon: { color: "#1f8a70", marginBottom: theme.spacing(1) },
  panel: { height: "100%", padding: theme.spacing(2.5), borderRadius: 12, border: "1px solid #d9e2ec" },
  panelTitle: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing(2) },
  chips: { display: "flex", flexWrap: "wrap", gap: theme.spacing(1) },
  application: { padding: theme.spacing(1.5, 0), borderTop: "1px solid #e6edf3" },
  status: { textTransform: "capitalize", fontWeight: 700 },
  editGrid: { marginTop: theme.spacing(1) },
  upload: { marginTop: theme.spacing(2) },
}));

const statusColors = { applied: "#3454D1", shortlisted: "#DC851F", accepted: "#09BC8A", rejected: "#D1345B", finished: "#4EA5D9", cancelled: "#8a94a6" };

const Profile = () => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);
  const [profile, setProfile] = useState({ name: "", education: [], skills: [], resume: "", profile: "", rating: -1 });
  const [applications, setApplications] = useState([]);
  const [open, setOpen] = useState(false);
  const [education, setEducation] = useState([]);

  const loadDashboard = useCallback(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    return Promise.all([axios.get(apiList.user, { headers }), axios.get(apiList.applications, { headers })]).then(([profileResponse, applicationsResponse]) => {
    setProfile(profileResponse.data);
    setEducation(profileResponse.data.education || []);
    setApplications(applicationsResponse.data || []);
    }).catch((error) => setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to load your dashboard" }));
  }, [setPopup]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const completion = useMemo(() => {
    const fields = [profile.name, profile.skills?.length, profile.education?.length, profile.resume, profile.profile];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);
  const accepted = applications.filter((application) => application.status === "accepted" || application.status === "finished").length;
  const active = applications.filter((application) => !["rejected", "cancelled", "finished"].includes(application.status)).length;

  const updateProfile = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const saveProfile = () => {
    const updated = { ...profile, education: education.filter((item) => item.institutionName && item.startYear).map((item) => ({ ...item, startYear: Number(item.startYear), endYear: item.endYear ? Number(item.endYear) : undefined })) };
    axios.put(apiList.user, updated, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then((response) => {
      setPopup({ open: true, severity: "success", message: response.data.message });
      setOpen(false);
      loadDashboard();
    }).catch((error) => setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to update profile" }));
  };

  return (
    <main className={classes.page}>
      <div className={classes.heading}><div><Typography variant="overline" color="textSecondary">STUDENT DASHBOARD</Typography><Typography variant="h4" component="h1">Welcome back, {profile.name || "student"}</Typography></div><Button variant="contained" color="primary" startIcon={<EditIcon />} onClick={() => setOpen(true)}>Edit profile</Button></div>
      <Paper className={classes.hero} elevation={0}>
        <div className={classes.heroContent}>
          {profile.profile ? <img className={classes.avatar} src={`${server}${profile.profile}`} alt={profile.name} /> : <div className={classes.avatar}>{(profile.name || "S").charAt(0).toUpperCase()}</div>}
          <div><Typography variant="h5">{profile.name || "Complete your profile"}</Typography><Typography variant="body2">Build a stronger profile to stand out to recruiters.</Typography></div>
        </div>
        <div style={{ marginTop: 24 }}><Typography variant="body2">Profile completeness · {completion}%</Typography><LinearProgress variant="determinate" value={completion} style={{ marginTop: 8, background: "rgba(255,255,255,.25)" }} /></div>
      </Paper>
      <Grid container spacing={2} style={{ marginTop: 8, marginBottom: 8 }}>
        <Grid item xs={12} sm={4}><Paper className={classes.stat} elevation={0}><WorkOutlineIcon className={classes.statIcon} /><Typography variant="h4">{applications.length}</Typography><Typography variant="body2" color="textSecondary">Total applications</Typography></Paper></Grid>
        <Grid item xs={12} sm={4}><Paper className={classes.stat} elevation={0}><CheckCircleIcon className={classes.statIcon} /><Typography variant="h4">{accepted}</Typography><Typography variant="body2" color="textSecondary">Accepted roles</Typography></Paper></Grid>
        <Grid item xs={12} sm={4}><Paper className={classes.stat} elevation={0}><DescriptionIcon className={classes.statIcon} /><Typography variant="h4">{active}</Typography><Typography variant="body2" color="textSecondary">Active applications</Typography></Paper></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">About you</Typography><Typography variant="body2" color="textSecondary">{profile.rating > -1 ? `${profile.rating.toFixed(1)} / 5 rating` : "No rating yet"}</Typography></div><Typography variant="body2" color="textSecondary" gutterBottom>Skills</Typography><div className={classes.chips}>{profile.skills?.length ? profile.skills.map((skill) => <Chip key={skill} label={skill} size="small" />) : <Typography variant="body2">Add skills to improve your profile.</Typography>}</div><Typography variant="body2" color="textSecondary" style={{ marginTop: 24 }} gutterBottom>Education</Typography>{profile.education?.length ? profile.education.map((item) => <div key={`${item.institutionName}-${item.startYear}`} style={{ marginBottom: 12 }}><Typography variant="body2" style={{ fontWeight: 700 }}><SchoolIcon style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }} />{item.institutionName}</Typography><Typography variant="caption" color="textSecondary">{item.startYear} - {item.endYear || "Present"}</Typography></div>) : <Typography variant="body2">Add your education history.</Typography>}{profile.resume ? <Button href={`${server}${profile.resume}`} target="_blank" rel="noreferrer" startIcon={<DescriptionIcon />} style={{ marginTop: 12 }}>View resume</Button> : null}</Paper></Grid>
        <Grid item xs={12} md={7}><Paper className={classes.panel} elevation={0}><div className={classes.panelTitle}><Typography variant="h6">Recent applications</Typography><Button color="primary" href="/applications">View all</Button></div>{applications.slice(0, 4).map((application) => <div className={classes.application} key={application._id}><Grid container alignItems="center" spacing={1}><Grid item xs><Typography variant="body1" style={{ fontWeight: 700 }}>{application.job.title}</Typography><Typography variant="caption" color="textSecondary">{application.recruiter.name} · Applied {new Date(application.dateOfApplication).toLocaleDateString()}</Typography></Grid><Grid item><Typography className={classes.status} variant="caption" style={{ color: statusColors[application.status] || "#52606d" }}>{application.status}</Typography></Grid></Grid></div>)}{applications.length === 0 ? <Typography variant="body2" color="textSecondary">Your applications will appear here.</Typography> : null}</Paper></Grid>
      </Grid>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Edit your profile</DialogTitle><DialogContent><TextField label="Full name" variant="outlined" fullWidth value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} className={classes.editGrid} /><ChipInput label="Skills" variant="outlined" fullWidth value={profile.skills || []} onAdd={(skill) => updateProfile("skills", [...(profile.skills || []), skill])} onDelete={(skill, index) => updateProfile("skills", profile.skills.filter((_, itemIndex) => itemIndex !== index))} className={classes.editGrid} /><Typography variant="subtitle2" style={{ marginTop: 18 }}>Education</Typography>{education.map((item, index) => <Grid container spacing={1} key={index} className={classes.editGrid}><Grid item xs={12} sm={6}><TextField label="Institution" variant="outlined" fullWidth value={item.institutionName} onChange={(event) => setEducation(education.map((entry, itemIndex) => itemIndex === index ? { ...entry, institutionName: event.target.value } : entry))} /></Grid><Grid item xs={6} sm={3}><TextField label="Start" type="number" variant="outlined" fullWidth value={item.startYear} onChange={(event) => setEducation(education.map((entry, itemIndex) => itemIndex === index ? { ...entry, startYear: event.target.value } : entry))} /></Grid><Grid item xs={6} sm={3}><TextField label="End" type="number" variant="outlined" fullWidth value={item.endYear || ""} onChange={(event) => setEducation(education.map((entry, itemIndex) => itemIndex === index ? { ...entry, endYear: event.target.value } : entry))} /></Grid></Grid>)}<Button onClick={() => setEducation([...education, { institutionName: "", startYear: "", endYear: "" }])} style={{ marginTop: 10 }}>Add education</Button><div className={classes.upload}><FileUploadInput uploadTo={apiList.uploadResume} identifier="resume" handleInput={updateProfile} label="Upload resume (PDF)" icon={<DescriptionIcon />} /></div><div className={classes.upload}><FileUploadInput uploadTo={apiList.uploadProfileImage} identifier="profile" handleInput={updateProfile} label="Upload profile image" icon={<FaceIcon />} /></div></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" color="primary" onClick={saveProfile}>Save changes</Button></DialogActions></Dialog>
    </main>
  );
};

export default Profile;
