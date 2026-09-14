import React, { useContext, useEffect, useState } from "react";
import { Button, Chip, Grid, IconButton, InputAdornment, makeStyles, MenuItem, Modal, Paper, TextField, Typography } from "@material-ui/core";
import Rating from "@material-ui/lab/Rating";
import axios from "axios";
import SearchIcon from "@material-ui/icons/Search";
import TuneIcon from "@material-ui/icons/Tune";
import LocationOnIcon from "@material-ui/icons/LocationOn";
import ScheduleIcon from "@material-ui/icons/Schedule";
import BookmarkBorderIcon from "@material-ui/icons/BookmarkBorder";
import BookmarkIcon from "@material-ui/icons/Bookmark";

import { SetPopupContext } from "../App";
import apiList from "../lib/apiList";
import { userType } from "../lib/isAuth";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", padding: theme.spacing(3, 3, 6), boxSizing: "border-box" },
  hero: { width: "100%", padding: theme.spacing(4, 3), marginBottom: theme.spacing(3), color: "#fff", background: "linear-gradient(120deg, #102a43 0%, #176b87 100%)", borderRadius: 18, boxSizing: "border-box" },
  search: { background: "#fff", borderRadius: 8, marginTop: theme.spacing(3) },
  toolbar: { width: "100%", display: "flex", gap: theme.spacing(2), alignItems: "center", marginBottom: theme.spacing(2), [theme.breakpoints.down("xs")]: { flexDirection: "column", alignItems: "stretch" } },
  count: { flexGrow: 1, color: "#52606d" },
  card: { height: "100%", padding: theme.spacing(2.5), border: "1px solid #d9e2ec", borderRadius: 14, boxSizing: "border-box", display: "flex", flexDirection: "column", transition: "transform 180ms ease, box-shadow 180ms ease", "&:hover": { transform: "translateY(-3px)", boxShadow: "0 12px 28px rgba(16, 42, 67, .12)" } },
  cardHeader: { display: "flex", justifyContent: "space-between", gap: theme.spacing(1) },
  details: { flexGrow: 1, marginTop: theme.spacing(2) },
  detail: { display: "flex", alignItems: "center", gap: theme.spacing(1), color: "#52606d", marginBottom: theme.spacing(1) },
  icon: { fontSize: 18, color: "#1f8a70" },
  chips: { display: "flex", flexWrap: "wrap", gap: theme.spacing(0.75), margin: theme.spacing(1, 0, 2) },
  modal: { display: "flex", alignItems: "center", justifyContent: "center", padding: theme.spacing(2) },
  modalPaper: { width: "100%", maxWidth: 620, padding: theme.spacing(3), outline: "none", borderRadius: 14 },
  empty: { width: "100%", padding: theme.spacing(6), textAlign: "center", color: "#52606d" },
}));

const formatSalary = (salary) => `₹${Number(salary || 0).toLocaleString("en-IN")}/month`;

const JobTile = ({ job }) => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);
  const [open, setOpen] = useState(false);
  const [sop, setSop] = useState("");
  const [saved, setSaved] = useState(false);
  const canApply = userType() === "applicant";

  useEffect(() => {
    if (!canApply) return;
    axios.get(apiList.savedJobStatus(job._id), { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then((response) => {
      setSaved(response.data.saved);
    }).catch(() => {});
  }, [canApply, job._id]);

  const toggleSaved = () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    const request = saved ? axios.delete(`${apiList.jobs}/${job._id}/save`, { headers }) : axios.post(`${apiList.jobs}/${job._id}/save`, {}, { headers });
    request.then((response) => {
      setSaved(response.data.saved);
      setPopup({ open: true, severity: "success", message: response.data.message });
    }).catch((error) => setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to update saved jobs" }));
  };

  const handleApply = () => {
    axios.post(`${apiList.jobs}/${job._id}/applications`, { sop }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then((response) => {
      setPopup({ open: true, severity: "success", message: response.data.message });
      setOpen(false);
      setSop("");
    }).catch((error) => setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to apply right now" }));
  };

  return (
    <Paper id={`job-${job._id}`} className={classes.card} elevation={0}>
        <div className={classes.cardHeader}>
        <div><Typography variant="h6" component="h2">{job.title}</Typography><Typography variant="body2" color="textSecondary">{job.recruiter?.name || "Verified employer"}</Typography></div>
        <div><IconButton aria-label={saved ? "Unsave job" : "Save job"} onClick={toggleSaved} disabled={!canApply}>{saved ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}</IconButton><Chip label={job.jobType} size="small" color="primary" /></div>
      </div>
      <div className={classes.details}>
        <Rating value={job.rating > -1 ? job.rating : 0} precision={0.5} readOnly size="small" />
        <div className={classes.detail}><LocationOnIcon className={classes.icon} /> Remote-friendly opportunity</div>
        <div className={classes.detail}><ScheduleIcon className={classes.icon} /> {formatSalary(job.salary)} · {job.duration ? `${job.duration} months` : "Flexible duration"}</div>
        <Typography variant="body2" color="textSecondary">Apply by {new Date(job.deadline).toLocaleDateString()}</Typography>
        <div className={classes.chips}>{(job.skillsets || []).map((skill) => <Chip key={skill} label={skill} size="small" variant="outlined" />)}</div>
      </div>
      <Button variant="contained" color="primary" fullWidth disabled={!canApply} onClick={() => setOpen(true)}>{canApply ? "Apply now" : "Applicant access required"}</Button>
      <Modal open={open} onClose={() => setOpen(false)} className={classes.modal}>
        <Paper className={classes.modalPaper}>
          <Typography variant="h6" gutterBottom>Apply for {job.title}</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>Tell the recruiter why this role is a strong match for you.</Typography>
          <TextField label="Statement of purpose (up to 250 words)" multiline rows={7} variant="outlined" fullWidth value={sop} onChange={(event) => setSop(event.target.value.split(/\s+/).filter(Boolean).length <= 250 ? event.target.value : sop)} />
          <Button variant="contained" color="primary" fullWidth style={{ marginTop: 20 }} onClick={handleApply} disabled={!sop.trim()}>Send application</Button>
        </Paper>
      </Modal>
    </Paper>
  );
};

const Home = () => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = {
        page,
        limit: 12,
        ...(query ? { q: query } : {}),
        ...(type !== "all" ? { jobType: type } : {}),
        ...(sort === "salary" ? { desc: "salary" } : { desc: "dateOfPosting" }),
      };
      axios.get(apiList.jobs, { params, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then((response) => {
        setJobs(response.data.results || response.data);
        setPageCount(response.data.pages || 1);
      }).catch((error) => {
        if (error.response?.status === 404) {
          setJobs([]);
          setPageCount(1);
          return;
        }
        setPopup({ open: true, severity: "error", message: error.response?.data?.message || "Unable to load jobs" });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [page, query, sort, type, setPopup]);

  return (
    <main className={classes.page}>
      <section className={classes.hero}>
        <Typography variant="overline">THE NEXT STEP IN YOUR CAREER</Typography>
        <Typography variant="h3" component="h1">Find work worth doing.</Typography>
        <Typography variant="body1">Explore carefully matched roles from ambitious teams building what is next.</Typography>
        <TextField className={classes.search} fullWidth variant="outlined" placeholder="Search by role, skill or company" value={query} onChange={(event) => setQuery(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
      </section>
      <div className={classes.toolbar}>
        <Typography className={classes.count} variant="body2">Showing page {page} of {pageCount}</Typography>
        <TextField select size="small" variant="outlined" label="Job type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><MenuItem value="all">All types</MenuItem><MenuItem value="Full Time">Full time</MenuItem><MenuItem value="Part Time">Part time</MenuItem><MenuItem value="Work From Home">Work from home</MenuItem></TextField>
        <TextField select size="small" variant="outlined" label="Sort by" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} InputProps={{ startAdornment: <InputAdornment position="start"><TuneIcon fontSize="small" /></InputAdornment> }}><MenuItem value="newest">Newest</MenuItem><MenuItem value="salary">Highest salary</MenuItem></TextField>
      </div>
      <Grid container spacing={2}>
        {jobs.length ? jobs.map((job) => <Grid item xs={12} sm={6} md={4} key={job._id}><JobTile job={job} /></Grid>) : <Paper className={classes.empty} elevation={0}><Typography variant="h6">No matching opportunities</Typography><Typography variant="body2">Try a different search or job type.</Typography></Paper>}
      </Grid>
      {pageCount > 1 && <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}><Button disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button></div>}
    </main>
  );
};

export default Home;
