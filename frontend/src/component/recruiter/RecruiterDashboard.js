import React, { useContext, useEffect, useState } from "react";
import { Button, CircularProgress, Grid, Paper, Typography, makeStyles } from "@material-ui/core";
import { useHistory } from "react-router-dom";
import { SetPopupContext } from "../../App";
import { getRecruiterDashboard } from "../../lib/recruiterApi";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", maxWidth: 1120, padding: theme.spacing(4, 2), margin: "0 auto" },
  heading: { marginBottom: theme.spacing(1), fontWeight: 800, color: "#172b4d" },
  subtitle: { marginBottom: theme.spacing(3), color: "#64748b" },
  card: { height: "100%", padding: theme.spacing(3), borderRadius: 16, border: "1px solid #e6ebf2" },
  label: { color: "#64748b", fontWeight: 600 },
  value: { marginTop: theme.spacing(1), fontWeight: 800, color: "#172b4d" },
  accent: { color: "#6d28d9" },
  actions: { marginTop: theme.spacing(3), display: "flex", gap: theme.spacing(1.5), flexWrap: "wrap" },
}));

const RecruiterDashboard = () => {
  const classes = useStyles();
  const history = useHistory();
  const setPopup = useContext(SetPopupContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getRecruiterDashboard()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((error) => {
        if (active) {
          setPopup({
            open: true,
            severity: "error",
            message: error.response?.data?.message || "Unable to load recruiter dashboard",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [setPopup]);

  const cards = stats ? [
    ["Total jobs posted", stats.totalJobs],
    ["Applicants received", stats.totalApplicants],
    ["Active listings", stats.activeJobs],
    ["Closed listings", stats.closedJobs],
  ] : [];

  return (
    <main className={classes.page}>
      <Typography variant="h4" className={classes.heading}>Recruiter dashboard</Typography>
      <Typography className={classes.subtitle}>A quick view of your hiring activity and open roles.</Typography>
      {loading ? <CircularProgress color="primary" /> : stats && (
        <>
          <Grid container spacing={2}>
            {cards.map(([label, value], index) => (
              <Grid item xs={12} sm={6} md={3} key={label}>
                <Paper elevation={0} className={classes.card}>
                  <Typography className={classes.label}>{label}</Typography>
                  <Typography variant="h3" className={`${classes.value} ${index === 2 ? classes.accent : ""}`}>
                    {value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          <div className={classes.actions}>
            <Button variant="contained" color="primary" onClick={() => history.push("/addjob")}>Post a job</Button>
            <Button variant="outlined" color="primary" onClick={() => history.push("/myjobs")}>Manage listings</Button>
          </div>
        </>
      )}
    </main>
  );
};

export default RecruiterDashboard;
