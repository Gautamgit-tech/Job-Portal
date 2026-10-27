import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
  makeStyles,
} from "@material-ui/core";
import BusinessIcon from "@material-ui/icons/Business";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import axios from "axios";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";

import { SetPopupContext } from "../../App";
import apiList, { server } from "../../lib/apiList";

const PROFILE_CHARACTER_LIMIT = 2000;

const useStyles = makeStyles((theme) => ({
  page: {
    width: "100%",
    maxWidth: 1040,
    margin: "0 auto",
    padding: theme.spacing(4, 2, 6),
  },
  hero: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2.5),
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
    color: "#fff",
    borderRadius: 18,
    background: "linear-gradient(120deg, #46166b 0%, #a8216b 100%)",
    [theme.breakpoints.down("xs")]: {
      alignItems: "flex-start",
      flexDirection: "column",
    },
  },
  avatar: {
    width: 96,
    height: 96,
    color: "#a8216b",
    background: "#fff",
    border: "3px solid rgba(255,255,255,.55)",
  },
  heroCopy: { flexGrow: 1, minWidth: 0 },
  section: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
    border: "1px solid #e6eaf0",
    borderRadius: 16,
  },
  sectionTitle: { marginBottom: theme.spacing(2), fontWeight: 700, color: "#273449" },
  uploadLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.5),
    borderRadius: 10,
    color: "#fff",
    background: "#a8216b",
    cursor: "pointer",
    fontWeight: 600,
    "&:hover": { background: "#861954" },
  },
  hiddenInput: { display: "none" },
  phone: {
    width: "100%",
    "& .form-control": {
      width: "100%",
      height: 56,
      borderRadius: 4,
      fontSize: 16,
    },
    "& .flag-dropdown": { borderRadius: "4px 0 0 4px" },
  },
  counter: { display: "flex", justifyContent: "flex-end", marginTop: theme.spacing(0.5), color: "#64748b" },
  footer: { display: "flex", justifyContent: "flex-end", gap: theme.spacing(1), marginTop: theme.spacing(2) },
  loading: { display: "flex", justifyContent: "center", padding: theme.spacing(8) },
}));

const emptyProfile = {
  name: "",
  bio: "",
  contactNumber: "",
  companyName: "",
  companyWebsite: "",
  industry: "",
  companySize: "",
  location: "",
  companyLogo: "",
  linkedInUrl: "",
};

const Profile = () => {
  const classes = useStyles();
  const setPopup = useContext(SetPopupContext);
  const [profile, setProfile] = useState(emptyProfile);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(apiList.user, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setProfile({ ...emptyProfile, ...response.data });
      setPhone(String(response.data.contactNumber || "").replace(/^\+/, ""));
    } catch (error) {
      setPopup({
        open: true,
        severity: "error",
        message: error.response?.data?.message || "Unable to load company profile",
      });
    } finally {
      setLoading(false);
    }
  }, [setPopup]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const uploadLogo = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setPopup({ open: true, severity: "error", message: "Choose a JPG or PNG image" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPopup({ open: true, severity: "error", message: "Logo image must be 5 MB or smaller" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploadingLogo(true);
    try {
      const response = await axios.post(apiList.uploadCompanyLogo, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setProfile((current) => ({ ...current, companyLogo: response.data.url }));
      setPopup({ open: true, severity: "success", message: response.data.message });
    } catch (error) {
      setPopup({
        open: true,
        severity: "error",
        message: error.response?.data?.message || "Unable to upload company logo",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await axios.put(apiList.user, {
        name: profile.name.trim(),
        contactNumber: phone ? `+${phone}` : "",
        bio: profile.bio,
        companyName: profile.companyName.trim(),
        companyWebsite: profile.companyWebsite.trim(),
        industry: profile.industry.trim(),
        companySize: profile.companySize,
        location: profile.location.trim(),
        companyLogo: profile.companyLogo,
        linkedInUrl: profile.linkedInUrl.trim(),
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setProfile((current) => ({ ...current, ...response.data.profile }));
      setPopup({ open: true, severity: "success", message: response.data.message });
    } catch (error) {
      setPopup({
        open: true,
        severity: "error",
        message: error.response?.data?.message || "Unable to save company profile",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className={classes.page}><Paper className={classes.loading} elevation={0}><CircularProgress /></Paper></main>;
  }

  return (
    <main className={classes.page}>
      <Typography variant="h4" style={{ fontWeight: 800, marginBottom: 20 }}>Company profile</Typography>
      <form onSubmit={saveProfile}>
        <Paper elevation={0} className={classes.hero}>
          <Avatar
            src={profile.companyLogo ? `${server}${profile.companyLogo}` : undefined}
            className={classes.avatar}
            alt={`${profile.companyName || "Company"} logo`}
          >
            {!profile.companyLogo && <BusinessIcon fontSize="large" />}
          </Avatar>
          <div className={classes.heroCopy}>
            <Typography variant="h5" style={{ fontWeight: 800 }}>
              {profile.companyName || "Your company"}
            </Typography>
            <Typography variant="body2" style={{ opacity: 0.88, marginTop: 4 }}>
              <Chip
                size="small"
                label={profile.industry || "Industry not set"}
                style={{ color: "#fff", background: "rgba(255,255,255,.2)" }}
              />
            </Typography>
          </div>
          <label className={classes.uploadLabel}>
            <CloudUploadIcon fontSize="small" />
            {uploadingLogo ? "Uploading..." : profile.companyLogo ? "Change logo" : "Upload logo"}
            <input
              className={classes.hiddenInput}
              type="file"
              accept="image/png,image/jpeg"
              onChange={uploadLogo}
              disabled={uploadingLogo}
            />
          </label>
        </Paper>

        <Paper elevation={0} className={classes.section}>
          <Typography variant="h6" className={classes.sectionTitle}>Professional details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField name="name" label="Your name" value={profile.name} onChange={handleChange} variant="outlined" required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <div className={classes.phone}>
                <PhoneInput
                  country="in"
                  value={phone}
                  onChange={setPhone}
                  inputProps={{ name: "contactNumber", "aria-label": "Phone number" }}
                  placeholder="Phone number"
                />
              </div>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="companyName" label="Company name" value={profile.companyName} onChange={handleChange} variant="outlined" required fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="industry" label="Industry" value={profile.industry} onChange={handleChange} variant="outlined" placeholder="Information Technology" fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="companyWebsite" label="Company website" value={profile.companyWebsite} onChange={handleChange} variant="outlined" placeholder="https://example.com" type="url" fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="location" label="Company location" value={profile.location} onChange={handleChange} variant="outlined" placeholder="City, Country" fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="companySize" label="Company size" value={profile.companySize} onChange={handleChange} variant="outlined" select fullWidth>
                <MenuItem value="">Select company size</MenuItem>
                {["1-10", "11-50", "51-200", "201-500", "500+"].map((size) => (
                  <MenuItem key={size} value={size}>{size} employees</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="linkedInUrl" label="LinkedIn URL" value={profile.linkedInUrl} onChange={handleChange} variant="outlined" placeholder="https://www.linkedin.com/company/..." type="url" fullWidth />
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} className={classes.section}>
          <Typography variant="h6" className={classes.sectionTitle}>About the company</Typography>
          <TextField
            name="bio"
            label="Company description"
            value={profile.bio}
            onChange={(event) => {
              if (event.target.value.length <= PROFILE_CHARACTER_LIMIT) handleChange(event);
            }}
            variant="outlined"
            multiline
            minRows={6}
            placeholder="Tell candidates about your mission, culture, and what makes your team a great place to work."
            fullWidth
          />
          <div className={classes.counter}>
            <Typography variant="caption">{profile.bio.length}/{PROFILE_CHARACTER_LIMIT} characters</Typography>
          </div>
        </Paper>

        <div className={classes.footer}>
          <Button variant="outlined" onClick={loadProfile} disabled={saving || uploadingLogo}>Discard changes</Button>
          <Button type="submit" variant="contained" color="primary" disabled={saving || uploadingLogo}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </main>
  );
};

export default Profile;
