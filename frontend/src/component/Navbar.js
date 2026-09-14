import React, { useState } from "react";
import { AppBar, Avatar, Button, Drawer, Hidden, IconButton, List, ListItem, ListItemText, makeStyles, Toolbar, Typography } from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import WorkOutlineIcon from "@material-ui/icons/WorkOutline";
import { useHistory, useLocation } from "react-router-dom";

import isAuth, { userType } from "../lib/isAuth";

const useStyles = makeStyles((theme) => ({
  toolbar: { maxWidth: 1180, width: "100%", margin: "0 auto", padding: theme.spacing(0, 2) },
  brand: { display: "flex", alignItems: "center", gap: theme.spacing(1), flexGrow: 1, cursor: "pointer" },
  brandMark: { width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" },
  title: { fontWeight: 800, letterSpacing: "0.01em" },
  navButton: { marginLeft: theme.spacing(0.5), opacity: 0.85, "&:hover": { opacity: 1 } },
  navButtonActive: { marginLeft: theme.spacing(0.5), opacity: 1, borderBottom: "2px solid #fff", borderRadius: 0 },
  drawer: { width: 260 },
  drawerHeader: { padding: theme.spacing(3, 2), background: "linear-gradient(120deg, #46166b 0%, #c21783 100%)", color: "#fff" },
}));

const linksForUser = () => {
  if (!isAuth()) return [["Login", "/login"], ["Signup", "/signup"]];
  if (userType() === "recruiter") return [["Home", "/home"], ["Add jobs", "/addjob"], ["My jobs", "/myjobs"], ["Employees", "/employees"], ["Profile", "/profile"], ["Logout", "/logout"]];
  return [["Home", "/home"], ["Dashboard", "/profile"], ["Applications", "/applications"], ["Saved jobs", "/saved-jobs"], ["Logout", "/logout"]];
};

const Navbar = () => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const links = linksForUser();
  const navigate = (loc) => { setOpen(false); history.push(loc); };

  return (
    <AppBar position="fixed" elevation={0}>
      <Toolbar className={classes.toolbar}>
        <div className={classes.brand} onClick={() => navigate(isAuth() ? "/home" : "/")}>
          <div className={classes.brandMark}><WorkOutlineIcon fontSize="small" /></div>
          <Typography variant="h6" className={classes.title}>Job Portal</Typography>
        </div>
        <Hidden xsDown>
          {links.map(([label, loc]) => (
            <Button key={loc} color="inherit" className={location.pathname === loc ? classes.navButtonActive : classes.navButton} onClick={() => navigate(loc)}>
              {label}
            </Button>
          ))}
        </Hidden>
        <Hidden smUp>
          <IconButton color="inherit" aria-label="Open navigation" onClick={() => setOpen(true)}><MenuIcon /></IconButton>
        </Hidden>
      </Toolbar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <div className={classes.drawerHeader}>
          <Avatar style={{ background: "rgba(255,255,255,.25)" }}><WorkOutlineIcon /></Avatar>
          <Typography variant="subtitle1" style={{ marginTop: 8, fontWeight: 700 }}>Job Portal</Typography>
        </div>
        <List className={classes.drawer}>
          {links.map(([label, loc]) => (
            <ListItem button key={loc} selected={location.pathname === loc} onClick={() => navigate(loc)}>
              <ListItemText primary={label} />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </AppBar>
  );
};

export default Navbar;