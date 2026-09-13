import React, { useState } from "react";
import { AppBar, Button, Drawer, Hidden, IconButton, List, ListItem, ListItemText, makeStyles, Toolbar, Typography } from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import { useHistory } from "react-router-dom";

import isAuth, { userType } from "../lib/isAuth";

const useStyles = makeStyles((theme) => ({
  title: { flexGrow: 1, fontWeight: 700, letterSpacing: "0.02em" },
  navButton: { marginLeft: theme.spacing(0.5) },
  drawer: { width: 250 },
}));

const linksForUser = () => {
  if (!isAuth()) return [["Login", "/login"], ["Signup", "/signup"]];
  if (userType() === "recruiter") return [["Home", "/home"], ["Add jobs", "/addjob"], ["My jobs", "/myjobs"], ["Employees", "/employees"], ["Profile", "/profile"], ["Logout", "/logout"]];
  return [["Home", "/home"], ["Dashboard", "/profile"], ["Applications", "/applications"], ["Logout", "/logout"]];
};

const Navbar = () => {
  const classes = useStyles();
  const history = useHistory();
  const [open, setOpen] = useState(false);
  const links = linksForUser();
  const navigate = (location) => { setOpen(false); history.push(location); };

  return (
    <AppBar position="fixed">
      <Toolbar>
        <Typography variant="h6" className={classes.title}>Job Portal</Typography>
        <Hidden xsDown>
          {links.map(([label, location]) => <Button className={classes.navButton} color="inherit" key={location} onClick={() => navigate(location)}>{label}</Button>)}
        </Hidden>
        <Hidden smUp>
          <IconButton color="inherit" aria-label="Open navigation" onClick={() => setOpen(true)}><MenuIcon /></IconButton>
        </Hidden>
      </Toolbar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <List className={classes.drawer}>
          {links.map(([label, location]) => <ListItem button key={location} onClick={() => navigate(location)}><ListItemText primary={label} /></ListItem>)}
        </List>
      </Drawer>
    </AppBar>
  );
};

export default Navbar;
