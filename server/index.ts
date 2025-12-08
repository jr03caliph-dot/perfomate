import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import authRoutes from "./routes/auth";
import studentsRoutes from "./routes/students";
import classesRoutes from "./routes/classes";
import attendanceRoutes from "./routes/attendance";
import talliesRoutes from "./routes/tallies";
import starsRoutes from "./routes/stars";
import morningBlissRoutes from "./routes/morningBliss";
import adminRoutes from "./routes/admin";

const app = express();
const PgSession = connectPgSimple(session);

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'performate-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

declare module 'express-session' {
  interface SessionData {
    userId: string;
    mentorId: string;
  }
}

app.use("/api/auth", authRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/tallies", talliesRoutes);
app.use("/api/stars", starsRoutes);
app.use("/api/morning-bliss", morningBlissRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
