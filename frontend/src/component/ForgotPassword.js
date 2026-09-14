import React, { useState } from "react";
import { Button, CircularProgress, Paper, TextField, Typography, makeStyles } from "@material-ui/core";
import axios from "axios";

import apiList from "../lib/apiList";

const useStyles = makeStyles((theme) => ({
  page: { minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: theme.spacing(3), boxSizing: "border-box", background: "#f4f7f9" },
  card: { width: "100%", maxWidth: 480, padding: theme.spacing(5), borderRadius: 20 },
  field: { marginTop: theme.spacing(2) },
  button: { marginTop: theme.spacing(3), width: "100%", minHeight: 48 },
}));

const ForgotPassword = () => {
  const classes = useStyles();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const requestReset = () => {
    setLoading(true);
    axios.post(apiList.requestPasswordReset, { email }).then((response) => { setRequested(true); setMessage(response.data.message); }).catch(() => setMessage("If an account exists, password reset instructions have been sent.")).finally(() => setLoading(false));
  };

  const resetPassword = () => {
    setLoading(true);
    axios.post(apiList.resetPassword, { token, password }).then((response) => { setMessage(`${response.data.message} You can now sign in.`); setRequested(false); setToken(""); setPassword(""); }).catch((error) => setMessage(error.response?.data?.message || "Unable to reset password")).finally(() => setLoading(false));
  };

  return <main className={classes.page}><Paper className={classes.card} elevation={2}><Typography variant="overline" color="primary">JOB PORTAL / ACCOUNT RECOVERY</Typography><Typography variant="h4" style={{ marginTop: 8 }}>Reset your password</Typography><Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>{message || "Enter your email and we will send secure reset instructions."}</Typography><TextField className={classes.field} fullWidth label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" variant="outlined" />{requested && <><TextField className={classes.field} fullWidth label="Reset token" value={token} onChange={(event) => setToken(event.target.value)} variant="outlined" /><TextField className={classes.field} fullWidth label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" variant="outlined" /></>}<Button className={classes.button} variant="contained" color="primary" disabled={loading} onClick={requested ? resetPassword : requestReset}>{loading ? <CircularProgress size={20} color="inherit" /> : requested ? "Update password" : "Send reset instructions"}</Button><Button href="/login" style={{ marginTop: 12, width: "100%" }}>Back to sign in</Button></Paper></main>;
};

export default ForgotPassword;
