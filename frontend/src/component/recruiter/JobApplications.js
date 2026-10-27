import React, { useState, useEffect, useContext } from "react";
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  makeStyles,
  Paper,
  TextField,
  Typography,
  Modal,
  FormControlLabel,
  MenuItem,
  Checkbox,
  Avatar,
} from "@material-ui/core";
import { useParams } from "react-router-dom";
import Rating from "@material-ui/lab/Rating";
import axios from "axios";
import FilterListIcon from "@material-ui/icons/FilterList";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
import ArrowDownwardIcon from "@material-ui/icons/ArrowDownward";

import { SetPopupContext } from "../../App";

import apiList, { server } from "../../lib/apiList";
import { openResume } from "../../lib/resumeAccess";
import { analyzeApplicantResume, updateApplicantStage } from "../../lib/recruiterApi";
import {
  DEFAULT_HIRING_STAGES,
} from "../../lib/hiringStages";

const useStyles = makeStyles((theme) => ({
  body: {
    height: "inherit",
  },
  statusBlock: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textTransform: "uppercase",
  },
  jobTileOuter: {
    padding: "30px",
    margin: "20px 0",
    boxSizing: "border-box",
    width: "100%",
  },
  popupDialog: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: theme.spacing(17),
    height: theme.spacing(17),
  },
  candidateCard: {
    borderRadius: 16,
    border: "1px solid #e6edf3",
    boxShadow: "0 5px 18px rgba(16, 42, 67, .06)",
    transition: "box-shadow 180ms ease, transform 180ms ease",
    "&:hover": { boxShadow: "0 10px 24px rgba(16, 42, 67, .1)", transform: "translateY(-1px)" },
  },
  stageDialog: { borderRadius: 18 },
  dialogBackdrop: { backdropFilter: "blur(4px)", backgroundColor: "rgba(15, 23, 42, .48)" },
  stageDetails: {
    marginTop: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    borderRadius: 10,
    background: "#f8fafc",
  },
}));

const stageColors = {
  Applied: { background: "#eff6ff", color: "#2563eb" },
  Shortlisted: { background: "#ecfeff", color: "#0e7490" },
  "PPT Discussion": { background: "#f0fdf4", color: "#15803d" },
  Assessment: { background: "#f5f3ff", color: "#7c3aed" },
  PI: { background: "#fff7ed", color: "#c2410c" },
  PI2: { background: "#fefce8", color: "#a16207" },
  "HR Interview": { background: "#eef2ff", color: "#4338ca" },
  Hired: { background: "#ecfdf5", color: "#059669" },
  Rejected: { background: "#fff1f2", color: "#e11d48" },
};

const legacyHiringStage = {
  under_review: "Applied",
  shortlisted: "Shortlisted",
  assessment: "Assessment",
  interview: "PI",
  offer: "HR Interview",
  hired: "Hired",
  accepted: "Hired",
  rejected: "Rejected",
};

const localDateTimeValue = (date) => {
  const parsed = date ? new Date(date) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const FilterPopup = (props) => {
  const classes = useStyles();
  const { open, handleClose, searchOptions, setSearchOptions, getData } = props;
  return (
    <Modal open={open} onClose={handleClose} className={classes.popupDialog}>
      <Paper
        style={{
          padding: "50px",
          outline: "none",
          minWidth: "50%",
        }}
      >
        <Grid container direction="column" alignItems="center" spacing={3}>
          <Grid container item alignItems="center">
            <Grid item xs={3}>
              Application Status
            </Grid>
            <Grid
              container
              item
              xs={9}
              justify="space-around"
              // alignItems="center"
            >
              <Grid item>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="rejected"
                      checked={searchOptions.status.rejected}
                      onChange={(event) => {
                        setSearchOptions({
                          ...searchOptions,
                          status: {
                            ...searchOptions.status,
                            [event.target.name]: event.target.checked,
                          },
                        });
                      }}
                    />
                  }
                  label="Rejected"
                />
              </Grid>
              <Grid item>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="applied"
                      checked={searchOptions.status.applied}
                      onChange={(event) => {
                        setSearchOptions({
                          ...searchOptions,
                          status: {
                            ...searchOptions.status,
                            [event.target.name]: event.target.checked,
                          },
                        });
                      }}
                    />
                  }
                  label="Applied"
                />
              </Grid>
              <Grid item>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="shortlisted"
                      checked={searchOptions.status.shortlisted}
                      onChange={(event) => {
                        setSearchOptions({
                          ...searchOptions,
                          status: {
                            ...searchOptions.status,
                            [event.target.name]: event.target.checked,
                          },
                        });
                      }}
                    />
                  }
                  label="Shortlisted"
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid container item alignItems="center">
            <Grid item xs={3}>
              Sort
            </Grid>
            <Grid item container direction="row" xs={9}>
              <Grid
                item
                container
                xs={4}
                justify="space-around"
                alignItems="center"
                style={{ border: "1px solid #D1D1D1", borderRadius: "5px" }}
              >
                <Grid item>
                  <Checkbox
                    name="name"
                    checked={searchOptions.sort["jobApplicant.name"].status}
                    onChange={(event) =>
                      setSearchOptions({
                        ...searchOptions,
                        sort: {
                          ...searchOptions.sort,
                          "jobApplicant.name": {
                            ...searchOptions.sort["jobApplicant.name"],
                            status: event.target.checked,
                          },
                        },
                      })
                    }
                    id="name"
                  />
                </Grid>
                <Grid item>
                  <label for="name">
                    <Typography>Name</Typography>
                  </label>
                </Grid>
                <Grid item>
                  <IconButton
                    disabled={!searchOptions.sort["jobApplicant.name"].status}
                    onClick={() => {
                      setSearchOptions({
                        ...searchOptions,
                        sort: {
                          ...searchOptions.sort,
                          "jobApplicant.name": {
                            ...searchOptions.sort["jobApplicant.name"],
                            desc: !searchOptions.sort["jobApplicant.name"].desc,
                          },
                        },
                      });
                    }}
                  >
                    {searchOptions.sort["jobApplicant.name"].desc ? (
                      <ArrowDownwardIcon />
                    ) : (
                      <ArrowUpwardIcon />
                    )}
                  </IconButton>
                </Grid>
              </Grid>
              <Grid
                item
                container
                xs={4}
                justify="space-around"
                alignItems="center"
                style={{ border: "1px solid #D1D1D1", borderRadius: "5px" }}
              >
                <Grid item>
                  <Checkbox
                    name="dateOfApplication"
                    checked={searchOptions.sort.dateOfApplication.status}
                    onChange={(event) =>
                      setSearchOptions({
                        ...searchOptions,
                        sort: {
                          ...searchOptions.sort,
                          dateOfApplication: {
                            ...searchOptions.sort.dateOfApplication,
                            status: event.target.checked,
                          },
                        },
                      })
                    }
                    id="dateOfApplication"
                  />
                </Grid>
                <Grid item>
                  <label for="dateOfApplication">
                    <Typography>Date of Application</Typography>
                  </label>
                </Grid>
                <Grid item>
                  <IconButton
                    disabled={!searchOptions.sort.dateOfApplication.status}
                    onClick={() => {
                      setSearchOptions({
                        ...searchOptions,
                        sort: {
                          ...searchOptions.sort,
                          dateOfApplication: {
                            ...searchOptions.sort.dateOfApplication,
                            desc: !searchOptions.sort.dateOfApplication.desc,
                          },
                        },
                      });
                    }}
                  >
                    {searchOptions.sort.dateOfApplication.desc ? (
                      <ArrowDownwardIcon />
                    ) : (
                      <ArrowUpwardIcon />
                    )}
                  </IconButton>
                </Grid>
              </Grid>
              <Grid
                item
                container
                xs={4}
                justify="space-around"
                alignItems="center"
                style={{ border: "1px solid #D1D1D1", borderRadius: "5px" }}
              >
                <Grid item>
                  <Checkbox
                    name="rating"
                    checked={searchOptions.sort["jobApplicant.rating"].status}
                    onChange={(event) =>
                      setSearchOptions({
                        ...searchOptions,
                        sort: {
                          ...searchOptions.sort,
                          "jobApplicant.rating": {
                            ...searchOptions.sort[["jobApplicant.rating"]],
                            status: event.target.checked,
                          },
                        },
                      })
                    }
                    id="rating"
                  />
                </Grid>
                <Grid item>
                  <label for="rating">
                    <Typography>Rating</Typography>
                  </label>
                </Grid>
                <Grid item>
                  <IconButton
                    disabled={!searchOptions.sort["jobApplicant.rating"].status}
                    onClick={() => {
                      setSearchOptions({
                        ...searchOptions,
                        sort: {
                          ...searchOptions.sort,
                          "jobApplicant.rating": {
                            ...searchOptions.sort["jobApplicant.rating"],
                            desc: !searchOptions.sort["jobApplicant.rating"]
                              .desc,
                          },
                        },
                      });
                    }}
                  >
                    {searchOptions.sort["jobApplicant.rating"].desc ? (
                      <ArrowDownwardIcon />
                    ) : (
                      <ArrowUpwardIcon />
                    )}
                  </IconButton>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Grid item>
            <Button
              variant="contained"
              color="primary"
              style={{ padding: "10px 50px" }}
              onClick={() => getData()}
            >
              Apply
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Modal>
  );
};

const ApplicationTile = (props) => {
  const classes = useStyles();
  const { application, getData } = props;
  const setPopup = useContext(SetPopupContext);
  const [stageDialog, setStageDialog] = useState("");
  const [dialogStage, setDialogStage] = useState("");
  const [selectedStage, setSelectedStage] = useState("Applied");
  const [stageSaving, setStageSaving] = useState(false);
  const [matchingResume, setMatchingResume] = useState(false);
  const [aiMatch, setAiMatch] = useState(application.aiMatch || null);
  const [assessmentDraft, setAssessmentDraft] = useState({
    link: application.assessmentDetails?.link || "",
    deadline: localDateTimeValue(application.assessmentDetails?.deadline),
  });
  const [interviewDraft, setInterviewDraft] = useState({
    roundName: "",
    date: localDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    interviewType: "Online",
    meetingLink: "",
    interviewer: "",
  });

  const appliedOn = new Date(application.dateOfApplication);
  const storedStage = application.hiringStage || legacyHiringStage[application.status] || "Applied";
  const normalizedStoredStage = storedStage === "Selected" ? "Hired" : storedStage;
  const stage = DEFAULT_HIRING_STAGES.includes(normalizedStoredStage) ? normalizedStoredStage : "Applied";
  const canChangeStage = !["cancelled", "withdrawn", "deleted"].includes(application.status);

  const getResume = () => {
    if (
      application.jobApplicant.resume &&
      application.jobApplicant.resume !== ""
    ) {
      openResume(application.jobApplicant.resume)
        .catch((error) => {
          console.log(error);
          setPopup({
            open: true,
            severity: "error",
            message: "Error",
          });
        });
    } else {
      setPopup({
        open: true,
        severity: "error",
        message: "No resume found",
      });
    }
  };

  const analyzeResume = async () => {
    setMatchingResume(true);
    try {
      const response = await analyzeApplicantResume(application._id);
      setAiMatch(response.aiMatch);
      setPopup({ open: true, severity: "success", message: response.message });
    } catch (error) {
      setPopup({
        open: true,
        severity: "error",
        message: error.response?.data?.message || "Unable to analyze this resume",
      });
    } finally {
      setMatchingResume(false);
    }
  };

  const handleStageSelect = async (nextStage) => {
    if (nextStage.toLowerCase().includes("assessment") && !application.assessmentDetails?.link) {
      setAssessmentDraft({
        link: application.assessmentDetails?.link || "",
        deadline: localDateTimeValue(application.assessmentDetails?.deadline),
      });
      setDialogStage(nextStage);
      setStageDialog("assessment");
      return;
    }
    if (["PI", "PI2", "HR Interview"].includes(nextStage)) {
      setInterviewDraft({
        roundName: nextStage,
        date: localDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        interviewType: "Online",
        meetingLink: "",
        interviewer: "",
      });
      setDialogStage(nextStage);
      setStageDialog("interview");
      return;
    }

    await submitStage({ stage: nextStage });
  };

  const openPipelineDialog = () => {
    setSelectedStage(stage);
    setStageDialog("pipeline");
  };

  const confirmStageChange = () => {
    if (selectedStage === stage) return;
    handleStageSelect(selectedStage);
  };

  const submitStage = async (payload) => {
    setStageSaving(true);
    try {
      const response = await updateApplicantStage(application._id, payload);
      setPopup({ open: true, severity: "success", message: response.message });
      setStageDialog("");
      getData();
    } catch (error) {
      setPopup({
        open: true,
        severity: "error",
        message: error.response?.data?.message || "Unable to update candidate stage",
      });
    } finally {
      setStageSaving(false);
    }
  };

  const saveAssessment = (event) => {
    event.preventDefault();
    const deadline = new Date(assessmentDraft.deadline);
    if (Number.isNaN(deadline.getTime())) {
      setPopup({ open: true, severity: "error", message: "Choose a valid assessment deadline" });
      return;
    }
    submitStage({
      stage: dialogStage || stage,
      assessmentDetails: { ...assessmentDraft, deadline: deadline.toISOString() },
    });
  };

  const saveInterview = (event) => {
    event.preventDefault();
    const date = new Date(interviewDraft.date);
    if (Number.isNaN(date.getTime())) {
      setPopup({ open: true, severity: "error", message: "Choose a valid interview date and time" });
      return;
    }
    submitStage({
      stage: dialogStage || stage,
      interviewRound: { ...interviewDraft, date: date.toISOString() },
    });
  };

  return (
    <>
    <Paper className={`${classes.jobTileOuter} ${classes.candidateCard}`} elevation={0}>
      <Grid container>
        <Grid
          item
          xs={12}
          sm={2}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Avatar
            src={`${server}${application.jobApplicant.profile}`}
            className={classes.avatar}
          />
        </Grid>
        <Grid container item xs={12} sm={7} spacing={1} direction="column">
          <Grid item>
            <Typography variant="h5">
              {application.jobApplicant.name}
              <Chip
                size="small"
                label={stage}
                style={{
                  marginLeft: 10,
                  verticalAlign: "middle",
                  background: (stageColors[stage] || { background: "#f1f5f9" }).background,
                  color: (stageColors[stage] || { color: "#475569" }).color,
                  fontWeight: 700,
                }}
              />
            </Typography>
          </Grid>
          <Grid item>
            <Rating
              value={
                application.jobApplicant.rating !== -1
                  ? application.jobApplicant.rating
                  : null
              }
              readOnly
            />
          </Grid>
          <Grid item>Applied On: {appliedOn.toLocaleDateString()}</Grid>
          <Grid item>
            Education:{" "}
            {application.jobApplicant.education
              .map((edu) => {
                return `${edu.institutionName} (${edu.startYear}-${
                  edu.endYear ? edu.endYear : "Ongoing"
                })`;
              })
              .join(", ")}
          </Grid>
          <Grid item>
            SOP: {application.sop !== "" ? application.sop : "Not Submitted"}
          </Grid>
          <Grid item>
            {application.jobApplicant.skills.map((skill) => (
              <Chip label={skill} style={{ marginRight: "2px" }} />
            ))}
          </Grid>
        </Grid>
        <Grid item container direction="column" xs={12} sm={3}>
          <Grid item>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 6 }}>
              Current stage: <strong>{stage}</strong>
            </Typography>
            {canChangeStage ? (
              <Button
                fullWidth
                size="small"
                variant="outlined"
                color="primary"
                disabled={stageSaving}
                onClick={openPipelineDialog}
                style={{ marginBottom: 12 }}
              >
                Change Stage
              </Button>
            ) : (
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 12 }}>
                No further stage changes are available.
              </Typography>
            )}
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              className={classes.statusBlock}
              color="primary"
              onClick={() => getResume()}
            >
              Download Resume
            </Button>
          </Grid>
          <Grid item>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              color="primary"
              onClick={analyzeResume}
              disabled={matchingResume}
              style={{ marginTop: 8 }}
            >
              {matchingResume ? <CircularProgress size={18} /> : "Analyze resume match with AI"}
            </Button>
            <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 4 }}>
              Resume text is sent to Gemini only when you click this button.
            </Typography>
          </Grid>
          {aiMatch && (
            <Paper elevation={0} className={classes.stageDetails} style={{ marginTop: 12 }}>
              <Typography variant="subtitle2">AI resume match: {aiMatch.score}%</Typography>
              <Typography variant="body2" color="textSecondary">{aiMatch.summary}</Typography>
              {!!aiMatch.matchedSkills?.length && (
                <Typography variant="caption" display="block" style={{ marginTop: 6 }}>
                  Matched: {aiMatch.matchedSkills.join(", ")}
                </Typography>
              )}
              {!!aiMatch.missingSkills?.length && (
                <Typography variant="caption" display="block">
                  Missing or unverified: {aiMatch.missingSkills.join(", ")}
                </Typography>
              )}
              {aiMatch.analyzedAt && (
                <Typography variant="caption" display="block" color="textSecondary">
                  Analyzed {new Date(aiMatch.analyzedAt).toLocaleString()}
                </Typography>
              )}
            </Paper>
          )}
          {stage === "Assessment" && application.assessmentDetails?.link && (
            <Paper elevation={0} className={classes.stageDetails}>
              <Typography variant="subtitle2">Assessment</Typography>
              <Typography variant="body2">
                Deadline: {application.assessmentDetails.deadline
                  ? new Date(application.assessmentDetails.deadline).toLocaleString()
                  : "Not set"}
              </Typography>
              <Button size="small" color="primary" href={application.assessmentDetails.link} target="_blank" rel="noopener noreferrer">
                Open assessment link
              </Button>
              <Button
                size="small"
                color="primary"
                onClick={() => {
                  setAssessmentDraft({
                    link: application.assessmentDetails.link,
                    deadline: localDateTimeValue(application.assessmentDetails.deadline),
                  });
                  setDialogStage(stage);
                  setStageDialog("assessment");
                }}
              >
                Edit details
              </Button>
            </Paper>
          )}
          {["PI", "PI2", "HR Interview"].includes(stage) && (
            <Button
              size="small"
              color="primary"
              variant="outlined"
              onClick={() => handleStageSelect(stage)}
              style={{ marginTop: 12 }}
            >
              Add interview round
            </Button>
          )}
          {(application.interviewRounds || []).map((round) => (
            <Paper elevation={0} className={classes.stageDetails} key={round._id || round.roundNumber}>
              <Typography variant="subtitle2">
                Round {round.roundNumber}: {round.roundName}
              </Typography>
              <Typography variant="body2">
                {round.date ? new Date(round.date).toLocaleString() : ""}
                {" | "}{round.interviewType || "Online"}
              </Typography>
              {round.interviewer && <Typography variant="body2">Interviewer: {round.interviewer}</Typography>}
              {round.meetingLink && (
                <Button size="small" color="primary" href={round.meetingLink} target="_blank" rel="noopener noreferrer">
                  Join meeting
                </Button>
              )}
            </Paper>
          ))}
        </Grid>
      </Grid>
    </Paper>
    <Dialog
      open={stageDialog === "pipeline"}
      onClose={() => !stageSaving && setStageDialog("")}
      fullWidth
      maxWidth="sm"
      BackdropProps={{ classes: { root: classes.dialogBackdrop } }}
      PaperProps={{ className: classes.stageDialog }}
    >
      <DialogTitle>Move {application.jobApplicant.name} to a stage</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
          Current stage: <strong>{stage}</strong>. Select any stage in this hiring pipeline.
        </Typography>
        <Grid container spacing={1}>
          {DEFAULT_HIRING_STAGES.map((pipelineStage) => (
            <Grid item xs={12} sm={6} key={pipelineStage}>
              <Button
                fullWidth
                variant={selectedStage === pipelineStage ? "contained" : "outlined"}
                color={pipelineStage === "Rejected" ? "secondary" : "primary"}
                onClick={() => setSelectedStage(pipelineStage)}
                disabled={stageSaving}
              >
                {pipelineStage}
              </Button>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions style={{ padding: 16 }}>
        <Button onClick={() => setStageDialog("")} disabled={stageSaving}>Cancel</Button>
        <Button
          color="primary"
          variant="contained"
          onClick={confirmStageChange}
          disabled={stageSaving || selectedStage === stage}
        >
          {stageSaving ? <CircularProgress size={20} /> : `Move to ${selectedStage}`}
        </Button>
      </DialogActions>
    </Dialog>
    <Dialog
      open={stageDialog === "assessment"}
      onClose={() => !stageSaving && setStageDialog("")}
      fullWidth
      maxWidth="sm"
      BackdropProps={{ classes: { root: classes.dialogBackdrop } }}
      PaperProps={{ className: classes.stageDialog }}
    >
      <form onSubmit={saveAssessment}>
        <DialogTitle>Assign online assessment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            Add the test link and deadline for {application.jobApplicant.name}.
          </Typography>
          <TextField
            label="Assessment link"
            type="url"
            value={assessmentDraft.link}
            onChange={(event) => setAssessmentDraft({ ...assessmentDraft, link: event.target.value })}
            placeholder="https://assessment.example.com"
            required
            fullWidth
            style={{ marginBottom: 18 }}
          />
          <TextField
            label="Deadline"
            type="datetime-local"
            value={assessmentDraft.deadline}
            onChange={(event) => setAssessmentDraft({ ...assessmentDraft, deadline: event.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />
        </DialogContent>
        <DialogActions style={{ padding: 20 }}>
          <Button onClick={() => setStageDialog("")} disabled={stageSaving}>Cancel</Button>
          <Button type="submit" color="primary" variant="contained" disabled={stageSaving}>
            {stageSaving ? <CircularProgress size={20} /> : "Save assessment"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
    <Dialog
      open={stageDialog === "interview"}
      onClose={() => !stageSaving && setStageDialog("")}
      fullWidth
      maxWidth="sm"
      BackdropProps={{ classes: { root: classes.dialogBackdrop } }}
      PaperProps={{ className: classes.stageDialog }}
    >
      <form onSubmit={saveInterview}>
        <DialogTitle>Schedule interview round</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            Schedule the next interview for {application.jobApplicant.name}.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Round name"
                value={interviewDraft.roundName}
                onChange={(event) => setInterviewDraft({ ...interviewDraft, roundName: event.target.value })}
                placeholder="Technical, HR..."
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Interview type"
                value={interviewDraft.interviewType}
                onChange={(event) => setInterviewDraft({ ...interviewDraft, interviewType: event.target.value })}
                fullWidth
              >
                {["Online", "On-site", "Phone"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Date and time"
                type="datetime-local"
                value={interviewDraft.date}
                onChange={(event) => setInterviewDraft({ ...interviewDraft, date: event.target.value })}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
            </Grid>
            {interviewDraft.interviewType === "Online" && (
              <Grid item xs={12}>
                <TextField
                  label="Google Meet / Zoom link"
                  type="url"
                  value={interviewDraft.meetingLink}
                  onChange={(event) => setInterviewDraft({ ...interviewDraft, meetingLink: event.target.value })}
                  placeholder="https://meet.google.com/..."
                  required
                  fullWidth
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="Interviewer"
                value={interviewDraft.interviewer}
                onChange={(event) => setInterviewDraft({ ...interviewDraft, interviewer: event.target.value })}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions style={{ padding: 20 }}>
          <Button onClick={() => setStageDialog("")} disabled={stageSaving}>Cancel</Button>
          <Button type="submit" color="primary" variant="contained" disabled={stageSaving}>
            {stageSaving ? <CircularProgress size={20} /> : "Schedule interview"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
    </>
  );
};

const JobApplications = (props) => {
  const setPopup = useContext(SetPopupContext);
  const [applications, setApplications] = useState([]);
  const { jobId } = useParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOptions, setSearchOptions] = useState({
    status: {
      all: false,
      applied: false,
      shortlisted: false,
    },
    sort: {
      "jobApplicant.name": {
        status: false,
        desc: false,
      },
      dateOfApplication: {
        status: true,
        desc: true,
      },
      "jobApplicant.rating": {
        status: false,
        desc: false,
      },
    },
  });

  useEffect(() => {
    getData();
  }, []);

  const getData = () => {
    let searchParams = [];

    if (searchOptions.status.rejected) {
      searchParams = [...searchParams, `status=rejected`];
    }
    if (searchOptions.status.applied) {
      searchParams = [...searchParams, `status=applied`];
    }
    if (searchOptions.status.shortlisted) {
      searchParams = [...searchParams, `status=shortlisted`];
    }

    let asc = [],
      desc = [];

    Object.keys(searchOptions.sort).forEach((obj) => {
      const item = searchOptions.sort[obj];
      if (item.status) {
        if (item.desc) {
          desc = [...desc, `desc=${obj}`];
        } else {
          asc = [...asc, `asc=${obj}`];
        }
      }
    });
    searchParams = [...searchParams, ...asc, ...desc];
    const queryString = searchParams.join("&");
    console.log(queryString);
    let address = `${apiList.applicants}?jobId=${jobId}`;
    if (queryString !== "") {
      address = `${address}&${queryString}`;
    }

    console.log(address);

    axios
      .get(address, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((response) => {
        console.log(response.data);
        setApplications(response.data);
      })
      .catch((err) => {
        console.log(err.response);
        // console.log(err.response.data);
        setApplications([]);
        setPopup({
          open: true,
          severity: "error",
          message: err.response.data.message,
        });
      });
  };

  return (
    <>
      <Grid
        container
        item
        direction="column"
        alignItems="center"
        style={{ padding: "30px", minHeight: "93vh" }}
      >
        <Grid item>
          <Typography variant="h2">Applications</Typography>
        </Grid>
        <Grid item>
          <IconButton onClick={() => setFilterOpen(true)}>
            <FilterListIcon />
          </IconButton>
        </Grid>
        <Grid
          container
          item
          xs
          direction="column"
          style={{ width: "100%" }}
          alignItems="stretch"
          justify="center"
        >
          {applications.length > 0 ? (
            applications.map((obj) => (
              <Grid item>
                {/* {console.log(obj)} */}
                <ApplicationTile application={obj} getData={getData} />
              </Grid>
            ))
          ) : (
            <Typography variant="h5" style={{ textAlign: "center" }}>
              No Applications Found
            </Typography>
          )}
        </Grid>
      </Grid>
      <FilterPopup
        open={filterOpen}
        searchOptions={searchOptions}
        setSearchOptions={setSearchOptions}
        handleClose={() => setFilterOpen(false)}
        getData={() => {
          getData();
          setFilterOpen(false);
        }}
      />
    </>
  );
};

export default JobApplications;
