import React, { useState, useEffect, useContext } from "react";
import { Button, Chip, Grid, makeStyles, Paper, Typography, Modal } from "@material-ui/core";
import Rating from "@material-ui/lab/Rating";
import ScheduleIcon from "@material-ui/icons/Schedule";
import EventIcon from "@material-ui/icons/Event";
import axios from "axios";

import { SetPopupContext } from "../App";
import apiList from "../lib/apiList";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", maxWidth: 1180, padding: theme.spacing(3, 2, 6), margin: "0 auto", boxSizing: "border-box" },
  heading: { marginBottom: theme.spacing(3) },
  card: { padding: theme.spacing(3), borderRadius: 14, border: "1px solid #d9e2ec" },
  cardHeader: { display: "flex", justifyContent: "space-between", gap: theme.spacing(2), flexWrap: "wrap" },
  detail: { display: "flex", alignItems: "center", gap: theme.spacing(1), color: "#52606d", marginTop: theme.spacing(0.5) },
  icon: { fontSize: 18, color: "#1f8a70" },
  chips: { display: "flex", flexWrap: "wrap", gap: theme.spacing(0.75), margin: theme.spacing(1.5, 0) },
  status: { padding: theme.spacing(0.75, 2), borderRadius: 20, color: "#fff", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em", display: "inline-block" },
  modal: { display: "flex", alignItems: "center", justifyContent: "center", padding: theme.spacing(2) },
  modalPaper: { padding: theme.spacing(4), outline: "none", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 320 },
  empty: { width: "100%", padding: theme.spacing(6), textAlign: "center", color: "#52606d", borderRadius: 14 },
}));

const colorSet = {
  applied: "#3454D1",
  shortlisted: "#DC851F",
  accepted: "#09BC8A",
  rejected: "#D1345B",
  deleted: "#B49A67",
  cancelled: "#FF8484",
  finished: "#4EA5D9",
};

const ApplicationTile = ({ application }) => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(application.job.rating);

  const appliedOn = new Date(application.dateOfApplication);
  const joinedOn = new Date(application.dateOfJoining);
  const canRate = application.status === "accepted" || application.status === "finished";

  const fetchRating = () => {
    axios
      .get(`${apiList.rating}?id=${application.job._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((response) => setRating(response.data.rating))
      .catch(() => setPopup({ open: true, severity: "error", message: "Unable to load rating" }));
  };

  const changeRating = () => {
    axios
      .put(apiList.rating, { rating, jobId: application.job._id }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(() => {
        setPopup({ open: true, severity: "success", message: "Rating updated successfully" });
        fetchRating();
        setOpen(false);
      })
      .catch((err) => {
        setPopup({ open: true, severity: "error", message: err.response?.data?.message || "Unable to update rating" });
        fetchRating();
        setOpen(false);
      });
  };

  return (
    <Paper className={classes.card} elevation={0}>
      <div className={classes.cardHeader}>
        <div>
          <Typography variant="h6">{application.job.title}</Typography>
          <Typography variant="body2" color="textSecondary">Posted by {application.recruiter.name}</Typography>
        </div>
        <span className={classes.status} style={{ background: colorSet[application.status] || "#52606d" }}>{application.status}</span>
      </div>

      <div className={classes.chips}>
        {application.job.skillsets.map((skill) => <Chip key={skill} label={skill} size="small" variant="outlined" />)}
      </div>

      <div className={classes.detail}><ScheduleIcon className={classes.icon} /> ₹{application.job.salary} / month · {application.job.duration !== 0 ? `${application.job.duration} months` : "Flexible duration"}</div>
      <div className={classes.detail}><EventIcon className={classes.icon} /> Applied on {appliedOn.toLocaleDateString()}{canRate ? ` · Joined ${joinedOn.toLocaleDateString()}` : ""}</div>

      {canRate && (
        <Button variant="outlined" color="primary" style={{ marginTop: 16 }} onClick={() => { fetchRating(); setOpen(true); }}>
          Rate this job
        </Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} className={classes.modal}>
        <Paper className={classes.modalPaper}>
          <Typography variant="h6" gutterBottom>Rate your experience</Typography>
          <Rating name="job-rating" size="large" style={{ margin: "16px 0" }} value={rating === -1 ? null : rating} onChange={(event, newValue) => setRating(newValue)} />
          <Button variant="contained" color="primary" fullWidth onClick={changeRating}>Submit rating</Button>
        </Paper>
      </Modal>
    </Paper>
  );
};

const Applications = () => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);
  const [applications, setApplications] = useState([]);

  useEffect(() => { getData(); }, []);

  const getData = () => {
    axios
      .get(apiList.applications, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((response) => setApplications(response.data))
      .catch(() => setPopup({ open: true, severity: "error", message: "Unable to load applications" }));
  };

  return (
    <main className={classes.page}>
      <div className={classes.heading}>
        <Typography variant="overline" color="textSecondary">YOUR ACTIVITY</Typography>
        <Typography variant="h4" component="h1">Applications</Typography>
        <Typography variant="body2" color="textSecondary">Track the status of every role you have applied to.</Typography>
      </div>
      <Grid container spacing={2}>
        {applications.length > 0 ? (
          applications.map((application) => (
            <Grid item xs={12} key={application._id}>
              <ApplicationTile application={application} />
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Paper className={classes.empty} elevation={0}>
              <Typography variant="h6">No applications yet</Typography>
              <Typography variant="body2">Jobs you apply to will show up here.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </main>
  );
};

export default Applications;