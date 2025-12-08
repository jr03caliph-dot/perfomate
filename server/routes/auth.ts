import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { mentors } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password, fullName, shortForm } = req.body;

    if (!email || !password || !fullName || !shortForm) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingMentor = await db.select().from(mentors).where(eq(mentors.email, email));
    if (existingMentor.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newMentor] = await db.insert(mentors).values({
      email,
      password: hashedPassword,
      fullName,
      shortForm,
    }).returning();

    req.session.userId = newMentor.id;
    req.session.mentorId = newMentor.id;

    const { password: _, ...mentorWithoutPassword } = newMentor;
    res.json({ user: mentorWithoutPassword, mentor: mentorWithoutPassword });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [mentor] = await db.select().from(mentors).where(eq(mentors.email, email));
    if (!mentor) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, mentor.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = mentor.id;
    req.session.mentorId = mentor.id;

    const { password: _, ...mentorWithoutPassword } = mentor;
    res.json({ user: mentorWithoutPassword, mentor: mentorWithoutPassword });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Failed to sign in" });
  }
});

router.post("/signout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to sign out" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

router.get("/session", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ user: null, mentor: null });
    }

    const [mentor] = await db.select().from(mentors).where(eq(mentors.id, req.session.userId));
    if (!mentor) {
      return res.json({ user: null, mentor: null });
    }

    const { password: _, ...mentorWithoutPassword } = mentor;
    res.json({ user: mentorWithoutPassword, mentor: mentorWithoutPassword });
  } catch (error) {
    console.error("Session error:", error);
    res.json({ user: null, mentor: null });
  }
});

export default router;
