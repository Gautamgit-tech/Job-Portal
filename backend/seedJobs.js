const mongoose = require("mongoose");
const User = require("./db/User");
const Recruiter = require("./db/Recruiter");
const Job = require("./db/Job");

const catalog = [
  ["Frontend Engineer", "Full Time", 95000, ["React", "JavaScript", "CSS"]],
  ["Product Designer", "Full Time", 82000, ["Figma", "UX Research", "Prototyping"]],
  ["Data Analyst", "Part Time", 65000, ["SQL", "Excel", "Python"]],
  ["Cloud Support Specialist", "Work From Home", 72000, ["AWS", "Linux", "Networking"]],
  ["Backend Engineer", "Full Time", 105000, ["Node.js", "MongoDB", "REST APIs"]],
  ["Content Strategist", "Part Time", 58000, ["Writing", "SEO", "Analytics"]],
  ["Mobile Developer", "Full Time", 98000, ["React Native", "TypeScript", "Firebase"]],
  ["QA Automation Engineer", "Work From Home", 88000, ["Cypress", "Selenium", "CI/CD"]],
  ["Growth Marketing Manager", "Full Time", 90000, ["Marketing", "CRM", "A/B Testing"]],
  ["People Operations Associate", "Part Time", 56000, ["Hiring", "People Ops", "Communication"]],
];

async function seed() {
  await mongoose.connect("mongodb://localhost:27017/jobPortal", { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
  let user = await User.findOne({ email: "demo.recruiter@jobportal.dev" });
  if (!user) user = await new User({ email: "demo.recruiter@jobportal.dev", password: "DemoRecruiter123!", type: "recruiter" }).save();
  await Recruiter.findOneAndUpdate({ userId: user._id }, { userId: user._id, name: "Northstar Talent Co.", contactNumber: "+919876543210", bio: "A product-led team hiring curious people for meaningful work." }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await Job.deleteMany({ userId: user._id });
  const jobs = Array.from({ length: 50 }, (_, index) => {
    const [role, jobType, salary, skillsets] = catalog[index % catalog.length];
    const weeksAhead = 3 + (index % 8);
    return { userId: user._id, title: `${role} ${index >= 10 ? `- Team ${Math.floor(index / 10) + 1}` : ""}`.trim(), maxApplicants: 40 + index, maxPositions: 2 + (index % 6), deadline: new Date(Date.now() + weeksAhead * 7 * 24 * 60 * 60 * 1000), skillsets, jobType, duration: index % 4 === 0 ? 0 : 3 + (index % 6), salary: salary + (index % 5) * 5000, rating: 3.5 + (index % 4) * 0.25 };
  });
  await Job.insertMany(jobs);
  console.log("Seeded 50 jobs for demo.recruiter@jobportal.dev");
  await mongoose.disconnect();
}

seed().catch((error) => { console.error(error); process.exitCode = 1; });