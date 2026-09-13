import React, { useEffect } from "react";
import { Button, Grid, makeStyles, Paper, Typography } from "@material-ui/core";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";
import ExploreIcon from "@material-ui/icons/Explore";
import PersonIcon from "@material-ui/icons/Person";
import DescriptionIcon from "@material-ui/icons/Description";
import WorkIcon from "@material-ui/icons/Work";
import { useHistory } from "react-router-dom";

import isAuth, { userType } from "../lib/isAuth";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", minHeight: "calc(100vh - 64px)", padding: theme.spacing(3, 3, 5), background: "linear-gradient(135deg, #f4f7f9 0%, #fff 45%, #fbe9f4 100%)", boxSizing: "border-box" },
  wrap: { width: "100%", maxWidth: 1180, margin: "0 auto" },
  hero: { position: "relative", overflow: "hidden", minHeight: 260, padding: theme.spacing(4), borderRadius: 22, color: "#fff", background: "linear-gradient(120deg, #46166b 0%, #c21783 52%, #f22b65 100%)", boxShadow: "0 22px 55px rgba(194, 23, 131, .22)", [theme.breakpoints.down("sm")]: { padding: theme.spacing(3, 2.5), minHeight: 310 }, "@media (max-height: 500px)": { minHeight: 190, padding: theme.spacing(2.5, 3) } },
  heroContent: { position: "relative", zIndex: 1, maxWidth: 660 },
  eyebrow: { letterSpacing: ".16em", fontWeight: 700, color: "#ffd4e9" },
  title: { marginTop: theme.spacing(1), fontWeight: 800, lineHeight: 1.08, fontSize: "clamp(2.25rem, 5vw, 4.2rem)", "@media (max-height: 500px)": { fontSize: "clamp(1.8rem, 5vw, 2.8rem)" } },
  copy: { maxWidth: 580, marginTop: theme.spacing(2), color: "rgba(255,255,255,.86)", lineHeight: 1.7 },
  primary: { marginTop: theme.spacing(3), background: "#fff", color: "#a3126f", fontWeight: 700, padding: theme.spacing(1.2, 2.5), borderRadius: 10, "&:hover": { background: "#fff0f7" } },
  orb: { position: "absolute", borderRadius: "50%", border: "1px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.12)" },
  orbLarge: { width: 330, height: 330, right: -80, top: -60 },
  orbSmall: { width: 130, height: 130, right: 230, bottom: 35 },
  sectionTitle: { margin: theme.spacing(3, 0, 2), fontWeight: 700, color: "#102a43" },
  card: { minHeight: 132, padding: theme.spacing(2), borderRadius: 14, border: "1px solid #e1e8ed", background: "rgba(255,255,255,.9)" },
  icon: { padding: 8, borderRadius: 10, color: "#fff", marginBottom: theme.spacing(1.2) },
  iconPink: { background: "#c21783" },
  iconTeal: { background: "#1f8a70" },
  iconGold: { background: "#e09f3e" },
  iconBlue: { background: "#3454d1" },
  error: { minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center" },
}));

const Welcome = () => {
  const classes = useStyles();
  const history = useHistory();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const loggedIn = isAuth();
  const recruiter = userType() === "recruiter";
  const cards = recruiter ? [
    [<WorkIcon />, classes.iconPink, "Manage your roles", "Create, update, and track every opportunity in one place.", "/myjobs"],
    [<PersonIcon />, classes.iconTeal, "Meet your candidates", "Review applications and find the right people faster.", "/employees"],
    [<DescriptionIcon />, classes.iconBlue, "Complete your profile", "Keep your company story clear and compelling.", "/profile"],
  ] : [
    [<ExploreIcon />, classes.iconPink, "Explore opportunities", "Browse 50 curated roles matched to your next move.", "/home"],
    [<DescriptionIcon />, classes.iconTeal, "Track applications", "See every application and status update at a glance.", "/applications"],
    [<PersonIcon />, classes.iconBlue, "Build your profile", "Show recruiters your skills, education, and ambitions.", "/profile"],
  ];

  if (!loggedIn) {
    return <main className={classes.page}><div className={classes.wrap}><Paper className={classes.hero} elevation={0}><div className={classes.heroContent}><Typography className={classes.eyebrow}>JOB PORTAL</Typography><Typography className={classes.title}>A better way to find what is next.</Typography><Typography className={classes.copy}>Connect ambitious people with meaningful work, thoughtful teams, and opportunities built for growth.</Typography><Button className={classes.primary} onClick={() => history.push("/login")} endIcon={<ArrowForwardIcon />}>Get started</Button></div><div className={`${classes.orb} ${classes.orbLarge}`} /><div className={`${classes.orb} ${classes.orbSmall}`} /></Paper></div></main>;
  }

  return (
    <main className={classes.page}>
      <div className={classes.wrap}>
        <Paper className={classes.hero} elevation={0}>
          <div className={classes.heroContent}>
            <Typography className={classes.eyebrow}>YOUR NEXT CHAPTER</Typography>
            <Typography className={classes.title}>{recruiter ? "Build the team that builds tomorrow." : "Welcome back, future builder."}</Typography>
            <Typography className={classes.copy}>{recruiter ? "Your hiring workspace is ready. Keep great candidates moving and great work moving forward." : "Your next opportunity is closer than it looks. Explore roles, keep your profile sharp, and make your next move count."}</Typography>
            <Button className={classes.primary} onClick={() => history.push(recruiter ? "/myjobs" : "/home")} endIcon={<ArrowForwardIcon />}>{recruiter ? "Open my jobs" : "Explore jobs"}</Button>
          </div>
          <div className={`${classes.orb} ${classes.orbLarge}`} /><div className={`${classes.orb} ${classes.orbSmall}`} />
        </Paper>
        <Typography variant="h5" className={classes.sectionTitle}>{recruiter ? "Your hiring workspace" : "Your career workspace"}</Typography>
        <Grid container spacing={2}>{cards.map(([icon, iconColor, title, copy, route]) => <Grid item xs={12} sm={4} key={title}><Paper className={classes.card} elevation={0} onClick={() => history.push(route)} style={{ cursor: "pointer" }}><span className={`${classes.icon} ${iconColor}`}>{icon}</span><Typography variant="h6">{title}</Typography><Typography variant="body2" color="textSecondary">{copy}</Typography></Paper></Grid>)}</Grid>
      </div>
    </main>
  );
};

export const ErrorPage = () => {
  const classes = useStyles();
  return <main className={classes.error}><Typography variant="h3">Page not found</Typography></main>;
};

export default Welcome;
