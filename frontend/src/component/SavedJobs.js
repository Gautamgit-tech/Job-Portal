import React, { useCallback, useContext, useEffect, useState } from "react";
import { Button, Chip, CircularProgress, Grid, IconButton, makeStyles, Paper, Typography } from "@material-ui/core";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import LocationOnIcon from "@material-ui/icons/LocationOn";
import axios from "axios";

import { SetPopupContext } from "../App";
import apiList from "../lib/apiList";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", maxWidth: 1180, padding: theme.spacing(3, 2, 6), margin: "0 auto", boxSizing: "border-box" },
  heading: { marginBottom: theme.spacing(3) },
  card: { height: "100%", padding: theme.spacing(2.5), border: "1px solid #d9e2ec", borderRadius: 14 },
  header: { display: "flex", justifyContent: "space-between", gap: theme.spacing(1) },
  details: { minHeight: 116, marginTop: theme.spacing(2) },
  detail: { display: "flex", alignItems: "center", gap: theme.spacing(1), color: "#52606d", marginBottom: theme.spacing(1) },
  empty: { width: "100%", padding: theme.spacing(6), textAlign: "center", color: "#52606d" },
  loading: { minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center" },
}));

const SavedJobs = () => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const loadSavedJobs = useCallback(() => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    axios.get(apiList.savedJobs, { params: { page, limit: 12 }, headers }).then((response) => {
      setItems(response.data.results || []);
      setPages(response.data.pages || 1);
    }).catch((error) => setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to load saved jobs" })).finally(() => setLoading(false));
  }, [setPopup, page]);

  useEffect(() => { loadSavedJobs(); }, [loadSavedJobs]);

  const removeSavedJob = (jobId) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    axios.delete(`${apiList.jobs}/${jobId}/save`, { headers }).then((response) => {
      setPopup({ open: true, severity: "success", message: response.data.message });
      loadSavedJobs();
    }).catch((error) => setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to remove saved job" }));
  };

  return (
    <main className={classes.page}>
      <div className={classes.heading}>
        <Typography variant="overline" color="textSecondary">YOUR SHORTLIST</Typography>
        <Typography variant="h4" component="h1">Saved jobs</Typography>
        <Typography variant="body2" color="textSecondary">Keep promising opportunities close while you decide what is next.</Typography>
      </div>
      {loading ? <Paper className={classes.loading} elevation={0}><CircularProgress /></Paper> : items.length ? <Grid container spacing={2}>{items.map((item) => { const job = item.jobId; return <Grid item xs={12} sm={6} md={4} key={item._id}><Paper className={classes.card} elevation={0}><div className={classes.header}><div><Typography variant="h6">{job.title}</Typography><Typography variant="body2" color="textSecondary">{item.recruiter?.name || "Verified employer"}</Typography></div><IconButton aria-label="Remove saved job" onClick={() => removeSavedJob(job._id)}><DeleteOutlineIcon /></IconButton></div><div className={classes.details}><div className={classes.detail}><LocationOnIcon fontSize="small" /> {job.location || "Location flexible"}</div><Typography variant="body2" color="textSecondary">{job.jobType} · {job.salary ? `₹${Number(job.salary).toLocaleString("en-IN")}/month` : "Salary not listed"}</Typography><Typography variant="caption" color="textSecondary">Posted {new Date(job.dateOfPosting).toLocaleDateString()} · Saved {new Date(item.createdAt).toLocaleDateString()}</Typography><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>{(job.skillsets || []).slice(0, 4).map((skill) => <Chip key={skill} label={skill} size="small" variant="outlined" />)}</div></div><Button variant="contained" color="primary" fullWidth href={`/home#job-${job._id}`}>View job</Button></Paper></Grid>; })}</Grid> : <Paper className={classes.empty} elevation={0}><Typography variant="h6">No saved jobs yet</Typography><Typography variant="body2">Bookmark a role from the job board and it will appear here.</Typography><Button color="primary" href="/home" style={{ marginTop: 16 }}>Explore jobs</Button></Paper>}
      {!loading && pages > 1 && <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}><Button disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><Typography style={{ paddingTop: 8 }}>Page {page} of {pages}</Typography><Button disabled={page === pages} onClick={() => setPage((current) => current + 1)}>Next</Button></div>}
    </main>
  );
};

export default SavedJobs;