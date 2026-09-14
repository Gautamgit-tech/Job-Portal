import React, { useContext, useState } from "react";
import {
  Grid,
  TextField,
  Button,
  Typography,
  makeStyles,
  Paper,
} from "@material-ui/core";
import axios from "axios";
import { Redirect } from "react-router-dom";

import { SetPopupContext } from "../App";
import apiList from "../lib/apiList";
import isAuth from "../lib/isAuth";
import PasswordInput from "../lib/PasswordInput";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", minHeight: "calc(100vh - 64px)", padding: theme.spacing(4), display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f7f9", boxSizing: "border-box" },
  shell: { width: "100%", maxWidth: 1080, minHeight: 610, display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", overflow: "hidden", borderRadius: 24, background: "#fff", boxShadow: "0 24px 70px rgba(16, 42, 67, .18)", [theme.breakpoints.down("sm")]: { gridTemplateColumns: "1fr", minHeight: 0 } },
  formSide: { padding: theme.spacing(6, 7), display: "flex", flexDirection: "column", justifyContent: "center", [theme.breakpoints.down("sm")]: { padding: theme.spacing(4, 3) } },
  art: { position: "relative", overflow: "hidden", padding: theme.spacing(6), color: "#fff", background: "linear-gradient(145deg, #46166b 0%, #c21783 48%, #f22b65 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", [theme.breakpoints.down("sm")]: { minHeight: 220, padding: theme.spacing(4) } },
  eyebrow: { color: "#c21783", fontWeight: 700, letterSpacing: ".12em" },
  title: { marginTop: theme.spacing(1), fontWeight: 800, color: "#102a43" },
  subtitle: { marginTop: theme.spacing(1), color: "#52606d", lineHeight: 1.6 },
  inputBox: { width: "100%" },
  submitButton: { width: "100%", minHeight: 48, borderRadius: 10, background: "#c21783", "&:hover": { background: "#a3126f" } },
  artTitle: { maxWidth: 390, fontWeight: 800, lineHeight: 1.05 },
  artCopy: { maxWidth: 360, marginTop: theme.spacing(2), lineHeight: 1.6, color: "rgba(255,255,255,.82)" },
  orb: { position: "absolute", borderRadius: "50%", border: "1px solid rgba(255,255,255,.34)", background: "rgba(255,255,255,.12)" },
  orbOne: { width: 230, height: 230, right: -50, top: 70 },
  orbTwo: { width: 120, height: 120, right: 180, bottom: 90 },
  artFooter: { position: "relative", zIndex: 1, fontSize: 13, color: "rgba(255,255,255,.75)" },
  switch: { textAlign: "center", marginTop: theme.spacing(2), color: "#52606d" },
}));

const Login = (props) => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);

  const [loggedin, setLoggedin] = useState(isAuth());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      setPopup({ open: true, severity: "error", message: "Email and password are required" });
      return;
    }
    setLoading(true);
    axios
      .post(apiList.login, { email, password })
      .then((response) => {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("type", response.data.type);
        setLoggedin(isAuth());
        setPopup({ open: true, severity: "success", message: "Logged in successfully" });
      })
      .catch((err) => {
        setPopup({ open: true, severity: "error", message: err.response?.data?.message || "Something went wrong" });
      })
      .finally(() => setLoading(false));
  };

  return loggedin ? (
    <Redirect to="/" />
  ) : (
    <main className={classes.page}>
      <Paper elevation={0} className={classes.shell}>
        <section className={classes.formSide}>
          <Typography variant="overline" className={classes.eyebrow}>JOB PORTAL / MEMBER ACCESS</Typography>
          <Typography variant="h3" component="h1" className={classes.title}>Welcome back.</Typography>
          <Typography variant="body1" className={classes.subtitle}>
            Sign in with your registered email and password.
          </Typography>

          <Grid container direction="column" spacing={3} style={{ marginTop: 18 }}>
            <Grid item>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={classes.inputBox}
                variant="outlined"
              />
            </Grid>
            <Grid item>
              <PasswordInput
                label="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={classes.inputBox}
              />
            </Grid>
            <Grid item>
              <Button variant="contained" color="primary" disabled={loading} onClick={handleLogin} className={classes.submitButton}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </Grid>
          </Grid>

          <Typography variant="body2" className={classes.switch}>
            New to Job Portal? <Button color="primary" href="/signup">Create an account</Button>
          </Typography>
        </section>
        <aside className={classes.art}>
          <div className={classes.orb + " " + classes.orbOne} />
          <div className={classes.orb + " " + classes.orbTwo} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <Typography variant="h2" className={classes.artTitle}>Your next chapter starts here.</Typography>
            <Typography variant="body1" className={classes.artCopy}>One place for ambitious students, thoughtful teams, and work that makes a difference.</Typography>
          </div>
          <Typography className={classes.artFooter}>Discover. Apply. Grow.</Typography>
        </aside>
      </Paper>
    </main>
  );
};

export default Login;