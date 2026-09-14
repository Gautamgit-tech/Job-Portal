import React, { createContext, useState } from "react";
import { BrowserRouter, Switch, Route, Redirect, useLocation } from "react-router-dom";
import { Grid, makeStyles, ThemeProvider, CssBaseline } from "@material-ui/core";

import theme from "./theme";
import Welcome, { ErrorPage } from "./component/Welcome";
import Navbar from "./component/Navbar";
import Login from "./component/Login";
import Logout from "./component/Logout";
import Signup from "./component/Signup";
import ForgotPassword from "./component/ForgotPassword";
import Home from "./component/Home";
import Applications from "./component/Applications";
import SavedJobs from "./component/SavedJobs";
import ApplicantDashboard from "./component/ApplicantDashboard";
import CreateJobs from "./component/recruiter/CreateJobs";
import MyJobs from "./component/recruiter/MyJobs";
import JobApplications from "./component/recruiter/JobApplications";
import AcceptedApplicants from "./component/recruiter/AcceptedApplicants";
import RecruiterProfile from "./component/recruiter/Profile";
import MessagePopup from "./lib/MessagePopup";
import isAuth, { userType } from "./lib/isAuth";

const RoleRoute = ({ roles, children, ...props }) => (
  <Route {...props} render={() => isAuth() && (!roles || roles.includes(userType())) ? children : <Redirect to={isAuth() ? "/home" : "/login"} />} />
);

const useStyles = makeStyles((theme) => ({
  body: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    minHeight: "calc(100vh - 64px)",
    paddingTop: "64px",
    boxSizing: "border-box",
    width: "100%",
    background: "#f4f7f9",
  },
  authBody: {
    minHeight: "100vh",
    paddingTop: 0,
  },
}));

export const SetPopupContext = createContext();

function AppContent() {
  const classes = useStyles();
  const [popup, setPopup] = useState({ open: false, severity: "", message: "" });
  const location = useLocation();
  const authPage = ["/login", "/signup", "/forgot-password"].includes(location.pathname);

  return (
      <>
        <SetPopupContext.Provider value={setPopup}>
          <Grid container direction="column">
            {!authPage && <Grid item xs><Navbar /></Grid>}
            <Grid item className={authPage ? classes.authBody : classes.body}>
              <Switch>
                <Route exact path="/"><Welcome /></Route>
                <Route exact path="/login"><Login /></Route>
                <Route exact path="/signup"><Signup /></Route>
                <Route exact path="/forgot-password"><ForgotPassword /></Route>
                <Route exact path="/logout"><Logout /></Route>
                <RoleRoute exact path="/home"><Home /></RoleRoute>
                <RoleRoute exact path="/applications" roles={["applicant"]}><Applications /></RoleRoute>
                <RoleRoute exact path="/saved-jobs" roles={["applicant"]}><SavedJobs /></RoleRoute>
                <Route exact path="/profile" render={() => !isAuth() ? <Redirect to="/login" /> : userType() === "recruiter" ? <RecruiterProfile /> : <ApplicantDashboard />} />
                <RoleRoute exact path="/addjob" roles={["recruiter"]}><CreateJobs /></RoleRoute>
                <RoleRoute exact path="/myjobs" roles={["recruiter"]}><MyJobs /></RoleRoute>
                <RoleRoute exact path="/job/applications/:jobId" roles={["recruiter"]}><JobApplications /></RoleRoute>
                <RoleRoute exact path="/employees" roles={["recruiter"]}><AcceptedApplicants /></RoleRoute>
                <Route><ErrorPage /></Route>
              </Switch>
            </Grid>
          </Grid>
          <MessagePopup
            open={popup.open}
            setOpen={(status) => setPopup({ ...popup, open: status })}
            severity={popup.severity}
            message={popup.message}
          />
        </SetPopupContext.Provider>
      </>
  );
}

function App() {
  return <ThemeProvider theme={theme}><CssBaseline /><BrowserRouter><AppContent /></BrowserRouter></ThemeProvider>;
}

export default App;