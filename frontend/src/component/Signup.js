import React, { useState, useContext } from "react";
import {
  Grid,
  TextField,
  Button,
  Typography,
  makeStyles,
  Paper,
  MenuItem,
} from "@material-ui/core";
import axios from "axios";
import { Redirect } from "react-router-dom";
import ChipInput from "material-ui-chip-input";
import DescriptionIcon from "@material-ui/icons/Description";
import FaceIcon from "@material-ui/icons/Face";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";

import EmailInput from "../lib/EmailInput";
import PasswordInput from "../lib/PasswordInput";
import FileUploadInput from "../lib/FileUploadInput";
import { SetPopupContext } from "../App";

import apiList from "../lib/apiList";
import isAuth from "../lib/isAuth";

const useStyles = makeStyles((theme) => ({
  page: { width: "100%", minHeight: "calc(100vh - 64px)", padding: theme.spacing(3, 4, 4), display: "flex", alignItems: "flex-start", justifyContent: "center", background: "#f4f7f9", boxSizing: "border-box", overflowY: "auto" },
  shell: { width: "100%", maxWidth: 1180, minHeight: "calc(100vh - 112px)", display: "grid", gridTemplateColumns: "minmax(0, .95fr) minmax(0, 1.05fr)", overflow: "hidden", borderRadius: 24, background: "#fff", boxShadow: "0 24px 70px rgba(16, 42, 67, .18)", alignItems: "stretch", [theme.breakpoints.down("sm")]: { gridTemplateColumns: "1fr", minHeight: 0 } },
  formSide: { gridColumn: 2, gridRow: 1, padding: theme.spacing(4, 6), minHeight: 0, maxHeight: "calc(100vh - 112px)", overflowY: "auto", overscrollBehavior: "contain", scrollbarWidth: "thin", [theme.breakpoints.down("sm")]: { gridColumn: 1, gridRow: 2, padding: theme.spacing(3, 2), maxHeight: "none", overflowY: "visible" } },
  art: { gridColumn: 1, gridRow: 1, position: "relative", overflow: "hidden", padding: theme.spacing(6), color: "#fff", background: "linear-gradient(145deg, #46166b 0%, #c21783 48%, #f22b65 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", [theme.breakpoints.down("sm")]: { minHeight: 210, padding: theme.spacing(4), gridColumn: 1, gridRow: 1 } },
  eyebrow: { color: "#c21783", fontWeight: 700, letterSpacing: ".12em" },
  title: { marginTop: theme.spacing(1), fontWeight: 800, color: "#102a43" },
  subtitle: { marginTop: theme.spacing(1), color: "#52606d", lineHeight: 1.6 },
  inputBox: { width: "100%" },
  submitButton: { width: "100%", minHeight: 48, borderRadius: 10, background: "#c21783", "&:hover": { background: "#a3126f" } },
  resend: { textAlign: "center", marginTop: theme.spacing(1), cursor: "pointer", color: "#c21783", fontWeight: 600 },
  artTitle: { maxWidth: 390, fontWeight: 800, lineHeight: 1.05 },
  artCopy: { maxWidth: 350, marginTop: theme.spacing(2), lineHeight: 1.6, color: "rgba(255,255,255,.82)" },
  orb: { position: "absolute", borderRadius: "50%", border: "1px solid rgba(255,255,255,.34)", background: "rgba(255,255,255,.12)" },
  orbOne: { width: 230, height: 230, right: -50, top: 70 },
  orbTwo: { width: 120, height: 120, right: 180, bottom: 90 },
  artFooter: { position: "relative", zIndex: 1, fontSize: 13, color: "rgba(255,255,255,.75)" },
  switch: { textAlign: "center", marginTop: theme.spacing(1), color: "#52606d" },
}));

const MultifieldInput = (props) => {
  const classes = useStyles();
  const { education, setEducation } = props;

  return (
    <>
      {education.map((obj, key) => (
        <Grid item container className={classes.inputBox} key={key} style={{ paddingLeft: 0, paddingRight: 0 }}>
          <Grid item xs={6}>
            <TextField
              label={`Institution Name #${key + 1}`}
              value={education[key].institutionName}
              onChange={(event) => {
                const newEdu = [...education];
                newEdu[key].institutionName = event.target.value;
                setEducation(newEdu);
              }}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Start Year"
              value={obj.startYear}
              variant="outlined"
              type="number"
              onChange={(event) => {
                const newEdu = [...education];
                newEdu[key].startYear = event.target.value;
                setEducation(newEdu);
              }}
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="End Year"
              value={obj.endYear}
              variant="outlined"
              type="number"
              onChange={(event) => {
                const newEdu = [...education];
                newEdu[key].endYear = event.target.value;
                setEducation(newEdu);
              }}
            />
          </Grid>
        </Grid>
      ))}
      <Grid item>
        <Button
          variant="contained"
          color="secondary"
          onClick={() =>
            setEducation([...education, { institutionName: "", startYear: "", endYear: "" }])
          }
          className={classes.inputBox}
        >
          Add another institution details
        </Button>
      </Grid>
    </>
  );
};

const Signup = (props) => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);

  const [loggedin, setLoggedin] = useState(isAuth());
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const [signupDetails, setSignupDetails] = useState({
    type: "applicant",
    email: "",
    password: "",
    name: "",
    education: [],
    skills: [],
    resume: "",
    profile: "",
    bio: "",
  });

  const [phone, setPhone] = useState("");

  const [education, setEducation] = useState([
    { institutionName: "", startYear: "", endYear: "" },
  ]);

  const [inputErrorHandler, setInputErrorHandler] = useState({
    email: { untouched: true, required: true, error: false, message: "" },
    name: { untouched: true, required: true, error: false, message: "" },
    password: { untouched: true, required: true, error: false, message: "" },
  });

  const handleInput = (key, value) => {
    setSignupDetails({ ...signupDetails, [key]: value });
  };

  const handleInputError = (key, status, message) => {
    setInputErrorHandler({
      ...inputErrorHandler,
      [key]: { required: true, untouched: false, error: status, message: message },
    });
  };

  const handleSendOtp = () => {
    const tmpErrorHandler = {};
    Object.keys(inputErrorHandler).forEach((obj) => {
      if (inputErrorHandler[obj].required && inputErrorHandler[obj].untouched) {
        tmpErrorHandler[obj] = {
          required: true,
          untouched: false,
          error: true,
          message: `${obj[0].toUpperCase() + obj.substr(1)} is required`,
        };
      } else {
        tmpErrorHandler[obj] = inputErrorHandler[obj];
      }
    });

    if (phone.length < 10) {
      setPopup({ open: true, severity: "error", message: "Enter a valid mobile number" });
      return;
    }

    if (signupDetails.password.length < 6) {
      handleInputError("password", true, "Password must be at least 6 characters");
      setPopup({ open: true, severity: "error", message: "Password must be at least 6 characters" });
      return;
    }

    const updatedDetails = {
      ...signupDetails,
      education: education
        .filter((obj) => obj.institutionName.trim() !== "")
        .map((obj) => {
          if (obj["endYear"] === "") delete obj["endYear"];
          return obj;
        }),
    };
    setSignupDetails(updatedDetails);

    const verified = !Object.keys(tmpErrorHandler).some((obj) => tmpErrorHandler[obj].error);

    if (!verified) {
      setInputErrorHandler(tmpErrorHandler);
      setPopup({ open: true, severity: "error", message: "Incorrect Input" });
      return;
    }

    setLoading(true);
    axios
      .post(apiList.sendSignupOtp, { email: updatedDetails.email, phone: `+${phone}` })
      .then(() => {
        setStep("otp");
        setPopup({ open: true, severity: "success", message: "OTP sent to your email" });
      })
      .catch((err) => {
        setPopup({ open: true, severity: "error", message: err.response?.data?.message || "Something went wrong" });
      })
      .finally(() => setLoading(false));
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setPopup({ open: true, severity: "error", message: "Enter the 6-digit OTP" });
      return;
    }
    setLoading(true);
    const finalPayload = { ...signupDetails, phone: `+${phone}`, otp };
    axios
      .post(apiList.signup, finalPayload)
      .then((response) => {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("type", response.data.type);
        setLoggedin(isAuth());
        setPopup({ open: true, severity: "success", message: "Account created successfully" });
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
          <Typography variant="overline" className={classes.eyebrow}>JOB PORTAL / JOIN THE NETWORK</Typography>
          <Typography variant="h3" component="h1" className={classes.title}>Create your space.</Typography>
          <Typography variant="body1" className={classes.subtitle}>
            {step === "form" ? "Build a profile that helps the right opportunities find you." : "Enter the 6-digit code sent to your email to finish creating your account."}
          </Typography>

          {step === "form" ? (
            <Grid container direction="column" spacing={3} style={{ marginTop: 16 }}>
              <Grid item>
                <TextField
                  select
                  label="Category"
                  variant="outlined"
                  className={classes.inputBox}
                  value={signupDetails.type}
                  onChange={(event) => handleInput("type", event.target.value)}
                >
                  <MenuItem value="applicant">Applicant</MenuItem>
                  <MenuItem value="recruiter">Recruiter</MenuItem>
                </TextField>
              </Grid>
              <Grid item>
                <TextField
                  label="Name"
                  value={signupDetails.name}
                  onChange={(event) => handleInput("name", event.target.value)}
                  className={classes.inputBox}
                  error={inputErrorHandler.name.error}
                  helperText={inputErrorHandler.name.message}
                  onBlur={(event) => {
                    if (event.target.value === "") handleInputError("name", true, "Name is required");
                    else handleInputError("name", false, "");
                  }}
                  variant="outlined"
                />
              </Grid>
              <Grid item>
                <EmailInput
                  label="Email"
                  value={signupDetails.email}
                  onChange={(event) => handleInput("email", event.target.value)}
                  inputErrorHandler={inputErrorHandler}
                  handleInputError={handleInputError}
                  className={classes.inputBox}
                  required={true}
                />
              </Grid>
              <Grid item>
                <PasswordInput
                  label="Password"
                  value={signupDetails.password}
                  onChange={(event) => handleInput("password", event.target.value)}
                  error={inputErrorHandler.password.error}
                  helperText={inputErrorHandler.password.message || "At least 6 characters"}
                  className={classes.inputBox}
                  onBlur={(event) => {
                    if (event.target.value.length < 6) handleInputError("password", true, "Password must be at least 6 characters");
                    else handleInputError("password", false, "");
                  }}
                />
              </Grid>
              <Grid item>
                <Typography variant="caption" style={{ color: "#52606d", marginBottom: 4, display: "block" }}>
                  Mobile Number
                </Typography>
                <PhoneInput
                  country={"in"}
                  value={phone}
                  onChange={(value) => setPhone(value)}
                  inputStyle={{ width: "100%", height: 56 }}
                  containerClass={classes.inputBox}
                />
              </Grid>

              {signupDetails.type === "applicant" ? (
                <>
                  <MultifieldInput education={education} setEducation={setEducation} />
                  <Grid item>
                    <ChipInput
                      className={classes.inputBox}
                      label="Skills"
                      variant="outlined"
                      helperText="Press enter to add skills"
                      onChange={(chips) => setSignupDetails({ ...signupDetails, skills: chips })}
                    />
                  </Grid>
                  <Grid item>
                    <FileUploadInput
                      className={classes.inputBox}
                      label="Resume (.pdf)"
                      icon={<DescriptionIcon />}
                      uploadTo={apiList.uploadResume}
                      handleInput={handleInput}
                      identifier={"resume"}
                    />
                  </Grid>
                  <Grid item>
                    <FileUploadInput
                      className={classes.inputBox}
                      label="Profile Photo (.jpg/.png)"
                      icon={<FaceIcon />}
                      uploadTo={apiList.uploadProfileImage}
                      handleInput={handleInput}
                      identifier={"profile"}
                    />
                  </Grid>
                </>
              ) : (
                <Grid item style={{ width: "100%" }}>
                  <TextField
                    label="Bio (upto 250 words)"
                    multiline
                    rows={8}
                    style={{ width: "100%" }}
                    variant="outlined"
                    value={signupDetails.bio}
                    onChange={(event) => {
                      if (event.target.value.split(" ").filter((n) => n !== "").length <= 250) {
                        handleInput("bio", event.target.value);
                      }
                    }}
                  />
                </Grid>
              )}

              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  onClick={handleSendOtp}
                  className={classes.submitButton}
                >
                  {loading ? "Sending OTP..." : "Send OTP & Continue"}
                </Button>
              </Grid>
            </Grid>
          ) : (
            <Grid container direction="column" spacing={3} style={{ marginTop: 16 }}>
              <Grid item>
                <TextField
                  label="Enter OTP"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={classes.inputBox}
                  variant="outlined"
                  inputProps={{ maxLength: 6, style: { letterSpacing: 8, fontSize: 20, textAlign: "center" } }}
                />
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  onClick={handleVerifyOtp}
                  className={classes.submitButton}
                >
                  {loading ? "Verifying..." : "Verify & Create Account"}
                </Button>
              </Grid>
              <Grid item>
                <Typography
                  variant="body2"
                  className={classes.resend}
                  onClick={() => {
                    setStep("form");
                    setOtp("");
                  }}
                >
                  Edit details / Resend OTP
                </Typography>
              </Grid>
            </Grid>
          )}

          <Typography variant="body2" className={classes.switch}>
            Already have an account? <Button color="primary" href="/login">Sign in</Button>
          </Typography>
        </section>
        <aside className={classes.art}>
          <div className={classes.orb + " " + classes.orbOne} />
          <div className={classes.orb + " " + classes.orbTwo} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <Typography variant="h2" className={classes.artTitle}>Make your work visible.</Typography>
            <Typography variant="body1" className={classes.artCopy}>Students find their first big opportunity here. Recruiters find the people who will shape what comes next.</Typography>
          </div>
          <Typography className={classes.artFooter}>A better beginning, one profile at a time.</Typography>
        </aside>
      </Paper>
    </main>
  );
};

export default Signup;