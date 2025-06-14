const express = require("express");
require('dotenv').config();
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "your-secret-key-here";

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve static frontend from /public (IMPORTANT!)
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected!"))
.catch(err => console.log("❌ Connection Error:", err));

// SCHEMAS
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  totalScore: { type: Number, default: 0 },
  problemsSolved: { type: Number, default: 0 },
  easyCount: { type: Number, default: 0 },
  mediumCount: { type: Number, default: 0 },
  hardCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const problemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  link: { type: String },
  points: { type: Number, required: true },
  solvedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Problem = mongoose.model("Problem", problemSchema);

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// ROUTES

app.get("/", (req, res) => {
  res.send("DSA Tracker Backend API is running!");
});

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.status(201).json({ message: "User created successfully", token, user: { id: user._id, username, email } });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.json({ message: "Login successful", token, user: { id: user._id, username: user.username, email: user.email } });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// DASHBOARD
app.get("/api/dashboard", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const problems = await Problem.find({ userId: req.user.userId }).sort({ solvedAt: -1 });

    res.json({
      user: {
        username: user.username,
        totalScore: user.totalScore,
        problemsSolved: user.problemsSolved,
        easyCount: user.easyCount,
        mediumCount: user.mediumCount,
        hardCount: user.hardCount,
      },
      recentProblems: problems.slice(0, 5),
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ADD PROBLEM
app.post("/api/problems", authenticateToken, async (req, res) => {
  try {
    const { title, difficulty, link } = req.body;
    const pointsMap = { Easy: 10, Medium: 20, Hard: 30 };
    const points = pointsMap[difficulty];

    const problem = new Problem({
      userId: req.user.userId,
      title,
      difficulty,
      link,
      points,
    });
    await problem.save();

    const user = await User.findById(req.user.userId);
    user.totalScore += points;
    user.problemsSolved += 1;
    if (difficulty === "Easy") user.easyCount += 1;
    else if (difficulty === "Medium") user.mediumCount += 1;
    else if (difficulty === "Hard") user.hardCount += 1;
    await user.save();

    res.status(201).json({ message: "Problem added successfully", problem, newScore: user.totalScore });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// LEADERBOARD
app.get("/api/leaderboard", async (req, res) => {
  try {
    const users = await User.find({})
      .select("username totalScore problemsSolved easyCount mediumCount hardCount")
      .sort({ totalScore: -1 })
      .limit(50);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Serve frontend (index.html for SPA routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// START
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
